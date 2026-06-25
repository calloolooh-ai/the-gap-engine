import type { InversionsResponse, CascadeResult } from "../types";
import { apiFetch } from "./client";

export function getInversions(jobId: string): Promise<InversionsResponse> {
  return apiFetch<InversionsResponse>(`/inversions/${jobId}`);
}

export function getCascade(
  jobId: string,
  gapId: string
): Promise<CascadeResult> {
  return apiFetch<CascadeResult>(`/cascade/${jobId}/${gapId}`);
}

export function getDemoCascade(): Promise<CascadeResult> {
  return apiFetch<CascadeResult>("/cascade/demo");
}
