"use client";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  {
    href: "/app",
    key: "home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/app/play",
    key: "session",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path d="M12 2a5 5 0 015 5c0 1.8-.9 3.4-2.3 4.4L16 21H8l1.3-9.6A5 5 0 0112 2z" strokeLinejoin="round" />
        <path d="M8 17h8" />
      </svg>
    ),
  },
  {
    href: "/app/lessons",
    key: "lessons",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinejoin="round" />
        <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/app/ranking",
    key: "ranking",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

function isActive(href: string, pathname: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}

/** Barre d'onglets desktop (cachée sur mobile). */
export function AppNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex gap-1 rounded-full border border-white/10 bg-brand-panel p-1">
      {TABS.map((tab) => {
        const active = isActive(tab.href, pathname);
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

/** Barre de navigation fixe en bas — visible uniquement sur mobile. */
export function AppBottomNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden border-t border-white/10 bg-brand-ink/95 backdrop-blur-md">
      {TABS.map((tab) => {
        const active = isActive(tab.href, pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] transition-colors ${
              active ? "text-brand-gold" : "text-brand-mutedLight"
            }`}
          >
            {tab.icon}
            <span>{labels[tab.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
