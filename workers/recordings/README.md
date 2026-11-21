# Mihrab recordings service

Receives the Quran recitations people choose to share from the Memorize page (`lib/donate.ts`)
and stores them in the private R2 bucket `mihrab-recordings`, for training and testing the
recitation checker (`scripts/asr-train`). Clips can be added and a donor's clips deleted; nothing
can be read back through the service. Reading for training uses an R2 API token
(`scripts/asr-train/pull_donations.py`).

Deployed (on pushes to main or this branch that touch it) by `.github/workflows/recordings-service.yml` with the repository secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Locally: `npx wrangler deploy`.

Stored per clip: `clips/<donor>/<day>/<sss><aaa>[-<sss><bbb>]_<id>.wav` and `.json` (ayahs, what
the checker heard, its marks, app version, country). `donors/<donor>.json` holds a hash of the
donor's delete key. No IP address or device identifier is stored.
