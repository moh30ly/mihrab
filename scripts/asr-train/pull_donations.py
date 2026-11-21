"""Downloads the recitations people chose to share (workers/recordings) into a folder that
prepare_data.py --folder reads:

  <out>/<donor>/<sss><aaa>[-<sss><bbb>]_<id>.wav   and   <out>/labels.csv

A clip is labelled "correct" only when every word was marked correct (not just close) by the
checker and the person didn't say they made mistakes. Everything else is "unknown": kept for
review and testing, never trained on. Before a training run, a person who knows the Quran
listens to a sample of the "correct" clips (README.md), because the checker can be wrong too.

Reads the private R2 bucket with an R2 API token (read only is enough):
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY   [R2_BUCKET=mihrab-recordings]

Usage: python scripts/asr-train/pull_donations.py <out dir> [--since 2026-11-21]
Needs boto3. Voice recordings are personal data: keep <out> off public places (no commits,
no public artifacts) and delete it after training.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out", type=Path)
    ap.add_argument("--since", default="", help="only clips received on or after this date (YYYY-MM-DD)")
    args = ap.parse_args()

    import boto3

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )
    bucket = os.environ.get("R2_BUCKET", "mihrab-recordings")
    args.out.mkdir(parents=True, exist_ok=True)
    rows = []
    counts = {"correct": 0, "unknown": 0}
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix="clips/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".json"):
                continue
            _, donor, day, name = key.split("/", 3)
            if args.since and day < args.since:
                continue
            meta = json.loads(s3.get_object(Bucket=bucket, Key=key)["Body"].read())
            wav = args.out / donor / (name[: -len(".json")] + ".wav")
            if not wav.exists():
                wav.parent.mkdir(parents=True, exist_ok=True)
                s3.download_file(bucket, key[: -len(".json")] + ".wav", str(wav))
            statuses = meta.get("statuses") or []
            sure = bool(statuses) and all(s == "correct" for s in statuses) and meta.get("selfConfirmed") is not False
            label = "correct" if sure else "unknown"
            counts[label] += 1
            rows.append({"file": str(wav.relative_to(args.out)), "label": label, "score": meta.get("score"),
                         "heard": meta.get("heard", ""), "country": meta.get("country") or ""})
    with (args.out / "labels.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "label", "score", "heard", "country"])
        w.writeheader()
        w.writerows(rows)
    donors = len({r["file"].split("/")[0] for r in rows})
    print(f"{len(rows)} clips from {donors} donors in {args.out}: {counts}")


if __name__ == "__main__":
    main()
