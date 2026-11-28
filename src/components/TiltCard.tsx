"use client";
import { useCallback, useRef } from "react";

/** Carte avec tilt 3D interactif au survol / touch. Max ±8 deg. */
export default function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const el = inner.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 16;  // ±8deg
    const rotateX = (0.5 - y) * 16;
    el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    el.style.setProperty("--shine-x", `${x * 100}%`);
    el.style.setProperty("--shine-y", `${y * 100}%`);
  }, []);

  const reset = useCallback(() => {
    if (inner.current) inner.current.style.transform = "";
  }, []);

  return (
    <div className={`tilt-3d ${className}`}
      onMouseMove={move} onMouseLeave={reset}
      onTouchMove={move} onTouchEnd={reset}>
      <div ref={inner} className="tilt-3d-inner">
        <span className="tilt-3d-shine" aria-hidden />
        {children}
      </div>
    </div>
  );
}
