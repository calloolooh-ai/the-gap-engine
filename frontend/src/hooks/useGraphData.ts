import { useState, useCallback, useRef } from "react";
import type { GraphExport, BuildRequest, JobStatus } from "../types";
import { buildGraph, getStatus, getExport } from "../api/graph";
import { mockGraphExport } from "../api/mockData";

type Stage = JobStatus["stage"] | "idle";

interface GraphDataState {
  graphData: GraphExport | null;
  isBuilding: boolean;
  progress: number;
  stage: Stage;
  error: string | null;
  startBuild: (req: BuildRequest, onComplete?: (jobId: string) => void) => void;
  loadDemo: () => void;
}

const POLL_INTERVAL_MS = 2000;

// Toggle this to use mock data instead of real API
const USE_MOCK = false;

export function useGraphData(): GraphDataState {
  const [graphData, setGraphData] = useState<GraphExport | null>(
    USE_MOCK ? mockGraphExport : null
  );
  const [isBuilding, setIsBuilding] = useState(false);
  const [progress, setProgress] = useState(USE_MOCK ? 100 : 0);
  const [stage, setStage] = useState<Stage>(USE_MOCK ? "complete" : "idle");
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startBuild = useCallback(
    async (req: BuildRequest, onComplete?: (jobId: string) => void) => {
      if (USE_MOCK) {
        // Simulate build with mock data
        setIsBuilding(true);
        setStage("fetching");
        setProgress(0);
        setError(null);

        const stages: Array<[Stage, number]> = [
          ["fetching", 20],
          ["building", 45],
          ["detecting_gaps", 70],
          ["scoring", 90],
          ["complete", 100],
        ];

        for (const [s, p] of stages) {
          await new Promise<void>((r) => setTimeout(r, 400));
          setStage(s);
          setProgress(p);
        }

        setGraphData(mockGraphExport);
        setIsBuilding(false);
        return;
      }

      // Real API path — keep previous graphData visible until new one is ready
      stopPolling();
      setIsBuilding(true);
      setStage("fetching");
      setProgress(0);
      setError(null);

      let job_id: string;
      try {
        const res = await buildGraph(req);
        job_id = res.job_id;
      } catch (e) {
        setError((e as Error).message);
        setIsBuilding(false);
        setStage("error");
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const status = await getStatus(job_id);
          setStage(status.stage);
          setProgress(status.progress);

          if (status.stage === "complete") {
            stopPolling();
            const exported = await getExport(job_id);
            setGraphData(exported);  // only clear old graph when new one is ready
            setIsBuilding(false);
            onComplete?.(job_id);  // let caller fetch this job's gaps
          } else if (status.stage === "error") {
            stopPolling();
            setError(status.error ?? "Build failed");
            setIsBuilding(false);
          }
        } catch (e) {
          stopPolling();
          setError((e as Error).message);
          setIsBuilding(false);
          setStage("error");
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  const loadDemo = useCallback(async () => {
    setGraphData(mockGraphExport);
    setStage("complete");
    setProgress(100);
    setError(null);
  }, []);

  return { graphData, isBuilding, progress, stage, error, startBuild, loadDemo };
}
