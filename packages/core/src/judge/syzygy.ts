/**
 * Juge « tables Syzygy » (SPEC.md, section « Types de juge ») : positions jusqu'à 7 pièces,
 * jugées via l'API tablebase de Lichess (tablebase.lichess.ovh/standard). Ce module ne fait
 * aucun appel réseau — il interprète une réponse déjà récupérée (par `TablebaseClient`, côté
 * serveur) pour juger un coup et choisir la réplique du juge, exactement comme `judgeKpkMove` et
 * `bestKpkReply` le font pour la table K+P vs K locale.
 *
 * Convention de l'API (telle que documentée par Lichess) :
 * - `category` au niveau de la position décrit le résultat du point de vue du camp AU TRAIT dans
 *   cette position.
 * - `category` de chaque coup dans `moves[]` décrit le résultat de la position obtenue APRÈS ce
 *   coup, donc du point de vue de l'adversaire (qui a alors le trait) : il faut l'inverser pour le
 *   lire du point de vue de celui qui vient de jouer.
 * - Le signe de `dtz`/`dtm` n'est pas une donnée fiable à interpréter sans accès réseau pour le
 *   vérifier ; seule leur magnitude (nombre de demi-coups) est utilisée ici, `category` restant la
 *   seule source de vérité pour gagné/nul/perdu.
 */

export type SyzygyCategory = "win" | "cursed-win" | "draw" | "blessed-loss" | "loss" | "maybe-win" | "maybe-loss" | "unknown";

export interface SyzygyMoveOption {
  uci: string;
  /** Résultat de la position obtenue après ce coup, du point de vue de l'adversaire (trait après coup). */
  category: SyzygyCategory;
  dtz: number | null;
  dtm?: number | null;
  zeroing: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

export interface SyzygyPosition {
  /** Résultat de cette position, du point de vue du camp au trait ici. */
  category: SyzygyCategory;
  dtz: number | null;
  dtm?: number | null;
  checkmate: boolean;
  stalemate: boolean;
  moves: SyzygyMoveOption[];
}

export type JudgeOutcome = "win" | "draw" | "loss";

/** Réduit une catégorie Syzygy au résultat pratique pour le camp au trait (la règle des 50 coups n'est pas modélisée). */
function outcomeOf(category: SyzygyCategory): JudgeOutcome {
  switch (category) {
    case "win":
    case "cursed-win":
    case "maybe-win":
      return "win";
    case "loss":
    case "blessed-loss":
    case "maybe-loss":
      return "loss";
    case "draw":
    case "unknown":
    default:
      return "draw";
  }
}

function invert(outcome: JudgeOutcome): JudgeOutcome {
  if (outcome === "draw") return "draw";
  return outcome === "win" ? "loss" : "win";
}

const RANK: Record<JudgeOutcome, number> = { loss: 0, draw: 1, win: 2 };

function distanceOf(move: Pick<SyzygyMoveOption, "dtz">): number | null {
  return move.dtz === null ? null : Math.abs(move.dtz);
}

export interface SyzygyMoveJudgement {
  resultBefore: JudgeOutcome;
  resultAfter: JudgeOutcome;
  distanceBefore: number | null;
  distanceAfter: number | null;
  /** Le résultat se dégrade (gain -> nulle ou perte, nulle -> perte) : coup à refuser/annuler. */
  blundered: boolean;
  /** Le résultat tient toujours, mais plus lentement que l'optimal : case rouge sur la barre de tempo. */
  tempoLost: boolean;
}

/**
 * Juge un coup déjà joué (identifié par son UCI) en comparant le résultat de la position avant
 * coup à celui de la position obtenue, telle que décrite dans `position.moves`. Lève une erreur si
 * le coup n'apparaît pas dans la liste (coup illégal ou UCI mal formé).
 */
export function judgeSyzygyMove(position: SyzygyPosition, playedUci: string): SyzygyMoveJudgement {
  const played = position.moves.find((m) => m.uci === playedUci);
  if (!played) throw new Error(`Coup absent de la réponse Syzygy : ${playedUci}`);

  const resultBefore = outcomeOf(position.category);
  const resultAfter = invert(outcomeOf(played.category));
  const distanceBefore = distanceOf(position);
  const distanceAfter = distanceOf(played);

  const blundered = RANK[resultAfter] < RANK[resultBefore];
  const tempoLost =
    !blundered &&
    resultBefore === "win" &&
    resultAfter === "win" &&
    distanceBefore !== null &&
    distanceAfter !== null &&
    distanceAfter !== distanceBefore - 1;

  return { resultBefore, resultAfter, distanceBefore, distanceAfter, blundered, tempoLost };
}

/** Coups qui ne dégradent pas le résultat de la position — pour signaler ce qui marchait après une erreur. */
export function safeSyzygyMoves(position: SyzygyPosition): SyzygyMoveOption[] {
  const resultBefore = outcomeOf(position.category);
  return position.moves.filter((move) => RANK[invert(outcomeOf(move.category))] >= RANK[resultBefore]);
}

/**
 * Choisit la réplique du juge (camp adverse) : le coup le plus rapide quand le juge gagne, le plus
 * résistant (nulle si possible, sinon la perte la plus longue) quand il ne gagne pas. `random`
 * départage les coups équivalents, comme `bestKpkReply`.
 */
export function bestSyzygyMove(position: SyzygyPosition, random: () => number = Math.random): SyzygyMoveOption {
  if (position.moves.length === 0) throw new Error("Aucun coup légal disponible (mat ou pat).");

  // Du point de vue du juge (au trait ici) : plus le résultat du coup est défavorable à
  // l'adversaire (= favorable au juge), mieux c'est ; à résultat égal, le juge va vite s'il gagne
  // et résiste longtemps sinon.
  let best: SyzygyMoveOption[] = [];
  let bestRank = -1;
  let bestDistance = Infinity;

  for (const move of position.moves) {
    const opponentOutcome = outcomeOf(move.category);
    const judgeOutcome = invert(opponentOutcome);
    const rank = RANK[judgeOutcome];
    const distance = distanceOf(move) ?? Infinity;
    const preferShort = judgeOutcome === "win";
    const comparableDistance = preferShort ? distance : -distance;

    if (rank > bestRank || (rank === bestRank && comparableDistance < bestDistance)) {
      bestRank = rank;
      bestDistance = comparableDistance;
      best = [move];
    } else if (rank === bestRank && comparableDistance === bestDistance) {
      best.push(move);
    }
  }

  return best[Math.floor(random() * best.length)]!;
}

/**
 * Normalise une FEN pour la clé de cache `TablebaseCache` : seuls les 4 premiers champs (position,
 * trait, roques, en passant) influent sur le résultat Syzygy — l'horloge des 50 coups et le numéro
 * de coup sont donc ignorés, pour que deux positions identiques à ces compteurs près partagent la
 * même entrée de cache.
 */
export function normalizeFenForTablebase(fen: string): string {
  const fields = fen.trim().split(/\s+/);
  const [placement, turn, castling, enPassant] = fields;
  if (!placement || !turn || !castling || !enPassant) {
    throw new Error(`FEN invalide, impossible de normaliser pour le cache tablebase : ${fen}`);
  }
  return `${placement} ${turn} ${castling} ${enPassant}`;
}
