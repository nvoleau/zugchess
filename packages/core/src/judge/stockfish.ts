/**
 * Juge Stockfish WASM (SPEC.md, section « Types de juge ») : positions de plus de 7 pièces,
 * hors de portée des tables Syzygy. Ce module ne lance aucun moteur — il interprète des scores déjà
 * calculés (par le worker Stockfish, côté navigateur) pour juger un coup selon un seuil de
 * tolérance configurable par position, exactement comme `judgeSyzygyMove` le fait pour les scores
 * exacts Syzygy.
 *
 * Convention : un `EngineScore` est toujours exprimé du point de vue du camp AU TRAIT dans la
 * position évaluée (convention UCI standard). Comme pour la table Syzygy, le score d'un coup donné
 * par l'analyse de la position résultante est du point de vue de l'adversaire : il faut l'inverser
 * pour le comparer au score d'avant-coup.
 */

export interface EngineScore {
  type: "cp" | "mate";
  /** Centipions (cp) ou nombre de coups avant mat (mate, négatif si c'est ce camp qui se fait mater). */
  value: number;
}

/** Grande valeur de base pour qu'un score de mat domine toujours un score en centipions, tout en
 *  conservant l'ordre entre mats (mater plus vite est toujours strictement mieux). */
const MATE_BASE = 100_000;

/** Convertit un score en un nombre comparable (centipions, mats aux extrêmes). */
function toComparable(score: EngineScore): number {
  if (score.type === "mate") {
    return score.value > 0 ? MATE_BASE - score.value : -MATE_BASE - score.value;
  }
  return score.value;
}

export function invertScore(score: EngineScore): EngineScore {
  return { type: score.type, value: -score.value };
}

export interface StockfishMoveJudgement {
  /** Score comparable (centipions, mats aux extrêmes) avant le coup, du point de vue du joueur. */
  scoreBefore: number;
  /** Score comparable après le coup, toujours du point de vue du joueur (inversé depuis le moteur). */
  scoreAfter: number;
  /** Centipions perdus par rapport au meilleur coup (0 si le coup est optimal ou meilleur). */
  lostCentipawns: number;
  /** Perte au-delà du seuil de tolérance de la position : coup à refuser/annuler. */
  blundered: boolean;
}

/**
 * Juge un coup en comparant le score Stockfish de la position avant coup (du point de vue du
 * joueur) à celui de la position obtenue (du point de vue de l'adversaire, à inverser). Le seuil de
 * tolérance (en centipions) est configurable par position (SPEC.md) : une finale serrée peut exiger
 * la précision, une finale large peut tolérer l'approximatif.
 */
export function judgeStockfishMove(
  before: EngineScore,
  afterFromOpponentPerspective: EngineScore,
  toleranceCp: number,
): StockfishMoveJudgement {
  const scoreBefore = toComparable(before);
  const scoreAfter = toComparable(invertScore(afterFromOpponentPerspective));
  const lostCentipawns = Math.max(0, scoreBefore - scoreAfter);
  return { scoreBefore, scoreAfter, lostCentipawns, blundered: lostCentipawns > toleranceCp };
}
