"""
OpenAlex ingestion with rate limiting and concept extraction.

OpenAlex (https://openalex.org) is a fully open scholarly index — no API key
or signup required. We use its native, scored `concepts` per work instead of
n-gram extraction, which yields a much cleaner co-occurrence graph.
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from pathlib import Path
from typing import Callable

import httpx

from config import (
    OPENALEX_BASE_URL,
    OPENALEX_MAILTO,
    OPENALEX_MIN_CONCEPT_LEVEL,
    OPENALEX_MIN_CONCEPT_SCORE,
    S2_RATE_LIMIT_DELAY,
    CACHE_DIR,
)
from models.paper import Paper

# ---------------------------------------------------------------------------
# Simple token-bucket rate limiter
# ---------------------------------------------------------------------------
_last_request_time: float = 0.0
_rate_lock = asyncio.Lock()


async def _rate_limited_get(client: httpx.AsyncClient, url: str, params: dict) -> dict:
    global _last_request_time
    max_retries = 4
    for attempt in range(max_retries):
        async with _rate_lock:
            now = time.monotonic()
            wait = S2_RATE_LIMIT_DELAY - (now - _last_request_time)
            if wait > 0:
                await asyncio.sleep(wait)
            resp = await client.get(url, params=params, timeout=20.0)
            _last_request_time = time.monotonic()

        if resp.status_code == 429:
            backoff = 3.0 * (2 ** attempt)
            print(f"[ingestion] 429 rate limited — retrying in {backoff:.1f}s (attempt {attempt + 1}/{max_retries})")
            await asyncio.sleep(backoff)
            continue

        resp.raise_for_status()
        return resp.json()

    raise RuntimeError(f"S2 API rate-limited after {max_retries} retries")


# ---------------------------------------------------------------------------
# Concept extraction
# ---------------------------------------------------------------------------
# Stopwords to exclude from bigrams/trigrams
_STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "at", "to", "for", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "could", "should", "may", "might", "shall",
    "and", "or", "but", "with", "by", "from", "as", "this", "that", "these",
    "those", "we", "our", "their", "its", "it", "which", "who", "how",
    "can", "than", "into", "also", "using", "used", "based", "via", "across",
    "through", "within", "between", "among", "such", "both", "each", "all",
}

_WORD_RE = re.compile(r"\b([a-z][a-z\-]{2,})\b")


def _tokenize(text: str) -> list[str]:
    return [m.group(1) for m in _WORD_RE.finditer(text.lower())]


def extract_concepts(title: str, tldr: str | None) -> list[str]:
    """Return deduplicated bigram/trigram noun-phrase candidates."""
    combined = title
    if tldr:
        combined = combined + " " + tldr

    tokens = _tokenize(combined)
    concepts: list[str] = []

    for i in range(len(tokens)):
        t = tokens[i]
        if t in _STOPWORDS:
            continue
        # bigrams
        if i + 1 < len(tokens) and tokens[i + 1] not in _STOPWORDS:
            concepts.append(f"{t} {tokens[i+1]}")
        # trigrams
        if (
            i + 2 < len(tokens)
            and tokens[i + 1] not in _STOPWORDS
            and tokens[i + 2] not in _STOPWORDS
        ):
            concepts.append(f"{t} {tokens[i+1]} {tokens[i+2]}")

    # deduplicate preserving order
    seen: set[str] = set()
    result: list[str] = []
    for c in concepts:
        if c not in seen:
            seen.add(c)
            result.append(c)
    return result


# ---------------------------------------------------------------------------
# OpenAlex parsing
# ---------------------------------------------------------------------------

def _reconstruct_abstract(inverted_index: dict | None) -> str | None:
    """OpenAlex stores abstracts as a word -> [positions] inverted index."""
    if not inverted_index:
        return None
    positions: list[tuple[int, str]] = []
    for word, idxs in inverted_index.items():
        for i in idxs:
            positions.append((i, word))
    if not positions:
        return None
    positions.sort()
    return " ".join(word for _, word in positions)


def _openalex_concepts(work: dict) -> list[str]:
    """Return relevant concept names from an OpenAlex work, lowercased."""
    out: list[str] = []
    for c in work.get("concepts", []):
        name = c.get("display_name")
        if not name:
            continue
        if c.get("level", 0) < OPENALEX_MIN_CONCEPT_LEVEL:
            continue
        if c.get("score", 0) < OPENALEX_MIN_CONCEPT_SCORE:
            continue
        out.append(name.lower())
    # dedupe preserving order
    seen: set[str] = set()
    result: list[str] = []
    for c in out:
        if c not in seen:
            seen.add(c)
            result.append(c)
    return result


def _openalex_fields(work: dict) -> list[str]:
    """Derive fields-of-study from the work's primary topic / level-0 concepts."""
    fields: list[str] = []
    topic = work.get("primary_topic") or {}
    for key in ("field", "domain"):
        name = (topic.get(key) or {}).get("display_name")
        if name:
            fields.append(name)
    # add broad (level 0) concepts as additional field signals
    for c in work.get("concepts", []):
        if c.get("level") == 0 and c.get("display_name"):
            fields.append(c["display_name"])
    # dedupe preserving order
    seen: set[str] = set()
    result: list[str] = []
    for f in fields:
        if f not in seen:
            seen.add(f)
            result.append(f)
    return result


_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _parse_openalex_work(work: dict, fallback_field: str, idx: int) -> Paper:
    abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))
    title = work.get("title") or work.get("display_name") or ""
    # OpenAlex titles occasionally embed HTML (e.g. <i>...</i>) — strip it.
    title = _HTML_TAG_RE.sub("", title).strip()

    concepts = _openalex_concepts(work)
    if not concepts:
        # fall back to n-gram extraction over title + abstract
        concepts = extract_concepts(title, abstract)

    fields = _openalex_fields(work) or [fallback_field]

    return Paper(
        paper_id=work.get("id", f"unknown_{idx}"),
        title=title,
        abstract=abstract,
        year=work.get("publication_year"),
        fields_of_study=fields,
        citation_count=work.get("cited_by_count", 0) or 0,
        tldr=None,
        concepts=concepts,
    )


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _cache_path(field: str, year_filter: int | None, page: int) -> Path:
    safe = re.sub(r"[^a-z0-9]", "_", field.lower())
    yr = str(year_filter) if year_filter else "any"
    return CACHE_DIR / f"{safe}_{yr}_{page}.json"


def _load_cache(path: Path) -> dict | None:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return None
    return None


def _save_cache(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data))


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

async def fetch_papers_for_field(
    field: str,
    max_papers: int,
    year_filter: int | None,
    progress_cb: Callable[[int], None] | None = None,
) -> list[Paper]:
    """Fetch papers for a single field from OpenAlex."""
    papers: list[Paper] = []
    page = 1  # OpenAlex pagination is 1-based
    page_size = min(100, max_papers)  # OpenAlex caps per-page at 200
    fetched = 0

    async with httpx.AsyncClient() as client:
        while fetched < max_papers:
            cache_path = _cache_path(field, year_filter, page)
            cached = _load_cache(cache_path)

            if cached:
                data = cached
            else:
                params: dict = {
                    "search": field,
                    "per-page": page_size,
                    "page": page,
                    "mailto": OPENALEX_MAILTO,
                    # rank by citations so we get the field's foundational work
                    "sort": "cited_by_count:desc",
                }
                if year_filter:
                    params["filter"] = f"publication_year:<{year_filter}"

                try:
                    data = await _rate_limited_get(client, OPENALEX_BASE_URL, params)
                    _save_cache(cache_path, data)
                except Exception as exc:
                    print(f"[ingestion] Error fetching '{field}' page {page}: {exc}")
                    break

            raw_papers = data.get("results", [])
            if not raw_papers:
                break

            for item in raw_papers:
                if fetched >= max_papers:
                    break
                papers.append(_parse_openalex_work(item, field, fetched))
                fetched += 1

            if progress_cb:
                progress_cb(min(fetched, max_papers))

            page += 1
            # If OpenAlex returned fewer than a full page, we've exhausted results
            if len(raw_papers) < page_size:
                break

    return papers


async def fetch_papers_for_fields(
    fields: list[str],
    max_papers_per_field: int,
    year_filter: int | None,
    progress_cb: Callable[[int, int], None] | None = None,
) -> tuple[list[Paper], list[str]]:
    """
    Fetch papers for multiple fields sequentially (rate-limit safe).

    Returns (all_papers, failed_fields) where failed_fields lists the fields
    that returned zero papers (a network error or a query OpenAlex doesn't
    recognise), so callers can surface a partial-result warning.
    """
    all_papers: list[Paper] = []
    failed_fields: list[str] = []
    total = len(fields) * max_papers_per_field

    for i, field in enumerate(fields):
        base = i * max_papers_per_field

        def _cb(n: int, base: int = base) -> None:
            if progress_cb:
                progress_cb(base + n, total)

        field_papers = await fetch_papers_for_field(
            field, max_papers_per_field, year_filter, _cb
        )
        if not field_papers:
            failed_fields.append(field)
        all_papers.extend(field_papers)

    return all_papers, failed_fields
