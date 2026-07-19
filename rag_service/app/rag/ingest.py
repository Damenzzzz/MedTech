from __future__ import annotations

import argparse
from pathlib import Path

from app.rag.index import RagIndex
from app.rag.loader import load_corpus


def build_index(corpus: Path, index: Path, max_chars: int = 700, overlap: int = 100) -> RagIndex:
    documents = load_corpus(corpus)
    if not documents:
        raise SystemExit(f"No supported protocol documents found in {corpus}")
    rag_index = RagIndex.from_documents(documents, max_chars=max_chars, overlap=overlap)
    rag_index.save(index)
    print(f"Indexed {len(documents)} documents into {len(rag_index.chunks)} chunks: {index}")
    return rag_index


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local RAG index from protocol corpus.")
    parser.add_argument("--corpus", type=Path, default=Path("data/corpus"))
    parser.add_argument("--index", type=Path, default=Path("data/index.json"))
    parser.add_argument("--max-chars", type=int, default=700)
    parser.add_argument("--overlap", type=int, default=100)
    args = parser.parse_args()
    build_index(args.corpus, args.index, args.max_chars, args.overlap)


if __name__ == "__main__":
    main()
