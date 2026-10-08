#!/usr/bin/env node
/**
 * Génère des positions KRP vs KR (finale de tour avec pion) via l'API tablebase de Lichess.
 * Chaque FEN valide produit deux exercices : attaque + défense.
 * Idempotent : upsert par ID stable basé sur un hash de la FEN et du camp.
 *
 * Usage : pnpm generate:syzygy [--count 75]
 *   --count N : nombre de FEN cibles PAR thème (lucena + philidor), défaut 75
 *
 * Le script génère des positions aléatoires, les valide avec chess.js, puis
 * interroge le tablebase pour les classifier :
 *   - attaquant au trait + category "win"  → thème lucena
 *   - défenseur au trait + category "draw" → thème philidor
 * Les autres positions sont ignorées.
 */
import { createHash } from "crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { normalizeFenForTablebase, type SyzygyPosition } from "@zugchess/core";
import { Chess, type Square } from "chess.js";

// --- Throttle + cache API tablebase ----------------------------------------

const API_KEY = process.env.LICHESS_API_KEY ?? "";
const TABLEBASE_URL = API_KEY
  ? "https://lichess.org/api/tablebase/standard"
  : "https://tablebase.lichess.ovh/standard";
// 2100ms garanti entre chaque requête HTTP — Lichess limite à ~28 req/min (tablebase public).
const THROTTLE_MS = 2100;
// Backoffs successifs en cas de 429 (ms) : 30 s → 60 s → 120 s
const BACKOFFS_MS = [30_000, 60_000, 120_000];

let lastFetch = 0;

async function fetchTablebase(
  fen: string,
  prisma: PrismaClient,
): Promise<SyzygyPosition | null> {
  const fenNorm = normalizeFenForTablebase(fen);

  const cached = await prisma.tablebaseCache.findUnique({ where: { fenNormalized: fenNorm } });
  if (cached) return cached.payload as unknown as SyzygyPosition;

  // Respecte le throttle Lichess.
  const elapsed = Date.now() - lastFetch;
  if (elapsed < THROTTLE_MS) await new Promise((r) => setTimeout(r, THROTTLE_MS - elapsed));
  lastFetch = Date.now();

  const headers: Record<string, string> = { "User-Agent": "ZugChess/generate-syzygy" };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const url = `${TABLEBASE_URL}?fen=${encodeURIComponent(fen)}`;
  let resp = await fetch(url, { headers });

  for (const backoff of BACKOFFS_MS) {
    if (resp.status !== 429) break;
    process.stderr.write(`429 Rate-limited — attente ${backoff / 1000}s …\n`);
    await new Promise((r) => setTimeout(r, backoff));
    lastFetch = Date.now();
    resp = await fetch(url, { headers });
  }

  if (!resp.ok) {
    process.stderr.write(`Tablebase ${resp.status} pour ${fen}\n`);
    return null;
  }
  const payload = (await resp.json()) as SyzygyPosition;

  await prisma.tablebaseCache.upsert({
    where: { fenNormalized: fenNorm },
    create: { fenNormalized: fenNorm, payload: payload as object },
    update: { payload: payload as object, fetchedAt: new Date() },
  });

  return payload;
}

// --- Génération de FEN KRP vs KR -------------------------------------------

type PieceCode = "K" | "R" | "P" | "k" | "r" | "p";

/**
 * Construit une FEN depuis une liste de pièces (rangs 0-indexés, 0 = rangée 1) et un trait.
 */
function buildFen(
  pieces: Array<{ piece: PieceCode; file: number; rank: number }>,
  turn: "w" | "b",
): string {
  // Tableau 8×8 : board[row][col], row 0 = rangée 8 en FEN
  const board: (PieceCode | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const { piece, file, rank } of pieces) {
    board[7 - rank]![file] = piece;
  }
  const placement = board
    .map((row) => {
      let s = "";
      let empty = 0;
      for (const cell of row) {
        if (cell === null) {
          empty++;
        } else {
          if (empty) { s += empty; empty = 0; }
          s += cell;
        }
      }
      if (empty) s += empty;
      return s;
    })
    .join("/");
  return `${placement} ${turn} - - 0 1`;
}

function sq(file: number, rank: number): number {
  return rank * 8 + file;
}

/** Tire une case vide parmi les candidates ou null si aucune. */
function pickEmpty(candidates: Array<{ file: number; rank: number }>, occupied: Set<number>, rng: () => number): { file: number; rank: number } | null {
  const free = candidates.filter((c) => !occupied.has(sq(c.file, c.rank)));
  if (free.length === 0) return null;
  return free[Math.floor(rng() * free.length)]!;
}

/** Toutes les cases d'un plateau 8×8. */
function allSquares(): Array<{ file: number; rank: number }> {
  const result: Array<{ file: number; rank: number }> = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) result.push({ file: f, rank: r });
  return result;
}

/**
 * Génère une FEN KRP vs KR ciblée pour le thème spécifié :
 *  - lucena  : attaquant au trait, pion avancé (rangs 4-6), position probablement gagnante
 *  - philidor: défenseur au trait, pion peu avancé (rangs 2-4), roi défenseur devant le pion
 *
 * Retourne null si le placement est invalide.
 */
function randomFenForTheme(
  theme: "lucena" | "philidor",
  rng: () => number,
): { fen: string; attackerColor: "w" | "b" } | null {
  const attackerIsWhite = rng() < 0.5;
  const atkColor: "w" | "b" = attackerIsWhite ? "w" : "b";
  const defColor: "w" | "b" = attackerIsWhite ? "b" : "w";

  // Fichier du pion : b-g (1-6) — évite les pions de tour (thème séparé)
  const pawnFile = 1 + Math.floor(rng() * 6);

  let pawnRank0: number;
  let turn: "w" | "b";

  if (theme === "lucena") {
    pawnRank0 = attackerIsWhite ? 3 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 3);
    turn = atkColor;
  } else {
    pawnRank0 = attackerIsWhite ? 1 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 3);
    turn = defColor;
  }

  const occupied = new Set<number>();
  occupied.add(sq(pawnFile, pawnRank0));

  const atkKingCandidates: Array<{ file: number; rank: number }> = [];
  for (let df = -2; df <= 2; df++) {
    for (let dr = -1; dr <= 2; dr++) {
      const f = pawnFile + df, r = pawnRank0 + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      if (df === 0 && dr === 0) continue;
      atkKingCandidates.push({ file: f, rank: r });
    }
  }
  const atkKing = pickEmpty(atkKingCandidates, occupied, rng);
  if (!atkKing) return null;
  occupied.add(sq(atkKing.file, atkKing.rank));

  let defKingCandidates: Array<{ file: number; rank: number }>;
  if (theme === "philidor") {
    const promotionRank0 = attackerIsWhite ? 7 : 0;
    defKingCandidates = allSquares().filter(({ file: f, rank: r }) => {
      if (occupied.has(sq(f, r))) return false;
      const nearProm = Math.abs(f - pawnFile) <= 1 && Math.abs(r - promotionRank0) <= 1;
      const farFromAtk = Math.max(Math.abs(f - atkKing.file), Math.abs(r - atkKing.rank)) >= 2;
      return nearProm && farFromAtk;
    });
    if (defKingCandidates.length === 0) {
      defKingCandidates = allSquares().filter(({ file: f, rank: r }) => {
        if (occupied.has(sq(f, r))) return false;
        return Math.max(Math.abs(f - atkKing.file), Math.abs(r - atkKing.rank)) >= 3;
      });
    }
  } else {
    defKingCandidates = allSquares().filter(({ file: f, rank: r }) => {
      if (occupied.has(sq(f, r))) return false;
      return Math.max(Math.abs(f - atkKing.file), Math.abs(r - atkKing.rank)) >= 3;
    });
  }
  const defKing = pickEmpty(defKingCandidates, occupied, rng);
  if (!defKing) return null;
  occupied.add(sq(defKing.file, defKing.rank));

  const atkRook = pickEmpty(allSquares(), occupied, rng);
  if (!atkRook) return null;
  occupied.add(sq(atkRook.file, atkRook.rank));

  let defRook: { file: number; rank: number } | null;
  if (theme === "philidor") {
    const philidorRookRank0 = attackerIsWhite ? 5 : 2;
    const philidorCandidates = allSquares().filter(({ file: f, rank: r }) => {
      if (r !== philidorRookRank0 || occupied.has(sq(f, r))) return false;
      if (f === atkKing.file) return false;
      return true;
    });
    defRook = pickEmpty(philidorCandidates.length > 0 ? philidorCandidates : allSquares(), occupied, rng);
  } else {
    defRook = pickEmpty(allSquares(), occupied, rng);
  }
  if (!defRook) return null;

  const piecesWhiteAtk: Array<{ piece: PieceCode; file: number; rank: number }> = [
    { piece: "K", file: atkKing.file, rank: atkKing.rank },
    { piece: "R", file: atkRook.file, rank: atkRook.rank },
    { piece: "P", file: pawnFile, rank: pawnRank0 },
    { piece: "k", file: defKing.file, rank: defKing.rank },
    { piece: "r", file: defRook.file, rank: defRook.rank },
  ];
  const piecesBlackAtk: Array<{ piece: PieceCode; file: number; rank: number }> = [
    { piece: "K", file: defKing.file, rank: defKing.rank },
    { piece: "R", file: defRook.file, rank: defRook.rank },
    { piece: "k", file: atkKing.file, rank: atkKing.rank },
    { piece: "r", file: atkRook.file, rank: atkRook.rank },
    { piece: "p", file: pawnFile, rank: pawnRank0 },
  ];

  const fen = buildFen(attackerIsWhite ? piecesWhiteAtk : piecesBlackAtk, turn);
  return { fen, attackerColor: atkColor };
}

/**
 * Génère des FEN Philidor systématiques à partir de gabarits.
 * Taux de réussite tablebase beaucoup plus élevé que la génération aléatoire.
 * Retourne un itérateur de { fen, attackerColor }.
 */
function* systematicPhilidorFens(): Generator<{ fen: string; attackerColor: "w" | "b" }> {
  // Pion blanc sur fichiers b-g, rangées 3-5 algébriques (0-idx 2-4)
  for (const pFile of [1, 2, 3, 4, 5, 6]) {
    for (const pRank0 of [2, 3, 4]) { // rangs algébriques 3-5
      const pRomRank0 = 7; // promotion rangée 0-idx pour blanc

      // Roi attaquant : derrière et à côté du pion
      const atkKingOptions = (
        [
          [pFile - 1, pRank0 - 1] as [number, number],
          [pFile + 1, pRank0 - 1] as [number, number],
          [pFile - 1, pRank0]     as [number, number],
          [pFile + 1, pRank0]     as [number, number],
          [pFile,     pRank0 - 1] as [number, number],
        ] satisfies Array<[number, number]>
      ).filter(([f, r]) => f >= 0 && f <= 7 && r >= 0 && r <= 7);

      for (const [akf, akr] of atkKingOptions) {
        const occupied = new Set<number>([sq(pFile, pRank0), sq(akf, akr)]);

        // Roi défenseur : directement devant le pion (rangée 7 ou 8 algébrique = 0-idx 6 ou 7)
        for (const dkr0 of [6, 7]) {
          for (const dkdf of [-1, 0, 1]) {
            const dkf = pFile + dkdf;
            if (dkf < 0 || dkf > 7) continue;
            if (occupied.has(sq(dkf, dkr0))) continue;
            // Rois non adjacents
            if (Math.max(Math.abs(dkf - akf), Math.abs(dkr0 - akr)) < 2) continue;
            occupied.add(sq(dkf, dkr0));

            // Tour défenseure : rangée 6 algébrique (0-idx 5) — position Philidor classique
            for (const drf of [0, 1, 2, 3, 4, 5, 6, 7]) {
              if (occupied.has(sq(drf, 5))) continue;
              if (drf === akf) continue; // évite échec au roi attaquant
              occupied.add(sq(drf, 5));

              // Tour attaquante : rangée 1 ou 8 (0-idx 0 ou 7), toute colonne
              for (const arf of [0, 1, 2, 3, 4, 5, 6, 7]) {
                for (const arr0 of [0, 7]) {
                  if (occupied.has(sq(arf, arr0))) continue;

                  const pieces: Array<{ piece: PieceCode; file: number; rank: number }> = [
                    { piece: "K", file: akf,  rank: akr  },
                    { piece: "R", file: arf,  rank: arr0 },
                    { piece: "P", file: pFile, rank: pRank0 },
                    { piece: "k", file: dkf,  rank: dkr0 },
                    { piece: "r", file: drf,  rank: 5    },
                  ];
                  const fen = buildFen(pieces, "b"); // défenseur (noir) au trait
                  yield { fen, attackerColor: "w" };
                }
              }

              occupied.delete(sq(drf, 5));
            }

            occupied.delete(sq(dkf, dkr0));
          }
        }
      }
    }
  }
}

/** Valide la FEN avec chess.js + vérifie que le roi du camp NON au trait n'est pas en échec (position impossible). */
function isPlayableFen(fen: string): boolean {
  try {
    const chess = new Chess(fen);
    if (chess.isCheckmate() || chess.isStalemate()) return false;

    // chess.js v1 ne vérifie pas toujours que le roi adverse n'est pas en échec au moment du trait.
    // On le détecte manuellement via isAttacked.
    const movingSide = chess.turn();
    const nonMovingSide = movingSide === "w" ? "b" : "w";
    const board = chess.board();
    let kingSquare: string | null = null;
    outer: for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board[row]?.[col];
        if (cell && cell.type === "k" && cell.color === nonMovingSide) {
          kingSquare = `${"abcdefgh"[col]}${8 - row}`;
          break outer;
        }
      }
    }
    if (kingSquare && chess.isAttacked(kingSquare as Square, movingSide)) return false;
    return true;
  } catch {
    return false;
  }
}

// --- ID déterministe --------------------------------------------------------

function stableId(key: string): string {
  return `g_${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

// --- Types textes thème -----------------------------------------------------

interface DefaultTextsLocale {
  intro: string;
  attackTitle: string;
  defendTitle: string;
  attackGoal: string;
  defendGoal: string;
}
interface DefaultTexts {
  fr: DefaultTextsLocale;
  en: DefaultTextsLocale;
}

// --- Main -------------------------------------------------------------------

const MIN_DTZ = 4;
const MAX_DTZ = 40;
const MAX_ATTEMPTS = 5000;

async function main() {
  const args = process.argv.slice(2);
  const countIdx = args.indexOf("--count");
  const countPerTheme = countIdx >= 0 ? parseInt(args[countIdx + 1] ?? "75", 10) : 75;

  const prisma = new PrismaClient();

  const themes = await prisma.theme.findMany({
    where: { slug: { in: ["lucena", "philidor"] } },
  });
  if (themes.length !== 2) {
    throw new Error(`Thèmes lucena/philidor introuvables. Relancer le seed.`);
  }
  const themeBySlug = new Map(themes.map((t) => [t.slug, t]));

  const lucenaBucket: string[] = [];
  const philidorBucket: string[] = [];
  const seenFens = new Set<string>();
  const rng = Math.random.bind(Math);
  let totalAttempts = 0, totalApiCalls = 0;

  // --- LUCENA : génération aléatoire ---
  {
    let attempts = 0;
    const target = countPerTheme;
    process.stdout.write(`\n--- LUCENA (cible: ${target} FEN) ---\n`);

    while (lucenaBucket.length < target && attempts < MAX_ATTEMPTS) {
      attempts++;
      totalAttempts++;

      const generated = randomFenForTheme("lucena", rng);
      if (!generated) continue;
      const { fen, attackerColor } = generated;

      if (!isPlayableFen(fen)) continue;

      const normFen = normalizeFenForTablebase(fen);
      if (seenFens.has(normFen)) continue;

      const tablebase = await fetchTablebase(fen, prisma);
      totalApiCalls++;
      if (!tablebase) continue;

      const { category, dtz } = tablebase;
      if (dtz === null || Math.abs(dtz) < MIN_DTZ || Math.abs(dtz) > MAX_DTZ) continue;

      const turnField = fen.split(" ")[1] as "w" | "b";
      const attackerToMove = turnField === attackerColor;

      if (attackerToMove && category === "win") {
        seenFens.add(normFen);
        lucenaBucket.push(fen);
        process.stdout.write(`[lucena ${lucenaBucket.length}/${target}] dtz=${dtz} ${fen}\n`);
      }
    }
    process.stdout.write(`lucena: ${lucenaBucket.length}/${target} en ${attempts} tentatives.\n`);
  }

  // --- PHILIDOR : génération systématique (bien meilleur taux de réussite) ---
  {
    const target = countPerTheme;
    process.stdout.write(`\n--- PHILIDOR systématique (cible: ${target} FEN) ---\n`);
    process.stdout.write(`Pause 30s avant Philidor pour récupérer le quota Lichess…\n`);
    await new Promise((r) => setTimeout(r, 30_000));

    let attempts = 0;
    const generator = systematicPhilidorFens();

    for (const { fen, attackerColor } of generator) {
      if (philidorBucket.length >= target) break;
      if (attempts >= MAX_ATTEMPTS * 3) break; // espace de recherche grand, on s'arrête quand même
      attempts++;
      totalAttempts++;

      if (!isPlayableFen(fen)) continue;

      const normFen = normalizeFenForTablebase(fen);
      if (seenFens.has(normFen)) continue;

      const tablebase = await fetchTablebase(fen, prisma);
      totalApiCalls++;
      if (!tablebase) continue;

      const { category, dtz } = tablebase;
      if (dtz === null || Math.abs(dtz) < MIN_DTZ || Math.abs(dtz) > MAX_DTZ) continue;

      const turnField = fen.split(" ")[1] as "w" | "b";
      const attackerToMove = turnField === attackerColor;

      if (!attackerToMove && (category === "draw" || category === "blessed-loss")) {
        seenFens.add(normFen);
        philidorBucket.push(fen);
        process.stdout.write(`[philidor ${philidorBucket.length}/${target}] dtz=${dtz} ${fen}\n`);
      }
    }
    process.stdout.write(`philidor: ${philidorBucket.length}/${target} en ${attempts} tentatives.\n`);
  }

  console.log(
    `\nTotal: ${totalAttempts} tentatives, ${totalApiCalls} appels API → ${lucenaBucket.length} Lucena + ${philidorBucket.length} Philidor FEN.`,
  );

  let upserted = 0;
  for (const [slug, bucket] of [
    ["lucena", lucenaBucket],
    ["philidor", philidorBucket],
  ] as Array<[string, string[]]>) {
    const theme = themeBySlug.get(slug)!;
    const dt = theme.defaultTexts as unknown as DefaultTexts | null;
    if (!dt) throw new Error(`${slug} n'a pas de defaultTexts — relancer le seed.`);

    for (const fen of bucket) {
      // On détermine qui a le pion en cherchant P ou p dans la FEN.
      const hasPawnWhite = fen.split(" ")[0]!.includes("P");
      const attackerColor = hasPawnWhite ? "white" : "black";
      const defenderColor = hasPawnWhite ? "black" : "white";

      // Résultat attendu de la position :
      // lucena = win pour l'attaquant ; philidor = drawn
      const expectedResult: "white" | "black" | "draw" =
        slug === "lucena" ? (attackerColor as "white" | "black") : "draw";

      const normFen = normalizeFenForTablebase(fen);

      for (const side of ["attacker", "defender"] as const) {
        const userSide = side === "attacker" ? attackerColor : defenderColor;
        const id = stableId(`syzygy:${normFen}:${userSide}`);
        const texts = {
          fr: {
            title: side === "attacker" ? dt.fr.attackTitle : dt.fr.defendTitle,
            intro: dt.fr.intro,
            goal: side === "attacker" ? dt.fr.attackGoal : dt.fr.defendGoal,
          },
          en: {
            title: side === "attacker" ? dt.en.attackTitle : dt.en.defendTitle,
            intro: dt.en.intro,
            goal: side === "attacker" ? dt.en.attackGoal : dt.en.defendGoal,
          },
        };

        await prisma.position.upsert({
          where: { id },
          create: {
            id,
            themeId: theme.id,
            fen,
            userSide: userSide as "white" | "black",
            expectedResult,
            judgeType: "syzygy",
            texts: texts as unknown as Prisma.InputJsonValue,
            source: "generated:syzygy",
            free: theme.free,
            status: "published",
            generated: true,
          },
          update: {
            texts: texts as unknown as Prisma.InputJsonValue,
            status: "published",
          },
        });
        upserted++;
      }
    }
  }

  console.log(`${upserted} positions insérées/mises à jour.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
