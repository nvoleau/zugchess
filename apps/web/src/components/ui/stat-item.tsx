interface StatItemProps {
  label: string;
  value: string | number;
}

/** Ligne label / valeur pour les quotas et statistiques de l'app. */
export function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-3 last:border-0">
      <span className="text-sm text-brand-muted">{label}</span>
      <span className="font-brandMono text-sm text-brand-cream">{value}</span>
    </div>
  );
}
