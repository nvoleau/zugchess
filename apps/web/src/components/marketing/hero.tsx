import { getTranslations } from "next-intl/server";
import { HeroTrial } from "@/components/marketing/hero-trial";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/reveal";

/** Large decorative chess board drawn in the hero background. */
function HeroChessBackground() {
  const SQ = 72;
  const BOARD = 8 * SQ; // 576 × 576

  // Warm wooden board colours — gradient per square for depth
  const pieces: Array<{ sq: string; glyph: string; white: boolean }> = [
    { sq: "g5", glyph: "♔", white: true },
    { sq: "h8", glyph: "♖", white: true },
    { sq: "f5", glyph: "♙", white: true },
    { sq: "g6", glyph: "♙", white: true },
    { sq: "d5", glyph: "♗", white: true },
    { sq: "h7", glyph: "♚", white: false },
    { sq: "a7", glyph: "♜", white: false },
    { sq: "f6", glyph: "♟", white: false },
    { sq: "e5", glyph: "♟", white: false },
    { sq: "b6", glyph: "♟", white: false },
  ];

  function sqToXY(sq: string): [number, number] {
    const file = sq.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(sq.charAt(1)) - 1;
    return [file * SQ, (7 - rank) * SQ];
  }

  return (
    <svg
      width={BOARD}
      height={BOARD}
      viewBox={`0 0 ${BOARD} ${BOARD}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hLightSq" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2DBA0" />
          <stop offset="100%" stopColor="#D9BF78" />
        </linearGradient>
        <linearGradient id="hDarkSq" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A87840" />
          <stop offset="100%" stopColor="#8C6028" />
        </linearGradient>
        {/* Inner vignette for depth */}
        <radialGradient id="hVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.30)" />
        </radialGradient>
        <filter id="hPieceShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.65)" />
        </filter>
      </defs>

      {/* Squares */}
      {Array.from({ length: 64 }, (_, i) => {
        const file = i % 8;
        const row = Math.floor(i / 8);
        const rank = 7 - row;
        const isLight = (file + rank) % 2 === 0;
        return (
          <rect
            key={i}
            x={file * SQ}
            y={row * SQ}
            width={SQ}
            height={SQ}
            fill={isLight ? "url(#hLightSq)" : "url(#hDarkSq)"}
          />
        );
      })}

      {/* Vignette overlay */}
      <rect x={0} y={0} width={BOARD} height={BOARD} fill="url(#hVignette)" />

      {/* Pieces */}
      {pieces.map(({ sq, glyph, white }) => {
        const [x, y] = sqToXY(sq);
        return (
          <text
            key={sq}
            x={x + SQ / 2}
            y={y + SQ * 0.82}
            textAnchor="middle"
            fontSize={SQ * 0.86}
            fill={white ? "#FFFEF4" : "#0C0905"}
            filter="url(#hPieceShadow)"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", userSelect: "none" }}
          >
            {glyph}
          </text>
        );
      })}
    </svg>
  );
}

export async function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = await getTranslations("Marketing.hero");

  return (
    <section className="relative overflow-hidden">
      {/* ── Background chess board (perspective-tilted) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Board: rotated + partially off-screen right */}
        <div
          className="absolute right-[-8%] top-[-12%] opacity-[0.15]"
          style={{ transform: "rotate(8deg) scale(1.08)" }}
        >
          <HeroChessBackground />
        </div>
        {/* Gradient: left side fully opaque so text is crisp */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-ink from-[35%] via-brand-ink/75 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-brand-ink to-transparent" />
        {/* Top-right gold glow */}
        <div className="absolute -right-[10%] -top-[20%] h-[780px] w-[780px] rounded-full bg-[radial-gradient(closest-side,rgba(226,182,90,0.18),rgba(226,182,90,0))]" />
      </div>

      {/* ── Content ── */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 py-14 sm:px-10 sm:py-20 lg:grid-cols-2 lg:gap-20">

        <div className="flex flex-col gap-7">
          <Reveal delay={0}>
            <div className="flex items-center gap-2.5 font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">
              <span className="h-px w-6 bg-brand-gold" />
              {t("kicker")}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-balance font-brandSerif text-[clamp(48px,7vw,92px)] font-normal leading-[0.98] tracking-tight">
              {t("titleLine1")} <em className="text-brand-gold">{t("titleEm")}</em>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="max-w-[500px] text-pretty text-lg leading-relaxed text-brand-muted">{t("body")}</p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-wrap gap-3">
              <Link
                href={isAuthenticated ? "/app" : "/login"}
                className="flex items-center gap-3 rounded-full bg-brand-gold px-7 py-4 text-base font-semibold text-brand-ink transition-all hover:bg-brand-goldHover hover:scale-[1.02] active:scale-[0.97]"
              >
                {t("ctaPrimary")} <span>→</span>
              </Link>
              <Link
                href="/try"
                className="flex items-center rounded-full border border-white/[0.22] px-[26px] py-4 text-base text-brand-cream transition-all hover:border-brand-gold hover:text-brand-gold hover:scale-[1.02] active:scale-[0.97]"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="flex flex-wrap gap-6 border-t border-white/[0.08] pt-5 sm:gap-11">
              <div className="flex flex-col gap-1">
                <span className="font-brandSerif text-4xl">{t("stat1Value")}</span>
                <span className="text-[13px] text-brand-muted">{t("stat1Label")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-brandSerif text-4xl">{t("stat2Value")}</span>
                <span className="text-[13px] text-brand-muted">{t("stat2Label")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-brandSerif text-4xl">{t("stat3Value")}</span>
                <span className="text-[13px] text-brand-muted">{t("stat3Label")}</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── Right: Device frame around live chess demo ── */}
        <Reveal delay={180} className="relative flex w-full max-w-[520px] flex-col gap-4 justify-self-center">
          {/* Floating XP badge */}
          <div className="absolute -left-4 top-[15%] z-10 hidden items-center gap-2 rounded-2xl border border-brand-gold/25 bg-brand-ink/90 px-3.5 py-2.5 shadow-lg backdrop-blur-sm sm:flex">
            <span className="font-brandMono text-[11px] text-brand-gold">+10 XP</span>
            <span className="font-brandMono text-[11px] text-brand-muted">Bon coup</span>
          </div>
          {/* Floating streak badge */}
          <div className="absolute -right-4 bottom-[20%] z-10 hidden items-center gap-2 rounded-2xl border border-amber-500/25 bg-brand-ink/90 px-3.5 py-2.5 shadow-lg backdrop-blur-sm sm:flex">
            <span className="text-sm">🔥</span>
            <div className="flex flex-col">
              <span className="font-brandMono text-[11px] leading-tight text-amber-400">7 jours</span>
              <span className="font-brandMono text-[9px] leading-tight text-brand-muted">Série</span>
            </div>
          </div>
          {/* Device frame */}
          <div className="relative overflow-hidden rounded-[18px] border border-white/[0.14] bg-[#080808] shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_80px_rgba(226,182,90,0.10)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/70" />
              <div className="mx-auto rounded-full bg-white/[0.06] px-4 py-0.5 font-brandMono text-[10px] text-brand-muted/60">
                zugchess.app
              </div>
            </div>
            {/* App content */}
            <div className="p-3">
              <HeroTrial />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
