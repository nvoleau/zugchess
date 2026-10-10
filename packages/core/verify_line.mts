import { Chess } from "chess.js";

// Verify Réti 1928 study: White Ka5, Pa4; Black Kb7, pb5 — doesn't work (Black pawn)

// Let me verify a simple KPK zugzwang study as a LINE exercise
// The idea: White wins by zugzwang/opposition — show a specific sequence

// Classic KPK line: e-pawn, kings in opposition
// Starting: White Ke5, Pe6; Black Ke8 — but this is the stalemate pos (draw)

// Let me verify: White Ka5, Pa6; Black Ka8 — KPK draw (rook pawn)
// This is a known draw due to rook pawn + corner

// Actually for an étude célèbre, let me add a rook ending:
// Lucena variation: different pawn file

// Test: King triangulation for KPK "win" 
// I need a position where White wins via tempo-stealing

// Let me verify a line for "breakthrough percée" variant
// Or: add a second Réti variation with different geometry

// The "reciprocal zugzwang" concept:
// If White plays with wrong approach, Black draws; correct approach wins
// 
// Check: 8/8/3k4/8/3KP3/8/8/8 w - - 0 1 — is this a win?
const { Chess } = await import("chess.js");
const test_pos = "8/8/3k4/8/3KP3/8/8/8 w - - 0 1";
const chess = new Chess(test_pos);
console.log("Moves from test_pos:", chess.moves().join(", "));
