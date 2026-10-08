/**
 * Règles XP (SPEC.md, section « XP et niveaux »).
 * Pur calcul — aucune dépendance externe.
 */

export type XpReason =
  | "review_good_easy"     // Carte due, note Good ou Easy
  | "review_hard"          // Carte due, note Hard
  | "new_position"         // Nouvelle position réussie (note >= Good)
  | "announce_correct"     // Annonce juste (+3 bonus)
  | "announce_wrong"       // Annonce incorrecte (−5 malus)
  | "errors_penalty"       // Erreurs de jeu (−5 malus, si l'annonce était juste)
  | "session_complete"     // Séance quotidienne terminée
  | "theme_mastered";      // Thème entièrement maîtrisé

/** Montants XP par raison (SPEC.md). */
export const XP_AMOUNTS: Record<XpReason, number> = {
  review_good_easy: 10,
  review_hard: 5,
  new_position: 15,
  announce_correct: 3,
  announce_wrong: -5,
  errors_penalty: -5,
  session_complete: 20,
  theme_mastered: 100,
};

/**
 * Niveau atteint pour un total d'XP.
 * Niveau n à 100 × n^1.5 XP cumulés.
 */
export function levelForXp(totalXp: number): number {
  // n^1.5 × 100 <= totalXp  →  n <= (totalXp / 100)^(2/3)
  return Math.floor(Math.pow(totalXp / 100, 2 / 3));
}

/** XP total requis pour atteindre le niveau n. */
export function xpForLevel(n: number): number {
  return Math.round(100 * Math.pow(n, 1.5));
}

export interface XpGrant {
  reason: XpReason;
  amount: number;
}

/**
 * Calcule les grants XP à attribuer pour une révision.
 * Note : seule la première révision du jour sur une position devrait donner de l'XP pour
 * la note review_* — le filtre est fait par GamificationService côté serveur.
 *
 * Règles pénalités :
 * - Annonce incorrecte → −5 XP (announce_wrong)
 * - Erreurs de jeu ET annonce correcte → −5 XP (errors_penalty)
 * - Au plus une pénalité par problème (jamais les deux)
 * - Le clampage "jamais sous 0" est fait côté serveur après lecture du total courant.
 */
export function computeReviewXp(params: {
  grade: number;          // 1=Again, 2=Hard, 3=Good, 4=Easy
  isNewPosition: boolean;
  announceOk: boolean;
  isFirstToday: boolean;  // première révision du jour pour cette position
  errors: number;         // coups perdants joués (0 = aucun)
}): XpGrant[] {
  const { grade, isNewPosition, announceOk, isFirstToday, errors } = params;
  const grants: XpGrant[] = [];

  if (!isFirstToday) return grants; // révision anticipée = pas d'XP

  // Pénalité : une seule par problème (announce_wrong prime sur errors_penalty)
  if (!announceOk) {
    grants.push({ reason: "announce_wrong", amount: XP_AMOUNTS.announce_wrong });
  } else if (errors > 0) {
    grants.push({ reason: "errors_penalty", amount: XP_AMOUNTS.errors_penalty });
  }

  if (grade === 1) {
    // Again : pas d'XP positif
    return grants;
  }

  if (isNewPosition && grade >= 3) {
    grants.push({ reason: "new_position", amount: XP_AMOUNTS.new_position });
  } else if (!isNewPosition) {
    if (grade >= 3) {
      grants.push({ reason: "review_good_easy", amount: XP_AMOUNTS.review_good_easy });
    } else if (grade === 2) {
      grants.push({ reason: "review_hard", amount: XP_AMOUNTS.review_hard });
    }
  }

  if (announceOk) {
    grants.push({ reason: "announce_correct", amount: XP_AMOUNTS.announce_correct });
  }

  return grants;
}
