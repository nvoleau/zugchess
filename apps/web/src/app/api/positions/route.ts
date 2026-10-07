import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listPositions } from "@/lib/positionService";

/** GET /api/positions?theme=&page= (SPEC.md) : bibliothèque filtrée, paginée. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";

  const result = await listPositions({ theme, page, locale });
  return NextResponse.json(result);
}
