"""The ayah texts the recitation model is trained to write, and helpers to find an ayah by its text.

Labels use Tanzil's "simple" script with tashkeel (مَالِكِ يَوْمِ الدِّينِ), the style Tarteel's
model already writes, so fine-tuning doesn't have to re-teach the output script. The app compares
words by consonant skeleton (lib/hifz.ts), so the script of the label doesn't change matching.

Text: fawazahmed0/quran-api edition ara-quransimple (from Tanzil quran-simple via alquran.cloud).
"""
from __future__ import annotations

import difflib
import json
import re
import unicodedata
import urllib.request
from functools import lru_cache
from pathlib import Path

API = "https://raw.githubusercontent.com/fawazahmed0/quran-api/1/"
CACHE = Path(__file__).resolve().parent / ".cache"

# Same classes as plainArabic() in lib/hifz.ts.
MARKS = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")


def _get(name: str) -> dict:
    CACHE.mkdir(exist_ok=True)
    path = CACHE / name.replace("/", "_")
    if not path.exists():
        with urllib.request.urlopen(API + name, timeout=60) as r:
            path.write_bytes(r.read())
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def ayahs() -> dict[tuple[int, int], str]:
    """(surah, ayah) -> label text."""
    data = _get("editions/ara-quransimple.json")["quran"]
    return {(v["chapter"], v["verse"]): v["text"].strip() for v in data}


@lru_cache(maxsize=1)
def surah_names() -> dict[int, str]:
    return {c["chapter"]: c["name"] for c in _get("info.json")["chapters"]}


def plain(text: str) -> str:
    """Letters without marks, hamza seats and alef forms unified (plainArabic in lib/hifz.ts)."""
    t = unicodedata.normalize("NFC", text)
    t = MARKS.sub("", t)
    t = re.sub("[ٱأإآ]", "ا", t)
    t = t.replace("ؤ", "و")
    t = re.sub("[ئى]", "ي", t)
    t = t.replace("ة", "ه")
    t = re.sub(r"[^ء-ي\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def skeleton(text: str) -> str:
    return re.sub(r"[اء\s]", "", plain(text))


@lru_cache(maxsize=1)
def _by_skeleton() -> dict[str, list[tuple[int, int]]]:
    out: dict[str, list[tuple[int, int]]] = {}
    for key, text in ayahs().items():
        out.setdefault(skeleton(text), []).append(key)
    return out


def _name_key(name: str) -> str:
    n = re.sub(r"[^a-z]", "", name.lower())
    n = re.sub(r"^(al|an|ar|as|at|ash|ad|az)", "", n)
    return n.rstrip("h").replace("aa", "a").replace("ee", "i").replace("oo", "u")


def surah_by_name(name: str) -> int | None:
    """Surah number for a transliterated name such as 'Al-Faatihah' (spellings vary between datasets)."""
    if not name:
        return None
    if name.strip().isdigit():
        return int(name)
    key = _name_key(name)
    best, score = None, 0.0
    for num, n in surah_names().items():
        s = difflib.SequenceMatcher(None, key, _name_key(n)).ratio()
        if s > score:
            best, score = num, s
    return best if score >= 0.75 else None


def find_ayah(text: str, surah: int | None = None) -> tuple[int, int] | None:
    """The ayah whose text this is (any script), preferring the given surah; None if it isn't one ayah."""
    sk = skeleton(text)
    if not sk:
        return None
    hits = _by_skeleton().get(sk, [])
    if surah is not None:
        in_surah = [h for h in hits if h[0] == surah]
        if in_surah:
            return in_surah[0]
    if hits:
        return hits[0]
    # Small spelling differences between scripts: the closest ayah in the surah, if close enough.
    if surah is None:
        return None
    best, score = None, 0.0
    for (s, a), t in ayahs().items():
        if s != surah:
            continue
        r = difflib.SequenceMatcher(None, sk, skeleton(t)).ratio()
        if r > score:
            best, score = (s, a), r
    return best if score >= 0.9 else None
