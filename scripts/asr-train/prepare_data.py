"""Builds a recitation dataset for testing and fine-tuning Mihrab's Quran checker.

Every clip becomes 16 kHz mono 16-bit WAV, with one line in manifest.jsonl:

  {"id", "audio": "audio/<id>.wav", "surah", "ayah", "text", "label", "speaker",
   "gender", "source", "split", "seconds"}

label is "correct" (recited as written), "incorrect" (a known mistake), or "unknown".
text is the ayah in the label script (quran_text.py). split is "train" or "test" and is
decided per speaker, so no voice is in both.

Sources (any mix, each a sub-command option):
  --retasy [N]         Learners' recitations from RetaSy/quranic_audio_dataset (non-Arab
                       reciters, labelled correct/incorrect by annotators). Licence not stated by
                       the authors, so it is used for testing only until they confirm one.
  --everyayah R:A,...  Professional reciters from everyayah.com, e.g.
                       Alafasy_128kbps:001001-001007,112001-112004
  --folder DIR         Our own recordings: DIR/<speaker>/<sss><aaa>[anything].<wav|mp3|m4a|webm|ogg>,
                       e.g. volunteers/moe/001002.m4a. An optional DIR/labels.csv with
                       file,label (correct/incorrect) overrides the default "unknown".

Usage: python scripts/asr-train/prepare_data.py <out dir> [sources...] [--test-share 0.2]
Needs ffmpeg; --retasy also needs pyarrow and huggingface_hub (public download, no account).
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import quran_text as q  # noqa: E402

RATE = 16000
EVERYAYAH = "https://everyayah.com/data/"
AUDIO_EXT = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".opus", ".aac", ".flac", ".3gp"}


def decode(data: bytes) -> np.ndarray:
    """Any audio file's bytes -> float32 16 kHz mono."""
    p = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", str(RATE), "-f", "f32le", "pipe:1"],
        input=data,
        capture_output=True,
        check=True,
    )
    return np.frombuffer(p.stdout, dtype=np.float32)


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def split_for(speaker: str, test_share: float, salt: str = "mihrab") -> str:
    h = int(hashlib.sha1(f"{salt}:{speaker}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
    return "test" if h < test_share else "train"


class Writer:
    def __init__(self, out: Path, test_share: float):
        self.out = out
        self.test_share = test_share
        (out / "audio").mkdir(parents=True, exist_ok=True)
        self.manifest = (out / "manifest.jsonl").open("a", encoding="utf-8")
        self.count = 0

    def add(self, *, id: str, audio: np.ndarray, surah: int, ayah: int, label: str, speaker: str,
            source: str, gender: str = "", split: str | None = None) -> None:
        if len(audio) < RATE * 0.5:
            return
        rel = f"audio/{id}.wav"
        write_wav(self.out / rel, audio)
        row = {
            "id": id, "audio": rel, "surah": surah, "ayah": ayah, "text": q.ayahs()[(surah, ayah)],
            "label": label, "speaker": speaker, "gender": gender, "source": source,
            "split": split or split_for(speaker, self.test_share), "seconds": round(len(audio) / RATE, 2),
        }
        self.manifest.write(json.dumps(row, ensure_ascii=False) + "\n")
        self.count += 1


# ---- Sources ----

RETASY_LABELS = {"correct": "correct", "in_correct": "incorrect", "incorrect": "incorrect"}


def add_retasy(w: Writer, limit: int | None) -> None:
    import pyarrow.parquet as pq
    from huggingface_hub import HfApi, hf_hub_download

    repo = "RetaSy/quranic_audio_dataset"
    files = sorted(f for f in HfApi().list_repo_files(repo, repo_type="dataset") if f.endswith(".parquet"))
    seen = skipped = 0
    labels: dict[str, int] = {}
    for f in files:
        table = pq.read_table(hf_hub_download(repo, f, repo_type="dataset"))
        if seen == 0:
            print("RetaSy columns:", table.column_names)
        for row in table.to_pylist():
            seen += 1
            raw = str(row.get("final_label") or "").strip()
            labels[raw] = labels.get(raw, 0) + 1
            label = RETASY_LABELS.get(raw)
            # The other labels (not Quran, wrong ayah, several ayahs, cut off) can't be scored.
            if label is None:
                skipped += 1
                continue
            surah = q.surah_by_name(str(row.get("Surah") or ""))
            found = q.find_ayah(str(row.get("Aya") or ""), surah)
            if found is None:
                skipped += 1
                continue
            audio = row["audio"]
            data = audio.get("bytes") if isinstance(audio, dict) else audio
            try:
                pcm = decode(data)
            except subprocess.CalledProcessError:
                skipped += 1
                continue
            speaker = f"retasy-{row.get('reciter_id') or seen}"
            w.add(id=f"retasy-{seen:05d}", audio=pcm, surah=found[0], ayah=found[1], label=label,
                  speaker=speaker, gender=str(row.get("reciter_gender") or ""), source="retasy")
            if limit and w.count >= limit:
                break
        if limit and w.count >= limit:
            break
    print(f"RetaSy: {seen} rows read, {skipped} skipped; labels {labels}")


def ayah_range(spec: str) -> list[tuple[int, int]]:
    out = []
    for part in spec.split(","):
        a, _, b = part.partition("-")
        s1, a1 = int(a[:3]), int(a[3:])
        s2, a2 = (int(b[:3]), int(b[3:])) if b else (s1, a1)
        for (s, n) in sorted(q.ayahs()):
            if (s1, a1) <= (s, n) <= (s2, a2):
                out.append((s, n))
    return out


def add_everyayah(w: Writer, spec: str, split: str | None) -> None:
    reciter, _, ayahs = spec.partition(":")
    for s, a in ayah_range(ayahs):
        url = f"{EVERYAYAH}{reciter}/{s:03d}{a:03d}.mp3"
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                pcm = decode(r.read())
        except Exception as e:  # noqa: BLE001 - a missing file shouldn't stop the run
            print(f"skip {url}: {e}")
            continue
        w.add(id=f"ea-{reciter}-{s:03d}{a:03d}", audio=pcm, surah=s, ayah=a, label="correct",
              speaker=f"everyayah-{reciter}", source="everyayah", gender="male", split=split)


def add_folder(w: Writer, folder: Path) -> None:
    labels: dict[str, str] = {}
    if (folder / "labels.csv").exists():
        with (folder / "labels.csv").open(encoding="utf-8") as f:
            for r in csv.DictReader(f):
                labels[r["file"].strip()] = r["label"].strip()
    for path in sorted(folder.rglob("*")):
        if path.suffix.lower() not in AUDIO_EXT:
            continue
        m = re.match(r"(\d{3})(\d{3})", path.stem)
        if not m or (int(m[1]), int(m[2])) not in q.ayahs():
            print(f"skip {path}: name must start with the surah and ayah, e.g. 001002")
            continue
        rel = str(path.relative_to(folder))
        speaker = path.parent.name if path.parent != folder else "unknown"
        clean = re.sub(r"[^A-Za-z0-9_-]", "_", rel.rsplit(".", 1)[0])
        w.add(id=f"own-{clean}", audio=decode(path.read_bytes()), surah=int(m[1]), ayah=int(m[2]),
              label=labels.get(rel, "unknown"), speaker=f"own-{speaker}", source="own")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out", type=Path)
    ap.add_argument("--retasy", nargs="?", const=0, type=int, metavar="N", help="at most N clips (0 = all)")
    ap.add_argument("--everyayah", action="append", default=[], metavar="RECITER:AYAHS")
    ap.add_argument("--everyayah-split", choices=["train", "test"], help="put all EveryAyah clips in one split")
    ap.add_argument("--folder", action="append", default=[], type=Path)
    ap.add_argument("--test-share", type=float, default=0.2)
    args = ap.parse_args()

    w = Writer(args.out, args.test_share)
    if args.retasy is not None:
        add_retasy(w, args.retasy or None)
    for spec in args.everyayah:
        add_everyayah(w, spec, args.everyayah_split)
    for folder in args.folder:
        add_folder(w, folder)
    w.manifest.close()

    rows = [json.loads(l) for l in (args.out / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
    summary: dict[str, dict[str, float]] = {}
    for r in rows:
        k = f"{r['source']} {r['split']} {r['label']}"
        s = summary.setdefault(k, {"clips": 0, "hours": 0.0, "speakers": set()})  # type: ignore[dict-item]
        s["clips"] += 1
        s["hours"] += r["seconds"] / 3600
        s["speakers"].add(r["speaker"])  # type: ignore[union-attr]
    print(f"\n{len(rows)} clips in {args.out / 'manifest.jsonl'}")
    for k, s in sorted(summary.items()):
        print(f"  {k}: {s['clips']} clips, {s['hours']:.2f} h, {len(s['speakers'])} speakers")  # type: ignore[arg-type]


if __name__ == "__main__":
    main()
