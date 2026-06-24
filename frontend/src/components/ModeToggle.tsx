import React from "react";

interface Props {
  isHistorical: boolean;
  isRunning: boolean;
  onChange: (historical: boolean) => void;
}

export const ModeToggle: React.FC<Props> = ({
  isHistorical,
  isRunning,
  onChange,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <span style={styles.label}>Mode</span>
        <span style={styles.proofBadge}>★ Proof demo</span>
      </div>
      <div style={styles.toggleGroup}>
        <button
          style={{
            ...styles.option,
            ...(isHistorical ? {} : styles.optionActive),
          }}
          onClick={() => onChange(false)}
          disabled={isRunning}
        >
          Live
        </button>
        <button
          style={{
            ...styles.option,
            ...(isHistorical ? styles.optionActiveHistorical : {}),
          }}
          onClick={() => onChange(true)}
          disabled={isRunning}
        >
          Historical
          <span style={styles.year}>2005</span>
        </button>
      </div>

      {!isHistorical && (
        <button
          style={styles.cta}
          onClick={() => onChange(true)}
          disabled={isRunning}
        >
          {isRunning ? "Running validation…" : "▶  Prove the engine works"}
        </button>
      )}

      <p style={styles.hint}>
        {isHistorical
          ? "Running on pre-2005 literature only — watch the engine surface the network-topology × epidemiology gap that was closed in 2001. Proof it sees discoveries before they happen."
          : "Run the engine on historical literature and watch it predict a real, known breakthrough in hindsight — the strongest proof that it works."}
      </p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "12px 16px",
    borderTop: "1px solid #2d2d2d",
    background: "rgba(124,58,237,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  proofBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#c4b5fd",
    background: "rgba(124,58,237,0.18)",
    border: "1px solid rgba(124,58,237,0.4)",
    borderRadius: 4,
    padding: "1px 6px",
    letterSpacing: "0.04em",
  },
  cta: {
    width: "100%",
    padding: "8px 4px",
    background: "#7c3aed",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.15s, opacity 0.15s",
  },
  toggleGroup: {
    display: "flex",
    background: "#111",
    borderRadius: 6,
    border: "1px solid #2d2d2d",
    overflow: "hidden",
  },
  option: {
    flex: 1,
    padding: "6px 4px",
    background: "transparent",
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    border: "none",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  optionActive: {
    background: "#f59e0b",
    color: "#0f0f0f",
    borderRadius: 4,
  },
  optionActiveHistorical: {
    background: "#7c3aed",
    color: "#fff",
    borderRadius: 4,
  },
  year: {
    fontSize: 10,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    padding: "1px 4px",
  },
  hint: {
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 1.4,
  },
};
