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

/**
 * Distributes new positions across themes in round-robin order so each session contains
 * variety. Within each theme, positions are ordered by ratingDistance (closest Elo first).
 * Themes are visited in ascending themeOrder so the pedagogical sequence is respected
 * globally, but no single theme monopolises the session quota.
 */
function interleaveByTheme(positions: NewPositionCandidate[], quota: number): NewPositionCandidate[] {
  const sorted = [...positions].sort(
    (a, b) => a.themeOrder - b.themeOrder || a.ratingDistance - b.ratingDistance,
  );
  const grouped = new Map<number, NewPositionCandidate[]>();
  for (const p of sorted) {
    const bucket = grouped.get(p.themeOrder) ?? [];
    bucket.push(p);
    grouped.set(p.themeOrder, bucket);
  }
  const buckets = [...grouped.values()];
  const result: NewPositionCandidate[] = [];
  let round = 0;
  while (result.length < quota) {
    let added = false;
    for (const bucket of buckets) {
      if (result.length >= quota) break;
      if (round < bucket.length) {
        result.push(bucket[round]!);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return result;
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

  const fresh = interleaveByTheme(newPositions, Math.max(0, newQuota)).map(
    (p): SessionQueueItem => ({ positionId: p.positionId, kind: "new" }),
  );

  return [...due, ...fresh];
}
