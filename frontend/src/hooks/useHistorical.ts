import { useState, useCallback } from "react";
import type { HistoricalValidationResult } from "../types";
import { runHistorical, getHistoricalResult } from "../api/historical";
import { mockGraphExport, mockGap } from "../api/mockData";

const USE_MOCK = false;

const MOCK_HISTORICAL: HistoricalValidationResult = {
  job_id: "historical-mock-001",
  target_gap: {
    name: "Network Topology → Epidemic Spreading",
    description:
      "Applying scale-free network theory to model epidemic thresholds in human contact networks",
    actual_discovery_year: 2001,
    key_papers: [
      "Pastor-Satorras & Vespignani (2001) — Epidemic Spreading in Scale-Free Networks",
      "Barabási & Albert (1999) — Emergence of Scaling in Random Networks",
    ],
  },
  engine_detected: true,
  engine_gap: mockGap,
  engine_question: mockGap.question ?? null,
  graph_export: { ...mockGraphExport, built_at: "2005-01-01T00:00:00Z" },
  validation_text:
    "The engine successfully identified the structural gap between network topology and epidemiology from 2005 literature. This gap was bridged by Pastor-Satorras & Vespignani in 2001, whose work demonstrated that scale-free networks have a vanishing epidemic threshold — overturning classical SIR model assumptions. The engine's question closely mirrors the actual research direction.",
};

interface HistoricalState {
  result: HistoricalValidationResult | null;
  isRunning: boolean;
  error: string | null;
  run: () => Promise<void>;
}

export function useHistorical(): HistoricalState {
  const [result, setResult] = useState<HistoricalValidationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (USE_MOCK) {
      setIsRunning(true);
      setError(null);
      await new Promise<void>((r) => setTimeout(r, 1200));
      setResult(MOCK_HISTORICAL);
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    setError(null);
    try {
      const { job_id } = await runHistorical();
      // Poll for result
      const poll = async (): Promise<HistoricalValidationResult> => {
        const data = await getHistoricalResult(job_id);
        return data;
      };
      // Poll until the background pipeline completes (202 while running).
      // The 4-field OpenAlex fetch can take a while, so allow ~3 minutes.
      let attempts = 0;
      while (attempts < 90) {
        try {
          const data = await poll();
          setResult(data);
          return;
        } catch {
          attempts++;
          await new Promise<void>((r) => setTimeout(r, 2000));
        }
      }
      throw new Error("Historical validation timed out");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { result, isRunning, error, run };
}
