"use client";

import { kpkResult, randomWinningKpkFen, type GameResult } from "@zugchess/core";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ZugBoard } from "@/components/zug-board";
import { AnnounceStep } from "@/components/play/announce-step";
import { attackerColorOf } from "@/components/play/chess-move-dests";
import { KpkTrainer } from "@/components/play/kpk-trainer";
import { Link } from "@/i18n/navigation";

function sideToMoveOf(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

/**
 * Démo du hero de l'accueil : même parcours réel que l'essai sans compte (`GuestTrial` /
 * `components/play/guest-trial.tsx`) — annonce du résultat puis juge KPK réel — réduit à une
 * seule position et encadré pour la carte du hero. Pas de logique scriptée factice : le juge, la
 * génération de position et l'étape d'annonce sont les mêmes que dans le vrai produit.
 */
export function HeroTrial() {
  const t = useTranslations("Marketing.heroDemo");
  const [fen] = useState(() => randomWinningKpkFen());
  const [phase, setPhase] = useState<"announce" | "play" | "done">("announce");
  const [announceOk, setAnnounceOk] = useState<boolean | null>(null);
  const attacker = attackerColorOf(fen);
  // randomWinningKpkFen() always generates a winning position for the attacker
  const truth: GameResult = kpkResult(fen) === "win" ? attacker : "draw";

  function handleAnnounce(choice: GameResult) {
    setAnnounceOk(choice === truth);
    setPhase("play");
  }

  return (
    <div className="dark flex flex-col gap-4 rounded-[22px] border border-brand-accent/20 bg-gradient-to-b from-[#1A1813] to-[#13110D] p-[18px] text-brand-cream shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-brandMono text-[11px] uppercase tracking-[0.12em] text-brand-muted">{t("label")}</span>
          <span className="text-[15px] font-medium text-brand-cream">{t("badge")}</span>
        </div>
      </div>

      {phase === "announce" && (
        <>
          <ZugBoard fen={fen} orientation={attacker} />
          <AnnounceStep sideToMove={sideToMoveOf(fen)} onAnswer={handleAnnounce} />
        </>
      )}

      {phase !== "announce" && (
        <>
          {announceOk !== null && (
            <p className={`text-center text-sm font-medium ${announceOk ? "text-brand-good" : "text-brand-bad"}`}>
              {announceOk ? t("announceCorrect") : t("announceWrong")}
            </p>
          )}
          <KpkTrainer key={fen} initialFen={fen} userColor={attacker} onWin={() => setPhase("done")} />
        </>
      )}

      {phase === "done" && (
        <Link
          href="/login"
          className="rounded-full bg-brand-accent px-4 py-3 text-center text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-accentHover"
        >
          {t("cta")}
        </Link>
      )}
    </div>
  );
}
