import { useState, useCallback } from "react";
import type { Gap } from "../types";
import { scoreGaps } from "../api/gaps";
import { mockGaps } from "../api/mockData";

interface GapsState {
  gaps: Gap[];
  isLoading: boolean;
  error: string | null;
  fetchGaps: (job_id: string) => Promise<void>;
  loadDemoGaps: () => Promise<void>;
  setGaps: (gaps: Gap[]) => void;
}

export function useGaps(): GapsState {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGaps = useCallback(async (job_id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await scoreGaps(job_id);
      setGaps(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDemoGaps = useCallback(async () => {
    setGaps(mockGaps);
    setError(null);
  }, []);

  return { gaps, isLoading, error, fetchGaps, loadDemoGaps, setGaps };
}
