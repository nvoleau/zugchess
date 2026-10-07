import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUserDetail, updateUserSubscription } from "@/lib/adminUserService";

export const dynamic = "force-dynamic";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const t = await getTranslations("Admin.UserDetail");

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateUserSubscription(id, {
      plan: formData.get("plan") as "free" | "premium",
      status: formData.get("status") as "active" | "canceled" | "past_due" | "trialing",
      founderDiscount: formData.get("founderDiscount") === "on",
    });
    revalidatePath(`/${locale}/admin/users/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{detail.email ?? detail.id}</h1>

      <section className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <p>{t("createdAt", { date: detail.createdAt.toLocaleDateString(locale) })}</p>
        <p>{t("role", { role: detail.role })}</p>
        <p>{t("usageToday", { newPositions: detail.usageToday.newPositions, reviews: detail.usageToday.reviews })}</p>
        <p>{t("counts", { cards: detail.cardsCount, reviewLogs: detail.reviewLogsCount })}</p>
      </section>

      <form action={handleUpdate} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">{t("subscriptionTitle")}</h2>
        <label className="flex flex-col gap-1 text-sm">
          {t("plan")}
          <select name="plan" defaultValue={detail.subscription?.plan ?? "free"} className={inputClass}>
            <option value="free">free</option>
            <option value="premium">premium</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("status")}
          <select name="status" defaultValue={detail.subscription?.status ?? "active"} className={inputClass}>
            <option value="active">active</option>
            <option value="canceled">canceled</option>
            <option value="past_due">past_due</option>
            <option value="trialing">trialing</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="founderDiscount" defaultChecked={detail.subscription?.founderDiscount ?? false} />
          {t("founderDiscount")}
        </label>
        <button type="submit" className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
          {t("save")}
        </button>
      </form>
    </div>
  );
}
