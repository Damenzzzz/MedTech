"""Measure whether the expected ICD code reaches the final RAG context."""

import argparse
import json
from pathlib import Path
from time import perf_counter

import httpx


def save_report(path: Path, results: list[dict]) -> dict:
    summary = {
        "total": len(results),
        "retrieved": sum(item["retrieved"] for item in results),
        "recall": round(sum(item["retrieved"] for item in results) / len(results), 4) if results else 0.0,
        "protocol_retrieved": sum(item["protocol_retrieved"] for item in results),
        "protocol_recall": round(
            sum(item["protocol_retrieved"] for item in results) / len(results), 4
        ) if results else 0.0,
        "results": results,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate retrieval recall on golden cases")
    parser.add_argument("--endpoint", default="http://127.0.0.1:8080/api/retrieve")
    parser.add_argument("--test-set", type=Path, default=Path("data/test_set"))
    parser.add_argument("--output", type=Path, default=Path("data/evals/retrieval_golden_20.json"))
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=300.0)
    args = parser.parse_args()

    results = []
    with httpx.Client(timeout=args.timeout) as client:
        for path in sorted(args.test_set.glob("*.json"))[: args.limit or None]:
            case = json.loads(path.read_text(encoding="utf-8"))
            expected = str(case.get("gt") or "").strip().upper()
            expected_protocol_id = str(case.get("protocol_id") or "").strip()
            started = perf_counter()
            response = client.post(args.endpoint, json={"symptoms": case.get("query", "")})
            response.raise_for_status()
            payload = response.json()
            chunks = payload.get("chunks", [])
            code_sets = [
                {str(code).strip().upper() for code in chunk.get("icd_codes", [])}
                for chunk in chunks
            ]
            code_ranks = [index + 1 for index, codes in enumerate(code_sets) if expected in codes]
            protocol_ranks = [
                index + 1
                for index, chunk in enumerate(chunks)
                if expected_protocol_id and chunk.get("protocol_id") == expected_protocol_id
            ]
            item = {
                "file": path.name,
                "expected": expected,
                "expected_protocol_id": expected_protocol_id,
                "retrieved": bool(code_ranks),
                "first_chunk_rank": code_ranks[0] if code_ranks else None,
                "protocol_retrieved": bool(protocol_ranks),
                "first_protocol_rank": protocol_ranks[0] if protocol_ranks else None,
                "analysis": payload.get("analysis", {}),
                "chunks": [
                    {
                        "protocol_id": chunk.get("protocol_id", ""),
                        "protocol_title": chunk.get("protocol_title", ""),
                        "section_type": chunk.get("section_type", ""),
                        "icd_codes": sorted(code_sets[index]),
                    }
                    for index, chunk in enumerate(chunks)
                ],
                "latency_seconds": round(perf_counter() - started, 3),
            }
            results.append(item)
            save_report(args.output, results)
            print(
                f"{path.name}: expected={expected} retrieved={item['retrieved']} "
                f"rank={item['first_chunk_rank']} protocol={item['protocol_retrieved']} "
                f"latency={item['latency_seconds']}s",
                flush=True,
            )

    summary = save_report(args.output, results)
    print(
        f"SUMMARY code={summary['retrieved']}/{summary['total']} recall={summary['recall']} "
        f"protocol={summary['protocol_retrieved']}/{summary['total']} "
        f"protocol_recall={summary['protocol_recall']}"
    )


if __name__ == "__main__":
    main()
