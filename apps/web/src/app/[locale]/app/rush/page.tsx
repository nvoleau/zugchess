import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { RushRunner } from "@/components/rush/rush-runner";

export const dynamic = "force-dynamic";

/** /app/rush (chantier 4) : Zug Rush, le mode "encore une" — auth déjà gardée par le layout `/app`. */
export default async function RushPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";

  const session = await auth();
  const userId = session!.user.id as string;

  return <RushRunner locale={localeTyped} currentUserId={userId} />;
}
