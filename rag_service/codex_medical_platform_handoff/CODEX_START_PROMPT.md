Read `AGENTS.md` and every file it references before changing code.

Then inspect the repository and the existing teammate RAG implementation for the Kazakhstan clinical protocol corpus. Do not rewrite it yet.

Your first task is to:
1. map the repository structure;
2. identify the RAG entry point, input schema, output schema, embedding/indexing approach, and returned source metadata;
3. inspect `corpus.zip` and `data/test_set`;
4. run the current RAG on 5–20 test cases without leaking ground truth;
5. report what works, what is broken, and what is missing for the vertical MVP in `docs/PROJECT_SPEC.md`;
6. write findings and a concrete plan to `docs/PROGRESS.md`;
7. only after that, implement the smallest end-to-end text flow:

dialogue text → structured encounter → existing RAG → top differential diagnoses with ICD-10 and real sources → editable draft note.

Run the code and tests yourself. Keep the final diagnosis with the doctor, never invent protocol evidence, and explicitly return insufficient information when grounding is weak.
