"""
Stage 3: Diagnosis generation using GPT-OSS with Reasoning: high.
Takes retrieved context chunks and generates ranked diagnoses with ICD-10 codes.
"""

import asyncio
import json
import os

from askhat_rag.config import (
    LLM_MODEL,
    make_gpt5_client,
    prepare_system,
    sampling_kwargs,
    token_limit_kwargs,
)
from askhat_rag.indexer import Chunk
from askhat_rag.postprocessor import (
    parse_diagnosis_json,
    validate_icd_codes,
    ground_diagnoses_to_patient,
    add_ranks,
    format_few_shot_examples,
    ALL_VALID_ICD_CODES,
)


async def generate_diagnosis(
    query: str,
    context_chunks: list[Chunk],
    analysis: dict,
    llm_client,
    few_shot_examples: list[dict],
) -> list[dict]:
    """
    Call GPT-OSS with high reasoning to produce final ranked diagnoses.
    Returns list of dicts with keys: rank, diagnosis, icd10_code, explanation.
    """

    assessment = await generate_case_assessment(
        query, context_chunks, analysis, llm_client, few_shot_examples
    )
    return assessment["diagnoses"]


async def generate_case_assessment(
    query: str,
    context_chunks: list[Chunk],
    analysis: dict,
    llm_client,
    few_shot_examples: list[dict],
) -> dict:
    """Generate diagnoses plus protocol-grounded questions for the doctor."""
    prompt_data = _build_generation_prompt(query, context_chunks, analysis, few_shot_examples)

    primary_task = _generate_single_assessment(
        query=query,
        context_chunks=context_chunks,
        available_icd_codes=prompt_data["available_icd_codes"],
        llm_client=llm_client,
        model=LLM_MODEL,
        system_prompt=prompt_data["system_prompt"],
        user_prompt=prompt_data["user_prompt"],
        label="primary",
    )

    if not _ensemble_enabled():
        return await primary_task

    gpt5_client = make_gpt5_client()
    if gpt5_client is None:
        print("[ENSEMBLE] GPT-5 disabled: GPT5_API_KEY/OPENAI_API_KEY is not set")
        return await primary_task

    primary, secondary = await asyncio.gather(
        primary_task,
        _generate_single_assessment(
            query=query,
            context_chunks=context_chunks,
            available_icd_codes=prompt_data["available_icd_codes"],
            llm_client=gpt5_client,
            model=os.getenv("GPT5_MODEL", "gpt-5"),
            system_prompt=prompt_data["system_prompt"],
            user_prompt=prompt_data["user_prompt"],
            label="gpt5",
        ),
    )
    return await _judge_assessments(
        query,
        prompt_data["context_str"],
        prompt_data["available_icd_codes"],
        primary,
        secondary,
        llm_client,
    )


def _ensemble_enabled() -> bool:
    return os.getenv("ENSEMBLE_GPT5_ENABLED", "0").lower() in {"1", "true", "yes"}


def _token_limit_kwargs(model: str, env_name: str, default: str) -> dict:
    if model.lower().startswith("gpt-5") and env_name == "GENERATION_MAX_TOKENS":
        return token_limit_kwargs(model, "GPT5_GENERATION_MAX_TOKENS", os.getenv(env_name, "8000"))
    return token_limit_kwargs(model, env_name, default)


def _sampling_kwargs(model: str, temperature: float) -> dict:
    if model.lower().startswith("gpt-5") and os.getenv("GPT5_REASONING_EFFORT"):
        return {"reasoning_effort": os.getenv("GPT5_REASONING_EFFORT", "minimal")}
    return sampling_kwargs(model, temperature)


def _build_generation_prompt(
    query: str,
    context_chunks: list[Chunk],
    analysis: dict,
    few_shot_examples: list[dict],
) -> dict:
    context_parts = []
    available_icd_codes: set[str] = set()

    for chunk in context_chunks:
        labels = getattr(chunk, "icd_labels", {}) or {}
        code_labels = "; ".join(
            f"{code} — {labels[code]}" for code in chunk.icd_codes if code in labels
        )
        context_parts.append(
            f"[Protocol: {chunk.protocol_id} | Title: {chunk.protocol_title} | "
            f"ICD: {', '.join(chunk.icd_codes)} | Section: {chunk.section_type}]\n"
            f"ICD labels: {code_labels or 'not provided'}\n{chunk.text}"
        )
        available_icd_codes.update(chunk.icd_codes)

    context_str = "\n\n---\n\n".join(context_parts)
    icd_list = ", ".join(sorted(available_icd_codes))
    examples_str = format_few_shot_examples(few_shot_examples)

    system_prompt = """Reasoning: high

You are an expert physician specializing in Kazakhstan clinical protocols (Клинические протоколы Республики Казахстан).

YOUR TASK: Given patient symptoms and clinical protocol excerpts, identify the most likely diagnoses.

STEP-BY-STEP APPROACH:
1. Identify the PRIMARY complaint and mechanism: trauma? infection? chronic condition? which organ system?
2. For each retrieved protocol excerpt, score how well its diagnostic criteria match the symptoms
3. Identify bright/discriminative symptoms and labs: findings that strongly point to one candidate over the others
4. Rank diagnoses by that match score — Rank 1 must have the strongest symptom-criteria alignment
5. If the patient has provided answers to follow-up questions, use those answers to rerank the same retrieved protocols
6. Use the ICD-10 code from the best-matching protocol excerpt

RULES:
- Do NOT assign a diagnosis that contradicts the clear clinical picture
  (e.g. do NOT diagnose diabetes for a patient with a clear trauma injury)
- Use ONLY ICD-10 codes explicitly listed in the retrieved protocol excerpts below
- When a protocol lists subcodes, select the most specific subcode whose label and criteria match; do not return a broad three-character prefix
- The diagnosis name must match the selected ICD-10 label or retrieved protocol title; do not pair one disease name with an unrelated code
- If none of the excerpts match, return an empty diagnoses list instead of guessing
- Follow-up questions must come from missing diagnostic criteria in the retrieved excerpts
- Do not ask generic questions if a sharper protocol criterion is available
- STRICT FAITHFULNESS: Never state that a clinical sign, lab value, symptom, or risk factor is present in the patient unless it is explicitly stated in Patient Symptoms.
- Protocol criteria are NOT patient facts. Unknown protocol criteria must go only into missing_findings, recommended_checks, or protocol_criteria.
- If proteinuria, creatinine, hemolysis, platelets, AST/ALT, blood pressure, fever, pregnancy week, or any other criterion is not explicitly present in Patient Symptoms, mark it as unknown; do not use it as supporting evidence.
- Every supporting finding must include patient_evidence copied or tightly paraphrased from Patient Symptoms. If there is no patient_evidence, do not put it in supporting_findings.
- Prefer returning 3 diagnoses for the clinical demo when three meaningfully different retrieved candidates exist. Do not invent a candidate outside retrieved protocols.
- Return valid JSON only — no markdown, no extra text

OUTPUT FORMAT:
{
  "diagnoses": [
    {
      "rank": 1,
      "diagnosis": "Disease name in Russian",
      "icd10_code": "X00.0",
      "confidence": "high/medium/low",
      "why_this_diagnosis": "1-2 short sentences explaining why this candidate is in the differential, using only patient facts and explicitly unknown criteria",
      "explanation": "Use only patient facts with patient_evidence; protocol criteria not in patient text must be described as unknown",
      "supporting_findings": [
        {
          "finding": "clinical fact",
          "present": true,
          "status": "present",
          "patient_evidence": "exact phrase or value from Patient Symptoms",
          "protocol_source": "protocol id or section"
        }
      ],
      "missing_findings": ["important protocol criterion that is not yet known from Patient Symptoms"],
      "recommended_checks": ["test or question needed to confirm an unknown criterion"],
      "protocol_criteria": ["diagnostic criterion from the protocol, without claiming it is present"]
    }
  ],
  "follow_up_questions": [
    {
      "question": "Precise question a doctor should ask the patient",
      "target_diagnoses": ["X00.0"],
      "rationale": "Which protocol criterion this question clarifies"
    }
  ]
}

Return 3-4 diagnoses when possible and 4-5 follow-up questions.
Follow-up questions must be useful for distinguishing the retrieved top diagnoses and deciding which candidate should move up or down.
Rank 1 = most likely based on symptom-criteria match."""

    user_prompt = f"""## Patient Symptoms
{query}

## Extracted Symptoms
{', '.join(analysis.get('normalized_symptoms', []))}

## Clinical Protocol Excerpts
{context_str}

## ICD-10 Codes in Retrieved Protocols
{icd_list}

## Reference Examples
{examples_str}

Which clinical condition best explains these symptoms? Match to the protocol excerpts above.
Also ask the doctor targeted follow-up questions that would help choose among these retrieved protocols.
Return JSON."""

    return {
        "available_icd_codes": available_icd_codes,
        "context_str": context_str,
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
    }


async def _generate_single_assessment(
    query: str,
    context_chunks: list[Chunk],
    available_icd_codes: set[str],
    llm_client,
    model: str,
    system_prompt: str,
    user_prompt: str,
    label: str,
) -> dict:
    """Generate one model's assessment, then apply deterministic grounding."""

    try:
        response = await llm_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": prepare_system(system_prompt)},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            **_sampling_kwargs(model, 0.2),
            **_token_limit_kwargs(model, "GENERATION_MAX_TOKENS", "2600"),
        )

        raw_text = response.choices[0].message.content
        print(f"[DEBUG LLM:{label}] raw_text[:300]: {raw_text[:300]!r}")
        parsed = _parse_assessment_json(raw_text)
        diagnoses_raw = parsed.get("diagnoses", [])
        print(f"[DEBUG LLM:{label}] parse_diagnosis_json -> {len(diagnoses_raw)} items")

        if not diagnoses_raw:
            print("[DEBUG LLM] FALLBACK: parse returned empty")
            return {
                "diagnoses": _fallback_from_context(context_chunks),
                "follow_up_questions": _fallback_questions_from_context(context_chunks),
            }

        # Validate ICD codes against corpus
        validated = validate_icd_codes(
            diagnoses_raw,
            available_icd_codes,
            {},  # icd_lookup dict not needed here
        )
        print(f"[DEBUG LLM:{label}] validate_icd_codes -> {len(validated)} items (context_codes={sorted(available_icd_codes)[:5]})")

        if not validated:
            print("[DEBUG LLM] FALLBACK: validate returned empty")
            return {
                "diagnoses": _fallback_from_context(context_chunks),
                "follow_up_questions": _fallback_questions_from_context(context_chunks),
            }

        grounded = ground_diagnoses_to_patient(validated, query, max_diagnoses=4)
        if not grounded:
            print("[DEBUG LLM] FALLBACK: faithfulness filter returned empty")
            return {
                "diagnoses": _fallback_from_context(context_chunks),
                "follow_up_questions": _fallback_questions_from_context(context_chunks),
            }

        # Ensure ranks are correct
        return {
            "diagnoses": add_ranks(grounded),
            "follow_up_questions": _normalize_questions(parsed.get("follow_up_questions", [])),
        }

    except Exception as e:
        print(f"Diagnosis generation failed: {e}")
        return {
            "diagnoses": _fallback_from_context(context_chunks),
            "follow_up_questions": _fallback_questions_from_context(context_chunks),
        }


async def _judge_assessments(
    query: str,
    context_str: str,
    available_icd_codes: set[str],
    primary: dict,
    secondary: dict,
    judge_client,
) -> dict:
    """Let the main LLM choose between Alem/current and GPT-5 assessments."""
    if not secondary.get("diagnoses"):
        return primary
    if not primary.get("diagnoses"):
        return secondary

    prompt = f"""You are a clinical RAG judge. Choose the better final assessment.

Patient symptoms:
{query}

Retrieved protocol context:
{context_str[:12000]}

Assessment A:
{json.dumps(primary, ensure_ascii=False)}

Assessment B:
{json.dumps(secondary, ensure_ascii=False)}

Judge criteria:
1. Prefer the assessment whose rank-1 diagnosis best matches bright/discriminative symptoms and labs.
2. Prefer strict faithfulness: no protocol-only criterion may be stated as a patient fact.
3. Preserve useful follow-up questions.
4. Do not invent ICD codes outside Assessment A/B.

Return JSON:
{{
  "choice": "A/B/merge",
  "reason": "short reason",
  "diagnoses": [...],
  "follow_up_questions": [...]
}}"""
    try:
        judge_model = os.getenv("ENSEMBLE_JUDGE_MODEL", LLM_MODEL) or LLM_MODEL
        response = await judge_client.chat.completions.create(
            model=judge_model,
            messages=[
                {"role": "system", "content": prepare_system("Reasoning: high\nReturn valid JSON only.")},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            **_sampling_kwargs(judge_model, 0.1),
            **_token_limit_kwargs(judge_model, "ENSEMBLE_JUDGE_MAX_TOKENS", "2200"),
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        diagnoses = parsed.get("diagnoses") or []
        if not diagnoses:
            return primary
        validated = validate_icd_codes(diagnoses, available_icd_codes, {})
        grounded = ground_diagnoses_to_patient(validated, query, max_diagnoses=4)
        if not grounded:
            return _prefer_by_top_confidence(primary, secondary)
        return {
            "diagnoses": add_ranks(grounded[:4]),
            "follow_up_questions": _normalize_questions(
                parsed.get("follow_up_questions") or primary.get("follow_up_questions", [])
            ),
        }
    except Exception as exc:
        print(f"[ENSEMBLE] judge failed: {exc}")
        return _prefer_by_top_confidence(primary, secondary)


def _prefer_by_top_confidence(primary: dict, secondary: dict) -> dict:
    scores = {"high": 3, "medium": 2, "low": 1}
    p_score = scores.get((primary.get("diagnoses") or [{}])[0].get("confidence"), 0)
    s_score = scores.get((secondary.get("diagnoses") or [{}])[0].get("confidence"), 0)
    return secondary if s_score > p_score else primary


def _parse_assessment_json(raw_text: str) -> dict:
    text = (raw_text or "").strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        diagnoses = parse_diagnosis_json(text)
        return {"diagnoses": diagnoses, "follow_up_questions": []}
    if isinstance(parsed, list):
        return {"diagnoses": parsed, "follow_up_questions": []}
    if not isinstance(parsed, dict):
        return {"diagnoses": [], "follow_up_questions": []}
    return {
        "diagnoses": parsed.get("diagnoses", []),
        "follow_up_questions": parsed.get("follow_up_questions", []),
    }


def _normalize_questions(questions: list[dict]) -> list[dict]:
    normalized = []
    for item in questions[:7]:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "")).strip()
        if not question:
            continue
        normalized.append({
            "question": question,
            "target_diagnoses": item.get("target_diagnoses", [])[:5]
            if isinstance(item.get("target_diagnoses", []), list)
            else [],
            "rationale": str(item.get("rationale", "")).strip(),
        })
    return normalized


def _fallback_from_context(context_chunks: list[Chunk]) -> list[dict]:
    """Emergency fallback: return top protocols from retrieved context."""
    seen_codes = set()
    diagnoses = []
    rank = 1

    for chunk in context_chunks[:5]:
        for code in _preferred_codes_for_chunk(chunk):
            if code not in seen_codes and rank <= 5:
                seen_codes.add(code)
                diagnoses.append({
                    "rank": rank,
                    "diagnosis": chunk.protocol_title or "Неизвестный диагноз",
                    "icd10_code": code,
                    "explanation": chunk.text[:200],
                })
                rank += 1

    return diagnoses


def _preferred_codes_for_chunk(chunk: Chunk) -> list[str]:
    title = (chunk.protocol_title or "").lower()
    labels = getattr(chunk, "icd_labels", {}) or {}
    codes = list(dict.fromkeys(chunk.icd_codes))
    if "hellp" in title or "хеллп" in title:
        preferred = [code for code in codes if code == "O14.2"]
        if preferred:
            return preferred
    if "преэкламп" in title:
        preferred = [code for code in codes if code.startswith("O14")]
        if preferred:
            return preferred
    labeled = [code for code in codes if code in labels]
    return labeled or codes


def _fallback_questions_from_context(context_chunks: list[Chunk]) -> list[dict]:
    questions = []
    seen_codes: set[str] = set()
    for chunk in context_chunks[:5]:
        codes = [code for code in chunk.icd_codes if code not in seen_codes][:2]
        seen_codes.update(codes)
        questions.append({
            "question": f"Уточните наличие ключевых диагностических критериев для протокола «{chunk.protocol_title or chunk.protocol_id}».",
            "target_diagnoses": codes,
            "rationale": "Вопрос сформирован по найденному протоколу, когда LLM-генерация вопросов недоступна.",
        })
    return questions[:5]
