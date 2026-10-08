import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PositionForm } from "@/components/admin/position-form";
import { redirect } from "@/i18n/navigation";
import {
  getPositionForAdmin,
  InvalidFenError,
  InvalidLineMoveError,
  listThemesForAdmin,
  parsePositionFormData,
  setPositionStatus,
  updatePosition,
} from "@/lib/adminPositionService";

export const dynamic = "force-dynamic";

export default async function AdminEditPositionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale, id } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);

  const [position, themes, t] = await Promise.all([
    getPositionForAdmin(id),
    listThemesForAdmin(),
    getTranslations("Admin.PositionForm"),
  ]);
  if (!position) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    try {
      const input = parsePositionFormData(formData);
      await updatePosition(id, input);
      const intent = formData.get("intent");
      if (intent === "draft" || intent === "published" || intent === "archived") {
        await setPositionStatus(id, intent);
      }
    } catch (err) {
      const msg =
        err instanceof InvalidFenError
          ? "invalid_fen"
          : err instanceof InvalidLineMoveError
            ? encodeURIComponent((err as Error).message)
            : "unknown";
      redirect({ href: `/admin/positions/${id}?error=${msg}`, locale });
      return;
    }
    revalidatePath(`/${locale}/admin/positions/${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{position.texts.fr.title || position.id}</h1>
        <span className={[
          "rounded px-2 py-0.5 text-xs font-mono",
          position.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" :
          position.status === "draft" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
          "bg-neutral-100 text-neutral-500 dark:bg-neutral-800",
        ].join(" ")}>
          {position.status}
        </span>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {decodeURIComponent(error)}
        </div>
      )}

      <PositionForm
        themes={themes}
        defaults={{
          themeId: position.themeId,
          fen: position.fen,
          userSide: position.userSide,
          expectedResult: position.expectedResult,
          judgeType: position.judgeType,
          lineMovesText: position.lineMovesText,
          titleFr: position.texts.fr.title,
          introFr: position.texts.fr.intro,
          goalFr: position.texts.fr.goal,
          titleEn: position.texts.en.title,
          introEn: position.texts.en.intro,
          goalEn: position.texts.en.goal,
          source: position.source ?? "",
          rating: position.rating,
          ratingDeviation: position.ratingDeviation,
          free: position.free,
        }}
        action={handleUpdate}
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
