import React, { useState, useEffect, useCallback } from "react";
import type { GraphExport, Inversion } from "../types";
import { getInversions } from "../api/inversions";

interface Props {
  graphData: GraphExport | null;
}

const DEMO_INVERSION: Inversion = {
  inversion_id: "inv_demo_001",
  cause: "immune system",
  effect: "cancer",
  verb: "suppresses",
  forward_count: 847,
  reverse_count: 0,
  example_titles: [
    "Immunosuppression and cancer risk: A systematic review",
    "T-cell exhaustion in tumor microenvironments",
  ],
  statement: "immune system suppresses cancer",
  inverse_question:
    "Does cancer suppress the immune system? 847 papers study how the immune system suppresses cancer — almost none test the reverse mechanism.",
};

/**
 * Type-C "Antimatter Query" — inline sidebar section.
 * Shows a curated demo example in demo mode; mines the live corpus when a real
 * graph is built.
 */
export const InversionPanel: React.FC<Props> = ({ graphData }) => {
  const [open, setOpen] = useState(true);
  const [inversions, setInversions] = useState<Inversion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const jobId = graphData?.job_id;
  const isReal = !!jobId && jobId !== "demo";

  const load = useCallback(async () => {
    if (!isReal || !jobId) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await getInversions(jobId);
      setInversions(res.inversions);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, [isReal, jobId]);

  useEffect(() => {
    if (open && isReal && status === "idle") load();
  }, [open, isReal, status, load]);

  useEffect(() => {
    setInversions([]);
    setStatus("idle");
    setError(null);
  }, [jobId]);

  const displayInversions = isReal ? inversions : [DEMO_INVERSION];

  return (
    <div style={styles.container}>
      <button style={styles.header} onClick={() => setOpen((o) => !o)}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>⇄</span>
          <div>
            <div style={styles.title}>Antimatter Query</div>
            <div style={styles.subtitle}>Studied A→B · untested B→A</div>
          </div>
        </div>
        <span style={styles.chevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={styles.body}>
          {!isReal && (
            <div style={styles.demoBadge}>
              Demo example · build a live graph to mine your own corpus
            </div>
          )}
          {isReal && status === "loading" && (
            <div style={styles.hint}>Scanning corpus for one-way claims…</div>
          )}
          {isReal && status === "error" && (
            <div style={styles.hint}>Couldn't load: {error}</div>
          )}
          {isReal && status === "done" && inversions.length === 0 && (
            <div style={styles.hint}>
              No clean one-directional claims found. Try broader causal fields
              (e.g. medicine, climate).
            </div>
          )}
          {displayInversions.map((inv) => (
            <div key={inv.inversion_id} style={styles.card}>
              <div style={styles.statement}>
                <span style={styles.cause}>{inv.cause}</span>
                <span style={styles.verb}> {inv.verb} </span>
                <span style={styles.effect}>{inv.effect}</span>
              </div>
              <div style={styles.antimatter}>
                <span style={styles.qmark}>?</span>
                <span style={styles.effect}>{inv.effect}</span>
                <span style={styles.verbGhost}> {inv.verb} </span>
                <span style={styles.cause}>{inv.cause}</span>
                <span style={styles.zero}>0 papers</span>
              </div>
              <div style={styles.question}>{inv.inverse_question}</div>
              <div style={styles.meta}>
                {inv.forward_count} paper{inv.forward_count === 1 ? "" : "s"} study
                the forward direction · inverse untested
              </div>
              {inv.example_titles[0] && (
                <div style={styles.example}>"{inv.example_titles[0]}"</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: "1px solid #2d2d2d",
    background: "rgba(139,92,246,0.04)",
    flexShrink: 0,
  },
  header: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    fontSize: 16,
    color: "#a78bfa",
    fontWeight: 700,
  },
  title: { fontSize: 12, fontWeight: 700, color: "#e5e7eb" },
  subtitle: { fontSize: 10, color: "#8b5cf6", marginTop: 1 },
  chevron: { fontSize: 10, color: "#6b7280" },
  body: {
    padding: "0 10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 280,
    overflowY: "auto",
  },
  demoBadge: {
    fontSize: 10,
    color: "#a78bfa",
    background: "rgba(139,92,246,0.12)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 4,
    padding: "3px 8px",
    lineHeight: 1.5,
  },
  hint: { fontSize: 11.5, color: "#6b7280", lineHeight: 1.6, padding: "4px 2px" },
  card: {
    background: "#111",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: 7,
    padding: "9px 10px",
  },
  statement: { fontSize: 12, lineHeight: 1.5 },
  cause: { color: "#e5e7eb", fontWeight: 600 },
  effect: { color: "#e5e7eb", fontWeight: 600 },
  verb: { color: "#10b981", fontStyle: "italic" },
  antimatter: {
    fontSize: 12,
    lineHeight: 1.5,
    marginTop: 3,
    opacity: 0.9,
    display: "flex",
    alignItems: "center",
    gap: 3,
    flexWrap: "wrap",
  },
  qmark: { color: "#a78bfa", fontWeight: 800, fontSize: 13 },
  verbGhost: { color: "#a78bfa", fontStyle: "italic" },
  zero: {
    marginLeft: "auto",
    fontSize: 10,
    color: "#ef4444",
    fontWeight: 700,
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 4,
    padding: "1px 5px",
  },
  question: {
    fontSize: 11,
    color: "#c4b5fd",
    marginTop: 5,
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  meta: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  example: {
    fontSize: 10,
    color: "#4b5563",
    marginTop: 3,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
};
