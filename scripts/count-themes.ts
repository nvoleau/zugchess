#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.theme.findMany({
    include: { _count: { select: { positions: true } } },
    orderBy: { order: "asc" },
  });
  rows.forEach((r) => console.log(String(r._count.positions).padStart(4), r.slug));
  await prisma.$disconnect();
}
main().catch(console.error);
