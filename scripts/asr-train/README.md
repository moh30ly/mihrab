# Training Mihrab's own Quran recitation model

The app checks recitation offline with Tarteel's `whisper-base-ar-quran` (Apache-2.0), which was
trained on professional reciters. These scripts continue its training on everyday voices, so
the model, its export (`scripts/build-asr-model.py`) and the app stay as they are.
The plan, data sources and licences are in the project's planning doc.

| Step | Script | Where it runs |
| --- | --- | --- |
| Build a dataset | `prepare_data.py` | Anywhere with ffmpeg (CI downloads RetaSy and EveryAyah) |
| Score a model on everyday voices and mistakes | `../eval-asr-everyday.mts` | CPU, CI job `everyday` |
| Fine-tune | `finetune.py` | A GPU (Kaggle, Colab, rented); CI job `smoke` runs 3 steps on a CPU |
| Export for the app | `../build-asr-model.py <out> runs/v2/final` | CPU, as for Tarteel's model |

## Volunteer recordings

Put each clip in a folder per person, named by surah and ayah:

```
volunteers/
  moe/001002.m4a        Al-Fatihah 1:2
  moe/112001-take2.mp3
  labels.csv            optional: file,label   (moe/001002.m4a,correct)
```

Only clips labelled `correct` are trained on; the rest are used to check that mistakes are caught.
Each person lands wholly in train or test, so test scores are on voices the model hasn't heard.

## A training run on a GPU

```
pip install -r scripts/asr-train/requirements.txt        # CUDA torch 2.4.1 on a GPU machine
python scripts/asr-train/prepare_data.py ds-own --folder volunteers
python scripts/asr-train/prepare_data.py ds-pro --everyayah Alafasy_128kbps:001001-001007,...
python scripts/asr-train/finetune.py --data ds-own --data ds-pro --out runs/v2 \
    --mix own=0.6,everyayah=0.4 --epochs 4
python scripts/build-asr-model.py quran-asr-v2 runs/v2/final
npx tsx scripts/eval-asr-everyday.mts ds-own --split test quran-asr-v2
```

A new model ships only if it beats the shipped one on everyday voices, stays level on
professional reciters, and catches changed and skipped words at least as often.

Not yet: training on the short stretches the app cuts at pauses needs word timings for each
clip, which we don't have; whole ayahs are used for now.
