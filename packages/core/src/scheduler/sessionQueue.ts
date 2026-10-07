/**
 * Construction de la séance quotidienne (SPEC.md, « Règles de séance ») : les cartes dues d'abord
 * (de la plus en retard à la plus récente), puis les nouvelles positions (par thème dans l'ordre
 * pédagogique, puis par difficulté proche de l'Elo de finales du joueur), chacune limitée par son
 * quota du jour. Fonction pure : la récupération des cartes/positions candidates (Prisma) reste
 * côté serveur, ce module ne fait que les ordonner et les tronquer.
 */

export interface DueCardCandidate {
  positionId: string;
  due: Date;
}

export interface NewPositionCandidate {
  positionId: string;
  /** Ordre pédagogique du thème (`Theme.order`) : les thèmes les plus tôt dans le programme d'abord. */
  themeOrder: number;
  /** `Math.abs(position.rating - eloDuJoueur)` : plus proche en premier. */
  ratingDistance: number;
}

export interface SessionQueueItem {
  positionId: string;
  kind: "due" | "new";
}

export function buildSessionQueue({
  dueCards,
  newPositions,
  reviewQuota,
  newQuota,
}: {
  dueCards: DueCardCandidate[];
  newPositions: NewPositionCandidate[];
  reviewQuota: number;
  newQuota: number;
}): SessionQueueItem[] {
  const due = [...dueCards]
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, Math.max(0, reviewQuota))
    .map((c): SessionQueueItem => ({ positionId: c.positionId, kind: "due" }));

  const fresh = [...newPositions]
    .sort((a, b) => a.themeOrder - b.themeOrder || a.ratingDistance - b.ratingDistance)
    .slice(0, Math.max(0, newQuota))
    .map((p): SessionQueueItem => ({ positionId: p.positionId, kind: "new" }));

  return [...due, ...fresh];
}
