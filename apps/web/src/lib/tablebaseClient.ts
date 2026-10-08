import { normalizeFenForTablebase, type SyzygyPosition } from "@zugchess/core";
import { prisma } from "./prisma";

// Avec un jeton personnel Lichess, on passe par lichess.org/api (meilleure tolérance de débit).
// Sans jeton, on utilise l'URL publique tablebase.lichess.ovh (1 req/s recommandée par Lichess).
const API_KEY = process.env.LICHESS_API_KEY ?? "";
const TABLEBASE_URL = API_KEY
  ? "https://lichess.org/api/tablebase/standard"
  : "https://tablebase.lichess.ovh/standard";

// 300 ms avec auth (≈ 3 req/s, largement sous le quota Lichess) ; 1 s sans auth.
const MIN_REQUEST_INTERVAL_MS = API_KEY ? 300 : 1000;

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours : un résultat Syzygy est immuable.

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

/**
 * Récupère le jugement Syzygy d'une position (SPEC.md, service `TablebaseClient`) : cache Neon
 * d'abord (`TablebaseCache`), sinon appel à l'API Lichess (authentifié si `LICHESS_API_KEY` est
 * défini), limité par le throttle ci-dessus. Lève une erreur si l'API est indisponible ou si la
 * position dépasse 7 pièces (utiliser Stockfish dans ce cas).
 */
export async function getTablebasePosition(fen: string): Promise<SyzygyPosition> {
  const fenNormalized = normalizeFenForTablebase(fen);

  const cached = await prisma.tablebaseCache.findUnique({ where: { fenNormalized } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.payload as unknown as SyzygyPosition;
  }

  await throttle();

  const headers: Record<string, string> = {
    "User-Agent": "ZugChess (https://github.com/zugchess)",
  };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const response = await fetch(`${TABLEBASE_URL}?fen=${encodeURIComponent(fen)}`, { headers });
  if (!response.ok) {
    throw new Error(`Tablebase Lichess indisponible (${response.status}) pour ${fen}`);
  }
  const payload = (await response.json()) as SyzygyPosition;

  await prisma.tablebaseCache.upsert({
    where: { fenNormalized },
    create: { fenNormalized, payload: payload as object },
    update: { payload: payload as object, fetchedAt: new Date() },
  });

  return payload;
}
