"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { HeartHandshake } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  deleteShared,
  dismissAsk,
  donateAvailable,
  flush,
  onDonateChange,
  optIn,
  optOut,
  readDonate,
  shouldAsk,
  type DonateState,
} from "@/lib/donate"
import { useT } from "@/lib/i18n"

let snapshot: DonateState | null = null
const subscribe = (l: () => void) =>
  onDonateChange(() => {
    snapshot = null
    l()
  })
const get = () => (snapshot ??= readDonate())
const server = () => null

function useDonate(): DonateState | null {
  return useSyncExternalStore(subscribe, get, server)
}

/** What sharing means, and the age check, before anything is sent. */
function ConsentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useT()
  const [adult, setAdult] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("Help improve the checker")}</DialogTitle>
          <DialogDescription>
            {t("The checker learned from famous reciters, so it mishears everyday voices more often. Sharing your recitations helps us train it on voices like yours.")}
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1.5 ps-5 text-sm leading-6">
          <li>{t("After each Recite, the recording, the ayah and what the checker heard are sent to Mihrab. Nothing else: no name, account, location or device id.")}</li>
          <li>{t("Recordings are used only to train and test Mihrab’s recitation checker. They are never published, sold or shared.")}</li>
          <li>{t("They are kept for up to 3 years. You can stop at any time and delete everything you shared from this page.")}</li>
        </ul>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 size-4 accent-[var(--grove,#123f3c)]" />
          <span>{t("I am 18 or older, or a parent or guardian has agreed.")}</span>
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-full border border-border bg-card px-4 py-2 text-sm">
            {t("Not now")}
          </button>
          <button
            type="button"
            disabled={!adult}
            onClick={() => {
              optIn()
              onOpenChange(false)
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40"
          >
            {t("Share my recitations")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The setting on the Memorize page: share recitations or not, and delete what was shared. */
export function DonateRecordings() {
  const { t } = useT()
  const state = useDonate()
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    void flush()
  }, [])

  if (!state || !donateAvailable()) return null

  const remove = async () => {
    setBusy(true)
    setNote(null)
    try {
      const n = await deleteShared()
      setNote(t("Deleted {n} shared recordings.", { n }))
    } catch {
      setNote(t("Couldn’t reach Mihrab to delete them. Try again when you’re online."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="andalus-card grid gap-2 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-medium text-ink">
          <HeartHandshake className="size-4 text-grove" aria-hidden />
          {t("Share my recitations to improve the checker")}
        </span>
        <Switch
          checked={state.on}
          onCheckedChange={(on) => (on ? setConsent(true) : void optOut())}
          aria-label={t("Share my recitations to improve the checker")}
        />
      </div>
      <p className="text-muted-foreground">
        {state.on
          ? t("On. {n} recitations shared so far. Thank you.", { n: state.sent })
          : t("Off. Your recordings stay on this device.")}
      </p>
      {state.donor ? (
        <button type="button" disabled={busy} onClick={remove} className="justify-self-start text-[#b4472c] underline underline-offset-2 disabled:opacity-50">
          {t("Delete everything I shared")}
        </button>
      ) : null}
      {note ? <p className="text-muted-foreground">{note}</p> : null}
      <ConsentDialog open={consent} onOpenChange={setConsent} />
    </section>
  )
}

/** A one-time ask after a few recitations; hidden once answered either way. */
export function DonateAsk() {
  const { t } = useT()
  const state = useDonate()
  const [consent, setConsent] = useState(false)
  if (!state || !shouldAsk(state)) return <ConsentDialog open={consent} onOpenChange={setConsent} />
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
      <HeartHandshake className="size-4 text-grove" aria-hidden />
      <span className="flex-1">{t("Would you share your recitations to help the checker understand voices like yours?")}</span>
      <button type="button" onClick={() => setConsent(true)} className="rounded-full bg-primary px-3 py-1 text-primary-foreground">
        {t("Tell me more")}
      </button>
      <button type="button" onClick={() => dismissAsk()} className="rounded-full border border-border bg-card px-3 py-1">
        {t("No thanks")}
      </button>
      <ConsentDialog open={consent} onOpenChange={(o) => { setConsent(o); if (!o && !readDonate().on) dismissAsk() }} />
    </div>
  )
}
