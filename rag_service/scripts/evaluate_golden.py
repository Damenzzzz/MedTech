"""Evaluate the running diagnosis endpoint against local golden cases."""

import argparse
import asyncio
import json
from pathlib import Path
from time import perf_counter

import httpx


def normalize_code(value: str) -> str:
    return str(value or "").strip().upper()


async def evaluate_case(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    endpoint: str,
    path: Path,
) -> dict:
    case = json.loads(path.read_text(encoding="utf-8"))
    expected = normalize_code(case.get("gt"))
    error = ""
    predictions: list[str] = []
    try:
        async with semaphore:
            started = perf_counter()
            response = await client.post(endpoint, json={"symptoms": case.get("query", "")})
        response.raise_for_status()
        predictions = [
            normalize_code(item.get("icd10_code"))
            for item in response.json().get("diagnoses", [])
        ]
    except Exception as exc:
        error = type(exc).__name__

    result = {
        "file": path.name,
        "expected": expected,
        "predictions": predictions,
        "top1": bool(predictions) and predictions[0] == expected,
        "top3": expected in predictions[:3],
        "any_rank": expected in predictions,
        "latency_seconds": round(perf_counter() - started, 3) if 'started' in locals() else 0.0,
        "error": error,
    }
    print(
        f"{path.name}: expected={expected} "
        f"top1={predictions[0] if predictions else 'NONE'} "
        f"match={result['top1']} latency={result['latency_seconds']}s",
        flush=True,
    )
    return result


def build_summary(endpoint: str, results: list[dict]) -> dict:
    results = sorted(results, key=lambda item: item["file"])
    total = len(results)
    return {
        "endpoint": endpoint,
        "total": total,
        "top1_correct": sum(item["top1"] for item in results),
        "top3_correct": sum(item["top3"] for item in results),
        "any_rank_correct": sum(item["any_rank"] for item in results),
        "non_empty": sum(bool(item["predictions"]) for item in results),
        "errors": sum(bool(item["error"]) for item in results),
        "mean_latency_seconds": round(
            sum(item["latency_seconds"] for item in results) / total, 3
        ) if total else 0.0,
        "results": results,
    }


def save_summary(path: Path, summary: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


async def run(args: argparse.Namespace) -> dict:
    paths = sorted(args.test_set.glob("*.json"))[: args.limit or None]
    semaphore = asyncio.Semaphore(args.concurrency)
    timeout = httpx.Timeout(args.timeout)
    async with httpx.AsyncClient(timeout=timeout) as client:
        tasks = [
            asyncio.create_task(evaluate_case(client, semaphore, args.endpoint, path))
            for path in paths
        ]
        results = []
        for task in asyncio.as_completed(tasks):
            results.append(await task)
            save_summary(args.output, build_summary(args.endpoint, results))

    return build_summary(args.endpoint, results)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate RAG on golden diagnosis cases")
    parser.add_argument("--endpoint", default="http://127.0.0.1:8080/diagnose")
    parser.add_argument("--test-set", type=Path, default=Path("data/test_set"))
    parser.add_argument("--output", type=Path, default=Path("data/evals/askhat_golden.json"))
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--concurrency", type=int, default=1)
    parser.add_argument("--timeout", type=float, default=300.0)
    args = parser.parse_args()

    summary = asyncio.run(run(args))
    save_summary(args.output, summary)
    print(
        f"SUMMARY total={summary['total']} top1={summary['top1_correct']} "
        f"top3={summary['top3_correct']} non_empty={summary['non_empty']} "
        f"errors={summary['errors']} mean_latency={summary['mean_latency_seconds']}s",
        flush=True,
    )


if __name__ == "__main__":
    main()
