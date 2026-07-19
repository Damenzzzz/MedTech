from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader


def normalize_key(value: str) -> str:
    value = value.lower().replace("ё", "е")
    value = re.sub(r"[^a-zа-я0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def canonical_protocol_key(value: str) -> str:
    """Normalize protocol filenames across Qazcode and NRCHD mirrors.

    Examples:
      HELLP-СИНДРОМ.pdf
      2025_HELLP_СИНДРОМ_b63c50b09e.pdf
    should collapse to the same key, otherwise retrieval sees duplicates.
    """
    value = str(value or "")
    value = re.sub(r"\.pdf$", "", value, flags=re.IGNORECASE)
    value = re.sub(r"^[12][0-9]{3}[_\s-]+", "", value)
    value = re.sub(r"[_\s-]+[a-f0-9]{10,12}$", "", value, flags=re.IGNORECASE)
    return normalize_key(value)


def stable_id(*parts: str) -> str:
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:12]
    return f"nrchd_{digest}"


def row_canonical_key(row: dict) -> str:
    return canonical_protocol_key(row.get("source_file") or row.get("title") or "")


def read_existing_jsonl(path: Path) -> tuple[list[dict], set[str]]:
    rows: list[dict] = []
    keys: set[str] = set()
    if not path.exists():
        return rows, keys
    with path.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            rows.append(row)
            title = row.get("title") or row.get("source_file") or ""
            codes = ",".join(row.get("icd_codes") or [])
            keys.add(normalize_key(f"{title} {codes}"))
            keys.add(normalize_key(row.get("source_file", "")))
            canonical = row_canonical_key(row)
            if canonical:
                keys.add(canonical)
    return rows, keys


def load_nrchd_index(index_csv: Path) -> dict[str, dict]:
    if not index_csv.exists():
        return {}
    by_file: dict[str, dict] = {}
    with index_csv.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            local_file = row.get("local_file", "")
            if local_file:
                by_file[Path(local_file).name] = row
    return by_file


def extract_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return re.sub(r"\s+", " ", "\n".join(pages)).strip()


def load_structured_extraction(structured_dir: Path, pdf: Path) -> dict | None:
    summary_path = structured_dir / "json" / f"{pdf.stem}.json"
    if not summary_path.exists():
        return None
    with summary_path.open(encoding="utf-8") as f:
        data = json.load(f)
    markdown = data.get("markdown") or data.get("text") or ""
    if len(markdown.strip()) < 500:
        return None
    return data


def should_replace(existing: dict | None, candidate: dict) -> bool:
    """Prefer structured/current NRCHD rows over older flat-text duplicates."""
    if existing is None:
        return True
    existing_meta = existing.get("metadata") or {}
    candidate_meta = candidate.get("metadata") or {}
    existing_method = existing_meta.get("extraction_method", "")
    candidate_method = candidate_meta.get("extraction_method", "")
    if candidate_method in {"docling", "pdfplumber"} and existing_method not in {"docling", "pdfplumber"}:
        return True
    if candidate_method == "docling" and existing_method != "docling":
        return True
    if candidate_meta.get("year") and not existing_meta.get("year"):
        return True
    return len(candidate.get("text", "")) > len(existing.get("text", "")) * 1.2


def split_icd_codes(value: str) -> list[str]:
    if not value:
        return []
    found = re.findall(r"\b[A-Z]\d{2}(?:\.\d+)?(?:-[A-Z]?\d{2}(?:\.\d+)?)?\b", value.upper())
    if found:
        return list(dict.fromkeys(found))
    return [value.strip()] if value.strip() else []


def merge(
    base_jsonl: Path,
    nrchd_dir: Path,
    output_jsonl: Path,
    limit: int | None = None,
    structured_dir: Path | None = None,
) -> None:
    rows, seen_keys = read_existing_jsonl(base_jsonl)
    rows_by_key: dict[str, dict] = {}
    ordered_keys: list[str] = []
    for row in rows:
        canonical = row_canonical_key(row)
        if not canonical:
            continue
        if canonical not in rows_by_key:
            ordered_keys.append(canonical)
            rows_by_key[canonical] = row
        elif should_replace(rows_by_key[canonical], row):
            rows_by_key[canonical] = row
    index = load_nrchd_index(nrchd_dir / "nrchd_protocols_index.csv")
    pdf_dir = nrchd_dir / "pdf"
    pdfs = sorted(pdf_dir.glob("*.pdf"))
    added = 0
    replaced = 0
    skipped = 0
    processed = 0

    for pdf in pdfs:
        if limit is not None and added >= limit:
            break
        meta = index.get(pdf.name, {})
        title = meta.get("name") or pdf.stem
        icd_codes = split_icd_codes(meta.get("mkb", ""))
        key = normalize_key(f"{title} {','.join(icd_codes)}")
        file_key = normalize_key(pdf.name)
        canonical_key = canonical_protocol_key(pdf.name)
        if limit is not None and added >= limit:
            break
        if (key in seen_keys or file_key in seen_keys or canonical_key in seen_keys) and canonical_key not in rows_by_key:
            skipped += 1
            continue
        structured = load_structured_extraction(structured_dir, pdf) if structured_dir else None
        if structured:
            text = structured.get("markdown") or structured.get("text") or ""
            extraction_method = structured.get("method", "structured")
            tables_file = structured.get("tables_file")
            table_count = len(structured.get("tables", []))
        else:
            try:
                text = extract_pdf_text(pdf)
            except Exception as exc:
                print(f"skip unreadable PDF {pdf.name}: {exc}")
                skipped += 1
                continue
            extraction_method = "pypdf"
            tables_file = None
            table_count = 0
        if len(text) < 500:
            skipped += 1
            continue
        processed += 1
        candidate = {
            "protocol_id": stable_id(pdf.name, title),
            "source_file": pdf.name,
            "title": title,
            "icd_codes": icd_codes,
            "text": text,
            "metadata": {
                "source": "nrchd_official",
                "year": meta.get("year"),
                "medicine": meta.get("medicine"),
                "url": meta.get("url"),
                "extraction_method": extraction_method,
                "tables_file": tables_file,
                "table_count": table_count,
                "dedupe_key": canonical_key,
            },
        }
        if should_replace(rows_by_key.get(canonical_key), candidate):
            if canonical_key not in rows_by_key:
                ordered_keys.append(canonical_key)
                added += 1
            else:
                replaced += 1
            rows_by_key[canonical_key] = candidate
        else:
            skipped += 1
            continue
        seen_keys.add(key)
        seen_keys.add(file_key)
        seen_keys.add(canonical_key)
        if processed % 50 == 0:
            print(f"processed PDFs: added={added} replaced={replaced} skipped={skipped}")

    output_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with output_jsonl.open("w", encoding="utf-8") as f:
        for key in ordered_keys:
            row = rows_by_key.get(key)
            if not row:
                continue
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(
        f"base_rows={len(rows)} final_rows={len(rows_by_key)} "
        f"added={added} replaced={replaced} skipped={skipped} output={output_jsonl}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge Qazcode JSONL corpus with NRCHD official PDF protocols.")
    parser.add_argument("--base", type=Path, default=Path("data/corpus/corpus/protocols_corpus.jsonl"))
    parser.add_argument("--nrchd", type=Path, default=Path("data/kz_clinical_protocols/nrchd_official"))
    parser.add_argument("--output", type=Path, default=Path("data/corpus/merged_protocols.jsonl"))
    parser.add_argument("--limit", type=int, default=None, help="Optional PDF limit for quick testing.")
    parser.add_argument(
        "--structured-dir",
        type=Path,
        default=Path("data/kz_clinical_protocols/nrchd_official/extracted_docling"),
        help="Use pre-extracted Docling/pdfplumber Markdown and tables when available.",
    )
    args = parser.parse_args()
    merge(args.base, args.nrchd, args.output, args.limit, args.structured_dir)


if __name__ == "__main__":
    main()
