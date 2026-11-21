// Mihrab recordings: receives Quran recitations that people chose to share from the app's
// Memorize page (lib/donate.ts) and keeps them in a private R2 bucket for training and testing
// Mihrab's recitation checker. Nothing here is public: there is no way to read clips back
// through this service, only to add them and to delete all of one donor's clips.
//
// Bindings: CLIPS (R2 bucket). Deploy: wrangler deploy (see README.md), or paste into the
// Cloudflare dashboard editor.
//
//   POST   /v1/clips            multipart: audio (WAV, at most 6 MB), meta (JSON, below)
//   DELETE /v1/donors/<donor>   header X-Delete-Key: the key the app made when the person opted in
//
// meta: { donor, deleteKey, surah, ayahFrom, ayahTo, score, heard, statuses, selfConfirmed,
//         consent, adult, app, model, seconds }

const ORIGINS = ["https://mihrab.live", "https://www.mihrab.live", "https://localhost", "capacitor://localhost", "http://localhost:3000"]
const MAX_BYTES = 6 * 1024 * 1024
const HEX = /^[0-9a-f]{32}$/
const STATUSES = new Set(["correct", "close", "wrong", "missed", "pending"])

function cors(req) {
  const origin = req.headers.get("Origin") || ""
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Delete-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}

const json = (req, status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(req) } })

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi

function checkMeta(m) {
  if (!m || typeof m !== "object") return "meta"
  if (!HEX.test(m.donor || "") || !HEX.test(m.deleteKey || "")) return "donor"
  if (!int(m.surah, 1, 114) || !int(m.ayahFrom, 1, 286) || !int(m.ayahTo, m.ayahFrom, 286)) return "ayah"
  if (typeof m.score !== "number" || m.score < 0 || m.score > 1) return "score"
  if (typeof m.heard !== "string" || m.heard.length > 4000) return "heard"
  if (!Array.isArray(m.statuses) || m.statuses.length > 2000 || !m.statuses.every((s) => STATUSES.has(s))) return "statuses"
  if (m.consent !== 1 || m.adult !== true) return "consent"
  return null
}

/** The first upload records the donor's delete key; later ones must carry the same key. */
async function checkDonor(env, donor, deleteKey) {
  const key = `donors/${donor}.json`
  const hash = await sha256(deleteKey)
  const found = await env.CLIPS.get(key)
  if (!found) {
    await env.CLIPS.put(key, JSON.stringify({ hash, since: new Date().toISOString() }), {
      httpMetadata: { contentType: "application/json" },
    })
    return true
  }
  return (await found.json()).hash === hash
}

async function addClip(req, env) {
  const len = Number(req.headers.get("Content-Length") || 0)
  if (len > MAX_BYTES + 64 * 1024) return json(req, 413, { error: "too large" })
  let form
  try {
    form = await req.formData()
  } catch {
    return json(req, 400, { error: "form" })
  }
  const audio = form.get("audio")
  let meta
  try {
    meta = JSON.parse(String(form.get("meta") || ""))
  } catch {
    return json(req, 400, { error: "meta" })
  }
  const bad = checkMeta(meta)
  if (bad) return json(req, 400, { error: bad })
  if (!audio || typeof audio === "string" || audio.size < 1000 || audio.size > MAX_BYTES) return json(req, 400, { error: "audio" })
  const head = new Uint8Array(await audio.slice(0, 12).arrayBuffer())
  const tag = String.fromCharCode(...head.slice(0, 4)) + String.fromCharCode(...head.slice(8, 12))
  if (tag !== "RIFFWAVE") return json(req, 400, { error: "wav" })
  if (!(await checkDonor(env, meta.donor, meta.deleteKey))) return json(req, 403, { error: "key" })

  const day = new Date().toISOString().slice(0, 10)
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
  const ayahs = `${String(meta.surah).padStart(3, "0")}${String(meta.ayahFrom).padStart(3, "0")}` +
    (meta.ayahTo !== meta.ayahFrom ? `-${String(meta.surah).padStart(3, "0")}${String(meta.ayahTo).padStart(3, "0")}` : "")
  const base = `clips/${meta.donor}/${day}/${ayahs}_${id}`
  const { deleteKey, ...keep } = meta
  void deleteKey
  // Country only (from Cloudflare), to know which accents the data covers; no IP is kept.
  const record = { ...keep, received: new Date().toISOString(), country: req.cf?.country || null }
  await env.CLIPS.put(`${base}.wav`, audio.stream(), { httpMetadata: { contentType: "audio/wav" } })
  await env.CLIPS.put(`${base}.json`, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } })
  return json(req, 201, { ok: true })
}

async function deleteDonor(req, env, donor) {
  if (!HEX.test(donor)) return json(req, 400, { error: "donor" })
  const found = await env.CLIPS.get(`donors/${donor}.json`)
  if (!found) return json(req, 200, { ok: true, deleted: 0 })
  const given = req.headers.get("X-Delete-Key") || ""
  if (!HEX.test(given) || (await found.json()).hash !== (await sha256(given))) return json(req, 403, { error: "key" })
  let deleted = 0
  let cursor
  do {
    const page = await env.CLIPS.list({ prefix: `clips/${donor}/`, cursor })
    const keys = page.objects.map((o) => o.key)
    if (keys.length) await env.CLIPS.delete(keys)
    deleted += keys.length
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
  await env.CLIPS.delete(`donors/${donor}.json`)
  return json(req, 200, { ok: true, deleted })
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) })
    if (req.method === "POST" && url.pathname === "/v1/clips") return addClip(req, env)
    const m = url.pathname.match(/^\/v1\/donors\/([^/]+)$/)
    if (req.method === "DELETE" && m) return deleteDonor(req, env, m[1])
    if (req.method === "GET" && url.pathname === "/") return new Response("Mihrab recordings service\n", { headers: cors(req) })
    return json(req, 404, { error: "not found" })
  },
}
