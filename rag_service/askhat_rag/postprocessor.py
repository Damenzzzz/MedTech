"""
Post-processing: JSON parsing, ICD-10 code validation and correction.
"""

import json
import os
import re

# Populated at startup by server.py
ALL_VALID_ICD_CODES: set[str] = set()


def _normalize_text(value: str) -> str:
    value = str(value or "").lower().replace("ё", "е")
    value = re.sub(r"[^a-zа-я0-9./]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _content_tokens(value: str) -> set[str]:
    stop = {
        "есть", "нет", "или", "при", "для", "это", "что", "как", "также",
        "пациент", "пациентка", "имеет", "наличие", "отмечается", "данные",
    }
    return {
        token for token in _normalize_text(value).split()
        if len(token) > 2 and token not in stop
    }


def _is_evidence_grounded(patient_text: str, evidence: str) -> bool:
    """Return True only when evidence is visibly supported by patient input."""
    normalized_patient = _normalize_text(patient_text)
    normalized_evidence = _normalize_text(evidence)
    if not normalized_evidence:
        return False
    if normalized_evidence in normalized_patient:
        return True
    evidence_tokens = _content_tokens(normalized_evidence)
    if not evidence_tokens:
        return False
    patient_tokens = _content_tokens(normalized_patient)
    overlap = evidence_tokens & patient_tokens
    # Keep short exact numeric/lab snippets and longer paraphrases with strong overlap.
    return len(overlap) >= min(2, len(evidence_tokens)) and len(overlap) / len(evidence_tokens) >= 0.55


def _finding_text(item) -> str:
    if isinstance(item, dict):
        return str(item.get("finding") or item.get("text") or item.get("name") or "").strip()
    return str(item or "").strip()


def _finding_evidence(item) -> str:
    if isinstance(item, dict):
        return str(
            item.get("patient_evidence")
            or item.get("evidence")
            or item.get("quote")
            or ""
        ).strip()
    return str(item or "").strip()


def _patient_fact_candidates(patient_text: str) -> list[dict]:
    clauses = re.split(r"[.;\n]|,\s+", patient_text)
    facts = []
    seen = set()
    for clause in clauses:
        fact = re.sub(r"\s+", " ", clause).strip(" -–—")
        if len(fact) < 4:
            continue
        key = _normalize_text(fact)
        if key in seen:
            continue
        seen.add(key)
        facts.append({
            "finding": fact,
            "present": True,
            "status": "present",
            "patient_evidence": fact,
            "protocol_source": None,
        })
    return facts[:8]


def _prioritize_supported_facts(code: str, supported: list[dict]) -> list[dict]:
    if not supported:
        return supported
    keyword_order: list[str]
    if code == "O14.2":
        keyword_order = [
            "алт", "аст", "трансаминаз", "тромбоцит", "правом подребер",
            "печен", "170/110", "ад", "голов", "зрен", "отек", "беремен",
        ]
    elif code.startswith("O14"):
        keyword_order = [
            "170/110", "ад", "голов", "зрен", "правом подребер",
            "алт", "аст", "трансаминаз", "тромбоцит", "отек", "беремен",
        ]
    else:
        return supported

    def score(item: dict) -> tuple[int, int]:
        text = _normalize_text(f"{item.get('finding', '')} {item.get('patient_evidence', '')}")
        for index, keyword in enumerate(keyword_order):
            if keyword in text:
                return (index, 0)
        return (len(keyword_order), 0)

    return sorted(supported, key=score)


def _add_required_unknowns(code: str, patient_text: str, missing: list[str]) -> list[str]:
    normalized_patient = _normalize_text(patient_text)

    def add_if_absent(term: str, note: str) -> None:
        if term not in normalized_patient and not any(term in _normalize_text(item) for item in missing):
            missing.append(note)

    if code in {"O14", "O14.0", "O14.1", "O14.2", "O14.9"}:
        add_if_absent("протеинур", "Протеинурия не указана пациентом/в данных, требуется анализ мочи или суточная протеинурия.")
        add_if_absent("креатинин", "Креатинин не указан, требуется оценка функции почек.")
    if code == "O14.2":
        add_if_absent("гемолиз", "Гемолиз не подтвержден, нужны ЛДГ, билирубин, мазок крови/шистоциты.")
    return missing


def _short_why(diagnosis: dict, supported: list[dict], missing: list[str]) -> str:
    existing = str(diagnosis.get("why_this_diagnosis") or "").strip()
    if existing:
        return existing[:420]
    name = diagnosis.get("diagnosis") or "Этот вариант"
    facts = [item["finding"] for item in supported[:3]]
    if facts:
        why = f"{name} рассматривается, потому что совпадают ключевые факты: {', '.join(facts)}."
    else:
        why = f"{name} остается в дифференциальном ряду по найденному протоколу."
    if missing:
        why += f" Нужно уточнить: {missing[0]}"
    return why[:420]


def ground_diagnoses_to_patient(
    diagnoses: list[dict],
    patient_text: str,
    max_diagnoses: int = 4,
) -> list[dict]:
    """Enforce faithfulness: protocol criteria cannot become patient facts."""
    grounded: list[dict] = []
    selected_codes: list[str] = []

    for diagnosis in diagnoses:
        code = str(diagnosis.get("icd10_code", "")).strip().upper()
        if not code:
            continue
        # Drop broad duplicates such as O14 when O14.1/O14.2 is already present.
        if any(existing.startswith(f"{code}.") for existing in selected_codes):
            continue
        if any(code.startswith(f"{existing}.") for existing in selected_codes):
            grounded = [
                item for item in grounded
                if not code.startswith(f"{item.get('icd10_code', '')}.")
            ]
            selected_codes = [
                existing for existing in selected_codes
                if not code.startswith(f"{existing}.")
            ]

        missing = list(diagnosis.get("missing_findings") or [])
        supported = []
        rejected = []
        for item in diagnosis.get("supporting_findings") or []:
            finding = _finding_text(item)
            evidence = _finding_evidence(item)
            if not finding:
                continue
            if _is_evidence_grounded(patient_text, evidence):
                supported.append({
                    "finding": finding,
                    "present": True,
                    "status": "present",
                    "patient_evidence": evidence,
                    "protocol_source": item.get("protocol_source") if isinstance(item, dict) else None,
                })
            else:
                rejected.append(finding)

        for finding in rejected:
            note = f"Не указано пациентом, требует уточнения: {finding}"
            if note not in missing:
                missing.append(note)
        missing = _add_required_unknowns(code, patient_text, missing)
        if not supported:
            supported = _patient_fact_candidates(patient_text)
        supported = _prioritize_supported_facts(code, supported)

        protocol_criteria = diagnosis.get("protocol_criteria") or []
        recommended_checks = diagnosis.get("recommended_checks") or []
        supported_facts = [
            f"{item['finding']} ({item['patient_evidence']})" for item in supported
        ]
        explanation_parts = []
        if supported_facts:
            explanation_parts.append("Факты пациента: " + "; ".join(supported_facts[:5]) + ".")
        if missing:
            explanation_parts.append("Неизвестные критерии из протокола: " + "; ".join(map(str, missing[:5])) + ".")
        if protocol_criteria:
            explanation_parts.append("Сопоставлено с критериями протокола: " + "; ".join(map(str, protocol_criteria[:4])) + ".")

        item = dict(diagnosis)
        item["supporting_findings"] = supported
        item["missing_findings"] = missing[:8]
        item["protocol_criteria"] = protocol_criteria[:8]
        item["recommended_checks"] = recommended_checks[:8]
        item["why_this_diagnosis"] = _short_why(item, supported, item["missing_findings"])
        if explanation_parts:
            item["explanation"] = " ".join(explanation_parts)
        grounded.append(item)
        selected_codes.append(code)
        if len(grounded) >= max_diagnoses:
            break

    return _rerank_obstetric_hypertension(grounded, patient_text)


def _rerank_obstetric_hypertension(diagnoses: list[dict], patient_text: str) -> list[dict]:
    codes = {item.get("icd10_code") for item in diagnoses}
    normalized_patient = _normalize_text(patient_text)
    if "O14.1" not in codes or "O14.2" not in codes:
        return diagnoses
    hemolysis_known = any(term in normalized_patient for term in ("гемолиз", "лдг", "билирубин", "шистоцит"))

    def sort_key(item: dict) -> tuple[int, int]:
        code = item.get("icd10_code")
        if code == "O14.2" and hemolysis_known:
            item["confidence"] = "high"
            return (0, 0)
        if code == "O14.1":
            return (1 if hemolysis_known else 0, 0)
        if code == "O14.2" and not hemolysis_known:
            item["confidence"] = "medium"
            if not any("Гемолиз" in str(value) for value in item.get("missing_findings", [])):
                item.setdefault("missing_findings", []).append(
                    "Гемолиз не подтвержден, HELLP-синдром требует исключения."
                )
            return (1, 0)
        if code == "O13":
            item["confidence"] = "low"
            note = "Менее вероятно: наличие признаков тяжелой преэклампсии/HELLP делает изолированную гестационную гипертензию слабым дифференциальным вариантом."
            if not any("гестационную гипертензию" in _normalize_text(value) for value in item.get("missing_findings", [])):
                item.setdefault("missing_findings", []).append(note)
            return (2, 0)
        return (3, 0)

    return sorted(diagnoses, key=sort_key)


def parse_diagnosis_json(raw_text: str) -> list[dict]:
    """Parse LLM output, handling common failure modes."""
    # Strip markdown code blocks if present
    text = re.sub(r'```json\s*', '', raw_text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "diagnoses" in parsed:
            return parsed["diagnoses"]
        elif isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Try to extract JSON object from the text
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, dict) and "diagnoses" in parsed:
                return parsed["diagnoses"]
        except Exception:
            pass

    # Try to extract JSON array
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass

    # Last-resort recovery for truncated/malformed model JSON.
    recovered = []
    object_matches = re.finditer(r'\{[^{}]*"diagnosis"\s*:\s*"([^"]+)"[^{}]*"icd10_code"\s*:\s*"([^"]+)"[^{}]*\}', text, re.DOTALL)
    for match in object_matches:
        obj_text = match.group(0)
        item = {
            "diagnosis": match.group(1),
            "icd10_code": match.group(2),
        }
        for field in ("confidence", "explanation"):
            field_match = re.search(rf'"{field}"\s*:\s*"([^"]*)"', obj_text, re.DOTALL)
            if field_match:
                item[field] = field_match.group(1)
        recovered.append(item)
    if recovered:
        return recovered

    pair_matches = re.finditer(
        r'"diagnosis"\s*:\s*"([^"]+)".{0,800}?"icd10_code"\s*:\s*"([^"]+)"',
        text,
        re.DOTALL,
    )
    for match in pair_matches:
        item = {
            "diagnosis": match.group(1),
            "icd10_code": match.group(2),
        }
        tail = text[match.end(): match.end() + 500]
        confidence_match = re.search(r'"confidence"\s*:\s*"([^"]*)"', tail)
        if confidence_match:
            item["confidence"] = confidence_match.group(1)
        recovered.append(item)
    if recovered:
        return recovered

    return []


def validate_icd_codes(
    diagnoses: list[dict],
    context_codes: set[str],
    icd_lookup: dict,
) -> list[dict]:
    """
    Validate ICD-10 codes against the Kazakhstan clinical protocol corpus.

    Strategy:
    1. Exact match in the full corpus — keep as-is (preferred)
    2. Code like "J03" that is a valid 3-char prefix: expand to the most specific
       matching code in context_codes (retrieved protocols), else in full corpus
    3. Completely unknown code — drop it (do not remap to an unrelated code)
    4. Remove duplicates
    """
    seen_codes = set()
    validated = []
    strict_context = os.getenv("STRICT_CONTEXT_ICD", "1").lower() not in {"0", "false", "no"}
    allowed_codes = context_codes if strict_context and context_codes else ALL_VALID_ICD_CODES

    for d in diagnoses:
        code = d.get("icd_code", "") or d.get("icd10_code", "")
        code = code.strip().upper()

        if not code:
            continue

        # Normalize field to icd10_code (match evaluate.py expectation)
        d_normalized = {
            "diagnosis": d.get("diagnosis", d.get("name", "Unknown")),
            "icd10_code": code,
            "explanation": d.get("explanation", ""),
        }
        for optional_key in (
            "confidence",
            "supporting_findings",
            "missing_findings",
            "recommended_checks",
            "protocol_criteria",
            "patient_findings",
            "why_this_diagnosis",
            "questions",
        ):
            if optional_key in d:
                d_normalized[optional_key] = d[optional_key]

        # 1. Exact match in corpus — accept directly
        if code in allowed_codes:
            if code not in seen_codes:
                seen_codes.add(code)
                validated.append(d_normalized)
            continue

        # 2. Prefix expansion only when the code is a 3-char prefix (e.g. "J03", "S22")
        #    and matches at least one corpus code with that exact prefix.
        #    Never remap a specific code (e.g. "J03.5") to a different one.
        if len(code) == 3:
            # Try context codes first (most relevant to this query)
            for valid_code in sorted(context_codes):
                if valid_code.startswith(code) and valid_code not in seen_codes:
                    d_normalized["icd10_code"] = valid_code
                    seen_codes.add(valid_code)
                    validated.append(d_normalized)
                    break
            else:
                # Optional global fallback for non-strict deployments.
                for valid_code in sorted(allowed_codes):
                    if valid_code.startswith(code) and valid_code not in seen_codes:
                        d_normalized["icd10_code"] = valid_code
                        seen_codes.add(valid_code)
                        validated.append(d_normalized)
                        break
            continue

        # 3. Specific code not in corpus — drop rather than remap to wrong disease
        print(f"[validate] Dropping ungrounded ICD code: {code!r}")

    return validated


def add_ranks(diagnoses: list[dict]) -> list[dict]:
    """Add rank field to diagnoses list (1-indexed)."""
    for i, d in enumerate(diagnoses):
        d["rank"] = i + 1
    return diagnoses


def format_few_shot_examples(examples: list[dict]) -> str:
    """Format few-shot examples for the diagnosis prompt."""
    if not examples:
        return "No examples provided."

    parts = []
    for i, ex in enumerate(examples, 1):
        parts.append(
            f"Example {i}:\n"
            f"Symptoms: {ex['query'][:300]}\n"
            f"Correct ICD-10: {ex['gt']}\n"
            f"Valid codes in protocol: {', '.join(ex.get('icd_codes', [])[:5])}"
        )
    return "\n\n".join(parts)
