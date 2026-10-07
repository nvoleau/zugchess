import { describe, expect, it } from "vitest";
import {
  bestSyzygyMove,
  judgeSyzygyMove,
  normalizeFenForTablebase,
  safeSyzygyMoves,
  type SyzygyPosition,
} from "../../src/judge/syzygy.js";

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Position fictive mais représentative de la forme de l'API tablebase de Lichess : le camp au
 * trait ici gagne en 10 (dtz), avec un coup optimal (-1 demi-coup), un coup qui gagne encore mais
 * plus lentement, un coup qui laisse échapper le gain (nulle), et un coup qui perd carrément.
 */
const WINNING_POSITION: SyzygyPosition = {
  category: "win",
  dtz: 10,
  checkmate: false,
  stalemate: false,
  moves: [
    { uci: "a1a8", category: "loss", dtz: 9, zeroing: false, checkmate: false, stalemate: false },
    { uci: "a1a7", category: "loss", dtz: 11, zeroing: false, checkmate: false, stalemate: false },
    { uci: "a1a2", category: "draw", dtz: null, zeroing: false, checkmate: false, stalemate: false },
    { uci: "a1b1", category: "win", dtz: 5, zeroing: false, checkmate: false, stalemate: false },
  ],
};

describe("judgeSyzygyMove", () => {
  it("le coup optimal garde le gain, à la distance attendue : pas de blunder, pas de temps perdu", () => {
    const judged = judgeSyzygyMove(WINNING_POSITION, "a1a8");
    expect(judged).toEqual({
      resultBefore: "win",
      resultAfter: "win",
      distanceBefore: 10,
      distanceAfter: 9,
      blundered: false,
      tempoLost: false,
    });
  });

  it("un coup qui gagne encore mais plus lentement est accepté avec un temps perdu", () => {
    const judged = judgeSyzygyMove(WINNING_POSITION, "a1a7");
    expect(judged.blundered).toBe(false);
    expect(judged.tempoLost).toBe(true);
    expect(judged.resultAfter).toBe("win");
  });

  it("un coup qui laisse échapper le gain (nulle) est un blunder", () => {
    const judged = judgeSyzygyMove(WINNING_POSITION, "a1a2");
    expect(judged.blundered).toBe(true);
    expect(judged.resultAfter).toBe("draw");
  });

  it("un coup qui perd carrément est un blunder", () => {
    const judged = judgeSyzygyMove(WINNING_POSITION, "a1b1");
    expect(judged.blundered).toBe(true);
    expect(judged.resultAfter).toBe("loss");
  });

  it("lève une erreur si le coup n'est pas dans la liste renvoyée par l'API", () => {
    expect(() => judgeSyzygyMove(WINNING_POSITION, "h1h8")).toThrow();
  });
});

describe("safeSyzygyMoves", () => {
  it("ne retient que les coups qui ne dégradent pas le résultat", () => {
    const safe = safeSyzygyMoves(WINNING_POSITION).map((m) => m.uci);
    expect(safe.sort()).toEqual(["a1a7", "a1a8"]);
  });
});

describe("bestSyzygyMove", () => {
  it("choisit le coup gagnant le plus rapide quand le juge gagne", () => {
    const move = bestSyzygyMove(WINNING_POSITION, seededRandom(1));
    expect(move.uci).toBe("a1a8");
  });

  it("préfère la nulle à n'importe quel coup perdant", () => {
    const position: SyzygyPosition = {
      category: "loss",
      dtz: 8,
      checkmate: false,
      stalemate: false,
      moves: [
        { uci: "k1k2", category: "win", dtz: 9, zeroing: false, checkmate: false, stalemate: false },
        { uci: "k1j2", category: "win", dtz: 3, zeroing: false, checkmate: false, stalemate: false },
        { uci: "k1h2", category: "draw", dtz: null, zeroing: false, checkmate: false, stalemate: false },
      ],
    };
    const move = bestSyzygyMove(position, seededRandom(2));
    expect(move.uci).toBe("k1h2");
  });

  it("sans échappatoire vers la nulle, résiste le plus longtemps possible", () => {
    const position: SyzygyPosition = {
      category: "loss",
      dtz: 8,
      checkmate: false,
      stalemate: false,
      moves: [
        { uci: "k1k2", category: "win", dtz: 9, zeroing: false, checkmate: false, stalemate: false },
        { uci: "k1j2", category: "win", dtz: 3, zeroing: false, checkmate: false, stalemate: false },
      ],
    };
    const move = bestSyzygyMove(position, seededRandom(3));
    expect(move.uci).toBe("k1k2");
  });

  it("lève une erreur si aucun coup légal n'est disponible", () => {
    const position: SyzygyPosition = { category: "loss", dtz: 0, checkmate: true, stalemate: false, moves: [] };
    expect(() => bestSyzygyMove(position)).toThrow();
  });
});

describe("normalizeFenForTablebase", () => {
  it("ignore l'horloge des 50 coups et le numéro de coup", () => {
    const a = normalizeFenForTablebase("8/8/8/4k3/8/8/4P3/4K3 w - - 0 1");
    const b = normalizeFenForTablebase("8/8/8/4k3/8/8/4P3/4K3 w - - 17 42");
    expect(a).toBe(b);
    expect(a).toBe("8/8/8/4k3/8/8/4P3/4K3 w - -");
  });

  it("distingue deux positions différentes", () => {
    const a = normalizeFenForTablebase("8/8/8/4k3/8/8/4P3/4K3 w - - 0 1");
    const b = normalizeFenForTablebase("8/8/8/4k3/8/8/4P3/4K3 b - - 0 1");
    expect(a).not.toBe(b);
  });

  it("lève une erreur sur une FEN incomplète", () => {
    expect(() => normalizeFenForTablebase("8/8/8/4k3/8/8/4P3/4K3 w")).toThrow();
  });
});
