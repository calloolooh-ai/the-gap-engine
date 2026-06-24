import React from "react";
import type { Gap } from "../types";

interface Props {
  gap: Gap;
  isGenerating: boolean;
  onGenerate: (gapId: string) => void;
}

export const QuestionCard: React.FC<Props> = ({
  gap,
  isGenerating,
  onGenerate,
}) => {
  const q = gap.question;

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <div style={styles.headerLeft}>
          <span
            className={`badge badge--${gap.type === "cross_domain" ? "cross-domain" : "structural"}`}
          >
            {gap.type === "cross_domain" ? "Cross-Domain" : "Structural"}
          </span>
          <span style={styles.gapId}>{gap.gap_id}</span>
        </div>
        <div style={styles.score}>
          <span style={styles.scoreNum}>{gap.leverage_score}</span>
          <span style={styles.scoreLabel}>leverage</span>
        </div>
      </div>

      {/* Nodes */}
      <div style={styles.nodeLink}>
        <span style={styles.nodeTag}>{gap.node_a.replace(/_/g, " ")}</span>
        <span style={styles.bridgeArrow}>⟶</span>
        <span style={styles.nodeTag}>{gap.node_b.replace(/_/g, " ")}</span>
      </div>

      {/* Score components — all values are normalised to [0,1]; clamp for safety */}
      <div style={styles.components}>
        {Object.entries(gap.score_components).map(([key, val]) => {
          const pct = Math.max(0, Math.min(100, Math.round(val * 100)));
          return (
            <div key={key} style={styles.componentRow}>
              <span style={styles.componentLabel}>
                {key.replace(/_/g, " ")}
              </span>
              <div style={styles.componentBarTrack}>
                <div
                  style={{
                    ...styles.componentBarFill,
                    width: `${pct}%`,
                  }}
                />
              </div>
              <span style={styles.componentVal}>{val.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Bridging concepts */}
      <div style={styles.conceptsSection}>
        <div style={styles.sectionLabel}>Bridging concepts</div>
        <div style={styles.concepts}>
          {gap.bridging_concepts.map((c) => (
            <span key={c} style={styles.concept}>
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Evidence — real source papers behind the gap */}
      {gap.evidence && (
        <div style={styles.storySection}>
          <div style={styles.sectionLabel}>Evidence</div>
          <p style={styles.storyText}>
            <strong style={{ color: "#f59e0b" }}>{gap.evidence.count_a}</strong> papers mention{" "}
            <strong style={{ color: "#e5e7eb" }}>{gap.node_a.replace(/_/g, " ")}</strong>,{" "}
            <strong style={{ color: "#f59e0b" }}>{gap.evidence.count_b}</strong> mention{" "}
            <strong style={{ color: "#e5e7eb" }}>{gap.node_b.replace(/_/g, " ")}</strong>, but{" "}
            <strong style={{ color: gap.evidence.count_both === 0 ? "#f59e0b" : "#e5e7eb" }}>
              {gap.evidence.count_both}
            </strong>{" "}
            mention both{gap.evidence.count_both === 0 ? " — an open gap." : "."}
          </p>
          {gap.evidence.sample_a.length > 0 && (
            <div style={styles.evidenceList}>
              {gap.evidence.sample_a.slice(0, 2).map((p) => (
                <a
                  key={p.paper_id}
                  href={p.paper_id}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.evidencePaper}
                >
                  {p.title}
                  {p.year ? ` (${p.year})` : ""} · {p.citation_count.toLocaleString()} cites
                </a>
              ))}
              {gap.evidence.sample_b.slice(0, 2).map((p) => (
                <a
                  key={p.paper_id}
                  href={p.paper_id}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.evidencePaper}
                >
                  {p.title}
                  {p.year ? ` (${p.year})` : ""} · {p.citation_count.toLocaleString()} cites
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Research Question */}
      {q ? (
        <div style={styles.questionSection}>
          <div style={styles.sectionLabel}>Research Question</div>
          <p style={styles.questionText}>{q.question}</p>

          <div style={styles.sectionLabel}>Why it matters</div>
          <p style={styles.bodyText}>{q.why_matters}</p>

          <div style={styles.sectionLabel}>Historical analogy</div>
          <p style={styles.bodyText}>{q.historical_analogy}</p>

          <div style={styles.questionMeta}>
            <span style={styles.metaItem}>model: {q.model_used}</span>
            <span style={styles.metaItem}>
              {new Date(q.generated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ) : (
        <div style={styles.noQuestion}>
          <p style={styles.noQuestionText}>
            No research question generated yet.
          </p>
          <button
            style={styles.generateBtn}
            onClick={() => onGenerate(gap.gap_id)}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating…" : "Generate Question"}
          </button>
        </div>
      )}

      {/* Re-generate button when question exists */}
      {q && (
        <button
          style={styles.regenBtn}
          onClick={() => onGenerate(gap.gap_id)}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating…" : "Regenerate"}
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    background: "#161616",
    borderTop: "1px solid #2d2d2d",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px 8px",
    borderBottom: "1px solid #1f1f1f",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  gapId: {
    fontSize: 11,
    color: "#4b5563",
    fontFamily: "monospace",
  },
  score: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  scoreNum: {
    fontSize: 20,
    fontWeight: 700,
    color: "#f59e0b",
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: 10,
    color: "#4b5563",
    textTransform: "uppercase",
  },
  nodeLink: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    flexWrap: "wrap",
  },
  nodeTag: {
    fontSize: 12,
    color: "#e5e7eb",
    background: "#242424",
    padding: "3px 8px",
    borderRadius: 4,
    border: "1px solid #2d2d2d",
    fontWeight: 500,
  },
  bridgeArrow: {
    color: "#f59e0b",
    fontSize: 14,
  },
  components: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: "8px 16px",
    borderBottom: "1px solid #1f1f1f",
  },
  componentRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  componentLabel: {
    fontSize: 11,
    color: "#6b7280",
    width: 120,
    flexShrink: 0,
    textTransform: "capitalize",
  },
  componentBarTrack: {
    flex: 1,
    height: 4,
    background: "#2d2d2d",
    borderRadius: 2,
    overflow: "hidden",
  },
  componentBarFill: {
    height: "100%",
    background: "#f59e0b",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  componentVal: {
    fontSize: 11,
    color: "#9ca3af",
    width: 32,
    textAlign: "right",
    fontFamily: "monospace",
  },
  conceptsSection: {
    padding: "8px 16px",
    borderBottom: "1px solid #1f1f1f",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
  },
  concepts: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
  },
  concept: {
    fontSize: 11,
    color: "#a78bfa",
    background: "rgba(139,92,246,0.1)",
    border: "1px solid rgba(139,92,246,0.2)",
    padding: "2px 7px",
    borderRadius: 4,
  },
  questionSection: {
    padding: "10px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  questionText: {
    fontSize: 13,
    color: "#e5e7eb",
    lineHeight: 1.6,
    fontStyle: "italic",
    background: "rgba(245,158,11,0.06)",
    border: "1px solid rgba(245,158,11,0.15)",
    borderRadius: 6,
    padding: "10px 12px",
  },
  bodyText: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.6,
  },
  questionMeta: {
    display: "flex",
    gap: 12,
    paddingTop: 4,
  },
  metaItem: {
    fontSize: 11,
    color: "#4b5563",
    fontFamily: "monospace",
  },
  storySection: {
    padding: "8px 16px 10px",
    borderBottom: "1px solid #1f1f1f",
  },
  storyText: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.7,
    margin: 0,
  },
  evidenceList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 8,
  },
  evidencePaper: {
    fontSize: 11,
    color: "#7dd3fc",
    textDecoration: "none",
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
  },
  noQuestion: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  noQuestionText: {
    fontSize: 13,
    color: "#4b5563",
  },
  generateBtn: {
    padding: "8px 20px",
    background: "#f59e0b",
    color: "#0f0f0f",
    fontWeight: 700,
    fontSize: 13,
    borderRadius: 6,
  },
  regenBtn: {
    margin: "0 16px 12px",
    padding: "6px 0",
    background: "#242424",
    color: "#9ca3af",
    fontSize: 12,
    borderRadius: 5,
    border: "1px solid #2d2d2d",
  },
};
