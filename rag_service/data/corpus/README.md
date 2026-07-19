# Protocol Corpus

Put official Kazakhstan protocol files here.

Current local setup uses the Qazcode corpus archive:

```text
data/corpus/corpus/protocols_corpus.jsonl
```

That folder is ignored by git because the extracted corpus is large. Rebuild the index after changing corpus files:

```bash
python -m app.rag.ingest --corpus data/corpus --index data/index.json
```
