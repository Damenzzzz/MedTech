"""Audit whether golden ICD labels are primary codes of their source protocols."""

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from askhat_rag.data_loader import load_all_protocols


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit golden-label grounding")
    parser.add_argument("--corpus", default="data/corpus/merged_protocols.jsonl")
    parser.add_argument("--test-set", type=Path, default=Path("data/test_set"))
    parser.add_argument("--output", type=Path, default=Path("data/evals/golden_quality.json"))
    args = parser.parse_args()

    protocols = load_all_protocols(args.corpus)
    cases = sorted(args.test_set.glob("*.json"))
    issues = []
    primary_available = 0
    primary_matches = 0
    metadata_matches = 0
    text_matches = 0
    missing_protocols = 0

    for path in cases:
        case = json.loads(path.read_text(encoding="utf-8"))
        protocol_id = str(case.get("protocol_id") or "")
        expected = str(case.get("gt") or "").strip().upper()
        protocol = protocols.get(protocol_id)
        if protocol is None:
            missing_protocols += 1
            issues.append({
                "file": path.name,
                "protocol_id": protocol_id,
                "expected": expected,
                "issue": "source_protocol_missing",
            })
            continue

        primary_codes = list(protocol.icd_labels)
        if primary_codes:
            primary_available += 1
            if expected in primary_codes:
                primary_matches += 1
            else:
                issues.append({
                    "file": path.name,
                    "protocol_id": protocol_id,
                    "protocol_title": protocol.title,
                    "expected": expected,
                    "primary_codes": primary_codes,
                    "issue": "expected_not_in_primary_icd_table",
                })

        metadata_matches += expected in protocol.icd_codes
        text_matches += expected in protocol.all_icd_codes

    report = {
        "total_cases": len(cases),
        "source_protocols_found": len(cases) - missing_protocols,
        "primary_icd_table_available": primary_available,
        "expected_in_primary_icd_table": primary_matches,
        "primary_match_rate_when_available": round(
            primary_matches / primary_available, 4
        ) if primary_available else 0.0,
        "expected_in_protocol_metadata": metadata_matches,
        "expected_mentioned_anywhere_in_text": text_matches,
        "needs_review": len(issues),
        "issues": issues,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({key: value for key, value in report.items() if key != "issues"}, indent=2))


if __name__ == "__main__":
    main()
