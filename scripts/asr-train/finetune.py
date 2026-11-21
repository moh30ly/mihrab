"""Fine-tunes Tarteel's Whisper Quran model on everyday reciters' voices.

Trains on manifests made by prepare_data.py (only clips labelled "correct", split "train"),
mixing sources by weight, with phone-like augmentation of the audio. Keeps the best checkpoint
by word error rate on the "test" split, and saves it in a folder that
scripts/build-asr-model.py exports for the app as it does Tarteel's model:

  python scripts/build-asr-model.py quran-asr runs/v2/final

Usage:
  python scripts/asr-train/finetune.py --data ds-own --data ds-everyayah --out runs/v2 \\
      [--mix own=0.5,everyayah=0.3,retasy=0.2] [--epochs 4] [--lr 1e-5] [--batch 16]
  Smoke test on a CPU (CI):  ... --max-steps 4 --batch 2 --eval-limit 4

Needs torch, transformers 4.41 (as the exporter), numpy. Runs on any CUDA GPU (Kaggle, Colab,
a rented one); fp16 is used automatically there.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
import wave
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import quran_text as q  # noqa: E402

RATE = 16000
BASE = "tarteel-ai/whisper-base-ar-quran"


# ---- Data ----

def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2, path
        return np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768


def load_rows(dirs: list[Path], split: str, labels: set[str]) -> list[dict]:
    rows = []
    for d in dirs:
        for line in (d / "manifest.jsonl").read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            if r["split"] == split and r["label"] in labels and r["seconds"] <= 29:
                r["path"] = str(d / r["audio"])
                rows.append(r)
    return rows


def augment(a: np.ndarray, rng: random.Random) -> np.ndarray:
    """A phone in a room: speed and pitch, narrow band, echo, background noise, level."""
    if rng.random() < 0.5:  # speed (and pitch) 0.9x to 1.12x
        f = rng.uniform(0.9, 1.12)
        a = np.interp(np.arange(0, len(a), f), np.arange(len(a)), a).astype(np.float32)
    if rng.random() < 0.6:  # telephone-ish band
        spec = np.fft.rfft(a)
        freqs = np.fft.rfftfreq(len(a), 1 / RATE)
        lo, hi = rng.uniform(80, 300), rng.uniform(3200, 7000)
        spec[(freqs < lo) | (freqs > hi)] *= 0.05
        a = np.fft.irfft(spec, len(a)).astype(np.float32)
    if rng.random() < 0.3:  # small room echo
        d = int(RATE * rng.uniform(0.02, 0.08))
        out = a.copy()
        out[d:] += a[:-d] * rng.uniform(0.2, 0.5)
        a = out
    if rng.random() < 0.7:  # noise at 5 to 30 dB SNR
        snr = rng.uniform(5, 30)
        p = float(np.mean(a**2)) + 1e-9
        n = np.random.default_rng(rng.randrange(1 << 30)).standard_normal(len(a)).astype(np.float32)
        if rng.random() < 0.5:  # pinker noise, like a fan or traffic
            n = np.cumsum(n) * 0.02
            n -= np.convolve(n, np.ones(400) / 400, mode="same")
        a = a + n * np.sqrt(p / (10 ** (snr / 10)) / (float(np.mean(n**2)) + 1e-9))
    a = a * rng.uniform(0.3, 1.0) / (np.max(np.abs(a)) + 1e-6)
    return a.astype(np.float32)


class Clips(torch.utils.data.Dataset):
    def __init__(self, rows, processor, train: bool, seed: int = 0):
        self.rows, self.p, self.train = rows, processor, train
        self.rng = random.Random(seed)

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        r = self.rows[i]
        a = read_wav(Path(r["path"]))
        # Most clips get a phone-and-room treatment; some stay clean so studio quality isn't forgotten.
        if self.train and self.rng.random() < 0.8:
            a = augment(a, self.rng)
        feats = self.p.feature_extractor(a, sampling_rate=RATE, return_tensors="np").input_features[0]
        labels = self.p.tokenizer(r["text"]).input_ids
        return {"input_features": feats, "labels": labels}


class Collator:
    def __init__(self, processor, start_id: int):
        self.p, self.start = processor, start_id

    def __call__(self, batch):
        feats = torch.tensor(np.stack([b["input_features"] for b in batch]))
        lab = self.p.tokenizer.pad({"input_ids": [b["labels"] for b in batch]}, return_tensors="pt")
        labels = lab["input_ids"].masked_fill(lab["attention_mask"].ne(1), -100)
        # The model adds the start token itself.
        if (labels[:, 0] == self.start).all():
            labels = labels[:, 1:]
        return {"input_features": feats, "labels": labels}


def weights(rows: list[dict], mix: dict[str, float]) -> list[float]:
    """Per-clip sampling weights so each source makes up its share of every epoch."""
    count: dict[str, int] = {}
    for r in rows:
        count[r["source"]] = count.get(r["source"], 0) + 1
    share = {s: mix.get(s, 0.0 if mix else 1.0) for s in count}
    total = sum(share.values()) or 1
    return [share[r["source"]] / total / count[r["source"]] for r in rows]


# ---- Metric ----

def wer(refs: list[str], hyps: list[str]) -> float:
    """Word error rate on consonant skeletons (how the app compares words)."""
    errors = words = 0
    for ref, hyp in zip(refs, hyps):
        a = [q.skeleton(w) for w in ref.split() if q.skeleton(w)]
        b = [q.skeleton(w) for w in hyp.split() if q.skeleton(w)]
        prev = list(range(len(b) + 1))
        for i in range(1, len(a) + 1):
            cur = [i] + [0] * len(b)
            for j in range(1, len(b) + 1):
                cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
            prev = cur
        errors += prev[len(b)]
        words += len(a)
    return errors / max(1, words)


# ---- Training ----

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", action="append", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--base", default=BASE)
    ap.add_argument("--mix", default="", help="source=weight,... (default: as found)")
    ap.add_argument("--epochs", type=float, default=4)
    ap.add_argument("--max-steps", type=int, default=-1)
    ap.add_argument("--lr", type=float, default=1e-5)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--eval-limit", type=int, default=0)
    ap.add_argument("--freeze-encoder", action="store_true", help="train only the decoder (less data needed, less gain)")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    from transformers import (Seq2SeqTrainer, Seq2SeqTrainingArguments, WhisperForConditionalGeneration,
                              WhisperProcessor)

    torch.manual_seed(args.seed)
    processor = WhisperProcessor.from_pretrained(args.base)
    processor.tokenizer.set_prefix_tokens(language="arabic", task="transcribe", predict_timestamps=False)
    model = WhisperForConditionalGeneration.from_pretrained(args.base)
    prompt = processor.get_decoder_prompt_ids(language="arabic", task="transcribe", no_timestamps=True)
    model.generation_config.forced_decoder_ids = prompt
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []
    if args.freeze_encoder:
        model.model.encoder.requires_grad_(False)

    train_rows = load_rows(args.data, "train", {"correct"})
    test_rows = load_rows(args.data, "test", {"correct"})
    if args.eval_limit:
        test_rows = random.Random(1).sample(test_rows, min(args.eval_limit, len(test_rows)))
    if not train_rows:
        raise SystemExit("No training clips (split=train, label=correct) in " + ", ".join(map(str, args.data)))
    mix = {k: float(v) for k, v in (p.split("=") for p in args.mix.split(",") if p)}
    by_source: dict[str, int] = {}
    for r in train_rows:
        by_source[r["source"]] = by_source.get(r["source"], 0) + 1
    print(f"train {len(train_rows)} clips {by_source}, test {len(test_rows)} clips, mix {mix or 'as found'}")

    train = Clips(train_rows, processor, train=True, seed=args.seed)
    test = Clips(test_rows, processor, train=False)
    cuda = torch.cuda.is_available()

    class Trainer(Seq2SeqTrainer):
        def _get_train_sampler(self):
            return torch.utils.data.WeightedRandomSampler(weights(train_rows, mix), len(train_rows), replacement=True)

    def metrics(pred):
        ids = np.where(pred.predictions == -100, processor.tokenizer.pad_token_id, pred.predictions)
        hyps = processor.batch_decode(ids, skip_special_tokens=True)
        return {"wer": wer([r["text"] for r in test_rows], hyps)}

    targs = Seq2SeqTrainingArguments(
        output_dir=str(args.out),
        per_device_train_batch_size=args.batch,
        per_device_eval_batch_size=args.batch,
        learning_rate=args.lr,
        warmup_ratio=0.1,
        num_train_epochs=args.epochs,
        max_steps=args.max_steps,
        fp16=cuda,
        eval_strategy="epoch" if args.max_steps < 0 else "steps",
        save_strategy="epoch" if args.max_steps < 0 else "steps",
        eval_steps=max(1, args.max_steps),
        save_steps=max(1, args.max_steps),
        save_total_limit=2,
        load_best_model_at_end=bool(test_rows),
        metric_for_best_model="wer",
        greater_is_better=False,
        predict_with_generate=True,
        generation_max_length=225,
        logging_steps=10 if args.max_steps < 0 else 1,
        report_to=[],
        dataloader_num_workers=2 if cuda else 0,
        remove_unused_columns=False,
        seed=args.seed,
    )
    start = model.config.decoder_start_token_id
    trainer = Trainer(model=model, args=targs, train_dataset=train, eval_dataset=test or None,
                      data_collator=Collator(processor, start), compute_metrics=metrics if test_rows else None)
    if test_rows:
        print("before training:", trainer.evaluate())
    trainer.train()
    final = args.out / "final"
    trainer.save_model(str(final))
    processor.save_pretrained(str(final))
    # The exporter reads the generation settings from here; keep Tarteel's, with Arabic transcription.
    model.generation_config.save_pretrained(str(final))
    if test_rows:
        result = trainer.evaluate()
        print("after training:", result)
        (final / "eval.json").write_text(json.dumps(result, indent=2))
    print(f"Saved {final}. Export for the app: python scripts/build-asr-model.py quran-asr {final}")


if __name__ == "__main__":
    main()
