"""Builds the offline Quran recitation checker model for the web and Android apps.

Tarteel's Whisper model fine-tuned on Quran recitation (tarteel-ai/whisper-base-ar-quran,
Apache-2.0) is exported to ONNX with Optimum and quantised to 8 bits, in the folder layout
Transformers.js reads:

  <out>/config.json, generation_config.json, preprocessor_config.json,
        tokenizer.json, tokenizer_config.json, special_tokens_map.json
  <out>/onnx/encoder_model_quantized.onnx, onnx/decoder_model_merged_quantized.onnx

Usage (CI, .github/workflows/asr-model.yml): python scripts/build-asr-model.py <out>
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

MODEL = "tarteel-ai/whisper-base-ar-quran"
KEEP = [
    "config.json",
    "generation_config.json",
    "preprocessor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "added_tokens.json",
    "normalizer.json",
    "vocab.json",
    "merges.txt",
]


def main(out: Path) -> None:
    work = Path("asr-export")
    if work.exists():
        shutil.rmtree(work)
    subprocess.run(
        [
            "optimum-cli", "export", "onnx",
            "--model", MODEL,
            "--task", "automatic-speech-recognition-with-past",
            "--opset", "17",
            str(work),
        ],
        check=True,
    )

    # Make sure a fast tokenizer.json exists (Transformers.js needs it).
    if not (work / "tokenizer.json").exists():
        from transformers import AutoTokenizer

        AutoTokenizer.from_pretrained(MODEL).save_pretrained(work)

    from onnxruntime.quantization import QuantType, quantize_dynamic

    onnx_dir = out / "onnx"
    onnx_dir.mkdir(parents=True, exist_ok=True)
    for name in ["encoder_model", "decoder_model_merged"]:
        src = work / f"{name}.onnx"
        quantize_dynamic(
            str(src),
            str(onnx_dir / f"{name}_quantized.onnx"),
            weight_type=QuantType.QUInt8,
            # Quantising the convolutions of Whisper's audio encoder hurts accuracy badly.
            op_types_to_quantize=["MatMul", "Gemm", "Gather"],
            extra_options={"EnableSubgraph": True},
        )

    for f in KEEP:
        if (work / f).exists():
            shutil.copy(work / f, out / f)

    # Transformers.js builds the decoder's start tokens (<|startoftranscript|> <|ar|> <|transcribe|>
    # <|notimestamps|>) from these fields, which older fine-tuned configs leave out.
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(str(work))
    tid = tok.convert_tokens_to_ids
    gen = json.loads((out / "generation_config.json").read_text())
    gen["is_multilingual"] = True
    gen["lang_to_id"] = {**gen.get("lang_to_id", {}), "<|ar|>": tid("<|ar|>")}
    gen["task_to_id"] = {"transcribe": tid("<|transcribe|>"), "translate": tid("<|translate|>")}
    gen["no_timestamps_token_id"] = tid("<|notimestamps|>")
    gen["decoder_start_token_id"] = tid("<|startoftranscript|>")
    gen.pop("forced_decoder_ids", None)
    (out / "generation_config.json").write_text(json.dumps(gen, indent=2))
    print(json.dumps(gen, indent=2))

    files = sorted(str(p.relative_to(out)) for p in out.rglob("*") if p.is_file())
    sizes = {f: (out / f).stat().st_size for f in files}
    (out / "files.json").write_text(json.dumps(sizes, indent=2))
    print(json.dumps(sizes, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "quran-asr"))
