import type { EngineScore } from "@zugchess/core";

/**
 * Enveloppe autour du worker Stockfish WASM (SPEC.md, juge pour les positions de plus de 7
 * pièces). Fichiers statiques dans `public/stockfish/` — build « lite-single » (mono-thread, sans
 * SharedArrayBuffer, ~1,8 Mo) du paquet npm `stockfish` v19.0.0 (nmrugg/stockfish.js), pour rester
 * déployable sans en-têtes COOP/COEP. Protocole UCI classique via `postMessage`/`onmessage`.
 */

const ENGINE_URL = "/stockfish/stockfish-19-lite-single.js";

export interface EvaluateOptions {
  depth?: number;
  /** Limite de temps en millisecondes, en plus (ou à la place) de la profondeur. */
  movetimeMs?: number;
}

export interface EvaluateResult {
  score: EngineScore;
  bestMoveUci: string;
  /** Suite principale (coups UCI) trouvée par la dernière ligne `info` reçue, meilleur coup inclus. */
  pv: string[];
}

function parseScoreFromInfoLine(line: string): EngineScore | null {
  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  if (mateMatch) return { type: "mate", value: Number(mateMatch[1]) };
  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  if (cpMatch) return { type: "cp", value: Number(cpMatch[1]) };
  return null;
}

function parsePvFromInfoLine(line: string): string[] | null {
  const match = line.match(/\bpv (.+)$/);
  return match ? match[1]!.trim().split(/\s+/) : null;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(ENGINE_URL);
    }
    return this.worker;
  }

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      const worker = this.ensureWorker();
      this.readyPromise = new Promise((resolve) => {
        const onMessage = (e: MessageEvent<string>) => {
          if (e.data === "uciok") worker.postMessage("isready");
          if (e.data === "readyok") {
            worker.removeEventListener("message", onMessage);
            resolve();
          }
        };
        worker.addEventListener("message", onMessage);
        worker.postMessage("uci");
      });
    }
    return this.readyPromise;
  }

  /** Évalue une position : score de la position (point de vue du camp au trait) et meilleur coup. */
  async evaluate(fen: string, { depth = 14, movetimeMs }: EvaluateOptions = {}): Promise<EvaluateResult> {
    await this.ensureReady();
    const worker = this.ensureWorker();

    return new Promise((resolve, reject) => {
      let lastScore: EngineScore | null = null;
      let lastPv: string[] = [];
      const timeout = setTimeout(
        () => {
          worker.removeEventListener("message", onMessage);
          reject(new Error("Stockfish n'a pas répondu à temps."));
        },
        (movetimeMs ?? 10_000) + 10_000,
      );

      function onMessage(e: MessageEvent<string>) {
        const line = e.data;
        const score = parseScoreFromInfoLine(line);
        if (score) lastScore = score;
        const pv = parsePvFromInfoLine(line);
        if (pv) lastPv = pv;
        if (line.startsWith("bestmove")) {
          clearTimeout(timeout);
          worker.removeEventListener("message", onMessage);
          const bestMoveUci = line.split(" ")[1];
          if (!lastScore || !bestMoveUci) {
            reject(new Error("Réponse Stockfish incomplète."));
            return;
          }
          resolve({ score: lastScore, bestMoveUci, pv: lastPv.length > 0 ? lastPv : [bestMoveUci] });
        }
      }

      worker.addEventListener("message", onMessage);
      worker.postMessage("position fen " + fen);
      worker.postMessage(`go${movetimeMs ? ` movetime ${movetimeMs}` : ` depth ${depth}`}`);
    });
  }

  destroy() {
    this.worker?.postMessage("quit");
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
  }
}
