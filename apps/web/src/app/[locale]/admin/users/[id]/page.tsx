import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUserDetail, updateUserSubscription } from "@/lib/adminUserService";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [detail, rating, xpAgg, streak] = await Promise.all([
    getUserDetail(id),
    prisma.playerRating.findUnique({ where: { userId: id } }),
    prisma.xpEvent.aggregate({ where: { userId: id }, _sum: { amount: true } }),
    prisma.streak.findUnique({ where: { userId: id } }),
  ]);
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
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="text-sm text-neutral-500 hover:underline">← {t("back")}</Link>
        <h1 className="text-xl font-semibold">{detail.name ?? detail.email ?? detail.id}</h1>
        <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs dark:bg-neutral-800">
          {detail.role}
        </span>
      </div>

      {/* Infos de base */}
      <section className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <p><span className="text-neutral-500">{t("email")} </span>{detail.email ?? "—"}</p>
        <p><span className="text-neutral-500">{t("createdAt", { date: "" })}</span>{detail.createdAt.toLocaleDateString(locale)}</p>
        <p><span className="text-neutral-500">{t("usageToday", { newPositions: "", reviews: "" })}</span>
          {detail.usageToday.newPositions} nouvelles · {detail.usageToday.reviews} révisions
        </p>
        <p><span className="text-neutral-500">{t("counts", { cards: "", reviewLogs: "" })}</span>
          {detail.cardsCount} cartes · {detail.reviewLogsCount} révisions au total
        </p>
      </section>

      {/* Stats gamification */}
      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">{t("gamificationTitle")}</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-mono text-lg">{Math.round(rating?.rating ?? 1500)}</p>
            <p className="text-xs text-neutral-500">{t("elo")}</p>
          </div>
          <div>
            <p className="font-mono text-lg">{xpAgg._sum.amount ?? 0} XP</p>
            <p className="text-xs text-neutral-500">{t("xp")}</p>
          </div>
          <div>
            <p className="font-mono text-lg">{streak?.current ?? 0}</p>
            <p className="text-xs text-neutral-500">{t("streak")}</p>
          </div>
        </div>
      </section>

      {/* Override abonnement */}
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
