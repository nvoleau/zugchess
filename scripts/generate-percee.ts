#!/usr/bin/env node
/**
 * Génère des positions de percée de pions (3 pions vs 3 pions ou 3 vs 2).
 * La percée crée un pion passé irréversible par un double sacrifice.
 * Chaque FEN produit deux exercices (kind = "line") : attaque + défense.
 * Idempotent : upsert par ID stable.
 *
 * Usage : pnpm generate:percee
 */
import { createHash } from "crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { Chess } from "chess.js";

function stableId(key: string): string {
  return `g_${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

// ---------------------------------------------------------------------------
// Breakthrough logic
// ---------------------------------------------------------------------------

type Move = { from: string; to: string; promotion?: string };
type LineStep = { from: string; to: string; promotion?: string; text: { fr: string; en: string } | null };

/**
 * Construit une FEN avec des pions alignés et deux rois éloignés.
 * files : tableau [L, M, R] de fichiers 0-indexés (0=a … 7=h).
 * wRank : rangée algébrique des pions blancs (4 ou 5).
 * bRank : rangée algébrique des pions noirs (wRank+2 = gap d'une case).
 * wKing / bKing : [fichier, rangée] 0-indexés.
 */
function buildPerceePos(
  files: [number, number, number],
  wRank: number,  // 1-indexed algebraic (ex: 5)
  bRank: number,  // 1-indexed algebraic (ex: 7)
  wKing: [number, number],
  bKing: [number, number],
): string {
  const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  const place = (piece: string, file: number, rank: number) => {
    board[7 - (rank - 1)]![file] = piece; // rank 1 = row 7, rank 8 = row 0
  };

  for (const f of files) {
    place("P", f, wRank);
    place("p", f, bRank);
  }
  place("K", wKing[0], wKing[1]);
  place("k", bKing[0], bKing[1]);

  const placement = board.map((row) => {
    let s = ""; let empty = 0;
    for (const cell of row) {
      if (!cell) { empty++; }
      else { if (empty) { s += empty; empty = 0; } s += cell; }
    }
    if (empty) s += empty;
    return s;
  }).join("/");

  return `${placement} w - - 0 1`;
}

/**
 * Calcule la ligne de percée standard pour 3 pions blancs [L,M,R] vs 3 pions noirs.
 * Retourne null si la percée est invalide pour ce FEN.
 */
function computePerceeLineFrom(fen: string): LineStep[] | null {
  const chess = new Chess(fen);

  // Trouver les pions blancs et noirs
  const board = chess.board();
  const wPawns: string[] = [];
  const bPawns: string[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r]?.[c];
      if (!p) continue;
      const sq = `${"abcdefgh"[c]}${8 - r}`;
      if (p.type === "p" && p.color === "w") wPawns.push(sq);
      if (p.type === "p" && p.color === "b") bPawns.push(sq);
    }
  }

  if (wPawns.length !== 3) return null;
  wPawns.sort();
  bPawns.sort();

  const [wL, wM, wR] = wPawns as [string, string, string];
  const wMrank = parseInt(wM[1]!);

  // --- Séquence : pion central avance, noir prend a×M, puis R avance, noir prend b×R, puis L donne dame ---
  const tryLine = (sacrifice1: string, captureFile1: string, sacrifice2: string, captureFile2: string, passer: string): LineStep[] | null => {
    const c = new Chess(fen);
    const steps: LineStep[] = [];

    const applyOrNull = (from: string, to: string, prom?: string): boolean => {
      try {
        const m = c.move({ from, to, promotion: prom });
        if (!m) return false;
        steps.push({ from, to, promotion: prom, text: null });
        return true;
      } catch {
        return false;
      }
    };

    // 1. Sacrifice pion central
    const s1From = sacrifice1;
    const s1To = sacrifice1[0]! + (wMrank + 1);
    if (!applyOrNull(s1From, s1To)) return null;

    // 1... capture noire (fichier captureFile1 × s1)
    const bCapFrom1 = captureFile1 + bPawns.find(sq => sq[0] === captureFile1)?.[1];
    if (!bCapFrom1 || !bPawns.find(sq => sq[0] === captureFile1)) return null;
    const bCapPawn1 = bPawns.find(sq => sq[0] === captureFile1)!;
    if (!applyOrNull(bCapPawn1, s1To)) return null;

    // 2. Second sacrifice
    const s2Rank = parseInt(sacrifice2[1]!);
    const s2To = sacrifice2[0]! + (s2Rank + 1);
    if (!applyOrNull(sacrifice2, s2To)) return null;

    // 2... capture noire : trouver le pion noir qui peut capturer sur s2To
    // (il doit être sur un fichier adjacent et une rangée plus loin que s2To)
    const s2ToFile = s2To.charCodeAt(0) - "a".charCodeAt(0);
    const s2ToRank = parseInt(s2To[1]!);
    const boardNow = c.board();
    let bCapSq2: string | null = null;
    for (let r = 0; r < 8; r++) {
      for (let col = 0; col < 8; col++) {
        const p = boardNow[r]?.[col];
        if (!p || p.type !== "p" || p.color !== "b") continue;
        const pFile = col;
        const pRank = 8 - r;
        // Pion noir capture en diagonale vers le bas : pRank - 1 = s2ToRank, |pFile - s2ToFile| = 1
        if (pRank - 1 === s2ToRank && Math.abs(pFile - s2ToFile) === 1) {
          bCapSq2 = `${"abcdefgh"[col]}${pRank}`;
          break;
        }
      }
      if (bCapSq2) break;
    }
    if (!bCapSq2) return null;
    if (!applyOrNull(bCapSq2, s2To)) return null;

    // 3. Pion libre avance jusqu'à la promotion
    let passerSq = passer;
    while (true) {
      const pRank = parseInt(passerSq[1]!);
      if (pRank === 8) break;
      const nextSq = passerSq[0]! + (pRank + 1);
      const isPromo = pRank + 1 === 8;
      if (!applyOrNull(passerSq, nextSq, isPromo ? "q" : undefined)) return null;
      if (isPromo) break;
      passerSq = nextSq;
      // Après chaque coup blanc, laisser noir jouer son meilleur coup (roi bouge)
      if (c.turn() === "b") {
        const legalMoves = c.moves({ verbose: true });
        if (legalMoves.length === 0) break;
        // Évite que le roi noir bloque la case de promotion du pion passant
        const promotionSq = passer[0]! + "8";
        const kMoves = legalMoves.filter(m => m.piece === "k" && m.to !== promotionSq);
        const kMove = kMoves[0] ?? legalMoves.find(m => m.to !== promotionSq) ?? legalMoves[0]!;
        steps.push({ from: kMove.from, to: kMove.to, text: null });
        c.move(kMove);
      }
    }

    return steps;
  };

  const wLfile = wL[0]!, wMfile = wM[0]!, wRfile = wR[0]!;

  // Essaie : sacrifice du pion central, noir prend par la gauche (L×M), puis R avance
  const line1 = tryLine(wM, wLfile, wR, wMfile, wL);
  if (line1) return line1;

  // Essaie : sacrifice du pion central, noir prend par la droite (R×M), puis L avance
  const line2 = tryLine(wM, wRfile, wL, wMfile, wR);
  if (line2) return line2;

  return null;
}

/**
 * Génère des lignes de méthode commentées pour la percée.
 * wRank / bRank en algébrique.
 */
function buildAnnotatedLine(
  files: [number, number, number],
  wRank: number,
  bRank: number,
  wKing: [number, number],
  bKing: [number, number],
): { fen: string; steps: LineStep[] } | null {
  const fen = buildPerceePos(files, wRank, bRank, wKing, bKing);

  // Vérifier que la FEN est légale
  try { new Chess(fen); } catch { return null; }

  const rawSteps = computePerceeLineFrom(fen);
  if (!rawSteps || rawSteps.length < 5) return null;

  // Annoter les coups clés
  const fileNames = ["a","b","c","d","e","f","g","h"];
  const [lf, mf, rf] = files;
  const midName = fileNames[mf!]!;
  const leftName = fileNames[lf!]!;
  const rightName = fileNames[rf!]!;

  const annotated: LineStep[] = rawSteps.map((step, i) => {
    const fr = (() => {
      if (i === 0) return `Le pion ${midName} se sacrifie et attaque ${leftName}${bRank} et ${rightName}${bRank}.`;
      if (i === 2) return `Deuxième sacrifice : le pion ${step.from[0]} attaque ${fileNames[mf! - 1] ?? ""}${bRank}.`;
      if (i === 4) return `La voie est libre — le pion ${step.from[0]} fonce vers la dame.`;
      if (step.promotion === "q") return `Dame ! Le roi adverse était trop loin.`;
      return null;
    })();
    const en = (() => {
      if (i === 0) return `The ${midName}-pawn sacrifices itself, attacking ${leftName}${bRank} and ${rightName}${bRank}.`;
      if (i === 2) return `Second sacrifice: the ${step.from[0]}-pawn attacks ${fileNames[mf! - 1] ?? ""}${bRank}.`;
      if (i === 4) return `The road is clear — the ${step.from[0]}-pawn races to queen.`;
      if (step.promotion === "q") return `A queen! The opposing king was too slow.`;
      return null;
    })();
    return { ...step, text: fr && en ? { fr, en } : null };
  });

  return { fen, steps: annotated };
}

// ---------------------------------------------------------------------------
// Configurations à générer
// ---------------------------------------------------------------------------

/**
 * Fichiers 0-indexés pour les formations de percée (on évite les pions de tour).
 * 4 combinaisons × 3 rangées × 2 positions de roi = 24 configurations.
 */
const FILE_SETS: Array<[number, number, number]> = [
  [1, 2, 3], // b/c/d
  [2, 3, 4], // c/d/e
  [3, 4, 5], // d/e/f
  [4, 5, 6], // e/f/g
];

// Rangées : avancée (5vs7) et moins avancée (4vs6)
const RANK_PAIRS: Array<[number, number]> = [
  [5, 7],
  [4, 6],
];

// Positions des rois (loins des pions) — [fichier, rangée algébrique 1-8]
const KING_PAIRS: Array<{ wKing: [number, number]; bKing: [number, number] }> = [
  { wKing: [7, 1], bKing: [0, 8] }, // Kh1 vs Ka8
  { wKing: [0, 1], bKing: [7, 8] }, // Ka1 vs Kh8
  { wKing: [7, 2], bKing: [0, 7] }, // Kh2 vs Ka7
];

// ---------------------------------------------------------------------------
// Seed texts
// ---------------------------------------------------------------------------

interface DefaultTexts {
  fr: { intro: string; attackTitle: string; defendTitle: string; attackGoal: string; defendGoal: string };
  en: { intro: string; attackTitle: string; defendTitle: string; attackGoal: string; defendGoal: string };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const prisma = new PrismaClient();

  const theme = await prisma.theme.findUnique({ where: { slug: "percee" } });
  if (!theme) throw new Error('Thème "percee" introuvable. Relancer le seed d\'abord.');

  const dt = theme.defaultTexts as unknown as DefaultTexts | null;
  if (!dt) throw new Error('"percee" n\'a pas de defaultTexts. Relancer le seed.');

  let generated = 0, skipped = 0;

  for (const files of FILE_SETS) {
    for (const [wRank, bRank] of RANK_PAIRS) {
      for (const { wKing, bKing } of KING_PAIRS) {
        const result = buildAnnotatedLine(files, wRank, bRank, wKing, bKing);
        if (!result) { skipped++; continue; }
        const { fen, steps } = result;
        if (steps.length < 5) { skipped++; continue; }

        const normKey = `percee:${fen}`;

        for (const side of ["attacker", "defender"] as const) {
          const id = stableId(`${normKey}:${side}`);
          const isAttacker = side === "attacker";

          const texts = {
            fr: {
              title: isAttacker ? dt.fr.attackTitle : dt.fr.defendTitle,
              intro: dt.fr.intro,
              goal: isAttacker ? dt.fr.attackGoal : dt.fr.defendGoal,
            },
            en: {
              title: isAttacker ? dt.en.attackTitle : dt.en.defendTitle,
              intro: dt.en.intro,
              goal: isAttacker ? dt.en.attackGoal : dt.en.defendGoal,
            },
          };

          await prisma.position.upsert({
            where: { id },
            create: {
              id,
              themeId: theme.id,
              fen,
              userSide: isAttacker ? "white" : "black",
              expectedResult: isAttacker ? "white" : "draw",
              judgeType: "line",
              lineMoves: steps as unknown as Prisma.InputJsonValue,
              texts: texts as unknown as Prisma.InputJsonValue,
              source: "generated:percee",
              free: theme.free,
              status: "published",
              generated: true,
            },
            update: {
              lineMoves: steps as unknown as Prisma.InputJsonValue,
              texts: texts as unknown as Prisma.InputJsonValue,
              status: "published",
            },
          });
          generated++;
        }

        process.stdout.write(`OK files=${files.join("/")} wRank=${wRank} bRank=${bRank} wK=${wKing} bK=${bKing}\n`);
      }
    }
  }

  console.log(`\n${generated} positions insérées/mises à jour, ${skipped} ignorées.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
