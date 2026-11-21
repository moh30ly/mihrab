import assert from "node:assert/strict"
import { test } from "node:test"
import { CHANNEL, PLAYLISTS, UPLOADS, embedUrl, findPlaylist } from "./lectures"

test("playlist ids are unique YouTube playlist ids", () => {
  const ids = PLAYLISTS.map((p) => p.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) assert.match(id, /^PL[\w-]{32}$/)
})

test("the uploads list is the channel's UU playlist", () => {
  assert.equal(UPLOADS.id, "UUASAOTD6fMPEg8jmO4nPblQ")
  assert.equal(UPLOADS.id.slice(2), CHANNEL.id.slice(2))
  assert.equal(findPlaylist(UPLOADS.id), UPLOADS)
})

test("embed asks for subtitles in the app language", () => {
  const u = new URL(embedUrl(PLAYLISTS[0].id, "de", "https://mihrab.live"))
  assert.equal(u.hostname, "www.youtube-nocookie.com")
  assert.equal(u.searchParams.get("list"), PLAYLISTS[0].id)
  assert.equal(u.searchParams.get("hl"), "de")
  assert.equal(u.searchParams.get("cc_lang_pref"), "de")
  assert.equal(u.searchParams.get("cc_load_policy"), "1")
  assert.equal(u.searchParams.get("origin"), "https://mihrab.live")
  const zh = new URL(embedUrl(PLAYLISTS[0].id, "zh"))
  assert.equal(zh.searchParams.get("cc_lang_pref"), "zh-Hans")
  assert.equal(zh.searchParams.get("origin"), null)
})

test("Arabic readers are not forced into Arabic captions", () => {
  const u = new URL(embedUrl(PLAYLISTS[0].id, "ar"))
  assert.equal(u.searchParams.get("cc_load_policy"), null)
  assert.equal(u.searchParams.get("hl"), "ar")
})
