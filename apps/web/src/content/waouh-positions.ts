/**
 * Positions de l'onboarding « waouh » — hardcodées, sans appel réseau ni base de données.
 * Chaque position se joue sur un coup : on vérifie uniquement le premier coup du joueur,
 * puis on explique le principe avec des flèches.
 *
 * Sources :
 *  - Percée : position classique d'analyse (domaine public)
 *  - Réti : étude de 1921 de Richard Réti (domaine public)
 *  - Règle du carré : KPK canonique (domaine public)
 *  - Opposition : finale KPK canonique (domaine public)
 */
export interface WaouhArrow {
  from: string;
  to: string;
  brush: "paleGreen" | "paleBlue" | "yellow" | "red";
}

export interface WaouhPosition {
  id: string;
  fen: string;
  playerColor: "white" | "black";
  /** Premier coup correct (UCI). Si `null`, n'importe quel coup valide est accepté. */
  keyMoves: string[]; // plusieurs coups acceptables
  challenge: { fr: string; en: string };
  hintOnFailure: { fr: string; en: string };
  successTitle: { fr: string; en: string };
  successExplanation: { fr: string; en: string };
  principleLabel: { fr: string; en: string };
  /** Flèches affichées APRÈS succès pour illustrer la suite */
  explanationArrows: WaouhArrow[];
  /** Flèches d'indice affichées APRÈS un mauvais coup */
  hintArrows: WaouhArrow[];
}

export const WAOUH_POSITIONS: WaouhPosition[] = [
  {
    id: "percee",
    fen: "6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1",
    playerColor: "white",
    keyMoves: ["b5b6"],
    challenge: {
      fr: "3 pions contre 3 pions. Les Blancs jouent et promeuvent à coup sûr. Comment ?",
      en: "3 pawns vs 3 pawns. White moves and promotes with best play. How?",
    },
    hintOnFailure: {
      fr: "Un sacrifice de pion libère toujours un autre. Regardez la colonne du milieu.",
      en: "A pawn sacrifice always frees another. Look at the middle file.",
    },
    successTitle: {
      fr: "La percée !",
      en: "The breakthrough!",
    },
    successExplanation: {
      fr: "Peu importe la réponse des Noirs : axb6 libère le pion c, et cxb6 libère le pion a. Il y a toujours un pion qui passe.",
      en: "No matter how Black responds: axb6 frees the c-pawn, cxb6 frees the a-pawn. There's always a passer.",
    },
    principleLabel: {
      fr: "La percée de pions",
      en: "Pawn breakthrough",
    },
    explanationArrows: [
      { from: "b5", to: "b6", brush: "paleGreen" },
      { from: "a7", to: "b6", brush: "red" },
      { from: "c5", to: "c6", brush: "paleGreen" },
      { from: "b7", to: "c6", brush: "red" },
      { from: "a5", to: "a8", brush: "yellow" },
    ],
    hintArrows: [
      { from: "b5", to: "b6", brush: "yellow" },
    ],
  },
  {
    id: "reti",
    fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1",
    playerColor: "white",
    keyMoves: ["h8g7"],
    challenge: {
      fr: "Le roi blanc court deux lièvres en même temps. Trouvez l'unique coup qui mène à la nulle.",
      en: "The white king chases two hares at once. Find the one move that forces a draw.",
    },
    hintOnFailure: {
      fr: "Le roi doit à la fois menacer de soutenir son pion ET de rattraper le pion noir. Un seul carré le permet.",
      en: "The king must both threaten to support its own pawn AND catch the black pawn. Only one square allows both.",
    },
    successTitle: {
      fr: "L'étude de Réti !",
      en: "Réti's study!",
    },
    successExplanation: {
      fr: "En g7, le roi blanc menace à la fois de soutenir le pion c6 par f6-e5 ET de rattraper le pion h par f6-g5. Les Noirs ne peuvent pas gagner.",
      en: "On g7, the white king threatens both to support the c6 pawn via f6-e5 AND to catch the h-pawn via f6-g5. Black cannot win.",
    },
    principleLabel: {
      fr: "L'étude de Réti (1921)",
      en: "Réti's study (1921)",
    },
    explanationArrows: [
      { from: "h8", to: "g7", brush: "paleGreen" },
      { from: "g7", to: "f6", brush: "yellow" },
      { from: "f6", to: "e5", brush: "yellow" },
      { from: "f6", to: "g5", brush: "paleBlue" },
    ],
    hintArrows: [
      { from: "h8", to: "g7", brush: "yellow" },
    ],
  },
  {
    id: "carre",
    // Pion blanc sur h4, roi blanc a1, roi noir a4 (hors du carré du pion). Blancs jouent.
    // Carré du pion h4 → h8 : coins d4-h4-h8-d8. Roi noir en a4 : hors du carré.
    fen: "8/8/8/8/k6P/8/8/K7 w - - 0 1",
    playerColor: "white",
    keyMoves: ["h4h5"],
    challenge: {
      fr: "Le pion blanc fonce vers la promotion. Le roi noir peut-il l'attraper ?",
      en: "The white pawn races to promote. Can the black king catch it?",
    },
    hintOnFailure: {
      fr: "Avancez simplement le pion. Le roi noir est hors du « carré » — il ne peut jamais l'attraper.",
      en: "Just push the pawn. The black king is outside the pawn's 'square' — it can never catch it.",
    },
    successTitle: {
      fr: "La règle du carré !",
      en: "The square rule!",
    },
    successExplanation: {
      fr: "Tracez un carré du pion jusqu'à la rangée de promotion. Si le roi ennemi ne peut pas y entrer avant que le pion y arrive, le pion promeut à coup sûr.",
      en: "Draw a square from the pawn to the promotion rank. If the enemy king can't enter it before the pawn arrives, the pawn always promotes.",
    },
    principleLabel: {
      fr: "La règle du carré",
      en: "The square rule",
    },
    explanationArrows: [
      { from: "h4", to: "h8", brush: "paleGreen" },
      { from: "h4", to: "d4", brush: "yellow" },
      { from: "d4", to: "d8", brush: "yellow" },
      { from: "d8", to: "h8", brush: "yellow" },
    ],
    hintArrows: [
      { from: "h4", to: "h5", brush: "yellow" },
    ],
  },
];

