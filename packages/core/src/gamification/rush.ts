/**
 * Zug Rush (SPEC.md refonte, chantier 4) : logique pure — durée, seuils, rampe de difficulté,
 * tirage déterministe reproductible depuis une graine. Le jugement des coups reste celui déjà en
 * place (juges KPK/Syzygy/ligne de méthode, packages/core/judge/*) ; ce module ne fait que la
 * mécanique propre au mode chrono.
 */

/** Durée d'une partie — fixée à 3 minutes pour le V1 (décision produit actée, pas de choix 3/5 min). */
export const RUSH_DURATION_MS = 3 * 60 * 1000;

/** Nombre d'erreurs avant élimination. */
export const RUSH_MAX_ERRORS = 3;

/**
 * Nombre de coups tenus pour valider une position de défense (nulle), en mode Rush. Plus court que
 * le seuil utilisé en entraînement normal (`HELD_TO_DRAW = 8`, apps/web/components/play/*-trainer.tsx)
 * pour qu'une position "tenir la nulle" ne coûte pas mécaniquement plus de temps qu'une position
 * "gagner" dans un mode chronométré — décision produit actée (pondérer le seuil plutôt qu'exclure
 * la famille entière des parties Rush).
 */
export const RUSH_HELD_TO_DRAW = 5;

/**
 * Nombre de coups corrects consécutifs pour valider une position de victoire (KPK attaquant,
 * Syzygy gagner), en mode Rush. Évite de devoir jouer l'intégralité d'une finale jusqu'au mat ou
 * à la promotion dans un mode chronométré : après ce seuil, la position est considérée résolue
 * (le joueur a prouvé qu'il maîtrisait la technique). Pour les lignes de méthode, c'est la
 * complétion de la ligne qui fait foi, pas ce seuil.
 */
export const RUSH_WIN_THRESHOLD = 3;

export const RUSH_START_RATING = 1200;
export const RUSH_RATING_STEP = 35;
export const RUSH_MAX_RATING = 2200;

/** Cote de position visée après `score` positions résolues — rampe linéaire simple, plafonnée. */
export function nextRushTargetRating(score: number): number {
  return Math.min(RUSH_START_RATING + score * RUSH_RATING_STEP, RUSH_MAX_RATING);
}

export function isRushOver(errors: number): boolean {
  return errors >= RUSH_MAX_ERRORS;
}

/** Temps restant, jamais négatif — calculé côté serveur à chaque coup, jamais fourni par le client. */
export function rushRemainingMs(startedAt: Date, now: Date): number {
  return Math.max(0, RUSH_DURATION_MS - (now.getTime() - startedAt.getTime()));
}

export function isRushTimeUp(startedAt: Date, now: Date): boolean {
  return rushRemainingMs(startedAt, now) <= 0;
}

/** Hash de chaîne en entier 32 bits (xmur3) — étape d'amorçage du PRNG ci-dessous. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * PRNG déterministe, reproductible depuis une graine texte (ex. `${RushRun.seed}:${score}`).
 * Jamais `Math.random` : le tirage de positions doit pouvoir être rejoué à l'identique côté serveur
 * (reproductibilité, et base pour une vérification anti-triche future).
 */
export function createSeededRandom(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

/** Tire un élément déterministe depuis `random` (ex. `createSeededRandom(seed)`). */
export function pickSeeded<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) throw new Error("pickSeeded : liste vide");
  return items[Math.floor(random() * items.length)]!;
}
