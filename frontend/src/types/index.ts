// Frozen contract — must match backend exactly

export type FieldOfStudy =
  | "Computer Science"
  | "Mathematics"
  | "Physics"
  | "Biology"
  | "Medicine"
  | "Economics"
  | "Chemistry"
  | "Engineering"
  | (string & {}); // allow custom fields

export interface BuildRequest {
  fields: string[];
  max_papers_per_field: number;
  year_filter?: number;
}

export interface JobStatus {
  job_id: string;
  stage:
    | "fetching"
    | "building"
    | "detecting_gaps"
    | "scoring"
    | "complete"
    | "error";
  progress: number;
  eta_seconds: number | null;
  error?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  field: string[];
  paper_count: number;
  community_id: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  is_gap: boolean;
  gap_id?: string;
  gap_type?: "structural" | "cross_domain";
}

export interface GraphExport {
  job_id: string;
  node_count: number;
  edge_count: number;
  gap_count: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: Record<number, string>;
  built_at: string;
  failed_fields?: string[];
}

export interface PaperRef {
  paper_id: string;
  title: string;
  year: number | null;
  citation_count: number;
}

export interface GapEvidence {
  count_a: number;
  count_b: number;
  count_both: number;
  sample_a: PaperRef[];
  sample_b: PaperRef[];
}

export interface Gap {
  gap_id: string;
  type: "structural" | "cross_domain";
  node_a: string;
  node_b: string;
  bridging_concepts: string[];
  field_a: string;
  field_b: string;
  leverage_score: number;
  score_components: {
    betweenness_delta: number;
    community_reach: number;
    paper_velocity: number;
    cross_domain_bonus: number;
  };
  evidence?: GapEvidence | null;
  question?: ResearchQuestion;
}

export interface ResearchQuestion {
  gap_id: string;
  question: string;
  why_matters: string;
  historical_analogy: string;
  model_used: string;
  generated_at: string;
}

export interface QuestionRequest {
  gap_ids: string[];
  use_high_quality: boolean;
}

export interface HistoricalValidationResult {
  job_id: string;
  target_gap: {
    name: string;
    description: string;
    actual_discovery_year: number;
    key_papers: string[];
  };
  engine_detected: boolean;
  engine_gap: Gap | null;
  engine_question: ResearchQuestion | null;
  graph_export: GraphExport;
  validation_text: string;
}
