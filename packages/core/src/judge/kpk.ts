import { Chess } from "chess.js";
import type { SquareMove } from "./types.js";

/**
 * Juge roi + pion contre roi, calculé par analyse rétrograde (comme une mini table de finales).
 *
 * Convention interne : on normalise toujours la position pour que ce soit le camp avec le pion
 * (l'« attaquant ») qui avance vers la rangée 8 (indices 0..7 = rangées 1..8). Si dans la partie
 * réelle c'est le camp noir qui a le pion, on retourne l'échiquier verticalement avant de
 * consulter la table, puis on retourne le résultat.
 *
 * États : (roiAttaquant 0..63, roiDéfenseur 0..63, pion 8..55, trait attaquant|défenseur).
 * Table : Int16Array indexée par cet état encodé.
 *   -2 = non résolu (pendant le calcul)
 *   -1 = nulle
 *   d >= 0 = gain de l'attaquant en `d` demi-coups (plus petit = plus rapide)
 */

const BOARD_SIZE = 64;
const PAWN_SQUARES = 48; // rangées 2 à 7 (indices 1..6), 8 colonnes
const PAWN_SQUARE_OFFSET = 8; // le premier index de pion valide est la case 8 (a2)
const TURNS = 2;
const ATTACKER = 0;
const DEFENDER = 1;

const UNKNOWN = -2;
const DRAW = -1;

type KpkTable = Int16Array;

let cachedTable: KpkTable | null = null;

function fileOf(sq: number): number {
  return sq % 8;
}

function rankOf(sq: number): number {
  return Math.floor(sq / 8);
}

function chebyshevDistance(a: number, b: number): number {
  return Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
}

function kingNeighbors(sq: number): number[] {
  const f = fileOf(sq);
  const r = rankOf(sq);
  const neighbors: number[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const nf = f + df;
      const nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        neighbors.push(nr * 8 + nf);
      }
    }
  }
  return neighbors;
}

/** Cases attaquées par le pion attaquant (avance vers la rangée 8) posé sur `pawnSq`. */
function pawnAttacks(pawnSq: number): number[] {
  const f = fileOf(pawnSq);
  const r = rankOf(pawnSq);
  const targets: number[] = [];
  if (r === 7) return targets; // ne devrait pas arriver (déjà promu)
  if (f > 0) targets.push((r + 1) * 8 + (f - 1));
  if (f < 7) targets.push((r + 1) * 8 + (f + 1));
  return targets;
}

function encode(wk: number, bk: number, pawnSq: number, turn: number): number {
  const pawnIndex = pawnSq - PAWN_SQUARE_OFFSET;
  return ((wk * BOARD_SIZE + bk) * PAWN_SQUARES + pawnIndex) * TURNS + turn;
}

function isLegalState(wk: number, bk: number, pawnSq: number, turn: number): boolean {
  if (wk === bk || wk === pawnSq || bk === pawnSq) return false;
  if (chebyshevDistance(wk, bk) < 2) return false;
  if (turn === ATTACKER) {
    // Si c'est à l'attaquant de jouer, le défenseur ne doit pas être déjà « en échec » du pion
    // (il aurait fallu qu'il y réponde avant).
    if (pawnAttacks(pawnSq).includes(bk)) return false;
  }
  return true;
}

/** Résout une promotion : dame+roi contre roi est gagnant sauf pat immédiat. */
function evaluatePromotion(wk: number, queenSq: number, bk: number): { win: boolean } {
  const queenReach = queenAttacks(queenSq);
  const kingReach = new Set(kingNeighbors(wk));
  const inCheck = queenReach.has(bk);
  const hasMove = kingNeighbors(bk).some((n) => {
    if (kingReach.has(n) || n === wk) return false; // case tenue par le roi attaquant
    if (n === queenSq) return !kingReach.has(queenSq); // capture de la dame, licite si non défendue
    return !queenReach.has(n);
  });
  if (!hasMove) {
    // Pas de coup : mat si en échec, pat (nulle) sinon.
    return { win: inCheck };
  }
  return { win: true };
}

function queenAttacks(sq: number): Set<number> {
  const attacks = new Set<number>();
  const f = fileOf(sq);
  const r = rankOf(sq);
  const directions: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [df, dr] of directions) {
    let nf = f + df;
    let nr = r + dr;
    while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      attacks.add(nr * 8 + nf);
      nf += df;
      nr += dr;
    }
  }
  return attacks;
}

function defenderMoves(wk: number, bk: number, pawnSq: number): number[] {
  // Le pion peut capturer (dest === pawnSq, traité à part par l'appelant) mais le roi défenseur
  // ne peut jamais se poser sur une case autre que le pion lui-même si elle est attaquée par lui.
  const attacked = pawnAttacks(pawnSq);
  return kingNeighbors(bk).filter(
    (dest) => dest !== wk && chebyshevDistance(dest, wk) >= 2 && (dest === pawnSq || !attacked.includes(dest)),
  );
}

interface AttackerMove {
  wk: number;
  pawnSq: number;
  /** Résultat direct si ce coup promeut le pion (évalué hors-table). */
  promotionWin?: boolean;
}

function attackerMoves(wk: number, bk: number, pawnSq: number): AttackerMove[] {
  const moves: AttackerMove[] = [];
  for (const dest of kingNeighbors(wk)) {
    if (dest === bk || dest === pawnSq) continue;
    if (chebyshevDistance(dest, bk) < 2) continue;
    moves.push({ wk: dest, pawnSq });
  }
  const r = rankOf(pawnSq);
  const f = fileOf(pawnSq);
  const oneStep = (r + 1) * 8 + f;
  if (oneStep !== wk && oneStep !== bk) {
    if (r + 1 === 7) {
      const { win } = evaluatePromotion(wk, oneStep, bk);
      moves.push({ wk, pawnSq: oneStep, promotionWin: win });
    } else {
      moves.push({ wk, pawnSq: oneStep });
      if (r === 1) {
        const twoStep = (r + 2) * 8 + f;
        if (twoStep !== wk && twoStep !== bk) {
          moves.push({ wk, pawnSq: twoStep });
        }
      }
    }
  }
  return moves;
}

function buildKpkTable(): KpkTable {
  const size = BOARD_SIZE * BOARD_SIZE * PAWN_SQUARES * TURNS;
  const table = new Int16Array(size).fill(UNKNOWN);

  // Étape 1 : positions terminales où le défenseur est au trait.
  for (let wk = 0; wk < BOARD_SIZE; wk++) {
    for (let bk = 0; bk < BOARD_SIZE; bk++) {
      for (let pawnIndex = 0; pawnIndex < PAWN_SQUARES; pawnIndex++) {
        const pawnSq = pawnIndex + PAWN_SQUARE_OFFSET;
        if (!isLegalState(wk, bk, pawnSq, DEFENDER)) continue;
        const moves = defenderMoves(wk, bk, pawnSq);
        if (moves.length === 0) {
          const inCheck = pawnAttacks(pawnSq).includes(bk);
          table[encode(wk, bk, pawnSq, DEFENDER)] = inCheck ? 0 : DRAW;
        }
      }
    }
  }

  // Étape 2 : relaxation itérative jusqu'au point fixe.
  let changed = true;
  while (changed) {
    changed = false;

    for (let wk = 0; wk < BOARD_SIZE; wk++) {
      for (let bk = 0; bk < BOARD_SIZE; bk++) {
        for (let pawnIndex = 0; pawnIndex < PAWN_SQUARES; pawnIndex++) {
          const pawnSq = pawnIndex + PAWN_SQUARE_OFFSET;

          // --- Trait à l'attaquant : gagnant dès qu'un coup mène à une position gagnante. ---
          if (isLegalState(wk, bk, pawnSq, ATTACKER)) {
            const key = encode(wk, bk, pawnSq, ATTACKER);
            if (table[key] === UNKNOWN) {
              let bestDepth = Infinity;
              let anyUnknown = false;
              for (const move of attackerMoves(wk, bk, pawnSq)) {
                let childValue: number;
                if (move.promotionWin !== undefined) {
                  childValue = move.promotionWin ? 0 : DRAW;
                } else {
                  childValue = table[encode(move.wk, bk, move.pawnSq, DEFENDER)] ?? UNKNOWN;
                }
                if (childValue === UNKNOWN) {
                  anyUnknown = true;
                } else if (childValue >= 0 && childValue < bestDepth) {
                  bestDepth = childValue;
                }
              }
              if (bestDepth !== Infinity) {
                table[key] = bestDepth + 1;
                changed = true;
              } else if (!anyUnknown) {
                table[key] = DRAW;
                changed = true;
              }
            }
          }

          // --- Trait au défenseur : nul dès qu'un coup échappe ; gagnant si tous perdent. ---
          if (isLegalState(wk, bk, pawnSq, DEFENDER)) {
            const key = encode(wk, bk, pawnSq, DEFENDER);
            if (table[key] === UNKNOWN) {
              let worstDepth = -Infinity;
              let allKnown = true;
              let foundDraw = false;
              for (const dest of defenderMoves(wk, bk, pawnSq)) {
                if (dest === pawnSq) {
                  foundDraw = true; // capture du pion : nulle immédiate
                  break;
                }
                const childValue = table[encode(wk, dest, pawnSq, ATTACKER)] ?? UNKNOWN;
                if (childValue === DRAW) {
                  foundDraw = true;
                  break;
                }
                if (childValue === UNKNOWN) {
                  allKnown = false;
                } else if (childValue > worstDepth) {
                  worstDepth = childValue;
                }
              }
              if (foundDraw) {
                table[key] = DRAW;
                changed = true;
              } else if (allKnown && worstDepth !== -Infinity) {
                table[key] = worstDepth + 1;
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  // Étape 3 : tout ce qui reste non résolu est nul (aucune suite forcée vers un gain).
  for (let i = 0; i < table.length; i++) {
    if (table[i] === UNKNOWN) table[i] = DRAW;
  }

  return table;
}

function getTable(): KpkTable {
  if (!cachedTable) {
    cachedTable = buildKpkTable();
  }
  return cachedTable;
}

// --- API publique -----------------------------------------------------------

export interface KpkPosition {
  attackerKing: number;
  defenderKing: number;
  pawnSquare: number;
  attackerToMove: boolean;
  /** Couleur réelle (non normalisée) du camp qui a le pion, pour reconvertir un coup vers la FEN d'origine. */
  attackerIsWhite: boolean;
}

export type KpkResult = "win" | "draw";

function squareIndex(file: number, rank: number): number {
  return rank * 8 + file;
}

function algebraicToSquare(algebraic: string): number {
  const file = algebraic.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(algebraic[1]) - 1;
  return squareIndex(file, rank);
}

function squareToAlgebraic(sq: number): string {
  const file = String.fromCharCode("a".charCodeAt(0) + fileOf(sq));
  return `${file}${rankOf(sq) + 1}`;
}

/**
 * Lit une FEN roi+pion contre roi et la normalise : l'attaquant (camp avec le pion) est toujours
 * ramené à « avance vers la rangée 8 », quelle que soit sa couleur réelle dans la FEN.
 */
export function parseKpkFen(fen: string): KpkPosition {
  const chess = new Chess(fen);
  const board = chess.board();

  let whiteKing = -1;
  let blackKing = -1;
  let pawnSquare = -1;
  let pawnColor: "w" | "b" | null = null;

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[7 - rank]?.[file];
      if (!piece) continue;
      const sq = squareIndex(file, rank);
      if (piece.type === "k") {
        if (piece.color === "w") whiteKing = sq;
        else blackKing = sq;
      } else if (piece.type === "p") {
        pawnSquare = sq;
        pawnColor = piece.color;
      }
    }
  }

  if (whiteKing === -1 || blackKing === -1 || pawnSquare === -1 || !pawnColor) {
    throw new Error("La position n'est pas une finale roi + pion contre roi valide.");
  }

  const sideToMove = chess.turn();
  const attackerColor = pawnColor;
  const attackerIsWhite = attackerColor === "w";

  const flip = (sq: number) => squareIndex(fileOf(sq), 7 - rankOf(sq));

  const attackerKing = attackerIsWhite ? whiteKing : flip(blackKing);
  const defenderKing = attackerIsWhite ? blackKing : flip(whiteKing);
  const pawn = attackerIsWhite ? pawnSquare : flip(pawnSquare);

  return {
    attackerKing,
    defenderKing: defenderKing,
    pawnSquare: pawn,
    attackerToMove: sideToMove === attackerColor,
    attackerIsWhite,
  };
}

function classify(position: KpkPosition): { result: KpkResult; depth: number } {
  const table = getTable();
  const turn = position.attackerToMove ? ATTACKER : DEFENDER;
  const value = table[encode(position.attackerKing, position.defenderKing, position.pawnSquare, turn)];
  if (value === undefined || value === DRAW) {
    return { result: "draw", depth: 0 };
  }
  return { result: "win", depth: value };
}

/** Résultat (du point de vue du camp qui a le pion) de la position décrite par `fen`. */
export function kpkResult(fen: string): KpkResult {
  return classify(parseKpkFen(fen)).result;
}

export interface KpkMoveJudgement {
  resultBefore: KpkResult;
  resultAfter: KpkResult;
  /** Demi-coups restants avant conversion, côté attaquant (0 si nulle). */
  depthBefore: number;
  depthAfter: number;
  /** Le gain tenait avant le coup et ne tient plus (nulle) après : coup à refuser/annuler. */
  blundered: boolean;
  /** Le gain tient toujours, mais plus lentement que l'optimal : case rouge sur la barre de tempo. */
  tempoLost: boolean;
}

/**
 * Juge un coup (joué par l'attaquant ou le défenseur) en comparant la classification
 * attaquant-centrée avant/après. Grâce à la structure de la table, un gain qui devient nulle ne
 * peut venir que d'une maladresse de l'attaquant, et une nulle qui devient un gain ne peut venir
 * que d'une maladresse du défenseur — inutile de savoir qui a trait pour interpréter le résultat.
 */
export function judgeKpkMove(fenBefore: string, fenAfter: string): KpkMoveJudgement {
  const before = classify(parseKpkFen(fenBefore));
  const after = classify(parseKpkFen(fenAfter));

  const blundered = before.result === "win" && after.result === "draw";
  const tempoLost = before.result === "win" && after.result === "win" && after.depth !== before.depth - 1;

  return {
    resultBefore: before.result,
    resultAfter: after.result,
    depthBefore: before.result === "win" ? before.depth : 0,
    depthAfter: after.result === "win" ? after.depth : 0,
    blundered,
    tempoLost,
  };
}

function unflip(sq: number, attackerIsWhite: boolean): number {
  return attackerIsWhite ? sq : squareIndex(fileOf(sq), 7 - rankOf(sq));
}

/**
 * Calcule la réponse du juge pour l'autre camp (celui que le joueur n'incarne pas) : le coup le
 * plus rapide pour l'attaquant, ou le plus résistant pour le défenseur (nulle si elle existe,
 * sinon la suite qui tient le plus longtemps). En position nulle (entraînement en défense),
 * l'attaquant préfère des coups qui gardent le pion défendu — forçant l'élève à tenir par
 * l'opposition plutôt que par la prise d'un pion mal gardé. Lève une erreur seulement si le camp
 * à jouer n'a plus aucun coup légal (mat ou pat).
 */
export function bestKpkReply(fen: string, random: () => number = Math.random): SquareMove {
  const { attackerKing: wk, defenderKing: bk, pawnSquare: pawnSq, attackerToMove, attackerIsWhite } = parseKpkFen(fen);
  const table = getTable();

  if (attackerToMove) {
    let best: AttackerMove | null = null;
    let bestValue = Infinity;
    for (const move of attackerMoves(wk, bk, pawnSq)) {
      const childValue =
        move.promotionWin !== undefined ? (move.promotionWin ? 0 : DRAW) : table[encode(move.wk, bk, move.pawnSq, DEFENDER)];
      if (childValue !== undefined && childValue >= 0 && childValue < bestValue) {
        bestValue = childValue;
        best = move;
      }
    }
    if (!best) {
      // Position nulle : aucun coup gagnant. Parmi les coups qui maintiennent la nulle en table,
      // préférer ceux où le roi reste adjacent au pion (pédagogie : l'élève doit tenir par
      // l'opposition, non par la prise d'un pion abandonné).
      const allMoves = attackerMoves(wk, bk, pawnSq);
      if (allMoves.length === 0) throw new Error("L'attaquant n'a aucun coup légal (mat ou pat).");
      const drawMoves = allMoves.filter((m) => {
        const cv =
          m.promotionWin !== undefined ? (m.promotionWin ? 0 : DRAW) : table[encode(m.wk, bk, m.pawnSq, DEFENDER)];
        return cv === DRAW;
      });
      const candidates = drawMoves.length > 0 ? drawMoves : allMoves;
      // Parmi les coups nuls, préférer ceux où le roi reste adjacent au pion.
      const defended = candidates.filter((m) => chebyshevDistance(m.wk, m.pawnSq) <= 1);
      const pool = defended.length > 0 ? defended : candidates;
      best = pool[Math.floor(random() * pool.length)]!;
    }

    const pawnMoved = best.pawnSq !== pawnSq;
    const fromSq = pawnMoved ? pawnSq : wk;
    const toSq = pawnMoved ? best.pawnSq : best.wk;
    const move: SquareMove = {
      from: squareToAlgebraic(unflip(fromSq, attackerIsWhite)),
      to: squareToAlgebraic(unflip(toSq, attackerIsWhite)),
    };
    if (pawnMoved && rankOf(best.pawnSq) === 7) move.promotion = "q";
    return move;
  }

  const defenderDests = defenderMoves(wk, bk, pawnSq);
  if (defenderDests.length === 0) throw new Error("Le défenseur n'a aucun coup légal (mat ou pat).");

  // Capturer le pion non défendu termine la partie sur-le-champ : toujours optimal quand possible,
  // on n'a pas besoin de comparer aux autres coups qui ne feraient, au mieux, que mener au même
  // résultat nul par un autre chemin.
  let bestDest: number | null = defenderDests.includes(pawnSq) ? pawnSq : null;
  let bestValue = -Infinity;
  if (bestDest === null) {
    for (const dest of defenderDests) {
      const childValue = table[encode(wk, dest, pawnSq, ATTACKER)];
      if (childValue === DRAW) {
        bestDest = dest; // échappatoire vers la nulle : optimal
        break;
      }
      if (childValue !== undefined && childValue > bestValue) {
        bestValue = childValue;
        bestDest = dest;
      }
    }
  }
  if (bestDest === null) throw new Error("Le défenseur n'a aucun coup légal (mat ou pat).");

  return {
    from: squareToAlgebraic(unflip(bk, attackerIsWhite)),
    to: squareToAlgebraic(unflip(bestDest, attackerIsWhite)),
  };
}

function piecePlacementFen(pieces: Array<{ sq: number; char: string }>): string {
  const grid: (string | null)[] = new Array(BOARD_SIZE).fill(null);
  for (const { sq, char } of pieces) grid[sq] = char;

  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = grid[rank * 8 + file];
      if (piece) {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        row += piece;
      } else {
        empty += 1;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return rows.join("/");
}

/**
 * Génère une FEN roi + pion contre roi aléatoire et gagnante pour l'attaquant à trait. Sert
 * l'essai sans compte (3 positions tirées au hasard, cf. SPEC.md « Visiteur ») : aucune position
 * n'est codée en dur, elle est tirée par essais successifs puis validée par la table KPK elle-même.
 */
export function randomWinningKpkFen(random: () => number = Math.random): string {
  const pick = (n: number) => Math.floor(random() * n);

  for (let attempt = 0; attempt < 500; attempt++) {
    const attackerIsWhite = pick(2) === 0;
    const pawnSq = squareIndex(pick(8), 1 + pick(5)); // rangées 2 à 6 : jamais déjà promu ni sur la 1ère
    const attackerKing = pick(BOARD_SIZE);
    const defenderKing = pick(BOARD_SIZE);
    if (!isLegalState(attackerKing, defenderKing, pawnSq, ATTACKER)) continue;

    const position: KpkPosition = {
      attackerKing,
      defenderKing,
      pawnSquare: pawnSq,
      attackerToMove: true,
      attackerIsWhite,
    };
    if (classify(position).result !== "win") continue;

    const atkKingSq = unflip(attackerKing, attackerIsWhite);
    const defKingSq = unflip(defenderKing, attackerIsWhite);
    const pawnRealSq = unflip(pawnSq, attackerIsWhite);
    const placement = piecePlacementFen([
      { sq: attackerIsWhite ? atkKingSq : defKingSq, char: "K" },
      { sq: attackerIsWhite ? defKingSq : atkKingSq, char: "k" },
      { sq: pawnRealSq, char: attackerIsWhite ? "P" : "p" },
    ]);
    const sideToMove = attackerIsWhite ? "w" : "b";
    return `${placement} ${sideToMove} - - 0 1`;
  }

  throw new Error("Impossible de générer une position roi + pion contre roi gagnante après 500 tentatives.");
}

/**
 * Suite principale (SPEC.md, « explication d'erreur » : coup juste + suite de quelques coups) :
 * rejoue `bestKpkReply` des deux côtés en alternance, puis continue 2 demi-coups après la
 * promotion pour montrer que le Roi noir ne peut pas capturer la dame.
 * S'arrête à la fin légale de la partie (mat/pat).
 */
export function kpkPrincipalVariation(fen: string, plies = 5, random: () => number = Math.random): SquareMove[] {
  const line: SquareMove[] = [];
  const chess = new Chess(fen);

  // Phase KPK : jusqu'à `plies` demi-coups avec bestKpkReply
  for (let i = 0; i < plies; i++) {
    if (chess.isGameOver()) return line;
    let move: SquareMove;
    try {
      move = bestKpkReply(chess.fen(), random);
    } catch {
      return line;
    }
    const played = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!played) return line;
    line.push(move);
    if (played.promotion) {
      // Phase post-promotion : 1 coup du Roi noir pour montrer qu'il ne peut pas prendre la dame
      if (!chess.isGameOver()) {
        const legalMoves = chess.moves({ verbose: true });
        const kingMoves = legalMoves.filter((m) => m.piece === "k" && m.captured !== "q");
        const extra = kingMoves[0] ?? legalMoves[0];
        if (extra) line.push({ from: extra.from, to: extra.to });
      }
      return line;
    }
  }

  return line;
}

export { algebraicToSquare };

/**
 * Nombre de demi-coups jusqu'à la conversion (promotion ou capture du pion) pour l'attaquant,
 * depuis la position donnée avec le meilleur jeu des deux côtés.
 * Retourne 0 si la position est nulle.
 * Utilisé par les scripts de génération pour filtrer les positions par complexité.
 */
export function kpkDepth(fen: string): number {
  return judgeKpkMove(fen, fen).depthBefore;
}
