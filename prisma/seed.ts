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
  free?: boolean; // défaut true si absent (contenu existant) ; mettre false pour les familles premium
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

  // --- Famille : Pièces mineures (order 10-12) --------------------------------
  {
    slug: "fou-couleurs-opposees", family: "piecesMineures", order: 10, free: false,
    title: { fr: "Fous de couleurs opposées", en: "Opposite-color bishops" },
    defaultTexts: {
      fr: {
        intro: "Les fous de couleurs opposées sont souvent nuls même avec un ou deux pions de plus : chaque fou est aveugle aux cases de l'autre couleur.",
        attackTitle: "Fous opp. – Gagner",
        defendTitle: "Fous opp. – Tenir la nulle",
        attackGoal: "Exploite la supériorité matérielle malgré les fous opposés.",
        defendGoal: "Utilise les fous opposés pour tenir la nulle.",
      },
      en: {
        intro: "Opposite-color bishops are often drawn even with an extra pawn or two: each bishop is blind to the squares of the other color.",
        attackTitle: "Opp. bishops – Win",
        defendTitle: "Opp. bishops – Hold the draw",
        attackGoal: "Exploit the material advantage despite opposite-color bishops.",
        defendGoal: "Use the opposite-color bishops to hold the draw.",
      },
    },
  },
  {
    slug: "mauvais-fou", family: "piecesMineures", order: 11, free: false,
    title: { fr: "Mauvais fou", en: "Bad bishop" },
    defaultTexts: {
      fr: {
        intro: "Un mauvais fou est bloqué derrière ses propres pions fixés sur sa couleur. Sa mobilité réduite en fait une pièce passive, souvent perdante.",
        attackTitle: "Mauvais fou – Exploiter",
        defendTitle: "Mauvais fou – Résister",
        attackGoal: "Exploite le mauvais fou adverse pour gagner.",
        defendGoal: "Compense le mauvais fou et tiens la nulle.",
      },
      en: {
        intro: "A bad bishop is locked behind its own pawns fixed on its color. Its reduced mobility makes it a passive piece, often leading to a loss.",
        attackTitle: "Bad bishop – Exploit it",
        defendTitle: "Bad bishop – Resist",
        attackGoal: "Exploit the opponent's bad bishop to win.",
        defendGoal: "Compensate for the bad bishop and hold the draw.",
      },
    },
  },
  {
    slug: "cavalier-vs-pions", family: "piecesMineures", order: 12, free: false,
    title: { fr: "Cavalier et pions", en: "Knight and pawns" },
    defaultTexts: {
      fr: {
        intro: "Le cavalier combat seul contre des pions ou avec le roi dans des finales aux règles spécifiques : le roi joue un rôle fondamental pour soutenir le cavalier.",
        attackTitle: "Cavalier – Attaque",
        defendTitle: "Cavalier – Défense",
        attackGoal: "Utilise le roi et le cavalier pour gagner.",
        defendGoal: "Résiste aux pions passés avec le cavalier.",
      },
      en: {
        intro: "The knight fights alone against pawns or with the king in endgames with specific rules: the king plays a fundamental role in supporting the knight.",
        attackTitle: "Knight – Attack",
        defendTitle: "Knight – Defense",
        attackGoal: "Use the king and knight to win.",
        defendGoal: "Resist the passed pawns with the knight.",
      },
    },
  },

  // --- Famille : Finales de dame (order 20-21) --------------------------------
  {
    slug: "dame-contre-pion", family: "dame", order: 20, free: false,
    title: { fr: "Dame contre pion", en: "Queen vs pawn" },
    defaultTexts: {
      fr: {
        intro: "La dame bat presque tout pion seul — sauf les pions de tour et de fou en 7e rangée, où le défenseur peut viser le pat.",
        attackTitle: "Dame vs pion – Gagner",
        defendTitle: "Dame vs pion – Tenir le pat",
        attackGoal: "Capte le pion ou force la promotion avantageuse.",
        defendGoal: "Tiens le pat avec le pion de tour ou de fou en 7e.",
      },
      en: {
        intro: "The queen beats almost any pawn alone — except rook and bishop pawns on the 7th rank, where the defender can aim for stalemate.",
        attackTitle: "Queen vs pawn – Win",
        defendTitle: "Queen vs pawn – Stalemate save",
        attackGoal: "Capture the pawn or force a favourable promotion.",
        defendGoal: "Hold the stalemate with a rook or bishop pawn on the 7th.",
      },
    },
  },
  {
    slug: "dame-contre-tour", family: "dame", order: 21, free: false,
    title: { fr: "Dame contre tour", en: "Queen vs rook" },
    defaultTexts: {
      fr: {
        intro: "La dame bat généralement la tour, mais le défenseur peut tenir de longues positions de Philidor-dame. La technique exacte est exigeante.",
        attackTitle: "Dame vs tour – Gagner",
        defendTitle: "Dame vs tour – Philidor",
        attackGoal: "Brise la défense de Philidor et gagne la tour.",
        defendGoal: "Applique la défense de Philidor pour la dame et tiens la nulle.",
      },
      en: {
        intro: "The queen generally beats the rook, but the defender can hold long queen-Philidor positions. The exact technique is demanding.",
        attackTitle: "Queen vs rook – Win",
        defendTitle: "Queen vs rook – Philidor",
        attackGoal: "Break the Philidor defense and win the rook.",
        defendGoal: "Apply the queen-Philidor defense and hold the draw.",
      },
    },
  },

  // --- Famille : Mats élémentaires (order 30-33) ------------------------------
  {
    slug: "mat-dame", family: "mats", order: 30, free: true,
    title: { fr: "Mat à la dame", en: "Queen mate" },
    defaultTexts: {
      fr: {
        intro: "La dame seule avec le roi suffit à mater : en quelques coups, le roi ennemi est repoussé vers le bord puis coincé dans le coin.",
        attackTitle: "Mat à la dame",
        defendTitle: "Résister au mat dame",
        attackGoal: "Mate avec la dame en un minimum de coups.",
        defendGoal: "Retarde le mat le plus longtemps possible.",
      },
      en: {
        intro: "The queen alone with the king is enough to mate: in a few moves, the enemy king is pushed to the edge and trapped in the corner.",
        attackTitle: "Queen mate",
        defendTitle: "Resist the queen mate",
        attackGoal: "Checkmate with the queen in as few moves as possible.",
        defendGoal: "Delay the mate as long as possible.",
      },
    },
  },
  {
    slug: "mat-tour", family: "mats", order: 31, free: true,
    title: { fr: "Mat à la tour", en: "Rook mate" },
    defaultTexts: {
      fr: {
        intro: "La tour seule avec le roi permet de mater : la technique de l'ascenseur repousse le roi ennemi rangée par rangée jusqu'à le bloquer en bordure.",
        attackTitle: "Mat à la tour",
        defendTitle: "Résister au mat tour",
        attackGoal: "Mate avec la tour en appliquant la technique de l'ascenseur.",
        defendGoal: "Retarde le mat en évitant les bords.",
      },
      en: {
        intro: "The rook alone with the king can mate: the elevator technique pushes the enemy king rank by rank until it is blocked on the edge.",
        attackTitle: "Rook mate",
        defendTitle: "Resist the rook mate",
        attackGoal: "Checkmate with the rook using the elevator technique.",
        defendGoal: "Delay the mate by avoiding the edges.",
      },
    },
  },
  {
    slug: "mat-deux-fous", family: "mats", order: 32, free: true,
    title: { fr: "Mat aux deux fous", en: "Two bishops mate" },
    defaultTexts: {
      fr: {
        intro: "Les deux fous matent ensemble : ils travaillent en équipe pour restreindre le roi ennemi, finalement coincé dans un coin.",
        attackTitle: "Mat aux deux fous",
        defendTitle: "Résister aux deux fous",
        attackGoal: "Mate avec les deux fous en coordination avec le roi.",
        defendGoal: "Retarde le mat en cherchant le centre.",
      },
      en: {
        intro: "The two bishops mate together: they work as a team to restrict the enemy king, eventually cornered.",
        attackTitle: "Two bishops mate",
        defendTitle: "Resist the two bishops",
        attackGoal: "Checkmate with both bishops in coordination with the king.",
        defendGoal: "Delay the mate by seeking the centre.",
      },
    },
  },
  {
    slug: "mat-fou-cavalier", family: "mats", order: 33, free: true,
    title: { fr: "Mat fou et cavalier", en: "Bishop and knight mate" },
    defaultTexts: {
      fr: {
        intro: "Le mat du fou et du cavalier est la technique la plus difficile des mats élémentaires : il faut conduire le roi adverse vers le coin de la couleur du fou.",
        attackTitle: "Mat fou + cavalier",
        defendTitle: "Résister au mat F+C",
        attackGoal: "Mate avec le fou et le cavalier en suivant la méthode W.",
        defendGoal: "Retarde le mat en fuyant vers le mauvais coin.",
      },
      en: {
        intro: "The bishop and knight mate is the hardest elementary mate: you must drive the enemy king to the corner matching the bishop's color.",
        attackTitle: "Bishop + knight mate",
        defendTitle: "Resist the B+N mate",
        attackGoal: "Checkmate with bishop and knight using the W-method.",
        defendGoal: "Delay the mate by fleeing to the wrong corner.",
      },
    },
  },

  // --- Famille : Tour contre pièce mineure (order 40-41) ----------------------
  {
    slug: "tour-vs-fou", family: "tourVsMineure", order: 40, free: false,
    title: { fr: "Tour contre fou", en: "Rook vs bishop" },
    defaultTexts: {
      fr: {
        intro: "La tour bat généralement le fou, mais le défenseur peut souvent tenir la nulle en gardant son fou actif ou en cherchant le coin de la mauvaise couleur.",
        attackTitle: "Tour vs fou – Gagner",
        defendTitle: "Tour vs fou – Tenir la nulle",
        attackGoal: "Gagne le fou ou force un pion passé décisif.",
        defendGoal: "Maintiens le fou actif et tiens la nulle.",
      },
      en: {
        intro: "The rook generally beats the bishop, but the defender can often hold the draw by keeping the bishop active or seeking the wrong-color corner.",
        attackTitle: "Rook vs bishop – Win",
        defendTitle: "Rook vs bishop – Hold the draw",
        attackGoal: "Win the bishop or force a decisive passed pawn.",
        defendGoal: "Keep the bishop active and hold the draw.",
      },
    },
  },
  {
    slug: "tour-vs-cavalier", family: "tourVsMineure", order: 41, free: false,
    title: { fr: "Tour contre cavalier", en: "Rook vs knight" },
    defaultTexts: {
      fr: {
        intro: "La tour bat le cavalier avec l'aide du roi : le cavalier est moins flexible que le fou, mais certaines forteresses permettent la nulle.",
        attackTitle: "Tour vs cavalier – Gagner",
        defendTitle: "Tour vs cavalier – Forteresse",
        attackGoal: "Brise la forteresse du cavalier et gagne.",
        defendGoal: "Construis une forteresse et tiens la nulle.",
      },
      en: {
        intro: "The rook beats the knight with the king's help: the knight is less flexible than the bishop, but some fortress positions allow a draw.",
        attackTitle: "Rook vs knight – Win",
        defendTitle: "Rook vs knight – Fortress",
        attackGoal: "Break the knight fortress and win.",
        defendGoal: "Build a fortress and hold the draw.",
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
    id: "pat-rush",
    themeSlug: "pat",
    kind: "kpk",
    fen: "5k2/8/4KP2/8/8/8/8/8 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "Pousser ou manœuvrer ?",
        intro: "Le pion est en f6, le roi en e6. Un coup de roi — même naturel — laisse filer le gain : le roi noir rejoint le coin et c'est pat.",
        goal: "Gagne. Un seul coup convient.",
      },
      en: {
        title: "Push or manoeuvre?",
        intro: "The pawn is on f6, the king on e6. A king move — even a natural one — throws away the win: the black king reaches the corner and it's stalemate.",
        goal: "Win. Only one move works.",
      },
    },
  },
  {
    id: "pat-corner-c",
    themeSlug: "pat",
    kind: "kpk",
    fen: "k7/8/K1P5/8/8/8/8/8 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "Le piège du coin",
        intro: "Pion en c6, rois en a6 et a8. S'approcher trop vite avec le roi mène au pat : après Rb6 Rb8 c7+ Rc8 Rc6, le roi noir n'a plus aucune case.",
        goal: "Gagne sans donner le pat.",
      },
      en: {
        title: "The corner trap",
        intro: "Pawn on c6, kings on a6 and a8. Approaching too fast with the king leads to stalemate: after Kb6 Kb8 c7+ Kc8 Kc6, the black king has no legal move.",
        goal: "Win without giving stalemate.",
      },
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
    id: "etude-chemin-roi",
    themeSlug: "etudes",
    kind: "kpk",
    fen: "5k2/1K6/8/8/8/8/5P2/8 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "Le bon chemin",
        intro: "Roi en b7, pion en f2, roi noir en f8. Le roi blanc est loin du pion — mais avancer vers lui n'est pas la bonne idée. Il n'existe qu'un seul coup gagnant.",
        goal: "Gagne. Trouve le bon chemin pour le roi.",
      },
      en: {
        title: "The right path",
        intro: "King on b7, pawn on f2, Black King on f8. The White King is far from the pawn — but marching toward it is not the right idea. Only one move wins.",
        goal: "Win. Find the right path for the king.",
      },
    },
  },
  {
    id: "etude-cases-critiques",
    themeSlug: "etudes",
    kind: "kpk",
    fen: "8/8/4k3/8/8/2K5/4P3/8 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "La case critique",
        intro: "Roi en c3, pion en e2, roi noir en e6. Avancer le pion semble naturel — mais les cases critiques du pion e sont d4, e4 et f4. Y amener le roi d'abord est la clé. Un seul coup gagne.",
        goal: "Gagne en prenant la case critique.",
      },
      en: {
        title: "The key square",
        intro: "King on c3, pawn on e2, Black King on e6. Advancing the pawn seems natural — but the key squares for the e-pawn are d4, e4 and f4. Getting the king there first is the key. Only one move wins.",
        goal: "Win by seizing the key square.",
      },
    },
  },
  {
    id: "etude-retrait",
    themeSlug: "etudes",
    kind: "kpk",
    fen: "2k5/5K2/8/8/8/8/1P6/8 w - - 0 1",
    userSide: "white",
    expectedResult: "white",
    texts: {
      fr: {
        title: "Le roi recule",
        intro: "Roi en f7, pion en b2, roi noir en c8. Rester haut ou avancer vers b8 semble logique. Pourtant le roi doit reculer pour créer la bonne configuration. Un seul coup gagne.",
        goal: "Gagne en reculant le roi.",
      },
      en: {
        title: "The king steps back",
        intro: "King on f7, pawn on b2, Black King on c8. Staying high or advancing toward b8 seems logical. Yet the king must step back to create the right configuration. Only one move wins.",
        goal: "Win by retreating the king.",
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
      ["Rf1+", { fr: "Échec latéral : on repousse le roi noir d'une colonne supplémentaire pour lui enlever toute proximité du pion.", en: "A lateral check: we push the black king one file further away from the pawn." }],
      ["Kg7"],
      ["Rf4", { fr: "Le pont — 4e rangée exactement. Pas la 3e : le roi blanc serait trop près et ne pourrait pas traverser. Pas la 5e : les échecs de la tour noire passeraient en dessous. En f4, la tour coupera les échecs dès que le roi atteindra la 5e rangée.", en: "The bridge — 4th rank precisely. Not the 3rd: the white king would be too close to cross. Not the 5th: black's checks would slip underneath. On f4, the rook will block checks the moment the king reaches the 5th rank." }],
      ["Rc1"],
      ["Ke7", { fr: "Le roi sort de devant son pion — il doit traverser vers la 6e rangée sans se faire couper par les échecs.", en: "The king steps out from in front of its pawn — it must cross toward the 6th rank without being cut off by checks." }],
      ["Re1+"],
      ["Kd6", { fr: "Le roi descend colonne par colonne, protégé par la menace du pion qui fait dame.", en: "The king steps down file by file, shielded by the promotion threat." }],
      ["Rd1+"],
      ["Ke6", { fr: "Encore une marche — le roi se rapproche de sa tour pour fermer le pont.", en: "One more step — the king approaches its rook to close the bridge." }],
      ["Re1+"],
      ["Kd5", { fr: "Le roi atteint la 5e rangée, juste à côté du pont en f4.", en: "The king reaches the 5th rank, right beside the bridge on f4." }],
      ["Rd1+"],
      ["Rd4", { fr: "Le pont se referme au bon moment : le roi est en d5, la tour en d4 bouche tous les échecs sur la colonne d. Le roi noir ne peut plus gêner — le pion fait dame.", en: "The bridge closes at the right moment: the king is on d5, the rook on d4 seals every check on the d-file. Black can no longer interfere — the pawn promotes." }],
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
      ["Rh6", { fr: "La tour en 6e rangée est le point clé : elle bloque le roi blanc et l'empêche d'entrer en e6 ou d6. Si tu quittes la 6e trop tôt, le roi blanc envahit et le pion avance vers la dame.", en: "The rook on the 6th rank is the key: it blocks the white king from entering e6 or d6. Leave the 6th too early and the white king invades — the pawn marches to queen." }],
      ["e6", { fr: "Le pion monte en 6e rangée — c'est le signal : la tour doit maintenant basculer en 1re rangée pour des échecs perpétuels. Rester en 6e serait une erreur, la tour serait capturée.", en: "The pawn reaches the 6th rank — this is the signal: the rook must now swing to the 1st rank for perpetual checks. Staying on the 6th would be a mistake — the rook would be captured." }],
      ["Rh1", { fr: "La tour file en 1re rangée : d'ici, elle donne des échecs verticaux ininterrompus sur toute la colonne.", en: "The rook swings to the 1st rank: from here it delivers uninterrupted vertical checks along any file." }],
      ["Kd6", { fr: "Le roi blanc avance vers d6 — réponds immédiatement par un échec ! C'est maintenant que les échecs perpétuels s'enclenchent.", en: "The white king advances to d6 — reply immediately with a check! This is when the perpetual begins." }],
      ["Rd1+", { fr: "Échec en d1 : le roi blanc n'a aucun abri. Il devra fuir de colonne en colonne sous les échecs.", en: "Check on d1: the white king has no shelter. It must flee from file to file under continuous checks." }],
      ["Ke5"],
      ["Re1+", { fr: "Le roi fuit vers e5 — continue les échecs sans relâche.", en: "The king flees to e5 — keep the checks coming without pause." }],
      ["Kf6"],
      ["Rf1+", { fr: "Nulle par échecs perpétuels : le roi blanc ne peut pas s'échapper. La défense de Philidor est accomplie.", en: "Draw by perpetual check: the white king cannot escape. Philidor's defence is complete." }],
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
        free: theme.free ?? true, defaultTexts: theme.defaultTexts as unknown as Prisma.InputJsonValue ?? undefined,
      },
      update: {
        family: theme.family, order: theme.order, title: theme.title,
        free: theme.free ?? true, defaultTexts: theme.defaultTexts as unknown as Prisma.InputJsonValue ?? undefined,
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

  // --- Trophées (Achievement) ---
  const ACHIEVEMENTS = [
    {
      code: "streak_7",
      name: { fr: "7 jours de suite", en: "7-day streak" },
      description: { fr: "Compléter une séance 7 jours d'affilée.", en: "Complete a session 7 days in a row." },
      condition: { type: "streak", value: 7 },
      icon: "🔥",
    },
    {
      code: "streak_30",
      name: { fr: "30 jours de suite", en: "30-day streak" },
      description: { fr: "Compléter une séance 30 jours d'affilée.", en: "Complete a session 30 days in a row." },
      condition: { type: "streak", value: 30 },
      icon: "⚡",
    },
    {
      code: "streak_100",
      name: { fr: "100 jours de suite", en: "100-day streak" },
      description: { fr: "Compléter une séance 100 jours d'affilée.", en: "Complete a session 100 days in a row." },
      condition: { type: "streak", value: 100 },
      icon: "👑",
    },
  ];

  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      create: { ...ach, name: ach.name as unknown as Prisma.InputJsonValue, description: ach.description as unknown as Prisma.InputJsonValue, condition: ach.condition as unknown as Prisma.InputJsonValue },
      update: { name: ach.name as unknown as Prisma.InputJsonValue, description: ach.description as unknown as Prisma.InputJsonValue, condition: ach.condition as unknown as Prisma.InputJsonValue, icon: ach.icon },
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

  console.log(`Seed terminé : ${THEMES.length} thèmes, ${POSITIONS.length} positions, ${ACHIEVEMENTS.length} trophées.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
