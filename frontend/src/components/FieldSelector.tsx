import React, { useState, useRef } from "react";
import type { BuildRequest, GraphExport } from "../types";

const PRESET_FIELDS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Biology",
  "Medicine",
  "Economics",
  "Chemistry",
  "Engineering",
];

interface Props {
  isBuilding: boolean;
  graphData: GraphExport | null;
  onBuild: (req: BuildRequest) => void;
}

export const FieldSelector: React.FC<Props> = ({
  isBuilding,
  graphData,
  onBuild,
}) => {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["Computer Science", "Mathematics", "Biology", "Medicine"])
  );
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [maxPapers, setMaxPapers] = useState(50);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (field: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        if (next.size <= 1) return prev;
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const addCustomField = () => {
    const val = customInput.trim();
    if (!val) return;
    const allFields = [...PRESET_FIELDS, ...customFields];
    if (allFields.some((f) => f.toLowerCase() === val.toLowerCase())) {
      // already exists — just select it
      setSelected((prev) => new Set([...prev, val]));
      setCustomInput("");
      return;
    }
    setCustomFields((prev) => [...prev, val]);
    setSelected((prev) => new Set([...prev, val]));
    setCustomInput("");
    inputRef.current?.focus();
  };

  const removeCustomField = (field: string) => {
    setCustomFields((prev) => prev.filter((f) => f !== field));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  const handleBuild = () => {
    onBuild({ fields: Array.from(selected), max_papers_per_field: maxPapers });
  };

  const allFields = [...PRESET_FIELDS, ...customFields];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.title}>Fields of Study</span>
        <span style={styles.subtitle}>Select domains to analyze</span>
      </div>

      <div style={styles.fieldList}>
        {allFields.map((f) => {
          const isCustom = customFields.includes(f);
          return (
            <label key={f} style={styles.fieldRow}>
              <input
                type="checkbox"
                checked={selected.has(f)}
                onChange={() => toggle(f)}
                disabled={isBuilding}
              />
              <span style={{ ...styles.fieldLabel, flex: 1 }}>{f}</span>
              {isCustom && (
                <button
                  style={styles.removeBtn}
                  onClick={(e) => { e.preventDefault(); removeCustomField(f); }}
                  title="Remove field"
                  disabled={isBuilding}
                >
                  ×
                </button>
              )}
            </label>
          );
        })}
      </div>

      {/* Custom field input */}
      <div style={styles.customSection}>
        <div style={styles.customRow}>
          <input
            ref={inputRef}
            style={styles.customInput}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomField()}
            placeholder="Add custom field…"
            disabled={isBuilding}
          />
          <button
            style={styles.addBtn}
            onClick={addCustomField}
            disabled={isBuilding || !customInput.trim()}
          >
            +
          </button>
        </div>
      </div>

      <div style={styles.sliderSection}>
        <div style={styles.sliderLabel}>
          <span>Papers per field</span>
          <span style={{ color: "#f59e0b", fontWeight: 600 }}>{maxPapers}</span>
        </div>
        <input
          type="range"
          min={10}
          max={200}
          step={10}
          value={maxPapers}
          disabled={isBuilding}
          onChange={(e) => setMaxPapers(Number(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.sliderTicks}>
          <span>10</span>
          <span>200</span>
        </div>
      </div>

      <button
        onClick={handleBuild}
        disabled={isBuilding || selected.size === 0}
        style={styles.buildBtn}
      >
        {isBuilding ? "Building…" : "Build Graph"}
      </button>

      <p style={styles.backendNote}>
        Live builds require the{" "}
        <a
          href="https://github.com/calloolooh-ai/the-gap-engine"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.backendLink}
        >
          local backend
        </a>
        . The demo graph above is fully functional.
      </p>

      {graphData && (
        <div style={styles.stats}>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Nodes</span>
            <span style={styles.statValue}>{graphData.node_count}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Edges</span>
            <span style={styles.statValue}>{graphData.edge_count}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Gaps found</span>
            <span style={{ ...styles.statValue, color: "#f59e0b" }}>
              {graphData.gap_count}
            </span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Communities</span>
            <span style={styles.statValue}>
              {Object.keys(graphData.communities ?? {}).length}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "#1a1a1a",
    borderRight: "1px solid #2d2d2d",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    overflowY: "auto",
  },
  header: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #2d2d2d",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: "#e5e7eb",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  fieldList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    padding: "8px 0",
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 16px",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  fieldLabel: {
    fontSize: 13,
    color: "#d1d5db",
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "#4b5563",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    padding: "0 2px",
    flexShrink: 0,
  },
  customSection: {
    padding: "8px 16px 12px",
    borderTop: "1px solid #2d2d2d",
    borderBottom: "1px solid #2d2d2d",
  },
  customRow: {
    display: "flex",
    gap: 6,
  },
  customInput: {
    flex: 1,
    background: "#242424",
    border: "1px solid #2d2d2d",
    borderRadius: 5,
    color: "#e5e7eb",
    fontSize: 12,
    padding: "6px 8px",
    outline: "none",
  },
  addBtn: {
    background: "#242424",
    border: "1px solid #2d2d2d",
    borderRadius: 5,
    color: "#f59e0b",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    padding: "0 10px",
    cursor: "pointer",
    flexShrink: 0,
  },
  sliderSection: {
    padding: "14px 16px",
    borderBottom: "1px solid #2d2d2d",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#9ca3af",
  },
  slider: {
    width: "100%",
    accentColor: "#f59e0b",
  },
  sliderTicks: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#4b5563",
  },
  buildBtn: {
    margin: "14px 16px 4px",
    padding: "9px 0",
    background: "#f59e0b",
    color: "#0f0f0f",
    fontWeight: 700,
    fontSize: 13,
    borderRadius: 6,
    letterSpacing: "0.02em",
  },
  backendNote: {
    margin: "0 16px 14px",
    fontSize: 11,
    color: "#4b5563",
    lineHeight: 1.5,
    textAlign: "center" as const,
  },
  backendLink: {
    color: "#6b7280",
    textDecoration: "underline",
  },
  stats: {
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    borderTop: "1px solid #2d2d2d",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  statValue: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e5e7eb",
  },
};
