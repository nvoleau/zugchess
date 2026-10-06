export type Side = "white" | "black";

export type GameResult = "white" | "black" | "draw";

export interface SquareMove {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}
