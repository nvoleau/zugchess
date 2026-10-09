"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";

interface MobileNavProps {
  isAuthenticated: boolean;
  labels: {
    method: string;
    programme: string;
    progression: string;
    pricing: string;
    about: string;
    login: string;
    goToApp: string;
    signup: string;
  };
}

export function MobileNav({ isAuthenticated, labels }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-brand-cream md:hidden"
      >
        {open ? (
          // X
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          // Hamburger
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 top-[65px] z-40 flex flex-col bg-brand-ink/98 backdrop-blur-md md:hidden">
          <nav className="flex flex-col gap-1 p-6 pt-8">
            {[
              { href: "/#methode", label: labels.method },
              { href: "/#programme", label: labels.programme },
              { href: "/#progression", label: labels.progression },
              { href: "/#tarifs", label: labels.pricing },
              { href: "/about", label: labels.about },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-4 text-lg font-medium text-brand-cream hover:bg-white/[0.04]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 border-t border-white/[0.08] p-6">
            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/20 px-5 py-3.5 text-center text-sm font-medium text-brand-cream"
              >
                {labels.login}
              </Link>
            )}
            <Link
              href={isAuthenticated ? "/app" : "/try"}
              onClick={() => setOpen(false)}
              className="rounded-full bg-brand-accent px-5 py-3.5 text-center text-sm font-semibold text-brand-ink"
            >
              {isAuthenticated ? labels.goToApp : labels.signup}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
