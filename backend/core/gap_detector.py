"""
Detect structural and cross-domain gaps in the knowledge graph.

Type A — structural:
    Concept pairs at graph distance=2 with high indirect weight but no direct edge.
    Score = (weight(A,B) * weight(B,C)) / (1 + weight(A,C_direct))

Type B — cross-domain:
    Per-community concept vectors; cosine similarity between communities
    from different fieldsOfStudy with zero inter-community edges = gap.
"""
from __future__ import annotations

import re
import uuid
from collections import defaultdict
from itertools import combinations

import math

import networkx as nx

from models.gap import Gap, GapEvidence, PaperRef

# Parentheses signal Wikipedia disambiguation suffixes like "simple (philosophy)"
_DISAMBIG_RE = re.compile(r'\(')

# Meta/philosophical single words that produce noisy bridging concepts
_CONCEPT_STOPWORDS = frozenset({
    "matter", "form", "logic", "theory", "method", "system", "model",
    "process", "analysis", "study", "science", "research", "approach",
    "simple", "complex", "general", "basic", "applied", "nature",
    "structure", "function", "behavior", "property", "type", "class",
})


def _is_valid_bridging_concept(name: str) -> bool:
    """Accept only clean, multi-word scientific concept names as bridging concepts."""
    if _DISAMBIG_RE.search(name):
        return False
    parts = name.lower().split()
    if len(parts) < 2:
        return False
    if len(name) < 8:
        return False
    if all(w in _CONCEPT_STOPWORDS for w in parts):
        return False
    return True

# Maximum number of candidates to evaluate (performance guard)
_MAX_STRUCTURAL_CANDIDATES = 5000
_MAX_CROSS_DOMAIN_CANDIDATES = 500
_MAX_GAPS_RETURNED = 200


def _primary_field(G: nx.Graph, node: str) -> str:
    fields = G.nodes[node].get("field", [])
    return fields[0] if fields else "Unknown"


def _paper_refs(G: nx.Graph, node: str) -> list[PaperRef]:
    """Build display PaperRefs from a node's stored paper sample."""
    refs: list[PaperRef] = []
    for p in G.nodes.get(node, {}).get("papers", []):
        refs.append(
            PaperRef(
                paper_id=p.get("paper_id", ""),
                title=p.get("title", "") or "(untitled)",
                year=p.get("year"),
                citation_count=p.get("citation_count", 0) or 0,
            )
        )
    return refs


def _attach_evidence(G: nx.Graph, gap: Gap) -> None:
    """Compute real-paper provenance for a gap from node attributes."""
    a_data = G.nodes.get(gap.node_a, {})
    b_data = G.nodes.get(gap.node_b, {})
    a_ids = set(a_data.get("paper_ids", []))
    b_ids = set(b_data.get("paper_ids", []))
    gap.evidence = GapEvidence(
        count_a=a_data.get("paper_count", len(a_ids)),
        count_b=b_data.get("paper_count", len(b_ids)),
        count_both=len(a_ids & b_ids),
        sample_a=_paper_refs(G, gap.node_a)[:3],
        sample_b=_paper_refs(G, gap.node_b)[:3],
    )


# ---------------------------------------------------------------------------
# Type A — structural gaps
# ---------------------------------------------------------------------------

def _detect_structural_gaps(G: nx.Graph) -> list[Gap]:
    gaps: list[Gap] = []
    scored: list[tuple[float, str, str, list[str]]] = []

    nodes = list(G.nodes())

    for node_b in nodes:
        neighbors_b = list(G.neighbors(node_b))
        if len(neighbors_b) < 2:
            continue
        weight_b = {n: G[node_b][n].get("weight", 1.0) for n in neighbors_b}

        # All pairs of B's neighbors that don't have a direct edge
        for node_a, node_c in combinations(neighbors_b, 2):
            if G.has_edge(node_a, node_c):
                continue
            w_ab = weight_b[node_a]
            w_bc = weight_b[node_c]
            indirect = w_ab * w_bc
            score = indirect / 1.0  # direct weight is 0 (no edge)
            scored.append((score, node_a, node_c, [node_b]))

            if len(scored) >= _MAX_STRUCTURAL_CANDIDATES * 10:
                break
        if len(scored) >= _MAX_STRUCTURAL_CANDIDATES * 10:
            break

    # Sort descending, take top candidates
    scored.sort(key=lambda x: x[0], reverse=True)
    seen: set[tuple[str, str]] = set()

    for raw_score, a, c, bridges in scored[:_MAX_STRUCTURAL_CANDIDATES]:
        key = (min(a, c), max(a, c))
        if key in seen:
            continue
        seen.add(key)

        gap = Gap(
            gap_id=f"gap_struct_{uuid.uuid4().hex[:8]}",
            type="structural",
            node_a=a,
            node_b=c,
            bridging_concepts=bridges,
            field_a=_primary_field(G, a),
            field_b=_primary_field(G, c),
            leverage_score=0.0,  # filled by leverage_scorer
            score_components={"raw_indirect": raw_score},
        )
        gaps.append(gap)
        if len(gaps) >= _MAX_GAPS_RETURNED // 2:
            break

    return gaps


# ---------------------------------------------------------------------------
# Type B — cross-domain gaps
# ---------------------------------------------------------------------------

_MIN_COMMUNITY_SIZE = 3   # skip tiny communities that produce noisy gaps
_CROSS_COSINE_THRESHOLD = 0.15  # raised from 0.05 to cut near-random overlap


def _detect_cross_domain_gaps(G: nx.Graph) -> list[Gap]:
    """
    Group nodes by community. For each pair of communities from different
    primary fields with NO inter-community edges, compute concept-vector
    cosine similarity using actual concept node names weighted by paper_count.
    High similarity + no edges = cross-domain gap.
    """
    # Group nodes by community; skip communities below minimum size
    comm_nodes: defaultdict[int, list[str]] = defaultdict(list)
    for node, data in G.nodes(data=True):
        cid = data.get("community_id", 0)
        comm_nodes[cid].append(node)

    # Filter out small communities
    comm_nodes = defaultdict(list, {
        cid: nodes for cid, nodes in comm_nodes.items()
        if len(nodes) >= _MIN_COMMUNITY_SIZE
    })

    all_communities = list(comm_nodes.keys())
    if len(all_communities) < 2:
        return []

    def _community_primary_field(cid: int) -> str:
        field_counts: defaultdict[str, int] = defaultdict(int)
        for n in comm_nodes[cid]:
            for f in G.nodes[n].get("field", []):
                field_counts[f] += 1
        if not field_counts:
            return "Unknown"
        return max(field_counts, key=field_counts.__getitem__)

    # Build vocabulary from actual concept node names (not word tokens).
    # Each node IS a concept; use node names as the feature space.
    all_concept_nodes = list(G.nodes())
    concept_idx: dict[str, int] = {c: i for i, c in enumerate(all_concept_nodes)}
    V = len(concept_idx)
    if V == 0:
        return []

    def _community_vector(cid: int) -> list[float]:
        vec = [0.0] * V
        for node in comm_nodes[cid]:
            idx = concept_idx.get(node)
            if idx is not None:
                vec[idx] = G.nodes[node].get("paper_count", 1)
        norm = math.sqrt(sum(x * x for x in vec))
        return [x / norm for x in vec] if norm > 0 else vec

    comm_vecs = {cid: _community_vector(cid) for cid in all_communities}
    comm_sets: dict[int, set[str]] = {cid: set(nodes) for cid, nodes in comm_nodes.items()}

    gaps: list[Gap] = []
    scored: list[tuple[float, int, int]] = []

    for cid_a, cid_b in combinations(all_communities, 2):
        field_a = _community_primary_field(cid_a)
        field_b = _community_primary_field(cid_b)
        if field_a == field_b:
            continue  # same field — skip

        # Count inter-community edges
        inter_edges = sum(
            1
            for n_a in comm_nodes[cid_a]
            for n_b in G.neighbors(n_a)
            if n_b in comm_sets[cid_b]
        )
        if inter_edges > 0:
            continue  # already connected

        sim = sum(a * b for a, b in zip(comm_vecs[cid_a], comm_vecs[cid_b]))
        if sim > _CROSS_COSINE_THRESHOLD:
            scored.append((sim, cid_a, cid_b))

    scored.sort(key=lambda x: x[0], reverse=True)

    for sim, cid_a, cid_b in scored[:_MAX_CROSS_DOMAIN_CANDIDATES]:
        field_a = _community_primary_field(cid_a)
        field_b = _community_primary_field(cid_b)

        # Pick representative nodes: highest paper_count from each community
        rep_a = max(
            comm_nodes[cid_a],
            key=lambda n: G.nodes[n].get("paper_count", 0),
        )
        rep_b = max(
            comm_nodes[cid_b],
            key=lambda n: G.nodes[n].get("paper_count", 0),
        )

        # Bridging concepts: actual concept nodes whose names appear in both
        # communities' node labels. Only accept clean multi-word scientific terms.
        labels_a = set(n.lower() for n in comm_nodes[cid_a])
        labels_b = set(n.lower() for n in comm_nodes[cid_b])
        shared = [
            n for n in G.nodes()
            if _is_valid_bridging_concept(n)
            and n.lower() in labels_a
            and n.lower() in labels_b
        ]
        # Fall back to overlap by substring across communities
        if not shared:
            shared = [
                n for n in list(comm_nodes[cid_a]) + list(comm_nodes[cid_b])
                if _is_valid_bridging_concept(n)
                and any(n.lower() in lbl or lbl in n.lower() for lbl in labels_b)
            ]
        bridging = sorted(shared, key=lambda n: G.nodes[n].get("paper_count", 0), reverse=True)[:3]

        gap = Gap(
            gap_id=f"gap_cross_{uuid.uuid4().hex[:8]}",
            type="cross_domain",
            node_a=rep_a,
            node_b=rep_b,
            bridging_concepts=bridging,
            field_a=field_a,
            field_b=field_b,
            leverage_score=0.0,
            score_components={"cosine_similarity": sim, "inter_edges": 0},
        )
        gaps.append(gap)
        if len(gaps) >= _MAX_GAPS_RETURNED // 2:
            break

    return gaps


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def detect_gaps(G: nx.Graph) -> list[Gap]:
    structural = _detect_structural_gaps(G)
    cross_domain = _detect_cross_domain_gaps(G)
    gaps = structural + cross_domain
    for gap in gaps:
        _attach_evidence(G, gap)
    return gaps
