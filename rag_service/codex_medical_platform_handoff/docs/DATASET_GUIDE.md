# Dataset Guide

## `data/test_set`
Simulated text cases for evaluation.

Each item:
- `query`: free-text symptoms/complaint;
- `gt`: ground-truth diagnosis and ICD-10.

Rules:
- Never pass `gt` to the model during inference.
- Use `gt` only after prediction.
- Check duplicates and near-duplicates.
- Separate development and final evaluation samples if needed.

## `corpus.zip`
Official Kazakhstan Ministry of Health clinical protocols converted to JSON/text.

Expected content:
- symptoms;
- diagnostic criteria;
- examinations;
- differential diagnosis;
- ICD-10 mappings;
- protocol metadata.

This is the RAG knowledge base.

## Existing teammate RAG
First:
1. Locate its entry point.
2. Identify input/output schemas.
3. Identify embedding/indexing method.
4. Check whether sources are returned.
5. Run it on a small sample.
6. Evaluate against `test_set`.
7. Wrap it behind a stable API.
8. Modify retrieval only after measuring failures.

## Evaluation
Diagnostic:
- Top-1 diagnosis accuracy
- Top-3 diagnosis accuracy
- ICD-10 exact match
- normalized diagnosis-name match

Retrieval, if labels permit:
- Recall@5
- Recall@10
- MRR
- nDCG

Safety:
- correct diagnosis missing from Top-3;
- invented ICD-10;
- answer without a valid source;
- unsupported source citation;
- critical case marked low-risk;
- schema failure.

## Data inspection checklist
Report:
- number of test cases;
- number of corpus documents/chunks;
- missing fields;
- duplicates;
- languages;
- ICD-10 distribution;
- diagnosis frequency;
- text length distributions;
- malformed JSON;
- available corpus metadata.
