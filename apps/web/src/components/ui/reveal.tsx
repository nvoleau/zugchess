"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Révèle son contenu avec un fondu + glissement vertical au scroll.
 * Le state initial (caché) n'est appliqué qu'après hydratation — pas de flash
 * côté serveur, pas d'impact SEO.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = [
      `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      `transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    ].join(", ");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "none";
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -28px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
