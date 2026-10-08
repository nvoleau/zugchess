#!/usr/bin/env node
/**
 * Génère des positions KPK (roi + pion contre roi) depuis le bitboard interne.
 * Chaque FEN unique produit deux exercices : attaque (promouvoir) + défense (tenir la nulle).
 * Idempotent : upsert par ID stable basé sur un hash de la FEN et du camp.
 *
 * Usage : pnpm generate:kpk [--count 250]
 *
 * Distribution par thème :
 *   - pawn colonne a ou h  → "pion-de-tour"
 *   - pawn colonne b-g     → "opposition" (70 %) ou "tempo" (30 %), selon hash de FEN
 */
import { createHash } from "crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { randomWinningKpkFen, kpkDepth, parseKpkFen } from "@zugchess/core";

const MIN_DEPTH = 6;    // filtre les positions triviales (< 3 coups)
const MAX_DEPTH = 26;   // filtre les positions trop complexes
const MAX_ATTEMPTS = 20_000;

interface DefaultTextsLocale {
  intro: string;
  attackTitle: string;
  defendTitle: string;
  attackGoal: string;
  defendGoal: string;
}
interface DefaultTexts {
  fr: DefaultTextsLocale;
  en: DefaultTextsLocale;
}

/** ID déterministe pour les positions générées — même FEN + même camp → même ID. */
function stableId(key: string): string {
  return `g_${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

/** Colonne du pion (0 = a … 7 = h). */
function pawnFile(fen: string): number {
  const pieces = fen.split(" ")[0]!;
  let file = 0;
  for (const ch of pieces) {
    if (ch === "P" || ch === "p") return file;
    if (ch === "/") { file = 0; continue; }
    if (ch >= "1" && ch <= "8") { file += parseInt(ch, 10); continue; }
    file++;
  }
  return 0;
}

/** Slug du thème cible d'après la colonne du pion et un hash de la FEN. */
function themeSlugFor(normalizedFen: string): string {
  const col = pawnFile(normalizedFen);
  if (col === 0 || col === 7) return "pion-de-tour";
  // 70 % opposition, 30 % tempo — déterministe par FEN
  const h = parseInt(createHash("sha256").update(normalizedFen).digest("hex").slice(0, 4), 16);
  return h % 10 < 3 ? "tempo" : "opposition";
}

async function main() {
  const args = process.argv.slice(2);
  const countIdx = args.indexOf("--count");
  const count = countIdx >= 0 ? parseInt(args[countIdx + 1] ?? "250", 10) : 250;

  const prisma = new PrismaClient();

  const themes = await prisma.theme.findMany({
    where: { slug: { in: ["opposition", "tempo", "pion-de-tour"] } },
  });
  if (themes.length !== 3) {
    throw new Error(`Thèmes manquants en DB (${themes.map((t) => t.slug).join(", ")}). Relancer le seed d'abord.`);
  }
  const themeBySlug = new Map(themes.map((t) => [t.slug, t]));

  const seenFens = new Set<string>();
  const collected: Array<{ normalizedFen: string; rawFen: string }> = [];
  let attempts = 0;

  while (collected.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const rawFen = randomWinningKpkFen();
    const depth = kpkDepth(rawFen);
    if (depth < MIN_DEPTH || depth > MAX_DEPTH) continue;

    const normalizedFen = rawFen.split(" ").slice(0, 4).join(" ");
    if (seenFens.has(normalizedFen)) continue;
    seenFens.add(normalizedFen);
    collected.push({ normalizedFen, rawFen });
  }

  console.log(`${collected.length} FEN uniques collectées en ${attempts} tentatives.`);

  let upserted = 0;
  for (const { normalizedFen, rawFen } of collected) {
    const slug = themeSlugFor(normalizedFen);
    const theme = themeBySlug.get(slug)!;
    const dt = theme.defaultTexts as unknown as DefaultTexts | null;
    if (!dt) throw new Error(`${slug} n'a pas de defaultTexts — relancer le seed.`);

    const { attackerIsWhite } = parseKpkFen(rawFen);
    const attackerColor = attackerIsWhite ? "white" : "black";
    const defenderColor = attackerIsWhite ? "black" : "white";
    const expectedResult = attackerColor; // position toujours gagnante pour l'attaquant

    for (const side of ["attacker", "defender"] as const) {
      const userSide = side === "attacker" ? attackerColor : defenderColor;
      const id = stableId(`kpk:${normalizedFen}:${userSide}`);
      const texts = {
        fr: {
          title: side === "attacker" ? dt.fr.attackTitle : dt.fr.defendTitle,
          intro: dt.fr.intro,
          goal: side === "attacker" ? dt.fr.attackGoal : dt.fr.defendGoal,
        },
        en: {
          title: side === "attacker" ? dt.en.attackTitle : dt.en.defendTitle,
          intro: dt.en.intro,
          goal: side === "attacker" ? dt.en.attackGoal : dt.en.defendGoal,
        },
      };

      await prisma.position.upsert({
        where: { id },
        create: {
          id,
          themeId: theme.id,
          fen: rawFen,
          userSide: userSide as "white" | "black",
          expectedResult: expectedResult as "white" | "black",
          judgeType: "kpk",
          texts: texts as unknown as Prisma.InputJsonValue,
          source: "generated:kpk",
          free: theme.free,
          status: "published",
          generated: true,
        },
        update: {
          texts: texts as unknown as Prisma.InputJsonValue,
          status: "published",
        },
      });
      upserted++;
    }
  }

  console.log(`${upserted} positions insérées/mises à jour (${upserted / 2} FEN × 2 côtés).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
