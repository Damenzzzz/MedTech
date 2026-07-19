"""Build only the dense FAISS layer from a checkpointed chunks.pkl file."""

import argparse
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
import json
import os
import pickle
import random
import sys
import time
from pathlib import Path

import faiss
import numpy as np
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

from askhat_rag.config import (
    EMBED_MODEL,
    EMBED_PROVIDER,
    get_embed_api_key,
    get_embed_base_url,
)
from askhat_rag.data_loader import load_all_protocols
from askhat_rag.indexer import corpus_fingerprint


def embedding_text(chunk) -> str:
    """Compact dense representation; BM25/reranker still use the full chunk."""
    max_chars = max(100, int(os.getenv("EMBED_TEXT_MAX_CHARS", "300")))
    body = chunk.text
    if len(body) > max_chars:
        left = max_chars // 2
        body = f"{body[:left]}\n...\n{body[-(max_chars - left):]}"
    return (
        f"{chunk.protocol_title}\n"
        f"ICD-10: {', '.join(chunk.icd_codes)}\n"
        f"Section: {chunk.section_type}\n"
        f"{body}"
    )


def save_progress(path: Path, state: dict) -> None:
    temp_path = path.with_suffix(".tmp")
    temp_path.write_text(
        json.dumps(state, ensure_ascii=True, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    temp_path.replace(path)


def normalize(vectors: list[list[float]]) -> np.ndarray:
    array = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(array, axis=1, keepdims=True)
    return array / np.where(norms == 0, 1.0, norms)


def build_api_embeddings(texts: list[str], indexes_dir: Path) -> np.memmap:
    """Embed with bounded concurrency, retries, and resumable batch checkpoints."""
    from openai import OpenAI
    from tqdm import tqdm

    batch_size = max(1, int(os.getenv("EMBED_BATCH_SIZE", "32")))
    concurrency = max(1, int(os.getenv("EMBED_CONCURRENCY", "12")))
    max_retries = max(1, int(os.getenv("EMBED_MAX_RETRIES", "7")))
    num_batches = (len(texts) + batch_size - 1) // batch_size
    progress_path = indexes_dir / "embeddings.progress.json"
    cache_path = indexes_dir / "embeddings.f32"
    signature = {
        "batch_size": batch_size,
        "embed_model": EMBED_MODEL,
        "embed_text_max_chars": int(os.getenv("EMBED_TEXT_MAX_CHARS", "300")),
        "num_texts": len(texts),
    }

    state = {}
    if progress_path.exists():
        try:
            state = json.loads(progress_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            state = {}
    if state.get("signature") != signature or not cache_path.exists():
        state = {"signature": signature, "dimension": 0, "completed": []}
        cache_path.unlink(missing_ok=True)
        progress_path.unlink(missing_ok=True)

    completed = {int(index) for index in state.get("completed", [])}
    client = OpenAI(
        base_url=get_embed_base_url(),
        api_key=get_embed_api_key(),
        timeout=90,
        max_retries=0,
    )

    def encode_batch(batch_index: int) -> tuple[int, np.ndarray]:
        start = batch_index * batch_size
        batch = texts[start : start + batch_size]
        for attempt in range(max_retries):
            try:
                response = client.embeddings.create(model=EMBED_MODEL, input=batch)
                ordered = [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
                if len(ordered) != len(batch):
                    raise RuntimeError(
                        f"Embedding batch {batch_index} returned {len(ordered)} of {len(batch)} vectors"
                    )
                return batch_index, normalize(ordered)
            except Exception as exc:
                if attempt + 1 == max_retries:
                    raise RuntimeError(
                        f"Embedding batch {batch_index} failed after {max_retries} attempts"
                    ) from exc
                delay = min(30.0, 2.0 ** attempt) + random.uniform(0.0, 1.0)
                time.sleep(delay)
        raise AssertionError("unreachable")

    if not completed:
        first_index, first_vectors = encode_batch(0)
        dimension = int(first_vectors.shape[1])
        matrix = np.memmap(
            cache_path,
            dtype=np.float32,
            mode="w+",
            shape=(len(texts), dimension),
        )
        matrix[: len(first_vectors)] = first_vectors
        matrix.flush()
        completed.add(first_index)
        state.update({"dimension": dimension, "completed": sorted(completed)})
        save_progress(progress_path, state)
    else:
        dimension = int(state["dimension"])
        expected_size = len(texts) * dimension * np.dtype(np.float32).itemsize
        if cache_path.stat().st_size != expected_size:
            raise RuntimeError("Embedding cache size does not match its checkpoint metadata")
        matrix = np.memmap(
            cache_path,
            dtype=np.float32,
            mode="r+",
            shape=(len(texts), dimension),
        )

    remaining = iter(index for index in range(num_batches) if index not in completed)
    executor = ThreadPoolExecutor(max_workers=concurrency)
    futures = {}

    def submit_one() -> bool:
        try:
            batch_index = next(remaining)
        except StopIteration:
            return False
        futures[executor.submit(encode_batch, batch_index)] = batch_index
        return True

    for _ in range(concurrency):
        if not submit_one():
            break

    saved_since_flush = 0
    progress = tqdm(total=num_batches, initial=len(completed), desc="Encoding via API")
    try:
        while futures:
            finished, _ = wait(futures, return_when=FIRST_COMPLETED)
            for future in finished:
                expected_index = futures.pop(future)
                batch_index, vectors = future.result()
                if batch_index != expected_index:
                    raise RuntimeError("Embedding worker returned the wrong batch index")
                start = batch_index * batch_size
                matrix[start : start + len(vectors)] = vectors
                completed.add(batch_index)
                saved_since_flush += 1
                progress.update(1)
                submit_one()

            if saved_since_flush >= 10:
                matrix.flush()
                state["completed"] = sorted(completed)
                save_progress(progress_path, state)
                saved_since_flush = 0
    except BaseException:
        for future in futures:
            future.cancel()
        raise
    finally:
        executor.shutdown(wait=True, cancel_futures=True)
        matrix.flush()
        state["completed"] = sorted(completed)
        save_progress(progress_path, state)
        progress.close()

    return matrix


def main() -> None:
    parser = argparse.ArgumentParser(description="Build FAISS from checkpointed Askhat chunks")
    parser.add_argument("--indexes", type=Path, default=Path("data/indexes"))
    parser.add_argument("--corpus", type=Path, default=None)
    args = parser.parse_args()

    chunks_path = args.indexes / "chunks.pkl"
    if not chunks_path.exists():
        raise SystemExit(f"Missing checkpoint: {chunks_path}")

    with chunks_path.open("rb") as handle:
        chunks = pickle.load(handle)
    print(f"Loaded {len(chunks)} checkpointed chunks")

    dense_texts = [embedding_text(chunk) for chunk in chunks]
    print(
        f"Dense representation: max_body_chars={os.getenv('EMBED_TEXT_MAX_CHARS', '300')} "
        f"total_chars={sum(map(len, dense_texts))}"
    )
    if EMBED_PROVIDER in {"local", "llama-cpp", "ollama"}:
        from askhat_rag.indexer import encode_texts, load_embed_model

        model = load_embed_model()
        embeddings = encode_texts(
            model,
            dense_texts,
            is_query=False,
            normalize_embeddings=True,
            show_progress_bar=True,
            batch_size=256,
        )
    else:
        embeddings = build_api_embeddings(dense_texts, args.indexes)

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings.astype(np.float32))
    faiss.write_index(index, str(args.indexes / "faiss.index"))

    metadata = {
        "num_protocols": len({chunk.protocol_id for chunk in chunks}),
        "num_chunks": len(chunks),
        "embed_provider": EMBED_PROVIDER,
        "embed_model": EMBED_MODEL,
        "embed_text_max_chars": int(os.getenv("EMBED_TEXT_MAX_CHARS", "300")),
        "faiss_dim": int(embeddings.shape[1]),
    }
    if args.corpus:
        protocols = load_all_protocols(str(args.corpus))
        metadata["corpus_fingerprint"] = corpus_fingerprint(protocols)
    (args.indexes / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Dense index complete: vectors={index.ntotal} "
        f"dim={embeddings.shape[1]} output={args.indexes / 'faiss.index'}"
    )


if __name__ == "__main__":
    main()
