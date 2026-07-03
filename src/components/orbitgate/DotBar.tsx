"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PAGE_GROUPS } from "@/lib/nav-config";
import { useOrbitGateStore } from "@/lib/orbitgate-store";

export function DotBar() {
  const { currentPage, setCurrentPage, navigateToSection } = useOrbitGateStore();
  const [hoveredPage, setHoveredPage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleDotClick = useCallback(
    (pageId: string) => {
      setCurrentPage(pageId);
    },
    [setCurrentPage]
  );

  const handleDotHover = useCallback((pageId: string | null) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    if (pageId) {
      tooltipTimer.current = setTimeout(() => setHoveredPage(pageId), 100);
    } else {
      setHoveredPage(null);
    }
  }, []);

  // Keyboard nav for dotbar
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;

      const pageIds = PAGE_GROUPS.map((g) => g.id);
      const idx = pageIds.indexOf(currentPage);

      if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        const next = pageIds[(idx + 1) % pageIds.length];
        setCurrentPage(next);
      } else if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        const prev = pageIds[(idx - 1 + pageIds.length) % pageIds.length];
        setCurrentPage(prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPage, setCurrentPage]);

  // Click outside to collapse expanded mode
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    if (expanded) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [expanded]);

  const hoveredGroup = PAGE_GROUPS.find((g) => g.id === hoveredPage);

  return (
    <div
      ref={barRef}
      className="fixed right-3 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center"
    >
      <AnimatePresence>
        {hoveredGroup && !expanded && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute right-full mr-3 whitespace-nowrap px-3 py-2 rounded-lg bg-[#0a0f1e]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl"
          >
            <div className="flex items-center gap-2">
              <hoveredGroup.icon className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-white">{hoveredGroup.label}</span>
            </div>
            {/* Sub-sections list in tooltip */}
            <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] space-y-0.5">
              {hoveredGroup.sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    navigateToSection(s.id);
                    setHoveredPage(null);
                  }}
                  className="block w-full text-left text-[11px] text-gray-400 hover:text-cyan-400 transition-colors py-0.5"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dots container */}
      <div
        className="relative flex flex-col items-center py-2 px-1.5 rounded-full bg-[#0a0f1e]/60 border border-white/[0.06] backdrop-blur-xl cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Vertical line behind dots */}
        <div className="absolute top-5 bottom-5 w-px bg-gradient-to-b from-cyan-500/30 via-white/[0.08] to-cyan-500/30" />

        {PAGE_GROUPS.map((group) => {
          const isActive = currentPage === group.id;
          const Icon = group.icon;

          return (
            <div key={group.id} className="relative z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDotClick(group.id);
                }}
                onMouseEnter={() => handleDotHover(group.id)}
                onMouseLeave={() => handleDotHover(null)}
                className="relative flex items-center justify-center py-1.5 px-1 group/dot"
                aria-label={`Navigate to ${group.label}`}
              >
                {/* Active glow ring */}
                {isActive && (
                  <motion.div
                    layoutId="dotbar-active"
                    className="absolute inset-0 rounded-full bg-cyan-500/20"
                    style={{ boxShadow: "0 0 12px rgba(6,182,212,0.3)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Dot or expanded icon */}
                {expanded ? (
                  <div className="relative">
                    <Icon
                      className={`h-3.5 w-3.5 transition-colors ${
                        isActive ? "text-cyan-400" : "text-gray-500 group-hover/dot:text-gray-300"
                      }`}
                    />
                  </div>
                ) : (
                  <motion.div
                    className={`rounded-full transition-all duration-200 ${
                      isActive
                        ? "h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                        : "h-1.5 w-1.5 bg-gray-600 group-hover/dot:bg-gray-400 group-hover/dot:shadow-[0_0_6px_rgba(255,255,255,0.15)]"
                    }`}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Expand/collapse hint */}
      <AnimatePresence>
        {!expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-1 text-[9px] text-gray-600 font-mono"
          >
            click
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}