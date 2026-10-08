/**
 * Mise à jour Glicko-2 simplifiée (SPEC.md, section « Elo de finales »).
 * Implémentation directe de l'algorithme Glicko-2 (Glickman 2012).
 * Seul le cas d'une partie unique par mise à jour est utilisé ici.
 */

const Q = Math.log(10) / 400; // ln(10)/400
const TAU = 0.5;              // contrainte de la volatilité (recommandation de Glickman)

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * Q * Q * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/** Score Glicko-2 pour une révision (SPEC.md) : Good/Easy = 1, Hard = 0.5, Again = 0. */
export function gradeToScore(grade: number): number {
  if (grade >= 3) return 1;
  if (grade === 2) return 0.5;
  return 0;
}

export interface GlickoRating {
  rating: number;
  deviation: number;
  volatility: number;
}

/**
 * Mise à jour Glicko-2 après une seule partie.
 * player   = cote du joueur
 * opponent = cote de la position
 * score    = résultat (0, 0.5, ou 1)
 */
export function updateGlicko(
  player: GlickoRating,
  opponent: GlickoRating,
  score: number,
): GlickoRating {
  const mu = (player.rating - 1500) / 173.7178;
  const phi = player.deviation / 173.7178;
  const sigma = player.volatility;

  const muJ = (opponent.rating - 1500) / 173.7178;
  const phiJ = opponent.deviation / 173.7178;

  const gJ = g(phiJ);
  const eJ = E(mu, muJ, phiJ);

  const v = 1 / (gJ * gJ * eJ * (1 - eJ));
  const delta = v * gJ * (score - eJ);

  // Nouvelle volatilité (algorithme Illinois)
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const d2 = phi * phi + v + ex;
    return (ex * (delta * delta - d2)) / (2 * d2 * d2) - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B = delta * delta > phi * phi + v ? Math.log(delta * delta - phi * phi - v) : a - TAU;
  let fA = f(A), fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else { fA /= 2; }
    B = C; fB = fC;
  }
  const newSigma = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gJ * (score - eJ);

  return {
    rating: Math.round(173.7178 * newMu + 1500),
    deviation: Math.round(173.7178 * newPhi),
    volatility: newSigma,
  };
}
