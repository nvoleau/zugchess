import { Chess } from "chess.js";
const c = new Chess("2R5/8/8/8/r7/1K6/8/k7 b - - 0 7");
c.move("Ra1");
process.stdout.write(`7...Ra1: ${c.fen().split(" ")[0]}\n`);
c.move("Rc4");
process.stdout.write(`8.Rc4: ${c.fen().split(" ")[0]}\n`);
const rm = (c.moves({ verbose: true }) as unknown as Array<{piece:string,san:string}>).filter(m=>m.piece==="r");
process.stdout.write(`Rook: ${rm.map(m=>m.san).join(", ")}\n`);
