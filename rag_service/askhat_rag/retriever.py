"""
3-strategy retrieval with RRF fusion:
  A: PageIndex tree navigation (LLM over compact tree summaries)
  B: Hybrid BM25 + dense with RRF
  C: ICD-10 direct lookup
"""

import json
import os
import re
import time
from dataclasses import dataclass
from typing import Optional

from askhat_rag.config import (
    LLM_MODEL,
    RERANK_API_KEY,
    RERANK_BASE_URL,
    RERANK_MODEL,
    RERANK_TOP_N,
    prepare_system,
    sampling_kwargs,
    token_limit_kwargs,
)
from askhat_rag.indexer import Chunk, TreeNode, lemmatize, format_tree_for_prompt, encode_texts
from askhat_rag.data_loader import normalize_icd_code


# ---------------------------------------------------------------------------
# Global state (set by server.py at startup)
# ---------------------------------------------------------------------------

bm25_index = None
faiss_index = None
embed_model = None
chunks_list: list[Chunk] = []
trees: dict[str, TreeNode] = {}
protocols_map = {}  # protocol_id -> Protocol
icd_to_protocols: dict[str, list] = {}


def init_retriever(
    bm25, faiss, embed, chunks, tree_map, proto_map, icd_map
):
    global bm25_index, faiss_index, embed_model, chunks_list
    global trees, protocols_map, icd_to_protocols
    bm25_index = bm25
    faiss_index = faiss
    embed_model = embed
    chunks_list = chunks
    trees = tree_map
    protocols_map = proto_map
    icd_to_protocols = icd_map


# ---------------------------------------------------------------------------
# Strategy B: Hybrid BM25 + Dense with RRF
# ---------------------------------------------------------------------------

def hybrid_search(queries: list[str], top_k: int = 15) -> list[Chunk]:
    """Run multiple queries through BM25 and dense search, fuse with RRF."""
    import numpy as np
    if not chunks_list:
        return []

    all_results: dict[int, dict] = {}
    query_embeddings = encode_texts(
        embed_model,
        queries,
        is_query=True,
        normalize_embeddings=True,
    )

    for query, q_emb in zip(queries, query_embeddings):
        # Dense search
        scores, indices = faiss_index.search(
            q_emb.reshape(1, -1).astype(np.float32),
            top_k * 2,
        )
        for rank, idx in enumerate(indices[0]):
            idx = int(idx)
            if idx < 0 or idx >= len(chunks_list):
                continue
            entry = all_results.setdefault(idx, {"dense_ranks": [], "bm25_ranks": []})
            entry["dense_ranks"].append(rank)

        # BM25 search
        q_tokens = lemmatize(query)
        if q_tokens:
            bm25_scores = bm25_index.get_scores(q_tokens)
            bm25_top = np.argsort(bm25_scores)[::-1][:top_k * 2]
            for rank, idx in enumerate(bm25_top):
                idx = int(idx)
                entry = all_results.setdefault(idx, {"dense_ranks": [], "bm25_ranks": []})
                entry["bm25_ranks"].append(rank)

    # RRF fusion
    k = 60
    rrf_scores: dict[int, float] = {}
    for idx, ranks in all_results.items():
        score = sum(1.0 / (k + r) for r in ranks["dense_ranks"])
        score += sum(1.0 / (k + r) for r in ranks["bm25_ranks"])
        rrf_scores[idx] = score

    sorted_indices = sorted(rrf_scores, key=rrf_scores.get, reverse=True)[:top_k]
    return [chunks_list[i] for i in sorted_indices]


# ---------------------------------------------------------------------------
# Strategy C: ICD-10 Direct Lookup
# ---------------------------------------------------------------------------

def icd_lookup(candidate_icd_codes: list[str]) -> list[Chunk]:
    """Direct lookup by hypothesized ICD codes with a broad rerankable pool."""
    max_protocols = max(1, int(os.getenv("ICD_LOOKUP_TOP_K", "16")))
    ranked_protocols: dict[str, tuple[tuple[int, int, int], object]] = {}

    for candidate_rank, raw_code in enumerate(candidate_icd_codes):
        code = normalize_icd_code(raw_code)
        if not code:
            continue
        for full_code, protocols in icd_to_protocols.items():
            if full_code == code:
                match_rank = 0
            elif len(code) == 3 and full_code.startswith(code):
                match_rank = 1
            elif len(code) > 3 and full_code.startswith(code[:3]):
                match_rank = 2
            else:
                continue

            for protocol in protocols:
                metadata_rank = 0 if full_code in protocol.icd_codes else 1
                score = (candidate_rank, match_rank, metadata_rank)
                current = ranked_protocols.get(protocol.protocol_id)
                if current is None or score < current[0]:
                    ranked_protocols[protocol.protocol_id] = (score, protocol)

    ordered = sorted(
        ranked_protocols.values(),
        key=lambda item: (item[0], item[1].title.lower(), item[1].protocol_id),
    )[:max_protocols]

    results = []
    for _, protocol in ordered:
        section_text = (
            protocol.sections.get("diagnostic_criteria", "")
            or protocol.sections.get("clinical_signs", "")
            or protocol.text
        )
        if not section_text:
            continue
        results.append(Chunk(
            chunk_id=f"{protocol.protocol_id}_icd_lookup",
            protocol_id=protocol.protocol_id,
            protocol_title=protocol.title,
            icd_codes=protocol.icd_codes,
            section_type="diagnostic_criteria",
            text=section_text[:3000],
            icd_labels=protocol.icd_labels,
        ))
    return results


# ---------------------------------------------------------------------------
# Strategy A: PageIndex Tree Navigation
# ---------------------------------------------------------------------------

async def tree_search(
    query: str,
    candidate_chunks: list[Chunk],
    llm_client,
) -> list[Chunk]:
    """Use LLM to navigate tree structures and select relevant sections."""
    if not trees or not candidate_chunks:
        return []

    # Get unique protocols from candidate chunks
    seen = set()
    candidate_pids = []
    for c in candidate_chunks:
        if c.protocol_id not in seen:
            seen.add(c.protocol_id)
            candidate_pids.append(c.protocol_id)
        if len(candidate_pids) >= 10:
            break

    # Build compact tree summaries
    tree_summaries = []
    for pid in candidate_pids:
        if pid not in trees:
            continue
        tree = trees[pid]
        protocol = protocols_map.get(pid)
        icd_codes = protocol.icd_codes if protocol else []
        tree_summaries.append(format_tree_for_prompt(tree, pid, icd_codes))

    if not tree_summaries:
        return []

    prompt = f"""You are a medical search assistant. Given patient symptoms, identify which protocol sections contain the relevant diagnostic criteria.

Patient symptoms: {query}

Available protocol sections:
{chr(10).join(tree_summaries)}

For each relevant section, return a JSON array:
[{{"protocol_id": "...", "node_id": "...", "relevance": "high/medium"}}]

Return ONLY the JSON array, nothing else. Select 3-8 most relevant sections."""

    try:
        response = await llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": prepare_system("Reasoning: low\nYou are a medical protocol search assistant. Return only valid JSON array."),
                },
                {"role": "user", "content": prompt},
            ],
            **sampling_kwargs(LLM_MODEL, 0.1),
            **token_limit_kwargs(LLM_MODEL, "TREE_SEARCH_MAX_TOKENS", "600"),
        )

        raw = (response.choices[0].message.content or "").strip()
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw)

        # Extract JSON array
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            return []
        selected_nodes = json.loads(match.group())

        results = []
        for node_sel in selected_nodes[:8]:
            pid = node_sel.get("protocol_id", "")
            node_id = node_sel.get("node_id", "")
            protocol = protocols_map.get(pid)
            if not protocol:
                continue

            # Get text for this node from trees
            tree = trees.get(pid)
            section_text = _get_node_text(tree, node_id, protocol.text)
            if not section_text:
                continue

            results.append(Chunk(
                chunk_id=f"{pid}_{node_id}_tree",
                protocol_id=pid,
                protocol_title=protocol.title,
                icd_codes=protocol.icd_codes,
                section_type=node_id.replace(f"{pid}_", ""),
                text=section_text[:3000],
                node_id=node_id,
            ))

        return results

    except Exception as e:
        print(f"Tree search failed: {e}")
        return []


def _get_node_text(tree: Optional[TreeNode], node_id: str, full_text: str) -> str:
    """Extract text for a specific tree node."""
    if tree is None:
        return ""

    if tree.node_id == node_id:
        return full_text[tree.text_start:tree.text_end]

    for child in tree.children:
        result = _get_node_text(child, node_id, full_text)
        if result:
            return result

    return ""


# ---------------------------------------------------------------------------
# Fusion and deduplication
# ---------------------------------------------------------------------------

def deduplicate_chunks(chunks: list[Chunk]) -> list[Chunk]:
    """Deduplicate chunks by protocol_id + section_type, keep first occurrence."""
    seen = set()
    result = []
    for c in chunks:
        key = (c.protocol_id, c.section_type)
        if key not in seen:
            seen.add(key)
            result.append(c)
    return result


def select_top_chunks(
    chunks: list[Chunk],
    max_chunks: int = 10,
    max_chars: int = 22000,
) -> list[Chunk]:
    """Keep reranker order, budget, and source diversity."""
    selected = []
    total_chars = 0
    protocol_counts: dict[str, int] = {}
    title_counts: dict[str, int] = {}
    for c in chunks:
        if len(selected) >= max_chunks:
            break
        if total_chars + len(c.text) > max_chars:
            continue
        normalized_title = re.sub(r"\W+", " ", c.protocol_title.lower()).strip()
        if protocol_counts.get(c.protocol_id, 0) >= 2:
            continue
        if normalized_title and title_counts.get(normalized_title, 0) >= 2:
            continue
        selected.append(c)
        total_chars += len(c.text)
        protocol_counts[c.protocol_id] = protocol_counts.get(c.protocol_id, 0) + 1
        if normalized_title:
            title_counts[normalized_title] = title_counts.get(normalized_title, 0) + 1

    return selected


def format_chunk_for_rerank(chunk: Chunk) -> str:
    """Give the reranker the metadata omitted from many section bodies."""
    max_chars = max(500, int(os.getenv("RERANK_DOC_MAX_CHARS", "1800")))
    labels = getattr(chunk, "icd_labels", {}) or {}
    label_text = "; ".join(
        f"{code}: {labels[code]}" for code in chunk.icd_codes if code in labels
    )
    codes = ", ".join(chunk.icd_codes)
    return (
        f"Протокол: {chunk.protocol_title}\n"
        f"МКБ-10: {codes}\n"
        f"Названия кодов: {label_text}\n"
        f"Раздел: {chunk.section_type}\n"
        f"{chunk.text[:max_chars]}"
    )


def rerank_chunks(query: str, chunks: list[Chunk], top_n: int | None = None) -> list[Chunk]:
    """Optionally rerank chunks through an external reranker endpoint.

    Expected OpenAI-like payload:
      {"model": "...", "query": "...", "documents": ["..."], "top_n": 8}
    """
    if not RERANK_BASE_URL or not RERANK_API_KEY or not chunks:
        return chunks

    import httpx

    top_n = top_n or RERANK_TOP_N
    payload = {
        "model": RERANK_MODEL,
        "query": query,
        "documents": [format_chunk_for_rerank(c) for c in chunks],
        "top_n": min(top_n, len(chunks)),
    }
    data = None
    retries = max(1, int(os.getenv("RERANK_RETRIES", "3")))
    for attempt in range(retries):
        try:
            response = httpx.post(
                RERANK_BASE_URL,
                headers={"Authorization": f"Bearer {RERANK_API_KEY}"},
                json=payload,
                timeout=float(os.getenv("RERANK_TIMEOUT_SECONDS", "90")),
            )
            response.raise_for_status()
            data = response.json()
            break
        except Exception as exc:
            if attempt + 1 == retries:
                print(f"Reranker failed, using original order: {exc}")
                return chunks
            time.sleep(1.5 * (attempt + 1))

    results = data.get("results") or data.get("data") or []
    ordered: list[Chunk] = []
    seen: set[int] = set()
    for item in results:
        idx = item.get("index") if isinstance(item, dict) else None
        if isinstance(idx, int) and 0 <= idx < len(chunks) and idx not in seen:
            ordered.append(chunks[idx])
            seen.add(idx)
    for idx, chunk in enumerate(chunks):
        if idx not in seen:
            ordered.append(chunk)
    return ordered


def promote_strategy_coverage(
    reranked: list[Chunk],
    icd_results: list[Chunk],
    hybrid_results: list[Chunk],
) -> list[Chunk]:
    """Reserve one candidate from each retrieval strategy without losing rerank order."""
    promoted = list(reranked[:6])
    promoted_ids = {chunk.chunk_id for chunk in promoted}

    for strategy_results in (icd_results, hybrid_results):
        candidate = strategy_results[0] if strategy_results else None
        if candidate is not None and candidate.chunk_id not in promoted_ids:
            promoted.append(candidate)
            promoted_ids.add(candidate.chunk_id)

    promoted.extend(chunk for chunk in reranked if chunk.chunk_id not in promoted_ids)
    return promoted


# ---------------------------------------------------------------------------
# Main retrieval function
# ---------------------------------------------------------------------------

async def retrieve(
    query: str,
    analysis: dict,
    llm_client,
) -> tuple[list[Chunk], dict]:
    """Main retrieval: runs all 3 strategies and fuses results."""
    final_context, _candidate_pool = await retrieve_with_candidates(query, analysis, llm_client)
    return final_context, analysis


async def retrieve_with_candidates(
    query: str,
    analysis: dict,
    llm_client,
) -> tuple[list[Chunk], list[Chunk]]:
    """Return final context plus a wider reranked candidate pool for fast refinement."""

    sub_queries = analysis.get("sub_queries", [query])
    candidate_icd_codes = analysis.get("candidate_icd_codes", [])
    hyde_passage = analysis.get("hyde_passage", "")

    # Include HyDE passage as an extra query: it's written in protocol language,
    # which matches indexed protocol text far better than raw patient descriptions.
    all_queries = [query] + sub_queries
    if hyde_passage:
        all_queries.append(hyde_passage)

    # Strategy B: Hybrid search (fast, no LLM)
    hybrid_top_k = max(8, int(os.getenv("HYBRID_TOP_K", "24")))
    hybrid_results = hybrid_search(queries=all_queries, top_k=hybrid_top_k)

    # Strategy C: ICD direct lookup (fast, no LLM)
    icd_results = icd_lookup(candidate_icd_codes) if candidate_icd_codes else []

    # Strategy A: Tree search over top candidates from hybrid
    tree_results = (
        await tree_search(query, hybrid_results[:10], llm_client)
        if os.getenv("ENABLE_TREE_SEARCH", "0").lower() in {"1", "true", "yes"}
        else []
    )

    # Merge: tree first (highest priority), then ICD lookup, then hybrid
    all_chunks = tree_results + icd_results + hybrid_results
    deduped = deduplicate_chunks(all_chunks)
    reranked = rerank_chunks(query, deduped, top_n=RERANK_TOP_N)
    covered = promote_strategy_coverage(reranked, icd_results, hybrid_results)
    pool_size = max(10, int(os.getenv("REFINE_CANDIDATE_POOL_SIZE", "24")))
    candidate_pool = covered[:pool_size]
    final_context = select_top_chunks(covered, max_chunks=10, max_chars=22000)

    return final_context, candidate_pool
