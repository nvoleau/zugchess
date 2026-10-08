import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type BadgeVariant = "plan" | "kicker" | "pill";

const VARIANTS: Record<BadgeVariant, string> = {
  plan: "rounded-full border border-brand-gold/40 px-2.5 py-1 font-brandMono text-xs text-brand-gold",
  kicker: "font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted",
  pill: "rounded-full bg-brand-gold/10 px-3 py-1 font-brandMono text-sm text-brand-gold",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

/** Étiquette de marque : badge d'offre, kicker de section, ou pastille compteur. */
export function Badge({ variant = "plan", className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(VARIANTS[variant], className)} {...props}>
      {children}
    </span>
  );
}
