import { setRequestLocale } from "next-intl/server";
import { KpkTrainer } from "@/components/play/kpk-trainer";

// Page jetable, non liée dans la nav : vérification visuelle sans dépendre de la base (auth()
// injoignable dans ce sandbox). À supprimer après contrôle manuel.
export const dynamic = "force-dynamic";

export default async function DevPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="flex flex-col items-center gap-8">
      <KpkTrainer initialFen="7k/8/8/8/8/1P6/8/7K w - - 0 1" userColor="white" />
    </div>
  );
}
