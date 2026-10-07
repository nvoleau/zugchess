"use client";

import { randomWinningKpkFen, type GameResult } from "@zugchess/core";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
  const attacker = attackerColorOf(fen);

  function handleAnnounce(choice: GameResult) {
    void choice; // la démo n'affiche pas si l'annonce était juste, seulement le jeu réel qui suit
    setPhase("play");
  }

  return (
    <div className="dark flex flex-col gap-4 rounded-[22px] border border-brand-gold/20 bg-gradient-to-b from-[#1A1813] to-[#13110D] p-[18px] text-brand-cream shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-brandMono text-[11px] uppercase tracking-[0.12em] text-brand-muted">{t("label")}</span>
          <span className="text-[15px] font-medium text-brand-cream">{t("badge")}</span>
        </div>
      </div>

      {phase === "announce" && (
        <AnnounceStep sideToMove={sideToMoveOf(fen)} onAnswer={handleAnnounce} />
      )}

      {phase !== "announce" && (
        <KpkTrainer key={fen} initialFen={fen} userColor={attacker} onWin={() => setPhase("done")} />
      )}

      {phase === "done" && (
        <Link
          href="/login"
          className="rounded-full bg-brand-gold px-4 py-3 text-center text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-goldHover"
        >
          {t("cta")}
        </Link>
      )}
    </div>
  );
}
