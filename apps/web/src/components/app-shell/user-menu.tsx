"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

interface Props {
  initials: string;
  name: string | null;
  plan: string;
  isAdmin: boolean;
  labels: { myAccount: string; adminPanel: string; signOut: string };
}

export function UserMenu({ initials, name, plan, isAdmin, labels }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-gold/50 bg-[#2A251B] text-xs font-semibold transition-colors hover:border-brand-gold"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1A160F] shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-medium text-brand-cream">{name ?? labels.myAccount}</p>
            <p className="font-brandMono text-xs text-brand-gold">{plan}</p>
          </div>
          <div className="p-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-brand-muted hover:bg-white/[0.06] hover:text-brand-cream"
              >
                {labels.adminPanel}
              </Link>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-brand-muted hover:bg-white/[0.06] hover:text-brand-cream"
            >
              {labels.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
