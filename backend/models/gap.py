from __future__ import annotations
from pydantic import BaseModel

from models.graph import GraphExport


class PaperRef(BaseModel):
    """A lightweight reference to a real source paper (from OpenAlex)."""
    paper_id: str
    title: str
    year: int | None = None
    citation_count: int = 0


class GapEvidence(BaseModel):
    """Real-paper provenance behind a detected gap."""
    count_a: int            # papers mentioning concept A
    count_b: int            # papers mentioning concept B
    count_both: int         # papers mentioning BOTH (the gap: typically 0)
    sample_a: list[PaperRef] = []
    sample_b: list[PaperRef] = []


class Gap(BaseModel):
    gap_id: str
    type: str  # "structural"|"cross_domain"
    node_a: str
    node_b: str
    bridging_concepts: list[str]
    field_a: str
    field_b: str
    leverage_score: float  # 0-100
    score_components: dict
    evidence: GapEvidence | None = None
    question: dict | None = None


class ResearchQuestion(BaseModel):
    model_config = {"protected_namespaces": ()}

    gap_id: str
    question: str
    why_matters: str
    historical_analogy: str
    model_used: str
    generated_at: str


class HistoricalTargetGap(BaseModel):
    name: str
    description: str
    actual_discovery_year: int
    key_papers: list[str]


class HistoricalValidationResult(BaseModel):
    job_id: str
    target_gap: HistoricalTargetGap
    engine_detected: bool
    engine_gap: Gap | None = None
    engine_question: ResearchQuestion | None = None
    graph_export: GraphExport
    validation_text: str
