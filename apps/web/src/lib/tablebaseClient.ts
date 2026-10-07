import { normalizeFenForTablebase, type SyzygyPosition } from "@zugchess/core";
import { prisma } from "./prisma";

const TABLEBASE_URL = "https://tablebase.lichess.ovh/standard";
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 requête/s, limite imposée par Lichess.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours : un résultat Syzygy ne change jamais, large marge pour un rafraîchissement.

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

/**
 * Récupère le jugement Syzygy d'une position (SPEC.md, service `TablebaseClient`) : cache Neon
 * d'abord (`TablebaseCache`), sinon appel à `tablebase.lichess.ovh`, limité à 1 requête/s comme
 * demandé par Lichess. Lève une erreur si l'API répond une erreur ou une position hors tables (plus
 * de 7 pièces : c'est alors Stockfish qui doit être utilisé, pas ce client).
 */
export async function getTablebasePosition(fen: string): Promise<SyzygyPosition> {
  const fenNormalized = normalizeFenForTablebase(fen);

  const cached = await prisma.tablebaseCache.findUnique({ where: { fenNormalized } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.payload as unknown as SyzygyPosition;
  }

  await throttle();
  const response = await fetch(`${TABLEBASE_URL}?fen=${encodeURIComponent(fen)}`, {
    headers: { "User-Agent": "ZugChess (https://github.com/zugchess)" },
  });
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
