import { NextResponse } from "next/server";
import { ForbiddenError, requireAdminApi } from "@/lib/adminAuth";
import { listUsers } from "@/lib/adminUserService";

/** GET /api/admin/users?query=&page= (back-office, hors SPEC.md) : liste des comptes. */
export async function GET(request: Request) {
  try {
    await requireAdminApi();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

  const result = await listUsers({ query, page });
  return NextResponse.json(result);
}
