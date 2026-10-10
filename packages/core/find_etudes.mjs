import { Chess } from "chess.js";

// Import built files since tsx is failing
const { kpkResult, bestKpkReply, randomWinningKpkFen } = await import("./dist/index.js").catch(() => null) || {};

if (!kpkResult) {
  process.stdout.write("dist not available, using source\n");
  process.exit(1);
}

let found = 0;
let tested = 0;
// Find positions where White has exactly 1 winning move (counter-intuitive)
while (found < 6 && tested < 5000) {
  tested++;
  const fen = randomWinningKpkFen();
  
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  
  const wins = [];
  const draws = [];
  
  for (const mv of moves) {
    chess.move(mv.san);
    const r = kpkResult(chess.fen());
    if (r === "win") wins.push(mv.san);
    else draws.push(mv.san);
    chess.undo();
  }
  
  // Find positions with 1 winning move among 3+ total moves  
  if (wins.length === 1 && draws.length >= 2) {
    // Extra filter: check if winning move is a KING RETREAT (counter-intuitive)
    const winMove = wins[0];
    const isKingMove = winMove.startsWith("K");
    const isPawnMove = !isKingMove;
    
    // Prefer king moves over pawn moves for interest
    if (isKingMove) {
      process.stdout.write(`FOUND: ${fen}\n  Only win: ${winMove}\n  Draws: ${draws.join(", ")}\n\n`);
      found++;
    }
  }
}
process.stdout.write(`Tested ${tested} positions, found ${found}\n`);
