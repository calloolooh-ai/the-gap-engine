"""
Score gaps by leverage: how much does bridging this gap unlock?

Components (all normalised to [0, 1] for the final weighted score)
------------------------------------------------------------------
betweenness_delta   : REAL betweenness centrality of the gap's anchor + bridge
                      nodes (nx.betweenness_centrality). High-betweenness anchors
                      sit on many shortest paths, so connecting them rewires the
                      most of the knowledge graph.
community_reach     : distinct communities bridged (directly + via bridge nodes)
paper_velocity      : (log) citation/paper volume of anchor nodes
cross_domain_bonus  : +1 if the gap spans different fieldsOfStudy
"""
from __future__ import annotations

import math

import networkx as nx

from models.gap import Gap

# Weights for the final score (sum to 1)
_W_BETWEENNESS = 0.35
_W_COMMUNITY = 0.30
_W_VELOCITY = 0.25
_W_CROSS = 0.10


def _log_citation(G: nx.Graph, node: str) -> float:
    pc = G.nodes[node].get("paper_count", 1)
    return math.log1p(pc)


def _community_id(G: nx.Graph, node: str) -> int:
    return G.nodes[node].get("community_id", -1)


def _betweenness_score(
    bc: dict[str, float], node_a: str, node_b: str, bridging: list[str]
) -> float:
    """
    Real-betweenness leverage: the mean betweenness centrality of the gap's
    anchor and bridge nodes. Uses a precomputed centrality map so it is
    O(1) per gap. Varies meaningfully across gaps (unlike the old degree proxy).
    """
    nodes = [node_a, node_b] + list(bridging)
    vals = [bc[n] for n in nodes if n in bc]
    if not vals:
        return 0.0
    return sum(vals) / len(vals)


def _community_reach(G: nx.Graph, node_a: str, node_b: str, bridging: list[str]) -> int:
    """Count distinct communities touched by node_a, node_b, and bridge nodes."""
    comms: set[int] = set()
    for node in [node_a, node_b] + bridging:
        if G.has_node(node):
            comms.add(_community_id(G, node))
    return len(comms)


def score_gaps(G: nx.Graph, gaps: list[Gap]) -> list[Gap]:
    """
    Compute leverage_score (0-100) for each gap in-place.
    Returns the same list, sorted descending by score.
    """
    if not gaps:
        return gaps

    # --- Real betweenness centrality, computed once over the whole graph ---
    # Unweighted (topological) betweenness: fraction of shortest paths a node
    # lies on. Cheap for our ~100-300 node graphs.
    if G.number_of_nodes() > 2:
        bc = nx.betweenness_centrality(G, normalized=True)
    else:
        bc = {n: 0.0 for n in G.nodes()}

    # Pre-compute global maxima for normalisation
    max_velocity = max(
        (math.log1p(G.nodes[n].get("paper_count", 1)) for n in G.nodes()),
        default=1.0,
    )
    max_betweenness = max(
        (
            _betweenness_score(bc, gap.node_a, gap.node_b, gap.bridging_concepts)
            for gap in gaps
        ),
        default=0.0,
    )
    max_community = max(
        (
            _community_reach(G, gap.node_a, gap.node_b, gap.bridging_concepts)
            for gap in gaps
        ),
        default=1,
    )

    for gap in gaps:
        bet = _betweenness_score(bc, gap.node_a, gap.node_b, gap.bridging_concepts)
        comm = _community_reach(G, gap.node_a, gap.node_b, gap.bridging_concepts)

        vel_a = _log_citation(G, gap.node_a) if G.has_node(gap.node_a) else 0.0
        vel_b = _log_citation(G, gap.node_b) if G.has_node(gap.node_b) else 0.0
        velocity = (vel_a + vel_b) / 2.0

        cross = 1.0 if gap.field_a != gap.field_b else 0.0

        # Normalise each component to [0, 1]
        norm_bet = bet / max_betweenness if max_betweenness > 0 else 0.0
        norm_comm = comm / max(max_community, 1)
        norm_vel = velocity / max(max_velocity, 1)

        raw = (
            _W_BETWEENNESS * norm_bet
            + _W_COMMUNITY * norm_comm
            + _W_VELOCITY * norm_vel
            + _W_CROSS * cross
        )

        gap.leverage_score = round(min(raw * 100, 100.0), 2)
        # Clean, display-ready components — all in [0, 1] so UI bars never overflow.
        # (Detection-internal keys like raw_indirect / cosine_similarity are dropped.)
        gap.score_components = {
            "betweenness_delta": round(norm_bet, 4),
            "community_reach": round(norm_comm, 4),
            "paper_velocity": round(norm_vel, 4),
            "cross_domain_bonus": cross,
        }

    gaps.sort(key=lambda g: g.leverage_score, reverse=True)
    return gaps
