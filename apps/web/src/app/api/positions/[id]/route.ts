import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPosition } from "@/lib/positionService";

/** GET /api/positions/:id (SPEC.md) : position, textes, ligne de méthode. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";

  const position = await getPosition(id, locale);
  if (!position) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(position);
}
