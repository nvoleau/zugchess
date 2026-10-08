"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { PositionDetail } from "@/lib/positionService";
import { SessionCard } from "@/components/play/session-card";

export function ReplayCard({ position, lessonsHref }: { position: PositionDetail; lessonsHref: string }) {
  const t = useTranslations("App.Lessons");
  const router = useRouter();

  return (
    <SessionCard
      position={position}
      nextLabel={t("replayDone")}
      onComplete={() => router.push(lessonsHref)}
    />
  );
}
