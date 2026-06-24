"""
Build a NetworkX concept co-occurrence graph from Paper objects.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Callable

import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

from config import MIN_PAPER_COUNT
from models.paper import Paper


def build_graph(
    papers: list[Paper],
    progress_cb: Callable[[int], None] | None = None,
) -> nx.Graph:
    """
    Build an undirected weighted graph where:
    - Nodes  = unique concept strings
    - Edges  = concept co-occurrence within the same paper (weight = count)

    Steps
    -----
    1. Count how many papers each concept appears in.
    2. Prune concepts appearing in fewer than MIN_PAPER_COUNT papers.
    3. Build edge co-occurrence counts.
    4. Attach community labels via greedy modularity.
    5. Store per-node metadata (paper_count, field, community_id).
    """
    total_steps = 5

    # -------------------------------------------------------------------------
    # 1. Count concept → paper appearances and concept → fields
    # -------------------------------------------------------------------------
    concept_paper_count: Counter[str] = Counter()
    concept_fields: defaultdict[str, set[str]] = defaultdict(set)
    # concept -> list of source papers (for real-evidence provenance behind gaps)
    concept_papers: defaultdict[str, list[Paper]] = defaultdict(list)

    for paper in papers:
        seen_in_paper: set[str] = set()
        for c in paper.concepts:
            if c not in seen_in_paper:
                concept_paper_count[c] += 1
                concept_papers[c].append(paper)
                seen_in_paper.add(c)
            for f in paper.fields_of_study:
                concept_fields[c].add(f)

    if progress_cb:
        progress_cb(1)

    # -------------------------------------------------------------------------
    # 2. Prune rare concepts
    # -------------------------------------------------------------------------
    valid_concepts: set[str] = {
        c for c, cnt in concept_paper_count.items() if cnt >= MIN_PAPER_COUNT
    }

    if progress_cb:
        progress_cb(2)

    # -------------------------------------------------------------------------
    # 3. Build edge co-occurrence counts
    # -------------------------------------------------------------------------
    edge_weight: Counter[tuple[str, str]] = Counter()

    for paper in papers:
        # only keep valid concepts for this paper, deduplicated
        concepts = list(dict.fromkeys(c for c in paper.concepts if c in valid_concepts))
        for i in range(len(concepts)):
            for j in range(i + 1, len(concepts)):
                a, b = concepts[i], concepts[j]
                key = (min(a, b), max(a, b))
                edge_weight[key] += 1

    if progress_cb:
        progress_cb(3)

    # -------------------------------------------------------------------------
    # 4. Build NetworkX graph
    # -------------------------------------------------------------------------
    G = nx.Graph()

    for concept in valid_concepts:
        src = concept_papers[concept]
        # Full id set for accurate intersection math; capped metadata sample for display.
        paper_ids = [p.paper_id for p in src]
        top = sorted(src, key=lambda p: p.citation_count, reverse=True)[:5]
        papers_sample = [
            {
                "paper_id": p.paper_id,
                "title": p.title,
                "year": p.year,
                "citation_count": p.citation_count,
            }
            for p in top
        ]
        G.add_node(
            concept,
            paper_count=concept_paper_count[concept],
            field=list(concept_fields[concept]),
            community_id=0,  # filled below
            paper_ids=paper_ids,
            papers=papers_sample,
        )

    for (a, b), weight in edge_weight.items():
        if a in G and b in G:
            G.add_edge(a, b, weight=weight)

    # Remove isolates (no edges)
    isolates = list(nx.isolates(G))
    G.remove_nodes_from(isolates)

    if progress_cb:
        progress_cb(4)

    # -------------------------------------------------------------------------
    # 5. Community detection
    # -------------------------------------------------------------------------
    if G.number_of_nodes() > 0:
        communities = list(greedy_modularity_communities(G, weight="weight"))
        for comm_id, community in enumerate(communities):
            for node in community:
                G.nodes[node]["community_id"] = comm_id

    if progress_cb:
        progress_cb(5)

    return G


def graph_to_export_data(
    G: nx.Graph,
    job_id: str,
    gaps: list | None = None,
    failed_fields: list[str] | None = None,
) -> dict:
    """
    Serialise a NetworkX graph into the GraphExport shape (as a plain dict).
    gaps is a list of Gap objects; their edges will be marked is_gap=True.
    failed_fields lists requested fields that returned no papers.
    """
    from datetime import datetime, timezone

    gaps = gaps or []
    failed_fields = failed_fields or []

    # Build a lookup: (node_a, node_b) → gap
    gap_edge_lookup: dict[tuple[str, str], object] = {}
    for gap in gaps:
        key = (min(gap.node_a, gap.node_b), max(gap.node_a, gap.node_b))
        gap_edge_lookup[key] = gap

    # --- Nodes ---
    nodes = []
    for node, data in G.nodes(data=True):
        nodes.append(
            {
                "id": node,
                "label": node,
                "field": data.get("field", []),
                "paper_count": data.get("paper_count", 1),
                "community_id": data.get("community_id", 0),
                "x": data.get("x"),
                "y": data.get("y"),
            }
        )

    # --- Edges ---
    edges = []
    for u, v, data in G.edges(data=True):
        key = (min(u, v), max(u, v))
        gap = gap_edge_lookup.get(key)
        edges.append(
            {
                "source": u,
                "target": v,
                "weight": float(data.get("weight", 1.0)),
                "is_gap": gap is not None,
                "gap_id": gap.gap_id if gap else None,
                "gap_type": gap.type if gap else None,
            }
        )

    # Also add gap edges that don't exist in the graph yet
    for gap in gaps:
        key = (min(gap.node_a, gap.node_b), max(gap.node_a, gap.node_b))
        if not G.has_edge(gap.node_a, gap.node_b):
            edges.append(
                {
                    "source": gap.node_a,
                    "target": gap.node_b,
                    "weight": 0.0,
                    "is_gap": True,
                    "gap_id": gap.gap_id,
                    "gap_type": gap.type,
                }
            )

    # --- Communities ---
    communities: dict[int, str] = {}
    for node, data in G.nodes(data=True):
        cid = data.get("community_id", 0)
        if cid not in communities:
            # label with most common field in this community
            fields = data.get("field", [])
            communities[cid] = fields[0] if fields else f"Community {cid}"

    return {
        "job_id": job_id,
        "node_count": G.number_of_nodes(),
        "edge_count": G.number_of_edges(),
        "gap_count": len(gaps),
        "nodes": nodes,
        "edges": edges,
        "communities": communities,
        "built_at": datetime.now(timezone.utc).isoformat(),
        "failed_fields": failed_fields,
    }
