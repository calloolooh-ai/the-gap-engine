import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./styles/globals.css";
import { useGraphData } from "./hooks/useGraphData";
import { useGaps } from "./hooks/useGaps";
import { useHistorical } from "./hooks/useHistorical";
import { GraphCanvas } from "./components/GraphCanvas";
import { FieldSelector } from "./components/FieldSelector";
import { ModeToggle } from "./components/ModeToggle";
import { GapPanel } from "./components/GapPanel";
import { StatusBar } from "./components/StatusBar";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { Onboarding, shouldShowOnboarding } from "./components/Onboarding";
import { InversionPanel } from "./components/InversionPanel";
import type { BuildRequest, HistoricalValidationResult } from "./types";

function App() {
  const { gapId: urlGapId } = useParams<{ gapId?: string }>();
  const navigate = useNavigate();

  const [selectedGapId, setSelectedGapId] = useState<string | null>(urlGapId ?? null);
  const [isHistorical, setIsHistorical] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

  const { graphData, isBuilding, progress, stage, error: buildError, startBuild, loadDemo } = useGraphData();
  const { gaps, loadDemoGaps, fetchGaps } = useGaps();
  const {
    result: historicalResult,
    isRunning: isHistoricalRunning,
    run: runHistorical,
  } = useHistorical();

  // Load demo graph + gaps on mount
  useEffect(() => {
    loadDemo();
    loadDemoGaps();
  }, []);

  // Auto-select top gap when gaps load
  useEffect(() => {
    if (gaps.length > 0 && !selectedGapId) {
      const topGap = gaps[0];
      setSelectedGapId(topGap.gap_id);
      navigate(`/gap/${topGap.gap_id}`, { replace: true });
    }
  }, [gaps]);

  // Sync URL → selected gap
  useEffect(() => {
    if (urlGapId) setSelectedGapId(urlGapId);
  }, [urlGapId]);

  const handleBuild = useCallback(
    async (req: BuildRequest) => {
      // Clear the stale (demo) selection so the new graph's gaps drive the panel
      setSelectedGapId(null);
      startBuild(req, (jobId) => {
        fetchGaps(jobId);
      });
    },
    [startBuild, fetchGaps]
  );

  const handleModeChange = useCallback(
    async (historical: boolean) => {
      setIsHistorical(historical);
      if (historical && !historicalResult) {
        await runHistorical();
      }
    },
    [historicalResult, runHistorical]
  );

  const handleGapClick = useCallback(
    (gapId: string) => {
      setSelectedGapId(gapId);
      navigate(`/gap/${gapId}`);
    },
    [navigate]
  );

  const activeGraphData = isHistorical && historicalResult
    ? historicalResult.graph_export
    : graphData;

  const activeGaps = isHistorical && historicalResult && historicalResult.engine_gap
    ? [historicalResult.engine_gap]
    : gaps;

  const showStatusBar = isBuilding && stage !== "idle";
  const showLoadingOverlay = isBuilding;

  return (
    <>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}

      <div style={styles.root}>
        <StatusBar stage={stage} progress={progress} visible={showStatusBar} />

        <div style={styles.main}>
          {/* Left sidebar */}
          <div style={styles.leftSidebar}>
            <FieldSelector
              isBuilding={isBuilding}
              graphData={activeGraphData}
              onBuild={handleBuild}
            />
            <InversionPanel graphData={activeGraphData} />
            <ModeToggle
              isHistorical={isHistorical}
              isRunning={isHistoricalRunning}
              onChange={handleModeChange}
            />
          </div>

          {/* Center */}
          <div style={styles.canvasWrapper}>
            {isHistorical && historicalResult ? (
              <HistoricalSplitScreen
                result={historicalResult}
                currentGraphData={graphData}
                onGapClick={handleGapClick}
                selectedGapId={selectedGapId}
              />
            ) : buildError && !isBuilding ? (
              <ErrorState message={buildError} onRetry={() => { loadDemo(); loadDemoGaps(); }} />
            ) : activeGraphData && activeGraphData.node_count === 0 && !isBuilding ? (
              <EmptyGraphState onLoadDemo={() => { loadDemo(); loadDemoGaps(); }} />
            ) : activeGraphData ? (
              <GraphCanvas
                graphData={activeGraphData}
                selectedGapId={selectedGapId}
                onGapClick={handleGapClick}
              />
            ) : (
              <EmptyState onLoadDemo={() => { loadDemo(); loadDemoGaps(); }} />
            )}

            {!isBuilding &&
              activeGraphData &&
              activeGraphData.node_count > 0 &&
              activeGraphData.failed_fields &&
              activeGraphData.failed_fields.length > 0 && (
                <PartialWarning fields={activeGraphData.failed_fields} />
              )}

            {showLoadingOverlay && (
              <LoadingOverlay stage={stage} progress={progress} visible={showLoadingOverlay} />
            )}
            {isHistorical && isHistoricalRunning && (
              <LoadingOverlay stage="building" progress={50} visible={true} />
            )}
          </div>

          {/* Right gap panel */}
          <GapPanel
            gaps={activeGaps}
            selectedGapId={selectedGapId}
            onSelectGap={(id) => {
              setSelectedGapId(id);
              navigate(`/gap/${id}`);
            }}
          />
        </div>
      </div>

    </>
  );
}

// Empty state with demo load button
function EmptyState({ onLoadDemo }: { onLoadDemo: () => void }) {
  return (
    <div style={emptyStyles.container}>
      <div style={emptyStyles.hex}>⬡</div>
      <h2 style={emptyStyles.title}>Anti-Discovery Engine</h2>
      <p style={emptyStyles.subtitle}>
        An engine that would have seen the discoveries coming. It maps the
        topology of scientific knowledge and surfaces the{" "}
        <strong style={{ color: "#f59e0b" }}>high-leverage gaps</strong> — the
        questions nobody is asking yet. Select fields and click{" "}
        <strong style={{ color: "#f59e0b" }}>Build Graph</strong>, or replay
        history to watch a gap the engine flags <em>before</em> it was closed.
      </p>
      <button style={emptyStyles.demoBtn} onClick={onLoadDemo}>
        Load Example Graph
      </button>
      <div style={emptyStyles.facts}>
        <Fact label="Nodes" desc="Concepts from the literature" />
        <Fact label="Edges" desc="Co-occurrence strength" />
        <Fact label="Gaps" desc="Unexplored voids, ranked by leverage" />
      </div>
    </div>
  );
}

function Fact({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={emptyStyles.fact}>
      <span style={emptyStyles.factLabel}>{label}</span>
      <span style={emptyStyles.factDesc}>{desc}</span>
    </div>
  );
}

function EmptyGraphState({ onLoadDemo }: { onLoadDemo: () => void }) {
  return (
    <div style={emptyStyles.container}>
      <div style={{ fontSize: 48, color: "#f59e0b" }}>⚠</div>
      <h2 style={emptyStyles.title}>No Graph Built</h2>
      <p style={emptyStyles.subtitle}>
        The selected fields returned too few papers to build a knowledge graph.
        Try adding more fields, increasing the papers-per-field slider, or using
        broader field names (e.g. <strong style={{ color: "#f59e0b" }}>Biology</strong> instead of{" "}
        <strong style={{ color: "#f59e0b" }}>Molecular Neurobiology</strong>).
      </p>
      <button style={emptyStyles.demoBtn} onClick={onLoadDemo}>
        Load Example Graph
      </button>
    </div>
  );
}

function PartialWarning({ fields }: { fields: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={warnStyles.banner}>
      <span style={{ fontSize: 14 }}>⚠</span>
      <span style={warnStyles.text}>
        No papers returned for{" "}
        <strong style={{ color: "#fbbf24" }}>{fields.join(", ")}</strong> — likely
        Semantic Scholar rate-limiting. Graph built from the remaining fields.
      </span>
      <button style={warnStyles.dismiss} onClick={() => setDismissed(true)}>
        ×
      </button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={emptyStyles.container}>
      <div style={{ fontSize: 48, color: "#ef4444" }}>✗</div>
      <h2 style={{ ...emptyStyles.title, color: "#ef4444" }}>Build Failed</h2>
      <p style={emptyStyles.subtitle}>{message}</p>
      <button style={emptyStyles.demoBtn} onClick={onRetry}>
        Load Example Graph
      </button>
    </div>
  );
}

// Before/After split-screen for historical mode
interface HistoricalSplitScreenProps {
  result: HistoricalValidationResult;
  currentGraphData: ReturnType<typeof useGraphData>["graphData"];
  selectedGapId: string | null;
  onGapClick: (id: string) => void;
}

function HistoricalSplitScreen({
  result,
  currentGraphData,
  selectedGapId,
  onGapClick,
}: HistoricalSplitScreenProps) {
  // Defensive guard: if the result arrives without its core fields (e.g. a
  // still-running 202 body leaked through), render a lightweight loading
  // state rather than throwing and blanking the whole page.
  if (!result?.target_gap || !result?.graph_export) {
    return (
      <div style={{ ...splitStyles.noGraph, height: "100%" }}>
        Running historical validation…
      </div>
    );
  }
  return (
    <div style={splitStyles.container}>
      {/* Left: 2005 graph */}
      <div style={splitStyles.pane}>
        <div style={splitStyles.paneLabel}>
          <span style={splitStyles.yearTag}>2005</span>
          <span style={splitStyles.paneTitle}>Before Discovery</span>
          <span style={splitStyles.gapBadge}>Gap visible in amber</span>
        </div>
        <div style={splitStyles.graphWrapper}>
          <GraphCanvas
            graphData={result.graph_export}
            selectedGapId={result.engine_gap?.gap_id ?? null}
            onGapClick={onGapClick}
          />
        </div>
        <div style={splitStyles.validationBar}>
          <span
            style={{
              ...splitStyles.detectedChip,
              background: result.engine_detected ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
              color: result.engine_detected ? "#10b981" : "#ef4444",
              border: `1px solid ${result.engine_detected ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            {result.engine_detected ? "✓ Gap detected" : "✗ Gap missed"}
          </span>
          <span style={splitStyles.targetName}>{result.target_gap.name}</span>
          <span style={splitStyles.discoveryYear}>
            Discovered: {result.target_gap.actual_discovery_year}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={splitStyles.divider}>
        <div style={splitStyles.dividerLine} />
        <span style={splitStyles.dividerLabel}>→</span>
        <div style={splitStyles.dividerLine} />
      </div>

      {/* Right: Current graph */}
      <div style={splitStyles.pane}>
        <div style={splitStyles.paneLabel}>
          <span style={{ ...splitStyles.yearTag, background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
            2024
          </span>
          <span style={splitStyles.paneTitle}>After Discovery</span>
          <span style={{ ...splitStyles.gapBadge, color: "#10b981" }}>Gap now closed</span>
        </div>
        <div style={splitStyles.graphWrapper}>
          {currentGraphData ? (
            <GraphCanvas
              graphData={currentGraphData}
              selectedGapId={selectedGapId}
              onGapClick={onGapClick}
            />
          ) : (
            <div style={splitStyles.noGraph}>
              Build a live graph to see how the gap closed
            </div>
          )}
        </div>
        <div style={splitStyles.validationBar}>
          <span style={splitStyles.validationText}>{result.validation_text}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    background: "#0f0f0f",
    overflow: "hidden",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  leftSidebar: {
    display: "flex",
    flexDirection: "column",
    width: 240,
    flexShrink: 0,
    background: "#1a1a1a",
    borderRight: "1px solid #2d2d2d",
    overflowY: "auto",
  },
  canvasWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    minWidth: 0,
  },
};

const warnStyles: Record<string, React.CSSProperties> = {
  banner: {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    maxWidth: "70%",
    background: "rgba(120,53,15,0.92)",
    border: "1px solid rgba(245,158,11,0.4)",
    borderRadius: 8,
    padding: "8px 12px",
    zIndex: 20,
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
  },
  text: {
    fontSize: 12.5,
    color: "#fde68a",
    lineHeight: 1.4,
  },
  dismiss: {
    background: "transparent",
    border: "none",
    color: "#fde68a",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    padding: "0 2px",
    flexShrink: 0,
  },
};

const emptyStyles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 48,
    textAlign: "center",
  },
  hex: { fontSize: 64, color: "#2d2d2d" },
  title: { fontSize: 28, fontWeight: 700, color: "#e5e7eb", letterSpacing: "-0.02em" },
  subtitle: { fontSize: 15, color: "#6b7280", lineHeight: 1.7, maxWidth: 460 },
  demoBtn: {
    background: "transparent",
    border: "1px solid #f59e0b",
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    padding: "8px 20px",
    cursor: "pointer",
  },
  facts: { display: "flex", gap: 32, marginTop: 12 },
  fact: { display: "flex", flexDirection: "column", gap: 4, alignItems: "center" },
  factLabel: { fontSize: 13, fontWeight: 700, color: "#f59e0b" },
  factDesc: { fontSize: 12, color: "#4b5563", maxWidth: 140, textAlign: "center" },
};

const splitStyles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    height: "100%",
    width: "100%",
    gap: 0,
  },
  pane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  paneLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 16px",
    background: "#111",
    borderBottom: "1px solid #2d2d2d",
    flexShrink: 0,
  },
  yearTag: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    background: "rgba(245,158,11,0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245,158,11,0.3)",
  },
  paneTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e5e7eb",
  },
  gapBadge: {
    fontSize: 11,
    color: "#f59e0b",
    marginLeft: "auto",
  },
  graphWrapper: {
    flex: 1,
    position: "relative",
    minHeight: 0,
  },
  validationBar: {
    padding: "8px 16px",
    background: "#111",
    borderTop: "1px solid #2d2d2d",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
    flexWrap: "wrap",
  },
  detectedChip: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    flexShrink: 0,
  },
  targetName: {
    fontSize: 12,
    fontWeight: 600,
    color: "#e5e7eb",
  },
  discoveryYear: {
    fontSize: 11,
    color: "#6b7280",
    marginLeft: "auto",
  },
  validationText: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.5,
  },
  divider: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    flexShrink: 0,
    background: "#111",
    borderLeft: "1px solid #2d2d2d",
    borderRight: "1px solid #2d2d2d",
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    width: 1,
    background: "#2d2d2d",
  },
  dividerLabel: {
    fontSize: 16,
    color: "#4b5563",
  },
  noGraph: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    color: "#4b5563",
    textAlign: "center",
    padding: 24,
  },
};

export default App;
