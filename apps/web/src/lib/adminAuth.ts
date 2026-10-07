import type { Session } from "next-auth";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";

export class ForbiddenError extends Error {
  constructor() {
    super("Accès réservé aux administrateurs.");
    this.name = "ForbiddenError";
  }
}

/** Garde pour les pages serveur admin : redirige comme un visiteur non admin, sans révéler que la route existe. */
export async function requireAdminSession(locale: string): Promise<Session> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect({ href: "/app", locale });
  }
  return session!;
}

/** Garde pour les routes `/api/admin/*` : à utiliser dans un try/catch qui renvoie 403 sur `ForbiddenError`. */
export async function requireAdminApi(): Promise<Session> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new ForbiddenError();
  }
  return session;
}
