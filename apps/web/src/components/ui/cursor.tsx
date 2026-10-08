"use client";

import { useEffect, useRef } from "react";

/**
 * Curseur de marque : pastille or qui suit la souris avec amortissement (lerp).
 * S'élargit en anneau sur les éléments interactifs (a, button).
 * Invisible sur écrans tactiles — ne gêne pas la navigation clavier.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (dot.style.opacity === "0") dot.style.opacity = "0.75";
    };

    const onEnter = () => dot.classList.add("cursor--hover");
    const onLeave = () => dot.classList.remove("cursor--hover");

    const bindInteractives = () => {
      document.querySelectorAll("a, button, [data-cursor-hover]").forEach((el) => {
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    };

    const mo = new MutationObserver(bindInteractives);
    mo.observe(document.body, { childList: true, subtree: true });
    bindInteractives();

    const loop = () => {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      // Décale de la moitié de la taille pour centrer le dot sur le curseur réel
      const half = dot.classList.contains("cursor--hover") ? 13 : 4;
      dot.style.transform = `translate(${cx - half}px, ${cy - half}px)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="cursor-dot"
    />
  );
}
