import type { LocalizedText, MethodLine } from "@zugchess/core";
import { FINALE_CARDS } from "./finales-tempo";

/**
 * Statut de relecture (SPEC.md refonte, chantier 2) : toute nouvelle position d'onboarding doit
 * être relue par un joueur confirmé avant mise en production, même quand sa solution a déjà été
 * vérifiée par un juge exact (table K+P vs K) ou par rejeu chess.js (lignes de méthode Réti/percée,
 * 8 pièces — hors de portée de l'API tablebase Lichess, limitée à 7 pièces).
 */
export type ReviewStatus = "à relire" | "validé";

interface OnboardingBase {
  id: string;
  theme: LocalizedText;
  /** Phrase-défi, courte et un peu joueuse, affichée avant que l'élève touche à l'échiquier. */
  challenge: LocalizedText;
  /** Message de célébration sobre, affiché une fois la position réussie. */
  celebration: LocalizedText;
  reviewStatus: ReviewStatus;
}

export interface OnboardingKpkPosition extends OnboardingBase {
  kind: "kpk";
  fen: string;
  userColor: "white" | "black";
}

export interface OnboardingLinePosition extends OnboardingBase {
  kind: "line";
  line: MethodLine;
}

export type OnboardingPosition = OnboardingKpkPosition | OnboardingLinePosition;

/** Nombre de positions jouables sans compte avant de proposer la connexion Lichess. */
export const ONBOARDING_FREE_COUNT = 5;

function lineOf(id: string): MethodLine {
  const card = FINALE_CARDS.find((c) => c.id === id);
  if (!card || card.kind !== "line") throw new Error(`ligne de méthode introuvable pour l'id "${id}"`);
  return card.line;
}

/**
 * Les positions d'accroche de l'onboarding « waouh » (refonte UX, chantier 2) : 5 finales
 * contre-intuitives et spectaculaires, choisies pour provoquer un « je ne savais pas ça » dans les
 * 60 premières secondes. Jouables sans compte (cf. `/try`). Les FEN roi+pion contre roi sont
 * vérifiées de façon exacte par la table K+P vs K (`@zugchess/core`, bitboard, pas d'approximation) ;
 * les lignes de méthode (Réti, percée) sont rejouées par chess.js à la construction du module
 * (`finales-tempo.ts`) pour garantir leur légalité — leur optimalité reste à confirmer par un
 * relecteur humain (`reviewStatus`), le détour par les tables Syzygy en ligne n'étant pas
 * accessible depuis cet environnement de développement.
 */
export const ONBOARDING_POSITIONS: OnboardingPosition[] = [
  {
    id: "onb-opposition",
    kind: "kpk",
    fen: "8/4k3/8/4K3/4P3/8/8/8 b - - 0 1",
    userColor: "white",
    theme: { fr: "L'opposition", en: "The opposition" },
    challenge: {
      fr: "Un seul pion sur l'échiquier, les rois se regardent droit dans les yeux. On dirait nulle. Et pourtant, les Noirs ont déjà perdu.",
      en: "Just one pawn on the board, the kings staring each other down. Looks drawn. Yet Black has already lost.",
    },
    celebration: {
      fr: "Exactement ! Une seule case d'écart entre les rois, et tout le résultat bascule.",
      en: "Exactly! One square of distance between the kings, and the whole result flips.",
    },
    reviewStatus: "à relire",
  },
  {
    id: "onb-carre",
    kind: "kpk",
    fen: "8/8/8/5k2/P7/8/8/7K w - - 0 1",
    userColor: "white",
    theme: { fr: "La règle du carré", en: "The rule of the square" },
    challenge: {
      fr: "Le roi noir fonce vers ton pion. Il a l'air assez proche pour le rattraper. Est-ce vrai ?",
      en: "The black king is racing toward your pawn. It looks close enough to catch it. Is it?",
    },
    celebration: {
      fr: "Dame ! Le roi noir était hors du carré depuis le premier coup.",
      en: "Queened! The black king was outside the square from the very first move.",
    },
    reviewStatus: "à relire",
  },
  {
    id: "onb-contournement",
    kind: "kpk",
    fen: "8/2k5/8/8/4P3/4K3/8/8 w - - 0 1",
    userColor: "white",
    theme: { fr: "Le détour qui gagne", en: "The winning detour" },
    challenge: {
      fr: "Foncer droit vers le roi noir semble la logique même. C'est pourtant le seul coup qui perd la partie.",
      en: "Marching straight at the black king looks like plain common sense. Yet it's the only move that loses.",
    },
    celebration: {
      fr: "Bien vu ! Un petit détour, et la course est gagnée d'avance.",
      en: "Well spotted! A small detour, and the race is won in advance.",
    },
    reviewStatus: "à relire",
  },
  {
    id: "onb-reti",
    kind: "line",
    line: lineOf("reti"),
    theme: { fr: "L'étude de Réti", en: "Réti's study" },
    challenge: {
      fr: "Ton roi est bien trop loin pour rattraper le pion noir, et ton propre pion semble perdu d'avance. Fais nulle. Impossible ?",
      en: "Your king is far too slow to catch the black pawn, and your own pawn looks doomed already. Hold the draw. Impossible?",
    },
    celebration: {
      fr: "Les deux camps font dame en même temps : nulle ! Ton roi visait deux objectifs à la fois, et personne ne l'a vu venir en 1921.",
      en: "Both sides queen at once: a draw! Your king aimed at two targets at once — nobody saw it coming in 1921.",
    },
    reviewStatus: "à relire",
  },
  {
    id: "onb-percee",
    kind: "line",
    line: lineOf("percee"),
    theme: { fr: "La percée", en: "The breakthrough" },
    challenge: {
      fr: "Trois pions contre trois, les rois bien trop loin pour intervenir. Matériel égal, position figée. Et pourtant, ça gagne.",
      en: "Three pawns against three, kings much too far to intervene. Even material, locked position. And yet, it wins.",
    },
    celebration: {
      fr: "Les sacrifices ouvrent la voie : un pion fait dame avant même que le roi noir n'ait eu le temps de réagir.",
      en: "The sacrifices clear the way: a pawn queens before the black king even has time to react.",
    },
    reviewStatus: "à relire",
  },
];
