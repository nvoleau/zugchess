import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/reveal";

/** Static SVG chess board — KPK position (White Ke6 escorts pawn d5 to promote). */
function MethodBoardPreview() {
  const SQ = 54;
  const BOARD = 8 * SQ; // 432 × 432

  const highlighted = new Set(["d5", "e6", "d7"]);

  const pieces: Array<{ sq: string; glyph: string; white: boolean }> = [
    { sq: "e6", glyph: "♔", white: true },
    { sq: "d5", glyph: "♙", white: true },
    { sq: "c8", glyph: "♚", white: false },
  ];

  function sqToXY(sq: string): [number, number] {
    const file = sq.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(sq.charAt(1)) - 1;
    return [file * SQ, (7 - rank) * SQ];
  }

  const squares: Array<{ x: number; y: number; isLight: boolean; isHighlighted: boolean }> = [];
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const isLight = (file + rank) % 2 === 0;
      const sqName = String.fromCharCode("a".charCodeAt(0) + file) + (rank + 1);
      squares.push({ x: file * SQ, y: (7 - rank) * SQ, isLight, isHighlighted: highlighted.has(sqName) });
    }
  }

  // Arrow e6 → d7, shortened to not overlap the arrowhead
  const [ax, ay] = sqToXY("e6");
  const [bx, by] = sqToXY("d7");
  const x1 = ax + SQ / 2, y1 = ay + SQ / 2;
  const x2 = bx + SQ / 2, y2 = by + SQ / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const x2s = x1 + (dx / len) * (len - SQ * 0.38);
  const y2s = y1 + (dy / len) * (len - SQ * 0.38);

  return (
    <div className="relative drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]">
      <svg
        width={BOARD}
        height={BOARD}
        viewBox={`0 0 ${BOARD} ${BOARD}`}
        className="w-full max-w-[432px] rounded-2xl"
        aria-hidden="true"
      >
        <defs>
          {/* Wood-grain gradient for light squares */}
          <linearGradient id="mbLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F4E0A8" />
            <stop offset="100%" stopColor="#DCC07A" />
          </linearGradient>
          {/* Wood-grain gradient for dark squares */}
          <linearGradient id="mbDark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B08040" />
            <stop offset="100%" stopColor="#8A6028" />
          </linearGradient>
          {/* Board vignette for depth */}
          <radialGradient id="mbVig" cx="50%" cy="50%" r="71%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
          </radialGradient>
          {/* Piece drop shadow */}
          <filter id="mbPS" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="rgba(0,0,0,0.60)" />
          </filter>
          {/* Arrow glow */}
          <filter id="mbGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="mbArrow" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
            <polygon points="0 1, 9 4.5, 0 8" fill="#FF5F3C" />
          </marker>
        </defs>

        {/* Board squares */}
        {squares.map(({ x, y, isLight, isHighlighted }, i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width={SQ}
            height={SQ}
            fill={isHighlighted ? "rgba(255,95,60,0.52)" : isLight ? "url(#mbLight)" : "url(#mbDark)"}
          />
        ))}

        {/* Board vignette */}
        <rect x={0} y={0} width={BOARD} height={BOARD} fill="url(#mbVig)" />

        {/* Pieces */}
        {pieces.map(({ sq, glyph, white }) => {
          const [x, y] = sqToXY(sq);
          return (
            <text
              key={sq}
              x={x + SQ / 2}
              y={y + SQ * 0.80}
              textAnchor="middle"
              fontSize={SQ * 0.84}
              fill={white ? "#FFFEF2" : "#0C0905"}
              filter="url(#mbPS)"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", userSelect: "none" }}
            >
              {glyph}
            </text>
          );
        })}

        {/* Arrow with glow */}
        <line
          x1={x1} y1={y1} x2={x2s} y2={y2s}
          stroke="#FF5F3C"
          strokeWidth="5"
          strokeOpacity="0.92"
          strokeLinecap="round"
          markerEnd="url(#mbArrow)"
          filter="url(#mbGlow)"
        />

        {/* Coordinate labels */}
        {"abcdefgh".split("").map((f, i) => (
          <text key={f} x={i * SQ + SQ / 2} y={BOARD - 4} textAnchor="middle"
            fontSize={11} fill="rgba(255,255,255,0.42)"
            style={{ fontFamily: "ui-monospace, monospace" }}>
            {f}
          </text>
        ))}
        {[1,2,3,4,5,6,7,8].map((r) => (
          <text key={r} x={5} y={(7 - (r - 1)) * SQ + SQ / 2 + 4} textAnchor="middle"
            fontSize={11} fill="rgba(255,255,255,0.42)"
            style={{ fontFamily: "ui-monospace, monospace" }}>
            {r}
          </text>
        ))}
      </svg>
    </div>
  );
}

export async function MethodSection() {
  const t = await getTranslations("Marketing.method");
  const tempo = await getTranslations("Marketing.tempo");

  return (
    <section id="methode" className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-16 sm:px-10 sm:py-28">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h2 className="max-w-[640px] text-balance font-brandDisplay text-[clamp(40px,5.5vw,68px)] font-normal leading-none tracking-tight">
            {t("title")} <em className="text-brand-accent">{t("titleEm")}</em>
          </h2>
          <p className="max-w-[380px] text-base leading-relaxed text-brand-muted">{t("body")}</p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Reveal delay={0}>
          <div className="flex h-full flex-col gap-[18px] rounded-[22px] border border-white/[0.08] bg-brand-panel p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.18]">
            <span className="self-start rounded-full border-[1.5px] border-brand-cream px-3.5 py-1 font-brandMono text-[15px]">01</span>
            <h3 className="text-[22px] font-medium">{t("step1Title")}</h3>
            <p className="text-[15px] leading-relaxed text-brand-muted">{t("step1Body")}</p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex h-full flex-col gap-[18px] rounded-[22px] border border-white/[0.08] bg-brand-panel p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.18]">
            <span className="self-start rounded-full border-[1.5px] border-brand-cream px-3.5 py-1 font-brandMono text-[15px]">02</span>
            <h3 className="text-[22px] font-medium">{t("step2Title")}</h3>
            <p className="text-[15px] leading-relaxed text-brand-muted">{t("step2Body")}</p>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="flex h-full flex-col gap-[18px] rounded-[22px] bg-brand-accent p-7 text-brand-ink transition-all duration-300 hover:-translate-y-1">
            <span className="self-start rounded-full border-[1.5px] border-brand-ink px-3.5 py-1 font-brandMono text-[15px]">03</span>
            <h3 className="text-[22px] font-medium">{t("step3Title")}</h3>
            <p className="text-[15px] leading-relaxed text-[#2B2214]">{t("step3Body")}</p>
          </div>
        </Reveal>
      </div>

      {/* Chess board visualization */}
      <Reveal delay={100}>
        <div className="grid grid-cols-1 items-center gap-8 rounded-[28px] border border-white/[0.08] bg-brand-panel p-7 sm:grid-cols-2 sm:p-10">
          <div className="flex flex-col gap-4">
            <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-accent">
              {t("boardTitle")}
            </span>
            <h3 className="font-brandDisplay text-[clamp(26px,3.5vw,38px)] font-normal leading-[1.08]">
              {t("boardHeading")}
            </h3>
            <p className="text-[15px] leading-relaxed text-brand-muted">
              {t("boardBody")}
            </p>
          </div>
          <div className="flex items-center justify-center">
            <MethodBoardPreview />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0}>
        <div className="grid grid-cols-1 items-center gap-10 rounded-[28px] border border-white/[0.08] bg-brand-panel p-7 transition-all duration-300 hover:border-white/[0.14] sm:grid-cols-2 sm:p-12">
          <div className="flex flex-col gap-4">
            <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-accent">{tempo("kicker")}</span>
            <h3 className="font-brandDisplay text-[clamp(32px,4vw,46px)] font-normal leading-[1.05]">
              {tempo("title")} <em className="text-brand-accent">{tempo("titleEm")}</em>
            </h3>
            <p className="max-w-[460px] text-[15px] leading-relaxed text-brand-muted">{tempo("body")}</p>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-3 rounded-2xl bg-brand-ink p-5">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">{tempo("attackLabel")}</span>
                <span className="font-medium text-brand-accent">{tempo("attackValue")}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-3 flex-1 rounded-[3px] bg-brand-accent" />
                <span className="h-3 flex-1 rounded-[3px] bg-brand-accent" />
                <span className="h-3 flex-1 rounded-[3px] bg-brand-bad" />
                <span className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
                <span className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
                <span className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
              </div>
              <span className="text-[13px] text-brand-muted">{tempo("attackNote", { move: "Rf6" })}</span>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-brand-ink p-5">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">{tempo("defenseLabel")}</span>
                <span className="font-medium">{tempo("defenseValue")}</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="h-3 flex-1 rounded-[3px] bg-brand-cream" />
                ))}
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
