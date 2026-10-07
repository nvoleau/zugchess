import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { getEntitlementsForUser } from "@/lib/entitlements";

// Dépend de la session (cookies) et des quotas du jour : jamais mis en cache statique.
export const dynamic = "force-dynamic";

function formatCount(value: number, unlimited: string): string {
  return Number.isFinite(value) ? String(value) : unlimited;
}

export default async function AppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }
  const user = session!.user;

  const t = await getTranslations("Dashboard");
  const playT = await getTranslations("Play");
  const freePlayT = await getTranslations("Play.FreePlay");
  const entitlements = await getEntitlementsForUser(user.id);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: `/${locale}` });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("greeting", { name: user.name ?? user.email ?? "" })}
        </h1>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {t("signOut")}
          </button>
        </form>
      </div>

      <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-3 text-lg font-semibold">{t("entitlementsTitle")}</h2>
        <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
          {t("plan", { plan: entitlements.plan })}
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          <li>{t("newPositions", { count: formatCount(entitlements.remaining.newPositions, t("unlimited")) })}</li>
          <li>{t("reviews", { count: formatCount(entitlements.remaining.reviews, t("unlimited")) })}</li>
          <li>{t("explanations", { count: formatCount(entitlements.remaining.explanations, t("unlimited")) })}</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/app/play"
          className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          {playT("title")}
        </Link>
        <Link
          href="/app/free-play"
          className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          {freePlayT("title")}
        </Link>
      </div>
    </div>
  );
}
