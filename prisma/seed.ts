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

interface ThemeDefaultTextsLocale {
  intro: string;
  attackTitle: string;
  defendTitle: string;
  attackGoal: string;
  defendGoal: string;
}

interface ThemeSeed {
  slug: string;
  family: string;
  order: number;
  title: { fr: string; en: string };
  defaultTexts?: { fr: ThemeDefaultTextsLocale; en: ThemeDefaultTextsLocale };
}

const THEMES: ThemeSeed[] = [
  {
    slug: "opposition", family: "pions", order: 0, title: { fr: "Opposition", en: "Opposition" },
    defaultTexts: {
      fr: {
        intro: "L'opposition directe place les deux rois face à face, séparés d'un nombre impair de cases. Posséder l'opposition force le roi adverse à reculer.",
        attackTitle: "KPK – Prendre l'opposition",
        defendTitle: "KPK – Résister à l'opposition",
        attackGoal: "Prends l'opposition et mène le pion à dame.",
        defendGoal: "Reprends l'opposition à chaque coup et tiens la nulle.",
      },
      en: {
        intro: "Direct opposition places the two kings face to face, separated by an odd number of squares. Gaining the opposition forces the opposing king to give way.",
        attackTitle: "KPK – Gain the opposition",
        defendTitle: "KPK – Resist the opposition",
        attackGoal: "Gain the opposition and promote the pawn.",
        defendGoal: "Retake the opposition every move and hold the draw.",
      },
    },
  },
  {
    slug: "tempo", family: "pions", order: 1, title: { fr: "Tempo et triangulation", en: "Tempo and triangulation" },
    defaultTexts: {
      fr: {
        intro: "La triangulation est une manœuvre de roi qui perd un tempo pour rendre le trait à l'adversaire. Utile quand la position est gagnée avec son propre trait mais nulle avec le trait adverse.",
        attackTitle: "KPK – Triangulation",
        defendTitle: "KPK – Éviter la triangulation",
        attackGoal: "Utilise le tempo de réserve ou triangule pour obtenir l'opposition favorable.",
        defendGoal: "Surveille le tempo adverse et tiens la nulle.",
      },
      en: {
        intro: "Triangulation is a king manoeuvre that loses a tempo to hand the move to the opponent. Useful when the position is winning with your own move but drawn when the opponent moves.",
        attackTitle: "KPK – Triangulation",
        defendTitle: "KPK – Avoid triangulation",
        attackGoal: "Use the spare tempo or triangulate to gain the favourable opposition.",
        defendGoal: "Watch for the tempo transfer and hold the draw.",
      },
    },
  },
  {
    slug: "pat", family: "pions", order: 2, title: { fr: "Éviter le pat", en: "Avoiding stalemate" },
    defaultTexts: {
      fr: {
        intro: "Le pat est la ressource ultime du défenseur : si le roi n'a aucun coup légal et n'est pas en échec, la partie est nulle. L'attaquant doit toujours laisser une case de fuite au roi adverse.",
        attackTitle: "KPK – Éviter le pat",
        defendTitle: "KPK – Viser le pat",
        attackGoal: "Gagne sans enfermer le roi adverse.",
        defendGoal: "Force le pat et sauve la nulle.",
      },
      en: {
        intro: "Stalemate is the defender's ultimate resource: if the king has no legal move and is not in check, the game is drawn. The attacker must always leave the defending king a flight square.",
        attackTitle: "KPK – Avoid stalemate",
        defendTitle: "KPK – Aim for stalemate",
        attackGoal: "Win without stalemating the defending king.",
        defendGoal: "Force stalemate and save the draw.",
      },
    },
  },
  {
    slug: "carre", family: "pions", order: 3, title: { fr: "Règle du carré", en: "Rule of the square" },
    defaultTexts: {
      fr: {
        intro: "La règle du carré : trace un carré depuis la case du pion jusqu'à la 8e rangée. Si le roi défenseur peut y entrer en un coup, il rattrape le pion.",
        attackTitle: "KPK – Hors du carré",
        defendTitle: "KPK – Entrer dans le carré",
        attackGoal: "Pousse le pion hors du carré du roi adverse.",
        defendGoal: "Entre dans le carré et rattrape le pion.",
      },
      en: {
        intro: "The rule of the square: draw a square from the pawn to the 8th rank. If the defending king can step into that square, it catches the pawn.",
        attackTitle: "KPK – Outside the square",
        defendTitle: "KPK – Step into the square",
        attackGoal: "Push the pawn out of the defending king's square.",
        defendGoal: "Step into the square and catch the pawn.",
      },
    },
  },
  {
    slug: "pion-de-tour", family: "pions", order: 4, title: { fr: "Pion de tour", en: "Rook pawn" },
    defaultTexts: {
      fr: {
        intro: "Les pions de colonnes a et h sont une exception majeure : même avec un pion en 7e et le roi en h8, le coin sauve le défenseur si son roi s'y réfugie.",
        attackTitle: "KPK – Pion de tour, attaque",
        defendTitle: "KPK – Pion de tour, défense",
        attackGoal: "Empêche le roi adverse de gagner le coin et fais dame.",
        defendGoal: "Rejoins le coin et tiens la nulle.",
      },
      en: {
        intro: "Rook pawns (a and h files) are a major exception: even with a pawn on the 7th, the corner saves the defender if their king reaches it.",
        attackTitle: "KPK – Rook pawn, attack",
        defendTitle: "KPK – Rook pawn, defense",
        attackGoal: "Cut the defending king off from the corner and promote.",
        defendGoal: "Reach the corner and hold the draw.",
      },
    },
  },
  {
    slug: "percee", family: "pions", order: 5, title: { fr: "Percée", en: "Breakthrough" },
    defaultTexts: {
      fr: {
        intro: "La percée est un sacrifice de pion qui crée un pion passé irréversible quand les rois sont loin de l'action.",
        attackTitle: "Percée de pions",
        defendTitle: "Contrer la percée",
        attackGoal: "Crée un pion passé par la percée et fais dame.",
        defendGoal: "Bloque la percée et tiens la nulle.",
      },
      en: {
        intro: "The breakthrough is a pawn sacrifice that creates an unstoppable passed pawn when the kings are far away.",
        attackTitle: "Pawn breakthrough",
        defendTitle: "Counter the breakthrough",
        attackGoal: "Create a passed pawn with the breakthrough and promote.",
        defendGoal: "Stop the breakthrough and hold the draw.",
      },
    },
  },
  {
    slug: "etudes", family: "etudes", order: 0, title: { fr: "Études célèbres", en: "Famous studies" },
    defaultTexts: {
      fr: {
        intro: "Les études classiques illustrent des thèmes contre-intuitifs, utilisés depuis des siècles pour enseigner les subtilités des finales.",
        attackTitle: "Étude – Attaque",
        defendTitle: "Étude – Défense",
        attackGoal: "Trouve la combinaison gagnante.",
        defendGoal: "Tiens la nulle par une défense précise.",
      },
      en: {
        intro: "Classical studies illustrate counter-intuitive themes, used for centuries to teach the subtleties of endgames.",
        attackTitle: "Study – Attack",
        defendTitle: "Study – Defense",
        attackGoal: "Find the winning combination.",
        defendGoal: "Hold the draw with precise defense.",
      },
    },
  },
  {
    slug: "lucena", family: "tours", order: 0, title: { fr: "Lucena", en: "Lucena" },
    defaultTexts: {
      fr: {
        intro: "La position de Lucena est la position gagnante de référence en finale de tour : le pion est en 7e rangée et le roi fort est sorti de devant son pion. La technique du pont est la clé.",
        attackTitle: "Lucena – Construire le pont",
        defendTitle: "Lucena – Résister au pont",
        attackGoal: "Construis le pont et fais dame.",
        defendGoal: "Donne le maximum d'échecs et tente de bloquer la technique.",
      },
      en: {
        intro: "The Lucena position is the reference winning position in rook endings: the pawn is on the 7th rank and the stronger side's king has stepped out. The bridge technique is the key.",
        attackTitle: "Lucena – Build the bridge",
        defendTitle: "Lucena – Resist the bridge",
        attackGoal: "Build the bridge and promote.",
        defendGoal: "Give maximum checks and try to disrupt the technique.",
      },
    },
  },
  {
    slug: "philidor", family: "tours", order: 1, title: { fr: "Philidor", en: "Philidor" },
    defaultTexts: {
      fr: {
        intro: "La défense de Philidor est la technique nulle de référence en finale de tour avec pion : la tour en 6e rangée bloque le roi adverse, puis passe derrière pour des échecs perpétuels.",
        attackTitle: "Philidor – Forcer la dame",
        defendTitle: "Philidor – Tenir la nulle",
        attackGoal: "Contourne la défense de Philidor et fais dame.",
        defendGoal: "Applique la défense de Philidor et tiens la nulle.",
      },
      en: {
        intro: "Philidor's defense is the reference drawing technique in rook-and-pawn endings: the rook on the 6th rank holds back the opposing king, then drops behind for perpetual checks.",
        attackTitle: "Philidor – Force promotion",
        defendTitle: "Philidor – Hold the draw",
        attackGoal: "Overcome Philidor's defense and promote.",
        defendGoal: "Apply Philidor's defense and hold the draw.",
      },
    },
  },
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
      create: {
        slug: theme.slug, family: theme.family, order: theme.order, title: theme.title,
        free: true, defaultTexts: theme.defaultTexts as unknown as Prisma.InputJsonValue ?? undefined,
      },
      update: {
        family: theme.family, order: theme.order, title: theme.title,
        defaultTexts: theme.defaultTexts as unknown as Prisma.InputJsonValue ?? undefined,
      },
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

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  if (adminEmails.length > 0) {
    const { count } = await prisma.user.updateMany({
      where: { email: { in: adminEmails } },
      data: { role: "admin" },
    });
    console.log(`Admins promus : ${count}/${adminEmails.length} (les comptes manquants seront promus à leur prochaine connexion, en relançant le seed).`);
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
