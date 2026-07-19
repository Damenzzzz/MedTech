"""
Stage 1: Query analysis and decomposition using GPT-OSS.
Decomposes patient symptom queries into sub-queries, extracts symptoms,
hypothesizes candidate ICD-10 codes, and generates a HyDE passage.
"""

import json
import re

from askhat_rag.config import LLM_MODEL, prepare_system, sampling_kwargs, token_limit_kwargs
from askhat_rag.data_loader import normalize_icd_code


async def analyze_query(query: str, llm_client) -> dict:
    """
    Lightweight LLM call to decompose and enrich the query.
    Also generates a HyDE (Hypothetical Document Embedding) passage —
    a fake protocol diagnostic-criteria excerpt that semantically matches
    what the correct protocol should look like.
    """
    prompt = f"""You optimize search over Kazakhstan clinical protocols.

This is a high-recall retrieval step, not the final diagnosis. Keep both the
most likely explanation and dangerous alternatives when red flags are present.
For a likely infection, include the etiologic ICD family (A/B code) as well as
the affected-organ code. Prefer a specific pathogen when the history supports it.

Return one compact JSON object with exactly these fields:
- "sub_queries": 3 concise Russian medical search queries: syndrome, likely diagnosis, dangerous differential
- "normalized_symptoms": at most 8 short Russian symptoms
- "candidate_icd_codes": at most 8 likely ICD-10 prefixes, including a dangerous alternative when justified
- "hyde_passage": a 40-60 word Russian diagnostic-criteria excerpt

Patient symptoms: "{query}"

Return ONLY valid JSON, no markdown, no explanation:
{{"sub_queries": [...], "normalized_symptoms": [...], "candidate_icd_codes": [...], "hyde_passage": "..."}}"""

    try:
        response = await llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": prepare_system("Reasoning: low\nReturn only valid JSON.")},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            **sampling_kwargs(LLM_MODEL, 0.1),
            **token_limit_kwargs(LLM_MODEL, "QUERY_ANALYSIS_MAX_TOKENS", "1800"),
        )

        raw = (response.choices[0].message.content or "").strip()
        # Strip markdown if present
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw)

        result = json.loads(raw)

        candidate_codes = [
            normalize_icd_code(code) for code in result.get("candidate_icd_codes", [])
        ]
        return {
            "sub_queries": result.get("sub_queries", [query])[:3],
            "normalized_symptoms": result.get("normalized_symptoms", [query])[:8],
            "candidate_icd_codes": list(dict.fromkeys(
                code for code in candidate_codes if code
            ))[:8],
            "hyde_passage": result.get("hyde_passage", ""),
        }

    except Exception as e:
        print(f"Query analysis failed ({type(e).__name__}): {e}")
        return {
            "sub_queries": [query],
            "normalized_symptoms": [query],
            "candidate_icd_codes": [],
            "hyde_passage": "",
        }
