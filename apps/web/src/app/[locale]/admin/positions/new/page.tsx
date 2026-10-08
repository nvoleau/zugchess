import { getTranslations, setRequestLocale } from "next-intl/server";
import { PositionForm } from "@/components/admin/position-form";
import { redirect } from "@/i18n/navigation";
import {
  createPosition,
  InvalidFenError,
  InvalidLineMoveError,
  listThemesForAdmin,
  parsePositionFormData,
  setPositionStatus,
} from "@/lib/adminPositionService";

export const dynamic = "force-dynamic";

export default async function AdminNewPositionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);

  const [themes, t, tPositions] = await Promise.all([
    listThemesForAdmin(),
    getTranslations("Admin.PositionForm"),
    getTranslations("Admin.Positions"),
  ]);

  async function handleCreate(formData: FormData) {
    "use server";
    let id: string;
    try {
      const input = parsePositionFormData(formData);
      id = await createPosition(input);
      const intent = formData.get("intent");
      if (intent === "published" || intent === "archived") {
        await setPositionStatus(id, intent);
      }
    } catch (err) {
      const msg =
        err instanceof InvalidFenError
          ? "invalid_fen"
          : err instanceof InvalidLineMoveError
            ? encodeURIComponent((err as Error).message)
            : "unknown";
      redirect({ href: `/admin/positions/new?error=${msg}`, locale });
      return;
    }
    redirect({ href: `/admin/positions/${id}`, locale });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{tPositions("new")}</h1>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {decodeURIComponent(error)}
        </div>
      )}

      <PositionForm
        themes={themes}
        defaults={{
          themeId: themes[0]?.id ?? "",
          fen: "",
          userSide: "white",
          expectedResult: "white",
          judgeType: "kpk",
          lineMovesText: "",
          titleFr: "",
          introFr: "",
          goalFr: "",
          titleEn: "",
          introEn: "",
          goalEn: "",
          source: "",
          rating: 1500,
          ratingDeviation: 350,
          free: false,
        }}
        action={handleCreate}
        labels={{
          theme: t("theme"),
          fen: t("fen"),
          userSide: t("userSide"),
          expectedResult: t("expectedResult"),
          judgeType: t("judgeType"),
          lineMoves: t("lineMoves"),
          title: t("title"),
          intro: t("intro"),
          goal: t("goal"),
          rating: t("rating"),
          ratingDeviation: t("ratingDeviation"),
          source: t("source"),
          free: t("free"),
          saveDraft: t("saveDraft"),
          publish: t("publish"),
          archive: t("archive"),
        }}
        showPublishButtons={true}
      />
    </div>
  );
}
