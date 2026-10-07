import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

/**
 * Chrome générique (logo + sélecteur de langue + thème clair/sombre, contenu centré) pour les
 * pages qui ne font pas partie de l'identité de marque sombre fixe (accueil, app) : connexion et
 * essai sans compte. Reprend ce qui vivait avant dans `[locale]/layout.tsx`.
 */
export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <Link href="/" className="font-semibold">
          ZugChess
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </>
  );
}
