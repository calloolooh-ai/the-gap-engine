"""
Precompute the cascade for the top demo gap and save to data/example_cascade.json.
Run with: python3.13 scripts/generate_demo_cascade.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure backend/ is on sys.path
_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

import networkx as nx
from config import DATA_DIR
from core.cascade import compute_cascade
from models.gap import Gap

GRAPH_PATH = DATA_DIR / "example_graph.json"
GAPS_PATH = DATA_DIR / "example_gaps.json"
CASCADE_PATH = DATA_DIR / "example_cascade.json"


def rebuild_graph(graph_data: dict) -> nx.Graph:
    G = nx.Graph()
    for node in graph_data["nodes"]:
        G.add_node(
            node["id"],
            paper_count=node.get("paper_count", 1),
            field=node.get("field", []),
            community_id=node.get("community_id", 0),
        )
    for edge in graph_data["edges"]:
        if not edge.get("is_gap"):
            G.add_edge(edge["source"], edge["target"], weight=edge.get("weight", 1.0))
    return G


def main() -> None:
    graph_data = json.loads(GRAPH_PATH.read_text())
    gaps_data = json.loads(GAPS_PATH.read_text())

    G = rebuild_graph(graph_data)
    gaps = [Gap(**g) for g in gaps_data]

    if not gaps:
        print("No gaps found — run generate_demo_graph.py first.")
        sys.exit(1)

    # Pick the gap that produces the strongest cascade (most unlocked gaps).
    # Fall back to highest leverage_score if none produce a cascade.
    best_gap = gaps[0]
    best_result: dict = {}
    best_score = -1
    for candidate in gaps:
        r = compute_cascade(G, gaps, candidate.gap_id)
        score = r["unlocked_count"] * 10 + len(r["affected_nodes"])
        if score > best_score:
            best_score = score
            best_gap = candidate
            best_result = r

    top_gap = best_gap
    result = best_result
    print(f"Computing cascade for: {top_gap.node_a} → {top_gap.node_b} (leverage {top_gap.leverage_score})")
    result["demo_gap_id"] = top_gap.gap_id  # tag so frontend knows which gap it's for

    CASCADE_PATH.write_text(json.dumps(result, indent=2))
    print(f"Wrote {CASCADE_PATH}")
    print(f"  found={result['found']}  unlocked={result['unlocked_count']}  affected_nodes={len(result['affected_nodes'])}")


if __name__ == "__main__":
    main()
