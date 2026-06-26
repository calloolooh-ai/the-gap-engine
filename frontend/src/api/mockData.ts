import type { GraphExport, Gap } from "../types";

export const mockGraphExport: GraphExport = {
  job_id: "mock-job-001",
  node_count: 10,
  edge_count: 12,
  gap_count: 1,
  nodes: [
    {
      id: "network_topology",
      label: "Network Topology",
      field: ["Computer Science", "Mathematics"],
      paper_count: 142,
      community_id: 0,
    },
    {
      id: "epidemiology",
      label: "Epidemiology",
      field: ["Medicine", "Biology"],
      paper_count: 198,
      community_id: 1,
    },
    {
      id: "scale_free_networks",
      label: "Scale-Free Networks",
      field: ["Computer Science", "Mathematics"],
      paper_count: 87,
      community_id: 0,
    },
    {
      id: "disease_spread",
      label: "Disease Spread",
      field: ["Medicine", "Biology"],
      paper_count: 165,
      community_id: 1,
    },
    {
      id: "graph_theory",
      label: "Graph Theory",
      field: ["Mathematics"],
      paper_count: 231,
      community_id: 0,
    },
    {
      id: "infection_rates",
      label: "Infection Rates",
      field: ["Medicine", "Biology"],
      paper_count: 119,
      community_id: 1,
    },
    {
      id: "complex_systems",
      label: "Complex Systems",
      field: ["Physics", "Computer Science"],
      paper_count: 94,
      community_id: 0,
    },
    {
      id: "contagion_dynamics",
      label: "Contagion Dynamics",
      field: ["Medicine", "Biology"],
      paper_count: 76,
      community_id: 1,
    },
    {
      id: "social_networks",
      label: "Social Networks",
      field: ["Computer Science", "Economics"],
      paper_count: 183,
      community_id: 0,
    },
    {
      id: "viral_propagation",
      label: "Viral Propagation",
      field: ["Biology", "Medicine"],
      paper_count: 102,
      community_id: 1,
    },
  ],
  edges: [
    // CS/Math cluster edges
    {
      source: "network_topology",
      target: "scale_free_networks",
      weight: 0.82,
      is_gap: false,
    },
    {
      source: "network_topology",
      target: "graph_theory",
      weight: 0.91,
      is_gap: false,
    },
    {
      source: "scale_free_networks",
      target: "complex_systems",
      weight: 0.74,
      is_gap: false,
    },
    {
      source: "graph_theory",
      target: "complex_systems",
      weight: 0.68,
      is_gap: false,
    },
    {
      source: "social_networks",
      target: "scale_free_networks",
      weight: 0.79,
      is_gap: false,
    },
    {
      source: "social_networks",
      target: "network_topology",
      weight: 0.61,
      is_gap: false,
    },
    // Biology/Medicine cluster edges
    {
      source: "epidemiology",
      target: "disease_spread",
      weight: 0.93,
      is_gap: false,
    },
    {
      source: "disease_spread",
      target: "infection_rates",
      weight: 0.88,
      is_gap: false,
    },
    {
      source: "epidemiology",
      target: "infection_rates",
      weight: 0.77,
      is_gap: false,
    },
    {
      source: "contagion_dynamics",
      target: "disease_spread",
      weight: 0.85,
      is_gap: false,
    },
    {
      source: "viral_propagation",
      target: "contagion_dynamics",
      weight: 0.72,
      is_gap: false,
    },
    // THE GAP: cross-domain bridge that nobody has written
    {
      source: "network_topology",
      target: "epidemiology",
      weight: 0.12,
      is_gap: true,
      gap_id: "gap_001",
      gap_type: "cross_domain",
    },
  ],
  communities: {
    0: "CS / Math / Physics",
    1: "Biology / Medicine",
  },
  built_at: "2005-01-01T00:00:00Z",
};

export const mockGaps: Gap[] = [
  {
    gap_id: "gap_001",
    type: "cross_domain",
    node_a: "network topology",
    node_b: "epidemiology",
    bridging_concepts: ["scale-free topology", "hub nodes", "transmission networks"],
    field_a: "Computer Science",
    field_b: "Medicine",
    leverage_score: 87,
    score_components: {
      betweenness_centrality: 0.87,
      community_reach: 0.92,
      citation_momentum: 0.78,
      cross_domain_bonus: 1.0,
    },
    question: {
      gap_id: "gap_001",
      question:
        "Do scale-free network properties — specifically the power-law degree distribution seen in internet routing graphs — govern epidemic thresholds in human contact networks, implying that targeting high-degree 'hub' individuals could eliminate disease spread even without achieving classical herd immunity?",
      why_matters:
        "If contact networks follow a scale-free topology, the epidemic threshold approaches zero, meaning pathogens can spread at arbitrarily low transmission rates. Identifying and vaccinating hub nodes could collapse transmission chains far more efficiently than uniform vaccination strategies.",
      historical_analogy:
        "Barabási & Albert (1999) showed the internet follows a power-law degree distribution. Pastor-Satorras & Vespignani (2001) then applied this to epidemic spreading — overturning classical SIR model assumptions and reshaping vaccination strategy for two decades.",
      model_used: "mock",
      generated_at: "2005-01-01T00:00:00Z",
    },
  },
  {
    gap_id: "gap_002",
    type: "structural",
    node_a: "topological data analysis",
    node_b: "protein folding",
    bridging_concepts: ["persistent homology", "shape descriptors"],
    field_a: "Mathematics",
    field_b: "Biology",
    leverage_score: 74,
    score_components: {
      betweenness_centrality: 0.74,
      community_reach: 0.80,
      citation_momentum: 0.65,
      cross_domain_bonus: 1.0,
    },
    question: null,
  },
  {
    gap_id: "gap_003",
    type: "cross_domain",
    node_a: "active matter",
    node_b: "neural dynamics",
    bridging_concepts: ["collective motion", "self-organization"],
    field_a: "Physics",
    field_b: "Neuroscience",
    leverage_score: 61,
    score_components: {
      betweenness_centrality: 0.58,
      community_reach: 0.71,
      citation_momentum: 0.55,
      cross_domain_bonus: 1.0,
    },
    question: null,
  },
];

export const mockGap: Gap = {
  gap_id: "gap_001",
  type: "cross_domain",
  node_a: "network_topology",
  node_b: "epidemiology",
  bridging_concepts: [
    "scale-free topology",
    "hub nodes",
    "transmission networks",
    "degree distribution",
    "super-spreaders",
  ],
  field_a: "Computer Science",
  field_b: "Medicine",
  leverage_score: 87,
  score_components: {
    betweenness_centrality: 0.34,
    community_reach: 0.91,
    citation_momentum: 0.62,
    cross_domain_bonus: 0.25,
  },
  question: {
    gap_id: "gap_001",
    question:
      "Do scale-free network properties — specifically the power-law degree distribution seen in internet routing graphs — govern epidemic thresholds in human contact networks, implying that targeting high-degree 'hub' individuals could eliminate disease spread even without achieving classical herd immunity?",
    why_matters:
      "If contact networks follow a scale-free topology, the epidemic threshold approaches zero, meaning pathogens can spread at arbitrarily low transmission rates. Identifying and vaccinating hub nodes could collapse transmission chains far more efficiently than uniform vaccination strategies, potentially halving the doses required to suppress an outbreak.",
    historical_analogy:
      "Barabási & Albert (1999) showed the internet follows a power-law degree distribution. Pastor-Satorras & Vespignani (2001) then applied this to epidemic spreading, demonstrating that scale-free networks have a vanishing epidemic threshold — a result that overturned classical SIR model assumptions and reshaped vaccination strategy for the next two decades.",
    model_used: "mock",
    generated_at: "2005-01-01T00:00:00Z",
  },
};
