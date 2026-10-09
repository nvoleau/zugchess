import { NextRequest, NextResponse } from "next/server";
import type { EngineScore } from "@zugchess/core";

interface LichessCloudEvalResponse {
  pvs?: Array<{ moves?: string; cp?: number; mate?: number }>;
}

export async function GET(req: NextRequest) {
  const fen = req.nextUrl.searchParams.get("fen");
  if (!fen) return NextResponse.json({ error: "FEN manquante" }, { status: 400 });

  try {
    const res = await fetch(
      `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`,
      { headers: { Accept: "application/json" }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return NextResponse.json({ error: "Pas d'évaluation disponible" }, { status: 503 });

    const data: LichessCloudEvalResponse = await res.json();
    const pv = data.pvs?.[0];
    if (!pv?.moves) return NextResponse.json({ error: "Réponse vide" }, { status: 503 });

    const moves = pv.moves.trim().split(/\s+/);
    const score: EngineScore =
      pv.mate !== undefined
        ? { type: "mate", value: pv.mate }
        : { type: "cp", value: pv.cp ?? 0 };

    return NextResponse.json({ score, bestMoveUci: moves[0] ?? "", pv: moves });
  } catch {
    return NextResponse.json({ error: "Erreur réseau" }, { status: 503 });
  }
}
