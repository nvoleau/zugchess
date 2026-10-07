import type { GameResult, LocalizedText, MethodLine, MethodLineStep, SquareMove } from "@zugchess/core";
import { Chess } from "chess.js";

export type FinaleCategory = "pions" | "tours";

interface BaseFinaleCard {
  id: string;
  category: FinaleCategory;
  title: LocalizedText;
  intro: LocalizedText;
  goal: LocalizedText;
  /** Camp joué par l'élève (couleur réelle, pas un rôle) ; cf. `attackerColorOf` pour le rôle K+P vs K. */
  userColor: "white" | "black";
}

export interface KpkFinaleCard extends BaseFinaleCard {
  kind: "kpk";
  fen: string;
}

export interface LineFinaleCard extends BaseFinaleCard {
  kind: "line";
  result: GameResult;
  line: MethodLine;
}

export type FinaleCard = KpkFinaleCard | LineFinaleCard;

/**
 * Construit une ligne de méthode depuis une FEN de départ et une suite de coups en SAN (avec
 * commentaire pédagogique optionnel par coup) : chess.js rejoue la ligne pour garantir sa légalité
 * et dérive les coups UCI attendus par le juge, une fois à la construction du module.
 */
function buildLine(fen: string, playerSide: "white" | "black", sanMoves: Array<[string, LocalizedText?]>): MethodLine {
  const chess = new Chess(fen);
  const steps: MethodLineStep[] = sanMoves.map(([san, comment]) => {
    const move = chess.move(san);
    if (!move) throw new Error(`coup illégal dans une ligne de méthode : ${san} depuis ${chess.fen()}`);
    const squareMove: SquareMove = { from: move.from, to: move.to };
    if (move.promotion) squareMove.promotion = move.promotion as SquareMove["promotion"];
    return { move: squareMove, comment: comment ?? { fr: "", en: "" } };
  });
  return { fen, playerSide, steps };
}

/**
 * Les 12 positions du prototype « Finales au tempo » (cf. lot 2 de SPEC.md), reprises telles
 * quelles. 8 finales de pions jugées par la table K+P vs K, 2 lignes de méthode de pions (Réti,
 * Percée) et 2 lignes de méthode de tours (Lucena, Philidor).
 */
export const FINALE_CARDS: FinaleCard[] = [
  {
    id: "opp-gain",
    category: "pions",
    kind: "kpk",
    userColor: "white",
    fen: "8/4k3/8/4K3/4P3/8/8/8 b - - 0 1",
    title: { fr: "Prendre l'opposition", en: "Taking the opposition" },
    intro: {
      fr: "Les rois sont face à face et c'est aux Noirs de jouer : ils doivent céder le passage.",
      en: "The kings stand face to face and it's Black to move: they must give way.",
    },
    goal: { fr: "Mène le pion à dame.", en: "Promote the pawn." },
  },
  {
    id: "opp-hold",
    category: "pions",
    kind: "kpk",
    userColor: "black",
    fen: "8/4k3/8/4K3/4P3/8/8/8 w - - 0 1",
    title: { fr: "Garder l'opposition", en: "Keeping the opposition" },
    intro: {
      fr: "Même position, mais le trait est aux Blancs. Un seul temps change le résultat.",
      en: "Same position, but White to move. A single tempo changes the result.",
    },
    goal: { fr: "Tiens la nulle : reprends l'opposition à chaque coup.", en: "Hold the draw: retake the opposition every move." },
  },
  {
    id: "tempo-reserve",
    category: "pions",
    kind: "kpk",
    userColor: "white",
    fen: "8/8/4k3/8/4K3/8/4P3/8 w - - 0 1",
    title: { fr: "Le tempo de réserve", en: "The spare tempo" },
    intro: {
      fr: "Ton roi est deux cases devant ton pion. Le pion peut avancer d'une case pour rendre le trait à l'adversaire.",
      en: "Your king is two squares ahead of your pawn. The pawn can advance one square to pass the move back to your opponent.",
    },
    goal: { fr: "Mène le pion à dame, sans perdre de temps.", en: "Promote the pawn, without wasting a tempo." },
  },
  {
    id: "pat-trap",
    category: "pions",
    kind: "kpk",
    userColor: "white",
    fen: "4k3/8/3KP3/8/8/8/8/8 w - - 0 1",
    title: { fr: "Éviter le pat", en: "Avoiding stalemate" },
    intro: {
      fr: "Le roi noir est sur la case de promotion. Le coup de roi naturel laisse filer le gain.",
      en: "The black king sits on the promotion square. The natural king move throws away the win.",
    },
    goal: { fr: "Gagne. Un seul coup convient.", en: "Win. Only one move works." },
  },
  {
    id: "pat-hold",
    category: "pions",
    kind: "kpk",
    userColor: "black",
    fen: "4k3/8/4PK2/8/8/8/8/8 b - - 0 1",
    title: { fr: "Défendre au bord", en: "Defending on the edge" },
    intro: { fr: "Pion en e6, roi blanc en f6, trait aux Noirs.", en: "Pawn on e6, white king on f6, Black to move." },
    goal: { fr: "Annule. Un seul coup convient.", en: "Draw. Only one move works." },
  },
  {
    id: "square-def",
    category: "pions",
    kind: "kpk",
    userColor: "black",
    fen: "8/8/8/5k2/P7/8/8/7K b - - 0 1",
    title: { fr: "La règle du carré, en défense", en: "The rule of the square, in defense" },
    intro: {
      fr: "Trace le carré du pion jusqu'à la 8e rangée : ton roi doit y entrer maintenant.",
      en: "Draw the pawn's square up to the 8th rank: your king must step into it now.",
    },
    goal: { fr: "Rattrape le pion.", en: "Catch the pawn." },
  },
  {
    id: "square-att",
    category: "pions",
    kind: "kpk",
    userColor: "white",
    fen: "8/8/8/5k2/P7/8/8/7K w - - 0 1",
    title: { fr: "La règle du carré, en attaque", en: "The rule of the square, in attack" },
    intro: { fr: "Même position, mais le trait est aux Blancs.", en: "Same position, but White to move." },
    goal: { fr: "Fais dame.", en: "Promote." },
  },
  {
    id: "rook-pawn",
    category: "pions",
    kind: "kpk",
    userColor: "black",
    fen: "8/8/3k4/8/7P/6K1/8/8 b - - 0 1",
    title: { fr: "Le pion de tour", en: "The rook pawn" },
    intro: {
      fr: "Contre un pion de tour, le coin h8 sauve le défenseur, à condition d'y arriver avant le roi blanc.",
      en: "Against a rook pawn, the h8 corner saves the defender — provided they reach it before the white king.",
    },
    goal: { fr: "Annule en rejoignant le coin.", en: "Draw by reaching the corner." },
  },
  {
    id: "reti",
    category: "pions",
    kind: "line",
    result: "draw",
    userColor: "white",
    title: { fr: "L'étude de Réti", en: "Réti's study" },
    intro: {
      fr: "Étude de Réti (1921). Ton roi semble trop loin du pion h, et ton pion c semble perdu.",
      en: "Réti's study (1921). Your king looks too far from the h-pawn, and your c-pawn looks lost.",
    },
    goal: { fr: "Annule en visant deux objectifs à la fois.", en: "Draw by aiming at two targets at once." },
    line: buildLine("7K/8/k1P5/7p/8/8/8/8 w - - 0 1", "white", [
      ["Kg7", { fr: "Le roi marche en diagonale : il se rapproche du pion h et de son propre pion.", en: "The king walks diagonally: it closes in on both the h-pawn and its own pawn." }],
      ["h4"],
      ["Kf6", { fr: "Même diagonale, deux menaces : entrer dans le carré du pion h ou soutenir c6.", en: "Same diagonal, two threats: enter the h-pawn's square, or support c6." }],
      ["h3"],
      ["Ke7", { fr: "Le roi arrive à temps pour soutenir son pion.", en: "The king arrives in time to support its pawn." }],
      ["h2"],
      ["c7", { fr: "Le pion file à dame.", en: "The pawn races to promotion." }],
      ["Kb7"],
      ["Kd7", { fr: "Le roi protège la case c8.", en: "The king protects the c8 square." }],
      ["h1=Q"],
      ["c8=Q+", { fr: "Les deux camps font dame : nulle.", en: "Both sides promote: a draw." }],
    ]),
  },
  {
    id: "percee",
    category: "pions",
    kind: "line",
    result: "white",
    userColor: "white",
    title: { fr: "La percée", en: "The breakthrough" },
    intro: { fr: "Trois pions contre trois, les rois sont loin.", en: "Three pawns against three, the kings are far away." },
    goal: { fr: "Gagne par la percée.", en: "Win with the breakthrough." },
    line: buildLine("8/ppp4k/8/PPP5/8/8/8/7K w - - 0 1", "white", [
      ["b6", { fr: "Le pion central se sacrifie et attaque a7 et c7.", en: "The central pawn sacrifices itself, attacking a7 and c7." }],
      ["axb6"],
      ["c6", { fr: "Deuxième sacrifice : il attaque b7.", en: "Second sacrifice: it attacks b7." }],
      ["bxc6"],
      ["a6", { fr: "La voie est libre.", en: "The road is clear." }],
      ["Kg6"],
      ["a7", { fr: "Plus rien ne l'arrête.", en: "Nothing stops it now." }],
      ["Kf5"],
      ["a8=Q", { fr: "Dame : le roi noir est bien trop loin.", en: "A queen: the black king is far too slow." }],
    ]),
  },
  {
    id: "lucena",
    category: "tours",
    kind: "line",
    result: "white",
    userColor: "white",
    title: { fr: "Lucena : construire le pont", en: "Lucena: building the bridge" },
    intro: {
      fr: "Position de Lucena : ton roi est devant son pion en 7e, le roi noir est coupé par ta tour.",
      en: "The Lucena position: your king is in front of its pawn on the 7th, the black king is cut off by your rook.",
    },
    goal: { fr: "Gagne avec la méthode du pont.", en: "Win with the bridge technique." },
    line: buildLine("3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1", "white", [
      ["Rf1+", { fr: "Échec pour repousser le roi noir d'une colonne de plus.", en: "A check to push the black king one more file away." }],
      ["Kg7"],
      ["Rf4", { fr: "Le pont : la tour se place en 4e rangée pour couper les futurs échecs.", en: "The bridge: the rook steps to the 4th rank to block future checks." }],
      ["Rc1"],
      ["Ke7", { fr: "Le roi sort de devant son pion.", en: "The king steps out from in front of its pawn." }],
      ["Re1+"],
      ["Kd6", { fr: "Le roi descend vers sa tour.", en: "The king walks down toward its rook." }],
      ["Rd1+"],
      ["Ke6", { fr: "Encore une marche.", en: "One more step." }],
      ["Re1+"],
      ["Kd5", { fr: "Le roi atteint la 5e rangée, à côté du pont.", en: "The king reaches the 5th rank, next to the bridge." }],
      ["Rd1+"],
      ["Rd4", { fr: "Le pont est construit : plus d'échecs, le pion fait dame.", en: "The bridge is built: no more checks, the pawn promotes." }],
    ]),
  },
  {
    id: "philidor",
    category: "tours",
    kind: "line",
    result: "draw",
    userColor: "black",
    title: { fr: "Philidor : la tour en 6e rangée", en: "Philidor: the rook on the 6th rank" },
    intro: {
      fr: "Position de Philidor : ton roi est sur la case de promotion, le pion blanc n'a pas encore atteint la 6e rangée.",
      en: "The Philidor position: your king sits on the promotion square, the white pawn hasn't reached the 6th rank yet.",
    },
    goal: { fr: "Annule avec la défense de Philidor.", en: "Draw with the Philidor defense." },
    line: buildLine("4k3/1R6/8/3KP3/8/8/8/7r b - - 0 1", "black", [
      ["Rh6", { fr: "La tour en 6e rangée interdit au roi blanc d'avancer.", en: "The rook on the 6th rank forbids the white king from advancing." }],
      ["e6", { fr: "Le pion avance : il ne pourra plus abriter son roi.", en: "The pawn advances: it will no longer be able to shelter its king." }],
      ["Rh1", { fr: "La tour file en 1re rangée pour donner échec par derrière.", en: "The rook drops to the 1st rank to check from behind." }],
      ["Kd6", { fr: "Menace Tb8 mat.", en: "Threatens Rb8 mate." }],
      ["Rd1+", { fr: "Échec : le roi blanc n'a aucun abri.", en: "Check: the white king has no shelter." }],
      ["Ke5"],
      ["Re1+", { fr: "Les échecs continuent.", en: "The checks keep coming." }],
      ["Kf6"],
      ["Rf1+", { fr: "Nulle : le roi blanc ne peut pas échapper aux échecs.", en: "Draw: the white king cannot escape the checks." }],
    ]),
  },
];
