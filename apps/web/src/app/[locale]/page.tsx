import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";

// Le CTA dépend de la session (cookies) : jamais mis en cache statique.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const session = await auth();

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">{t("tagline")}</p>
      <Link
        href={session ? "/app" : "/login"}
        className="rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        {session ? t("cta") : t("loginCta")}
      </Link>
    </div>
  );
}
