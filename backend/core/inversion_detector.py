"""
Type-C gap detection — the "Antimatter Query".

For every *directional* claim asserted in the corpus ("A causes / drives /
increases B"), check whether the logical inverse ("B causes / drives /
increases A") has ever been asserted. Directional relationships whose inverse
has **zero** supporting papers are systematically unstudied — a class of gap no
other tool surfaces.

Input is the list of Paper objects for a build job plus the set of valid graph
concepts; we mine ordered (cause -> effect) assertions from titles + abstracts
and report the asymmetric ones.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Iterable

from models.paper import Paper

# Directional / causal cue verbs and phrases. Each implies LEFT -> RIGHT.
_CAUSAL_VERBS = [
    "causes", "cause", "caused", "causing",
    "induces", "induce", "induced", "inducing",
    "increases", "increase", "increased", "increasing",
    "decreases", "decrease", "decreased", "decreasing",
    "reduces", "reduce", "reduced", "reducing",
    "improves", "improve", "improved", "improving",
    "enhances", "enhance", "enhanced", "enhancing",
    "inhibits", "inhibit", "inhibited", "inhibiting",
    "suppresses", "suppress", "suppressed",
    "activates", "activate", "activated",
    "regulates", "regulate", "regulated", "regulating",
    "modulates", "modulate", "modulated",
    "drives", "drive", "driven", "driving",
    "promotes", "promote", "promoted",
    "prevents", "prevent", "prevented",
    "predicts", "predict", "predicted", "predicting",
    "affects", "affect", "affected", "affecting",
    "influences", "influence", "influenced",
    "determines", "determine", "determined",
    "controls", "control", "controlled",
    "triggers", "trigger", "triggered",
    "leads to", "results in", "gives rise to", "contributes to",
]

# Build a single regex that matches any cue verb as a whole token/phrase.
_VERB_RE = re.compile(
    r"\b(" + "|".join(re.escape(v) for v in sorted(_CAUSAL_VERBS, key=len, reverse=True)) + r")\b"
)

# How far (characters) a concept mention may sit from the verb to count.
_WINDOW = 110

# Minimum forward assertions before we treat the missing inverse as a real gap.
_MIN_FORWARD = 2
_MAX_RETURNED = 40

# Generic stopword concepts that add noise (single words or content-free terms).
_JUNK_CONCEPTS = {
    "simple", "model", "data", "analysis", "study", "result", "method",
    "approach", "process", "system", "function", "type", "form", "case",
    "effect", "factor", "level", "rate", "role", "state", "term", "value",
}


def _concept_spans(text: str, concepts: list[str]) -> list[tuple[int, int, str]]:
    """Return (start, end, concept) for every concept mention in text."""
    spans: list[tuple[int, int, str]] = []
    for c in concepts:
        # Require at least 4 chars and at least 2 words (multi-word concepts only)
        # OR at least 6 chars for single-word scientific terms.
        # Skip generic stopword concepts.
        stripped = c.strip()
        if len(stripped) < 4:
            continue
        word_count = len(stripped.split())
        if word_count == 1 and len(stripped) < 6:
            continue
        if stripped.lower() in _JUNK_CONCEPTS:
            continue
        start = 0
        while True:
            idx = text.find(stripped, start)
            if idx == -1:
                break
            spans.append((idx, idx + len(stripped), stripped))
            start = idx + len(stripped)
    return spans


def _mine_assertions(
    text: str, concepts: list[str]
) -> list[tuple[str, str, str]]:
    """
    Mine (cause, effect, verb) directed assertions from a single text.

    For each causal-verb occurrence, attach the nearest preceding concept
    (cause) and the nearest following concept (effect) within the window.
    """
    spans = _concept_spans(text, concepts)
    if len(spans) < 2:
        return []

    assertions: list[tuple[str, str, str]] = []
    for m in _VERB_RE.finditer(text):
        vstart, vend = m.start(), m.end()
        verb = m.group(1)

        # nearest concept ending just before the verb
        cause = None
        cause_gap = _WINDOW + 1
        # nearest concept starting just after the verb
        effect = None
        effect_gap = _WINDOW + 1

        for s, e, c in spans:
            if e <= vstart:
                d = vstart - e
                if d < cause_gap:
                    cause_gap, cause = d, c
            elif s >= vend:
                d = s - vend
                if d < effect_gap:
                    effect_gap, effect = d, c

        if cause and effect and cause != effect:
            assertions.append((cause, effect, verb))
    return assertions


def detect_inversions(
    papers: Iterable[Paper],
    valid_concepts: set[str] | None = None,
) -> list[dict]:
    """
    Detect Type-C inversion gaps.

    Returns a ranked list of dicts:
        {
          inversion_id, cause, effect, verb, forward_count, reverse_count,
          example_titles, statement, inverse_question
        }
    where forward_count > 0 and reverse_count == 0.
    """
    # forward[(a,b)] = set of (verb) ; evidence[(a,b)] = list of titles
    directed_count: dict[tuple[str, str], int] = defaultdict(int)
    directed_verbs: dict[tuple[str, str], set[str]] = defaultdict(set)
    directed_titles: dict[tuple[str, str], list[str]] = defaultdict(list)

    for paper in papers:
        concepts = list(paper.concepts)
        if valid_concepts is not None:
            concepts = [c for c in concepts if c in valid_concepts]
        if len(concepts) < 2:
            continue

        parts = [paper.title or ""]
        if paper.abstract:
            parts.append(paper.abstract)
        if paper.tldr:
            parts.append(paper.tldr)
        text = " ".join(parts).lower()

        seen_pairs: set[tuple[str, str]] = set()
        for cause, effect, verb in _mine_assertions(text, concepts):
            key = (cause, effect)
            directed_verbs[key].add(verb)
            if key not in seen_pairs:
                directed_count[key] += 1
                seen_pairs.add(key)
                if paper.title and len(directed_titles[key]) < 3:
                    directed_titles[key].append(paper.title)

    # An inversion gap = forward asserted, reverse never asserted.
    candidates: list[dict] = []
    for (a, b), fwd in directed_count.items():
        if fwd < _MIN_FORWARD:
            continue
        rev = directed_count.get((b, a), 0)
        if rev > 0:
            continue  # both directions studied — not a gap
        verb = sorted(directed_verbs[(a, b)], key=len, reverse=True)[0]
        candidates.append(
            {
                "inversion_id": f"inv_{abs(hash((a, b))) % (10**8):08d}",
                "cause": a,
                "effect": b,
                "verb": verb,
                "forward_count": fwd,
                "reverse_count": rev,
                "example_titles": directed_titles[(a, b)],
                "statement": f"{a} {verb} {b}",
                "inverse_question": (
                    f"Does {b} {verb} {a}? "
                    f"{fwd} paper(s) assert \"{a} {verb} {b}\" — "
                    f"none test the reverse direction."
                ),
            }
        )

    # Rank: strongest forward evidence first.
    candidates.sort(key=lambda d: d["forward_count"], reverse=True)
    return candidates[:_MAX_RETURNED]
