import type { EngineScore } from "@zugchess/core";

export interface EvaluateResult {
  score: EngineScore;
  bestMoveUci: string;
  pv: string[];
}

export async function evaluatePosition(fen: string): Promise<EvaluateResult> {
  const res = await fetch(`/api/judge/cloud-eval?fen=${encodeURIComponent(fen)}`);
  if (!res.ok) throw new Error("Aucune évaluation cloud disponible pour cette position.");
  return res.json() as Promise<EvaluateResult>;
}
