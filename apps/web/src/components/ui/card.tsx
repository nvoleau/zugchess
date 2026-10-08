import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Panneau de marque : fond sombre, bordure subtile, coins arrondis. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("rounded-[22px] border border-white/[0.08] bg-brand-panel p-6", className)} {...props}>
      {children}
    </div>
  );
}
