/**
 * Script de seed (lot 4, SPEC.md « Script de génération et de validation ») : recharge les thèmes
 * et positions de contenu. Pour l'instant, ce sont les 12 positions du prototype « Finales au
 * tempo » déjà jouées en lot 2 (`apps/web/src/content/finales-tempo.ts`), migrées en base pour que
 * `GET /api/positions` les serve réellement — la bibliothèque des 300 positions viendra compléter
 * cette même table, par lots validés par tablebase ou Stockfish.
 *
 * Idempotent : peut être relancé sans dupliquer (upsert par slug/id).
 *
 * Lancer : `pnpm prisma:seed` (nécessite un accès à la base — voir DATABASE_URL dans .env).
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { Chess } from "chess.js";

const prisma = new PrismaClient();

interface PositionTexts {
  title: string;
  intro: string;
  goal: string;
}

interface MethodLineStepSeed {
  move: { from: string; to: string; promotion?: string };
  comment: { fr: string; en: string };
}

/** Rejoue une suite de coups en SAN depuis une FEN pour garantir leur légalité et dériver l'UCI. */
function buildLineSteps(fen: string, sanMoves: Array<[string, { fr: string; en: string }?]>): MethodLineStepSeed[] {
  const chess = new Chess(fen);
  return sanMoves.map(([san, comment]) => {
    const move = chess.move(san);
    if (!move) throw new Error(`coup illégal dans une ligne de méthode : ${san} depuis ${chess.fen()}`);
    return {
      move: { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) },
      comment: comment ?? { fr: "", en: "" },
    };
  });
}

interface ThemeSeed {
  slug: string;
  family: string;
  order: number;
  title: { fr: string; en: string };
}

const THEMES: ThemeSeed[] = [
  { slug: "opposition", family: "pions", order: 0, title: { fr: "Opposition", en: "Opposition" } },
  { slug: "tempo", family: "pions", order: 1, title: { fr: "Tempo et triangulation", en: "Tempo and triangulation" } },
  { slug: "pat", family: "pions", order: 2, title: { fr: "Éviter le pat", en: "Avoiding stalemate" } },
  { slug: "carre", family: "pions", order: 3, title: { fr: "Règle du carré", en: "Rule of the square" } },
  { slug: "pion-de-tour", family: "pions", order: 4, title: { fr: "Pion de tour", en: "Rook pawn" } },
  { slug: "percee", family: "pions", order: 5, title: { fr: "Percée", en: "Breakthrough" } },
  { slug: "etudes", family: "etudes", order: 0, title: { fr: "Études célèbres", en: "Famous studies" } },
  { slug: "lucena", family: "tours", order: 0, title: { fr: "Lucena", en: "Lucena" } },
  { slug: "philidor", family: "tours", order: 1, title: { fr: "Philidor", en: "Philidor" } },
];

interface KpkPositionSeed {
  id: string;
  themeSlug: string;
  kind: "kpk";
  fen: string;
  userSide: "white" | "black";
  expectedResult: "white" | "draw" | "black";
  texts: { fr: PositionTexts; en: PositionTexts };
}

interface LinePositionSeed {
  id: string;
  themeSlug: string;
  kind: "line";
  fen: string;
  userSide: "white" | "black";
  expectedResult: "white" | "draw" | "black";
  lineMoves: MethodLineStepSeed[];
  texts: { fr: PositionTexts; en: PositionTexts };
}

type PositionSeed = KpkPositionSeed | LinePositionSeed;

const POSITIONS: PositionSeed[] = [
  {
    id: "opp-gain",
    themeSlug: "opposition",
    kind: "kpk",
    fen: "8/4k3/8/4K3/4P3/8/8/8 b - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "Prendre l'opposition",
        intro: "Les rois sont face à face et c'est aux Noirs de jouer : ils doivent céder le passage.",
        goal: "Mène le pion à dame.",
      },
      en: {
        title: "Taking the opposition",
        intro: "The kings stand face to face and it's Black to move: they must give way.",
        goal: "Promote the pawn.",
      },
    },
  },
  {
    id: "opp-hold",
    themeSlug: "opposition",
    kind: "kpk",
    fen: "8/4k3/8/4K3/4P3/8/8/8 w - - 0 1",
    userSide: "black",
    expectedResult: "draw",
    texts: {
      fr: {
        title: "Garder l'opposition",
        intro: "Même position, mais le trait est aux Blancs. Un seul temps change le résultat.",
        goal: "Tiens la nulle : reprends l'opposition à chaque coup.",
      },
      en: {
        title: "Keeping the opposition",
        intro: "Same position, but White to move. A single tempo changes the result.",
        goal: "Hold the draw: retake the opposition every move.",
      },
    },
  },
  {
    id: "tempo-reserve",
    themeSlug: "tempo",
    kind: "kpk",
    fen: "8/8/4k3/8/4K3/8/4P3/8 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "Le tempo de réserve",
        intro: "Ton roi est deux cases devant ton pion. Le pion peut avancer d'une case pour rendre le trait à l'adversaire.",
        goal: "Mène le pion à dame, sans perdre de temps.",
      },
      en: {
        title: "The spare tempo",
        intro: "Your king is two squares ahead of your pawn. The pawn can advance one square to pass the move back to your opponent.",
        goal: "Promote the pawn, without wasting a tempo.",
      },
    },
  },
  {
    id: "pat-trap",
    themeSlug: "pat",
    kind: "kpk",
    fen: "4k3/8/3KP3/8/8/8/8/8 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "Éviter le pat",
        intro: "Le roi noir est sur la case de promotion. Le coup de roi naturel laisse filer le gain.",
        goal: "Gagne. Un seul coup convient.",
      },
      en: {
        title: "Avoiding stalemate",
        intro: "The black king sits on the promotion square. The natural king move throws away the win.",
        goal: "Win. Only one move works.",
      },
    },
  },
  {
    id: "pat-hold",
    themeSlug: "pat",
    kind: "kpk",
    fen: "4k3/8/4PK2/8/8/8/8/8 b - - 0 1",
    userSide: "black",
    expectedResult: "draw",
    texts: {
      fr: { title: "Défendre au bord", intro: "Pion en e6, roi blanc en f6, trait aux Noirs.", goal: "Annule. Un seul coup convient." },
      en: { title: "Defending on the edge", intro: "Pawn on e6, white king on f6, Black to move.", goal: "Draw. Only one move works." },
    },
  },
  {
    id: "square-def",
    themeSlug: "carre",
    kind: "kpk",
    fen: "8/8/8/5k2/P7/8/8/7K b - - 0 1",
    userSide: "black",
    expectedResult: "draw",
    texts: {
      fr: {
        title: "La règle du carré, en défense",
        intro: "Trace le carré du pion jusqu'à la 8e rangée : ton roi doit y entrer maintenant.",
        goal: "Rattrape le pion.",
      },
      en: {
        title: "The rule of the square, in defense",
        intro: "Draw the pawn's square up to the 8th rank: your king must step into it now.",
        goal: "Catch the pawn.",
      },
    },
  },
  {
    id: "square-att",
    themeSlug: "carre",
    kind: "kpk",
    fen: "8/8/8/5k2/P7/8/8/7K w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: { title: "La règle du carré, en attaque", intro: "Même position, mais le trait est aux Blancs.", goal: "Fais dame." },
      en: { title: "The rule of the square, in attack", intro: "Same position, but White to move.", goal: "Promote." },
    },
  },
  {
    id: "rook-pawn",
    themeSlug: "pion-de-tour",
    kind: "kpk",
    fen: "8/8/3k4/8/7P/6K1/8/8 b - - 0 1",
    userSide: "black",
    expectedResult: "draw",
    texts: {
      fr: {
        title: "Le pion de tour",
        intro: "Contre un pion de tour, le coin h8 sauve le défenseur, à condition d'y arriver avant le roi blanc.",
        goal: "Annule en rejoignant le coin.",
      },
      en: {
        title: "The rook pawn",
        intro: "Against a rook pawn, the h8 corner saves the defender — provided they reach it before the white king.",
        goal: "Draw by reaching the corner.",
      },
    },
  },
  {
    id: "reti",
    themeSlug: "etudes",
    kind: "line",
    fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1",
    userSide: "white",
    expectedResult: "draw",
    lineMoves: buildLineSteps("7K/8/k1P5/7p/8/8/8/8 w - - 0 1", [
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
    texts: {
      fr: {
        title: "L'étude de Réti",
        intro: "Étude de Réti (1921). Ton roi semble trop loin du pion h, et ton pion c semble perdu.",
        goal: "Annule en visant deux objectifs à la fois.",
      },
      en: {
        title: "Réti's study",
        intro: "Réti's study (1921). Your king looks too far from the h-pawn, and your c-pawn looks lost.",
        goal: "Draw by aiming at two targets at once.",
      },
    },
  },
  {
    id: "percee",
    themeSlug: "percee",
    kind: "line",
    fen: "8/ppp4k/8/PPP5/8/8/8/7K w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    lineMoves: buildLineSteps("8/ppp4k/8/PPP5/8/8/8/7K w - - 0 1", [
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
    texts: {
      fr: { title: "La percée", intro: "Trois pions contre trois, les rois sont loin.", goal: "Gagne par la percée." },
      en: { title: "The breakthrough", intro: "Three pawns against three, the kings are far away.", goal: "Win with the breakthrough." },
    },
  },
  {
    id: "lucena",
    themeSlug: "lucena",
    kind: "line",
    fen: "3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    lineMoves: buildLineSteps("3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1", [
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
    texts: {
      fr: {
        title: "Lucena : construire le pont",
        intro: "Position de Lucena : ton roi est devant son pion en 7e, le roi noir est coupé par ta tour.",
        goal: "Gagne avec la méthode du pont.",
      },
      en: {
        title: "Lucena: building the bridge",
        intro: "The Lucena position: your king is in front of its pawn on the 7th, the black king is cut off by your rook.",
        goal: "Win with the bridge technique.",
      },
    },
  },
  {
    id: "philidor",
    themeSlug: "philidor",
    kind: "line",
    fen: "4k3/1R6/8/3KP3/8/8/8/7r b - - 0 1",
    userSide: "black",
    expectedResult: "draw",
    lineMoves: buildLineSteps("4k3/1R6/8/3KP3/8/8/8/7r b - - 0 1", [
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
    texts: {
      fr: {
        title: "Philidor : la tour en 6e rangée",
        intro: "Position de Philidor : ton roi est sur la case de promotion, le pion blanc n'a pas encore atteint la 6e rangée.",
        goal: "Annule avec la défense de Philidor.",
      },
      en: {
        title: "Philidor: the rook on the 6th rank",
        intro: "The Philidor position: your king sits on the promotion square, the white pawn hasn't reached the 6th rank yet.",
        goal: "Draw with the Philidor defense.",
      },
    },
  },
];

async function main() {
  const themeIdBySlug = new Map<string, string>();

  for (const theme of THEMES) {
    const row = await prisma.theme.upsert({
      where: { slug: theme.slug },
      create: { slug: theme.slug, family: theme.family, order: theme.order, title: theme.title, free: true },
      update: { family: theme.family, order: theme.order, title: theme.title },
    });
    themeIdBySlug.set(theme.slug, row.id);
  }

  for (const position of POSITIONS) {
    const themeId = themeIdBySlug.get(position.themeSlug);
    if (!themeId) throw new Error(`Thème inconnu : ${position.themeSlug}`);

    const base = {
      themeId,
      fen: position.fen,
      userSide: position.userSide,
      expectedResult: position.expectedResult,
      judgeType: position.kind,
      lineMoves: (position.kind === "line" ? position.lineMoves : undefined) as unknown as Prisma.InputJsonValue | undefined,
      texts: position.texts as unknown as Prisma.InputJsonValue,
      source: "theorie",
      free: true,
      status: "published" as const,
    };

    await prisma.position.upsert({
      where: { id: position.id },
      create: { id: position.id, ...base },
      update: base,
    });
  }

  console.log(`Seed terminé : ${THEMES.length} thèmes, ${POSITIONS.length} positions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
