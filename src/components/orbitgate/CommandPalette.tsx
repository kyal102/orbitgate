"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  ArrowUp,
  SunMoon,
  type LucideIcon,
} from "lucide-react";
import { PAGE_GROUPS } from "@/lib/nav-config";
import { useOrbitGateStore } from "@/lib/orbitgate-store";

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  sectionId?: string;
  hint?: string;
  pageLabel?: string;
  action?: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { setTheme, resolvedTheme } = useTheme();
  const navigateToSection = useOrbitGateStore((s) => s.navigateToSection);
  const setCurrentPage = useOrbitGateStore((s) => s.setCurrentPage);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // Build all commands dynamically from PAGE_GROUPS
  const allCommands = useMemo<CommandItem[]>(() => {
    const navCmds: CommandItem[] = [];
    for (const group of PAGE_GROUPS) {
      for (const section of group.sections) {
        navCmds.push({
          id: section.id,
          label: section.label,
          icon: group.icon,
          sectionId: section.id,
          hint: group.label,
          pageLabel: group.label,
        });
      }
    }
    navCmds.push({
      id: "go-to-top",
      label: "Go to Dashboard",
      icon: ArrowUp,
      hint: "Back to main page",
      action: () => setCurrentPage("dashboard"),
    });
    navCmds.push({
      id: "toggle-dark",
      label: "Toggle dark mode",
      icon: SunMoon,
      hint: "Switch theme",
      action: toggleTheme,
    });
    return navCmds;
  }, [setCurrentPage, toggleTheme]);

  const filtered = query.trim()
    ? allCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        (cmd.pageLabel && cmd.pageLabel.toLowerCase().includes(query.toLowerCase()))
      )
    : allCommands;

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // Global keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleOpen, handleClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!open || filtered.length === 0) return;
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open, filtered.length]);

  function executeCommand(cmd: CommandItem) {
    if (cmd.action) {
      cmd.action();
    } else if (cmd.sectionId) {
      navigateToSection(cmd.sectionId);
    }
    handleClose();
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        executeCommand(filtered[activeIndex]);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else handleOpen(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg bg-white border border-gray-200 shadow-2xl dark:bg-[#0c1222] dark:border-white/[0.06] dark:backdrop-blur-2xl dark:shadow-2xl p-0 gap-0 overflow-hidden [&>span]:hidden"
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search and navigate to any section of the OrbitGate application
        </DialogDescription>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex flex-col"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-gray-200/60 dark:border-white/[0.06] px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search pages & sections..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-shadow duration-300 rounded"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-gray-200/60 dark:border-white/[0.06] bg-gray-100 dark:bg-[#0c1222] px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                  ESC
                </kbd>
              </div>

              {/* Results list */}
              <div
                ref={listRef}
                className="max-h-[400px] overflow-y-auto custom-scrollbar"
              >
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-500">
                    <Search className="h-8 w-8" />
                    <p className="text-sm">No commands found</p>
                  </div>
                ) : (
                  <ul role="listbox" className="py-2">
                    {filtered.map((cmd, index) => {
                      const Icon = cmd.icon;
                      const isActive = index === activeIndex;
                      return (
                        <li
                          key={cmd.id}
                          role="option"
                          aria-selected={isActive}
                          data-index={index}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => executeCommand(cmd)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-200 text-sm ${
                            isActive
                              ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
                              : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-500" : "text-gray-400"}`} />
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {cmd.pageLabel && (
                            <span className="hidden sm:inline text-[10px] text-gray-400 bg-gray-100 dark:bg-white/[0.04] rounded px-1.5 py-0.5">
                              {cmd.pageLabel}
                            </span>
                          )}
                          {!cmd.sectionId && cmd.id !== "go-to-top" && (
                            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-gray-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0c1222] px-1.5 py-0.5 text-[10px] font-medium text-gray-400 shadow-sm">
                              Action
                            </kbd>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-gray-200/60 dark:border-white/[0.06] px-4 py-2.5 text-[11px] text-gray-400 bg-gray-50 dark:bg-[#0c1222]/40">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-gray-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0c1222] px-1.5 py-0.5 text-[10px] font-medium shadow-sm">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-gray-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0c1222] px-1.5 py-0.5 text-[10px] font-medium shadow-sm">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-gray-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0c1222] px-1.5 py-0.5 text-[10px] font-medium shadow-sm">Esc</kbd>
                  Close
                </span>
                <span className="ml-auto hidden sm:inline-flex items-center gap-1">
                  <kbd className="rounded border border-gray-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0c1222] px-1.5 py-0.5 text-[10px] font-medium shadow-sm">⌘K</kbd>
                  <span className="text-gray-400">to open</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}