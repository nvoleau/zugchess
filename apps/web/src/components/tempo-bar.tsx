export type TempoBoxState = "pending" | "done" | "lost";

export interface TempoBarProps {
  label: string;
  boxes: TempoBoxState[];
}

const boxClassName: Record<TempoBoxState, string> = {
  pending: "border-white/20",
  done: "border-brand-good bg-brand-good",
  lost: "border-brand-bad bg-brand-bad",
};

/**
 * Barre de tempo : une case par coup restant (ou joué, pour la progression d'une ligne de
 * méthode), une case rouge par temps perdu. Composant purement présentationnel.
 */
export function TempoBar({ label, boxes }: TempoBarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brand-cream">{label}</span>
      <div className="flex gap-1">
        {boxes.map((state, index) => (
          <span key={index} className={`h-3 w-5 rounded-sm border-2 ${boxClassName[state]}`} />
        ))}
      </div>
    </div>
  );
}
