"use client";

export interface HalfMove {
  san: string;
  color: "w" | "b";
}

/** Liste de coups style étude Lichess : numéro + blanc + noir, dernier coup surligné en or. */
export function MoveList({ moves }: { moves: HalfMove[] }) {
  if (moves.length === 0) return null;

  const rows: Array<{ n: number; white: string | null; black: string | null }> = [];
  let i = 0;
  if (moves[0]?.color === "b") {
    rows.push({ n: 1, white: null, black: moves[0].san });
    i = 1;
  }
  while (i < moves.length) {
    const w = moves[i];
    const b = moves[i + 1];
    const n = rows.length + 1;
    rows.push({ n, white: w?.san ?? null, black: b?.san ?? null });
    i += 2;
  }

  const lastIdx = moves.length - 1;
  const lastColor = moves[lastIdx]?.color;
  const lastRow = rows.length - 1;

  return (
    <div className="font-brandMono text-sm">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-baseline gap-1 leading-7">
          <span className="w-6 shrink-0 text-brand-muted/60 text-xs">{row.n}.</span>
          <span
            className={`w-[80px] rounded px-1 ${ri === lastRow && lastColor === "w" ? "bg-brand-accent/20 text-brand-accent" : "text-brand-cream"}`}
          >
            {row.white ?? "…"}
          </span>
          <span
            className={`w-[80px] rounded px-1 ${ri === lastRow && lastColor === "b" ? "bg-brand-accent/20 text-brand-accent" : "text-brand-muted"}`}
          >
            {row.black ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}
