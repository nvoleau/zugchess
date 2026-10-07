"use client";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/app", key: "home" },
  { href: "/app/play", key: "session" },
  { href: "/app/lessons", key: "lessons" },
  { href: "/app/ranking", key: "ranking" },
] as const;

/** Barre d'onglets de l'app (SPEC.md + design de marque), active selon le chemin courant. */
export function AppNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-brand-panel p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? "rounded-full bg-brand-gold px-4 py-2 text-sm text-brand-ink"
                : "rounded-full px-4 py-2 text-sm text-brand-mutedLight hover:text-brand-cream"
            }
          >
            {labels[tab.key]}
          </Link>
        );
      })}
    </nav>
  );
}
