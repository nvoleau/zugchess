import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { Lichess } from "@/lib/lichessProvider";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail } from "@/lib/sendMagicLinkEmail";

const emailProvider: Provider = {
  id: "email",
  type: "email",
  name: "Email",
  from: process.env.EMAIL_FROM ?? "ZugChess <login@zugchess.app>",
  maxAge: 24 * 60 * 60,
  async sendVerificationRequest({
    identifier,
    url,
    provider,
  }: {
    identifier: string;
    url: string;
    provider: { from?: string };
  }) {
    await sendMagicLinkEmail({ to: identifier, url, from: provider.from ?? "ZugChess <login@zugchess.app>" });
  },
} as unknown as Provider;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    emailProvider,
    Lichess({
      clientId: process.env.LICHESS_CLIENT_ID,
      clientSecret: process.env.LICHESS_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.lichessId = (user as { lichessId?: string | null }).lichessId ?? null;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const userId = user.id;
      if (!userId) return;
      await prisma.$transaction([
        prisma.userSettings.create({ data: { userId } }),
        prisma.subscription.create({ data: { userId } }),
      ]);
    },
    async linkAccount({ user, account }) {
      if (account.provider === "lichess") {
        await prisma.user.update({
          where: { id: user.id },
          data: { lichessId: account.providerAccountId },
        });
      }
    },
  },
});
