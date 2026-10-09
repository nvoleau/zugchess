export interface RatingCurvePoint {
  rating: number;
}

/**
 * Courbe de progression ZugElo (chantier 4) : SVG léger, aucune dépendance de charting, cohérent
 * avec le reste du projet. Trace simplement la cote dans l'ordre chronologique (point le plus
 * ancien à gauche) ; vert si la tendance est à la hausse entre le premier et le dernier point,
 * rouge sinon.
 */
export function RatingCurve({ points, height = 56 }: { points: RatingCurvePoint[]; height?: number }) {
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-[11px] text-brand-muted" style={{ height }}>
        —
      </div>
    );
  }

  const width = 280;
  const ratings = points.map((p) => p.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const pad = 4;

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = pad + (height - 2 * pad) * (1 - (p.rating - min) / range);
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const trendUp = ratings[ratings.length - 1]! >= ratings[0]!;
  const color = trendUp ? "#7FCB94" : "#E06B57";
  const [lastX, lastY] = coords[coords.length - 1]!;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  );
}
