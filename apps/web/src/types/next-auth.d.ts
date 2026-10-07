import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      lichessId: string | null;
      role: "player" | "admin";
    } & DefaultSession["user"];
  }
}
