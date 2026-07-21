# Core Cases Audit & Clinical Review Requirements

## Executive Summary

This document explains the classification criteria and audit findings for the synthetic medical case catalog in KazMedSim (MedTech).

- **Total Cases in Catalog**: 32
- **Core (Verified) Cases**: 0
- **Beta (Unreviewed) Cases**: 32

---

## 1. Audit Findings: Search for Reviewed Core Cases

A thorough audit of the repository git history, commit messages, golden test scripts (`rag_service/scripts/audit_golden.py`), and documentation was performed to identify any cases with formal, signed physician validation.

### Candidate Initial Cases Evaluated:
1. `chest-pain` (Cardiology)
2. `hypertensive-crisis` (Cardiology)
3. `pneumonia` (Pulmonology)
4. `asthma` (Pulmonology)
5. `hypoglycemia` (Endocrinology)
6. `dka` (Endocrinology)
7. `appendicitis` (Gastroenterology)
8. `pyelonephritis` (Therapy)
9. `tia` (Neurology)
10. `anaphylaxis` (Emergency)
11. `anemia` (Therapy)
12. `migraine` (Neurology)
13. `gerd` (Gastroenterology)
14. `viral-uri` (Infectious)
15. `preeclampsia` (Emergency)

### Reason Core Status Cannot Be Granted Automatically:
While these 15 initial cases were created with clinical structure, **no signed medical review logs, institutional protocol audit signatures, or clinician sign-off records exist in the codebase**. Automated test execution or LLM evaluation DOES NOT constitute medical validation.

To maintain medical safety and honesty, **no case may be randomly or arbitrarily assigned `validationTier: "core"`**.

---

## 2. Infrastructure & Catalog Tiers

All 32 cases are assigned:
- `validationTier: "beta"`
- `medicalReviewStatus: "unreviewed"`

### Field Definitions:

```typescript
export type ValidationTier = 'core' | 'beta';
export type MedicalReviewStatus = 'unreviewed' | 'reviewed';
```

- **`beta` / `unreviewed`**: Synthetically generated case for educational demonstration. Exact dosages and management actions are accompanied by a synthetic educational warning and must be reviewed by a licensed physician before clinical application.
- **`core` / `reviewed`**: Formally reviewed case validated by a board-certified physician against Ministry of Health (МЗ РК) clinical protocols with recorded reviewer identity and review date.

---

## 3. Protocol for Elevating a Case to Core Tier

To elevate a case from `beta` to `core`:
1. **Physician Review**: A qualified clinician must verify all hidden facts, vital signs, examination findings, investigation results, correct diagnosis (ICD-10), and medication dosages against official clinical protocols.
2. **Review Metadata**: Record reviewer name, medical license/specialty, protocol reference ID, and review timestamp.
3. **Version Control**: Commit the review certificate to `docs/reviews/<caseId>.json` alongside the updated `validationTier: "core"` status.
