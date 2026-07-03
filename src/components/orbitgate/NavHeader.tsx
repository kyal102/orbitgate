"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Command, Menu, X } from "lucide-react";
import { PAGE_GROUPS, type PageGroup } from "@/lib/nav-config";
import { useOrbitGateStore } from "@/lib/orbitgate-store";

function NavDropdown({ group, isActive, onSelectSection }: {
  group: PageGroup;
  isActive: boolean;
  onSelectSection: (sectionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const Icon = group.icon;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
            : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{group.label}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-1.5 min-w-[220px] rounded-xl border border-white/[0.08] bg-[#0a0f1e]/95 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden z-[60]"
          >
            <div className="p-1.5">
              {group.sections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onSelectSection(section.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all duration-150 group/item ${
                    "hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-[10px] font-mono text-gray-600 w-4 text-right shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-gray-300 group-hover/item:text-white transition-colors">
                    {section.label}
                  </span>
                </button>
              ))}
            </div>
            {/* Subtle glow at top of dropdown */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NavHeader() {
  const { currentPage, setCurrentPage, navigateToSection } = useOrbitGateStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdHint, setCmdHint] = useState(true);

  // Hide cmd hint after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setCmdHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Close mobile menu on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => setCurrentPage("dashboard")}
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <span className="text-white font-orbitron text-xs font-black">OG</span>
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron text-white font-bold text-sm leading-none tracking-wide">
                Orbit<span className="text-gradient-cyan">Gate</span>
              </span>
              <span className="text-[10px] text-gray-600 font-mono leading-none mt-0.5">v0.4</span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {PAGE_GROUPS.map((group) => (
              <NavDropdown
                key={group.id}
                group={group}
                isActive={currentPage === group.id}
                onSelectSection={navigateToSection}
              />
            ))}
          </nav>

          {/* Right side: cmd hint + mobile toggle */}
          <div className="flex items-center gap-2">
            {cmdHint && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] text-gray-500 text-xs cursor-pointer hover:border-white/[0.12] transition-colors"
              >
                <Command className="h-3 w-3" />
                <span>K</span>
              </motion.div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-[#0a0f1e] border-l border-white/[0.06] z-[80] overflow-y-auto lg:hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-orbitron text-white font-bold text-sm">Navigation</span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {PAGE_GROUPS.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.id} className="mb-4">
                      <button
                        onClick={() => {
                          setCurrentPage(group.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          currentPage === group.id
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "text-gray-300 hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{group.label}</span>
                        <span className="ml-auto text-xs text-gray-600">{group.sections.length}</span>
                      </button>

                      {/* Show sub-sections for current page */}
                      {currentPage === group.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="ml-7 mt-1 border-l border-white/[0.06] pl-3 space-y-0.5"
                        >
                          {group.sections.map((section) => (
                            <button
                              key={section.id}
                              onClick={() => {
                                navigateToSection(section.id);
                                setMobileOpen(false);
                              }}
                              className="w-full text-left text-xs text-gray-400 hover:text-white py-1.5 transition-colors"
                            >
                              {section.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}