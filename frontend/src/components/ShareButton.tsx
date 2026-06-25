import React, { useState } from "react";
import type { GraphExport, Gap } from "../types";
import { apiFetch } from "../api/client";

interface Props {
  graphData: GraphExport | null;
  gaps: Gap[];
}

export const ShareButton: React.FC<Props> = ({ graphData, gaps }) => {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!graphData || graphData.node_count === 0) return null;

  const handleShare = async () => {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await apiFetch<{ share_id: string; backend: string }>("/persistence/save", {
        method: "POST",
        body: JSON.stringify({
          label: "Anti-Discovery Map",
          graph: graphData,
          gaps: gaps,
        }),
      });
      const url = `${window.location.origin}/share/${res.share_id}`;
      setShareUrl(url);
      setStatus("done");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStatus("idle");
    setShareUrl(null);
    setErrorMsg(null);
  };

  return (
    <div style={styles.wrapper}>
      {status === "idle" && (
        <button style={styles.btn} onClick={handleShare} title="Save and share this knowledge map">
          ↗ Share map
        </button>
      )}
      {status === "saving" && (
        <button style={{ ...styles.btn, opacity: 0.6 }} disabled>
          Saving…
        </button>
      )}
      {status === "done" && shareUrl && (
        <div style={styles.pill}>
          <span style={styles.urlText} title={shareUrl}>
            {shareUrl.slice(shareUrl.lastIndexOf("/share/"))}
          </span>
          <button style={styles.copyBtn} onClick={handleCopy}>
            {copied ? "✓" : "Copy"}
          </button>
          <button style={styles.resetBtn} onClick={handleReset} title="Share again">
            ×
          </button>
        </div>
      )}
      {status === "error" && (
        <div style={styles.pill}>
          <span style={{ ...styles.urlText, color: "#ef4444" }}>
            {errorMsg ?? "Save failed"}
          </span>
          <button style={styles.resetBtn} onClick={handleReset}>
            ×
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "fixed",
    bottom: 18,
    right: 18,
    zIndex: 60,
  },
  btn: {
    background: "#f59e0b",
    color: "#0f0f0f",
    border: "none",
    borderRadius: 20,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#1a1a1a",
    border: "1px solid rgba(245,158,11,0.4)",
    borderRadius: 20,
    padding: "6px 12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    maxWidth: 280,
  },
  urlText: {
    fontSize: 12,
    color: "#e5e7eb",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  copyBtn: {
    background: "#f59e0b",
    color: "#0f0f0f",
    border: "none",
    borderRadius: 10,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  resetBtn: {
    background: "transparent",
    border: "none",
    color: "#6b7280",
    fontSize: 16,
    cursor: "pointer",
    lineHeight: 1,
    padding: "0 2px",
    flexShrink: 0,
  },
};
