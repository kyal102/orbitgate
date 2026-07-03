"use client";

import { useEffect, useRef, useCallback } from "react";

export function ScrollProgressIndicator() {
  const barRef = useRef<HTMLDivElement>(null);

  const updateWidth = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (barRef.current) {
      const pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      barRef.current.style.width = `${pct}%`;
      barRef.current.style.display = pct < 1 ? "none" : "block";
    }
  }, []);

  useEffect(() => {
    updateWidth();
    window.addEventListener("scroll", updateWidth, { passive: true });
    return () => window.removeEventListener("scroll", updateWidth);
  }, [updateWidth]);

  return (
    <div
      ref={barRef}
      className="scroll-progress-bar"
      style={{ display: "none" }}
    />
  );
}