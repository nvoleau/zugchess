import { getTranslations, setRequestLocale } from "next-intl/server";
import { signIn } from "@/auth";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Login");

  async function signInWithEmail(formData: FormData) {
    "use server";
    const email = formData.get("email");
    if (typeof email !== "string" || email.length === 0) return;
    await signIn("email", { email, redirectTo: `/${locale}/app` });
  }

  async function signInWithLichess() {
    "use server";
    await signIn("lichess", { redirectTo: `/${locale}/app` });
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <form action={signInWithEmail} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder={t("emailPlaceholder")}
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {t("emailSubmit")}
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        {t("or")}
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <form action={signInWithLichess}>
        <button
          type="submit"
          className="w-full rounded-md border border-neutral-300 px-4 py-2 font-medium dark:border-neutral-700"
        >
          {t("lichessCta")}
        </button>
      </form>
    </div>
  );
}
