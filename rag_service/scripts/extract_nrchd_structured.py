from __future__ import annotations

import argparse
import csv
import json
import re
import time
from pathlib import Path
from typing import Any


def safe_name(value: str) -> str:
    value = Path(value).stem
    value = re.sub(r"[^A-Za-zА-Яа-яЁё0-9_.-]+", "_", value)
    return value.strip("._") or "protocol"


def load_index(index_csv: Path) -> dict[str, dict[str, str]]:
    if not index_csv.exists():
        return {}
    with index_csv.open(encoding="utf-8") as f:
        return {
            Path(row.get("local_file", "")).name: row
            for row in csv.DictReader(f)
            if row.get("local_file")
        }


def compact_whitespace(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def dataframe_to_rows(df: Any) -> list[dict[str, str]]:
    try:
        records = df.fillna("").astype(str).to_dict(orient="records")
        return [{str(k): str(v) for k, v in row.items()} for row in records]
    except Exception:
        return []


def extract_docling_tables(document: Any) -> list[dict[str, Any]]:
    tables: list[dict[str, Any]] = []
    for index, table in enumerate(getattr(document, "tables", []) or [], start=1):
        item: dict[str, Any] = {"index": index}
        try:
            try:
                df = table.export_to_dataframe(doc=document)
            except TypeError:
                df = table.export_to_dataframe()
            item["rows"] = dataframe_to_rows(df)
            item["columns"] = [str(col) for col in getattr(df, "columns", [])]
        except Exception as exc:
            item["dataframe_error"] = str(exc)
        try:
            try:
                item["markdown"] = table.export_to_markdown(doc=document)
            except TypeError:
                item["markdown"] = table.export_to_markdown()
        except Exception:
            pass
        try:
            prov = getattr(table, "prov", None) or []
            pages = sorted({
                int(getattr(p, "page_no"))
                for p in prov
                if getattr(p, "page_no", None) is not None
            })
            if pages:
                item["pages"] = pages
        except Exception:
            pass
        tables.append(item)
    return tables


def extract_with_docling(pdf: Path, converter: Any) -> dict[str, Any]:
    result = converter.convert(str(pdf))
    document = result.document
    try:
        markdown = document.export_to_markdown()
    except Exception:
        markdown = ""
    try:
        document_json = document.export_to_dict()
    except Exception:
        document_json = None
    tables = extract_docling_tables(document)
    return {
        "method": "docling",
        "markdown": compact_whitespace(markdown),
        "text": compact_whitespace(markdown),
        "tables": tables,
        "document": document_json,
    }


def extract_with_pdfplumber(pdf: Path) -> dict[str, Any]:
    import pdfplumber

    pages: list[str] = []
    tables: list[dict[str, Any]] = []
    with pdfplumber.open(str(pdf)) as doc:
        for page_index, page in enumerate(doc.pages, start=1):
            pages.append(page.extract_text(layout=True) or page.extract_text() or "")
            for table_index, table in enumerate(page.extract_tables() or [], start=1):
                if not table:
                    continue
                header = [str(cell or "").strip() for cell in table[0]]
                body = table[1:] if len(table) > 1 else []
                rows = []
                for raw_row in body:
                    row = [str(cell or "").strip() for cell in raw_row]
                    if header and len(header) == len(row):
                        rows.append(dict(zip(header, row)))
                    else:
                        rows.append({str(i): value for i, value in enumerate(row)})
                tables.append(
                    {
                        "index": len(tables) + 1,
                        "page": page_index,
                        "page_table_index": table_index,
                        "columns": header,
                        "rows": rows,
                    }
                )
    text = compact_whitespace("\n\n".join(pages))
    return {
        "method": "pdfplumber",
        "markdown": text,
        "text": text,
        "tables": tables,
        "document": None,
    }


def write_outputs(pdf: Path, output_dir: Path, payload: dict[str, Any]) -> Path:
    stem = safe_name(pdf.name)
    json_dir = output_dir / "json"
    markdown_dir = output_dir / "markdown"
    table_dir = output_dir / "tables"
    docling_dir = output_dir / "docling"
    for directory in (json_dir, markdown_dir, table_dir, docling_dir):
        directory.mkdir(parents=True, exist_ok=True)

    (markdown_dir / f"{stem}.md").write_text(payload.get("markdown", ""), encoding="utf-8")
    (table_dir / f"{stem}.tables.json").write_text(
        json.dumps(payload.get("tables", []), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if payload.get("document") is not None:
        (docling_dir / f"{stem}.docling.json").write_text(
            json.dumps(payload["document"], ensure_ascii=False),
            encoding="utf-8",
        )

    summary = {
        key: value
        for key, value in payload.items()
        if key not in {"document"}
    }
    summary["markdown_file"] = str(markdown_dir / f"{stem}.md")
    summary["tables_file"] = str(table_dir / f"{stem}.tables.json")
    if payload.get("document") is not None:
        summary["docling_file"] = str(docling_dir / f"{stem}.docling.json")
    summary_path = json_dir / f"{stem}.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary_path


def write_failure(pdf: Path, output_dir: Path, error: str) -> Path:
    failure_dir = output_dir / "failed"
    failure_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "source_file": pdf.name,
        "method": "failed",
        "error": error,
    }
    failure_path = failure_dir / f"{safe_name(pdf.name)}.failed.json"
    failure_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return failure_path


def build_converter() -> Any:
    from docling.document_converter import DocumentConverter

    return DocumentConverter()


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract NRCHD PDF protocols with table-aware tooling.")
    parser.add_argument("--nrchd", type=Path, default=Path("data/kz_clinical_protocols/nrchd_official"))
    parser.add_argument("--output", type=Path, default=Path("data/kz_clinical_protocols/nrchd_official/extracted_docling"))
    parser.add_argument("--method", choices=["auto", "docling", "pdfplumber"], default="auto")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--start", type=int, default=0, help="Skip this many sorted PDFs before processing.")
    args = parser.parse_args()

    pdf_dir = args.nrchd / "pdf"
    index = load_index(args.nrchd / "nrchd_protocols_index.csv")
    pdfs = sorted(pdf_dir.glob("*.pdf"))[args.start :]
    if args.limit is not None:
        pdfs = pdfs[: args.limit]

    converter = None
    if args.method in {"auto", "docling"}:
        try:
            converter = build_converter()
        except Exception as exc:
            if args.method == "docling":
                raise
            print(f"Docling unavailable, using pdfplumber fallback: {exc}")

    done = 0
    failed = 0
    manifest_path = args.output / "manifest.jsonl"
    args.output.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("a", encoding="utf-8") as manifest:
        for pdf in pdfs:
            stem = safe_name(pdf.name)
            summary_path = args.output / "json" / f"{stem}.json"
            failure_path = args.output / "failed" / f"{stem}.failed.json"
            if summary_path.exists() and not args.force:
                continue
            if failure_path.exists() and not args.force:
                continue
            started = time.perf_counter()
            meta = index.get(pdf.name, {})
            try:
                if converter is not None:
                    payload = extract_with_docling(pdf, converter)
                else:
                    payload = extract_with_pdfplumber(pdf)
            except Exception as exc:
                if args.method == "docling":
                    failed += 1
                    print(f"failed {pdf.name}: {exc}")
                    continue
                try:
                    payload = extract_with_pdfplumber(pdf)
                    payload["fallback_error"] = str(exc)
                except Exception as fallback_exc:
                    failed += 1
                    error = f"{exc}; fallback failed: {fallback_exc}"
                    failure = write_failure(pdf, args.output, error)
                    manifest.write(json.dumps({"source_file": pdf.name, "failed": str(failure), "error": error}, ensure_ascii=False) + "\n")
                    manifest.flush()
                    print(f"failed {pdf.name}: {error}")
                    continue

            payload["source_file"] = pdf.name
            payload["title"] = meta.get("name") or pdf.stem
            payload["metadata"] = {
                "year": meta.get("year"),
                "medicine": meta.get("medicine"),
                "url": meta.get("url"),
            }
            payload["stats"] = {
                "seconds": round(time.perf_counter() - started, 3),
                "text_chars": len(payload.get("text", "")),
                "markdown_chars": len(payload.get("markdown", "")),
                "tables": len(payload.get("tables", [])),
            }
            out = write_outputs(pdf, args.output, payload)
            manifest.write(json.dumps({"source_file": pdf.name, "summary": str(out), **payload["stats"]}, ensure_ascii=False) + "\n")
            manifest.flush()
            done += 1
            print(
                f"{done:04d} {payload['method']} tables={payload['stats']['tables']} "
                f"chars={payload['stats']['markdown_chars']} {pdf.name}"
            )

    print(f"done={done} failed={failed} output={args.output}")


if __name__ == "__main__":
    main()
