import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PositionForm } from "@/components/admin/position-form";
import {
  getPositionForAdmin,
  listThemesForAdmin,
  parsePositionFormData,
  setPositionStatus,
  updatePosition,
} from "@/lib/adminPositionService";

export const dynamic = "force-dynamic";

export default async function AdminEditPositionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [position, themes, t] = await Promise.all([
    getPositionForAdmin(id),
    listThemesForAdmin(),
    getTranslations("Admin.PositionForm"),
  ]);
  if (!position) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    const input = parsePositionFormData(formData);
    await updatePosition(id, input);
    const intent = formData.get("intent");
    if (intent === "draft" || intent === "published" || intent === "archived") {
      await setPositionStatus(id, intent);
    }
    revalidatePath(`/${locale}/admin/positions/${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{position.texts.fr.title || position.id}</h1>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{position.status}</span>
      </div>
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
