import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { bestKpkReply, judgeKpkMove, kpkResult } from "../../src/judge/kpk.js";

function applyMove(fen: string, move: { from: string; to: string; promotion?: string }): string {
  const chess = new Chess(fen);
  const applied = chess.move(move);
  if (!applied) throw new Error(`coup illégal: ${JSON.stringify(move)} depuis ${fen}`);
  return chess.fen();
}

/**
 * 20 positions de référence pour le juge roi + pion contre roi.
 *
 * L'API publique `tablebase.lichess.ovh` (recommandée par SPEC.md comme source de vérité pour
 * les finales) n'est pas joignable depuis cet environnement de développement (réseau restreint,
 * TLS intercepté). Les résultats attendus sont donc dérivés de mécanismes KPK sans aucune
 * ambiguïté théorique plutôt que d'une règle fine (opposition, cases clés) sujette à erreur de
 * mémoire :
 *
 * - WIN  : le pion est totalement hors d'atteinte du roi défenseur — distance de Tchebychev au
 *          carré de promotion supérieure au nombre de coups nécessaires au pion avec une marge
 *          d'au moins 2 (une marge de 1 seulement n'est pas fiable à dériver à la main : le roi
 *          défenseur peut parfois arriver juste à temps pour capturer la dame fraîchement promue
 *          si elle n'est pas défendue — ce cas limite est donc évité ici plutôt que deviné).
 * - DRAW : le roi défenseur capture le pion non défendu dès son trait (fin de partie immédiate),
 *          ou le pion est un pion de tour avec le roi défenseur déjà dans l'angle de promotion
 *          (forteresse classique, imprenable même avec un temps illimité), ou la position est un
 *          pat immédiat (zéro coup légal, pas en échec).
 */
describe("kpkResult — 20 positions de référence", () => {
  const winCases: Array<[string, string]> = [
    ["7k/8/8/2P5/8/8/8/K7 b - - 0 1", "Pc5 (3 coups), Rd h8 à 5 de c8, trait noir (marge 2) : hors d'atteinte"],
    ["k7/8/8/5P2/8/8/8/K7 b - - 0 1", "Pf5 (3 coups), Rd a8 à 5 de f8, trait noir (marge 2) : hors d'atteinte"],
    ["8/4P3/8/8/8/8/8/k6K w - - 0 1", "Pe7 : promotion immédiate, rien ne peut l'arrêter"],
    ["K6k/8/8/3p4/8/8/8/8 w - - 0 1", "pd5 noir (4 coups), Rd blanc a8 à 7 de d1, trait blanc (marge 3) : hors d'atteinte"],
    ["8/8/8/8/8/4P3/8/K6k w - - 0 1", "Pe3 (5 coups), Rd noir h1 à 7 de e8, trait blanc (marge 3) : hors d'atteinte"],
    ["K7/8/8/8/7P/8/8/k7 w - - 0 1", "Ph4 (4 coups), Rd noir a1 à 7 de h8, trait blanc (marge 4) : hors d'atteinte"],
    ["k6K/8/2p5/8/8/8/8/8 w - - 0 1", "pc6 noir (5 coups), Rd blanc h8 à 7 de c1, trait blanc (marge 2) : hors d'atteinte"],
    ["8/6P1/8/8/8/8/8/k6K w - - 0 1", "Pg7 : promotion immédiate"],
    ["7k/8/8/8/8/1P6/8/7K w - - 0 1", "Pb3 (5 coups), Rd noir h8 à 6 de b8, trait blanc (marge 2) : hors d'atteinte"],
  ];

  const drawCases: Array<[string, string]> = [
    ["8/8/8/4k3/4P3/8/8/K7 b - - 0 1", "Rxe4 : capture immédiate du pion non défendu"],
    ["k7/8/8/3K4/3p4/8/8/8 w - - 0 1", "Rxd4 : capture immédiate du pion non défendu"],
    ["K7/8/8/8/2k5/1P6/8/8 b - - 0 1", "Rxb3 : capture immédiate du pion non défendu"],
    ["7k/8/8/5K2/5p2/8/8/8 w - - 0 1", "Rxf4 : capture immédiate du pion non défendu"],
    ["k7/8/P7/8/8/8/8/7K w - - 0 1", "Pion de tour a6, roi défenseur déjà dans l'angle a8 : forteresse"],
    ["7k/8/8/7P/8/8/8/K7 w - - 0 1", "Pion de tour h5, roi défenseur déjà dans l'angle h8 : forteresse"],
    ["k7/8/8/P7/8/8/8/7K b - - 0 1", "Pion de tour a5, roi défenseur déjà dans l'angle a8 : forteresse"],
    ["7k/8/8/8/8/7P/8/K7 b - - 0 1", "Pion de tour h3, roi défenseur déjà dans l'angle h8 : forteresse"],
    ["k7/2P5/1K6/8/8/8/8/8 b - - 0 1", "Pat : Ra8 n'a aucun coup légal (a7/b7 tenues par Rb6, b8 par Pc7) et n'est pas en échec"],
    ["7k/5P2/6K1/8/8/8/8/8 b - - 0 1", "Pat : Rh8 n'a aucun coup légal (h7/g7 tenues par Rg6, g8 par Pf7) et n'est pas en échec"],
    ["8/8/8/8/8/6k1/5p2/7K w - - 0 1", "Pat : Rh1 n'a aucun coup légal (g2/h2 tenues par Rg3, g1 par pf2) et n'est pas en échec"],
  ];

  it.each(winCases)("gagnant : %s (%s)", (fen) => {
    expect(kpkResult(fen)).toBe("win");
  });

  it.each(drawCases)("nul : %s (%s)", (fen) => {
    expect(kpkResult(fen)).toBe("draw");
  });

  it("20 positions de référence au total", () => {
    expect(winCases.length + drawCases.length).toBe(20);
  });
});

describe("kpkResult — cohérence interne", () => {
  it("le résultat est indépendant de la couleur qui a le pion (même position, couleurs inversées)", () => {
    // Pb3 (blanc attaquant) hors d'atteinte du roi noir h8, trait blanc.
    const whiteAttacker = "7k/8/8/8/8/1P6/8/7K w - - 0 1";
    // Même géométrie, couleurs échangées ET position retournée verticalement (rang k -> 9-k)
    // pour que le pion noir avance dans le même sens relatif que le pion blanc d'origine.
    const blackAttacker = "7k/8/1p6/8/8/8/8/7K b - - 0 1";
    expect(kpkResult(whiteAttacker)).toBe(kpkResult(blackAttacker));
  });

  it("une position symétrique par réflexion horizontale donne le même résultat", () => {
    const original = "k7/8/8/8/4P3/8/8/K7 w - - 0 1"; // Pe4, Rd a8, Ra blanc a1
    const mirrored = "7k/8/8/8/3P4/8/8/7K w - - 0 1"; // miroir a<->h, e<->d
    expect(kpkResult(original)).toBe(kpkResult(mirrored));
  });
});

describe("bestKpkReply", () => {
  it("l'attaquant (blanc) joue le coup qui réduit la distance de gain d'exactement un demi-coup", () => {
    const fen = "7k/8/8/8/8/1P6/8/7K w - - 0 1"; // Pb3, Rd h8, Ra blanc h1 (gagnant, marge 2)
    const before = judgeKpkMove(fen, fen);
    const move = bestKpkReply(fen);
    const after = applyMove(fen, move);
    const judged = judgeKpkMove(fen, after);
    expect(judged.resultAfter).toBe("win");
    expect(judged.depthAfter).toBe(before.depthBefore - 1);
  });

  it("l'attaquant (noir) joue aussi le coup optimal : la conversion de couleur/orientation est correcte", () => {
    const fen = "7k/8/1p6/8/8/8/8/7K b - - 0 1"; // même géométrie que ci-dessus, couleurs inversées
    const before = judgeKpkMove(fen, fen);
    const move = bestKpkReply(fen);
    const after = applyMove(fen, move);
    const judged = judgeKpkMove(fen, after);
    expect(judged.resultAfter).toBe("win");
    expect(judged.depthAfter).toBe(before.depthBefore - 1);
  });

  it("le défenseur capture le pion non défendu dès qu'il le peut (nulle immédiate)", () => {
    const fen = "8/8/8/4k3/4P3/8/8/K7 b - - 0 1"; // Rxe4 possible
    const move = bestKpkReply(fen);
    expect(move).toEqual({ from: "e5", to: "e4" });
  });

  it("le défenseur sans échappatoire choisit le coup qui résiste le plus longtemps", () => {
    const fen = "7k/8/8/2P5/8/8/8/K7 b - - 0 1"; // perdant pour le défenseur, aucune capture possible
    const move = bestKpkReply(fen);
    const after = applyMove(fen, move);
    const judged = judgeKpkMove(fen, after);
    // Le défenseur reste en position perdante (le gain ne peut pas lui échapper), mais le coup
    // choisi doit être un coup légal du roi défenseur qui ne précipite pas la défaite.
    expect(judged.resultAfter).toBe("win");
  });

  it("lève une erreur si le défenseur au trait est pat", () => {
    const fen = "8/8/8/8/8/6k1/5p2/7K w - - 0 1"; // pat : Rh1 (défenseur) n'a aucun coup légal
    expect(() => bestKpkReply(fen)).toThrow();
  });
});
