import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const BASE = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-gold text-brand-ink hover:bg-brand-goldHover",
  secondary: "border border-white/[0.22] text-brand-cream hover:border-brand-gold",
  ghost: "text-brand-muted hover:text-brand-cream",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

/** Retourne la classe Tailwind pour un bouton de marque — utilisable sur <button> ou <Link>. */
export function btnClass(variant: Variant = "primary", size: Size = "md", extra?: string | false | null) {
  return cn(BASE, VARIANTS[variant], SIZES[size], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button className={btnClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}
