"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { keys: "⌘K", description: "Command Palette" },
  { keys: "?", description: "Show this help" },
  { keys: "Esc", description: "Close dialog / overlay" },
  { keys: "T", description: "Scroll to Claim Checker" },
  { keys: "B", description: "Scroll to TLE Browser" },
  { keys: "A", description: "Scroll to Analytics" },
  { keys: "G", description: "Scroll to Gate Rules" },
  { keys: "1–9", description: "Jump to gate rule (1=TLE, 2=SGP4, etc.)" },
  { keys: "D", description: "Toggle dark mode" },
  { keys: "Home", description: "Scroll to top" },
  { keys: "End", description: "Scroll to bottom" },
];

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsOverlay({ open, onClose }: KeyboardShortcutsOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Centered card */}
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div
              className="pointer-events-auto w-full max-w-lg rounded-2xl border border-gray-200/60 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl shadow-2xl shadow-black/20 dark:shadow-cyan-900/10"
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard Shortcuts"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="mx-6 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/[0.06] to-transparent" />

              {/* Shortcuts grid */}
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {SHORTCUTS.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between gap-3 py-1.5"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {shortcut.description}
                    </span>
                    <kbd className="shrink-0 inline-flex items-center justify-center min-w-[3rem] px-2 py-1 text-xs font-mono font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#0c1222] border border-gray-200/60 dark:border-white/[0.06] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none select-none">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="px-6 pb-5 pt-2">
                <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center">
                  Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-[#0c1222] border border-gray-200/60 dark:border-white/[0.06] rounded">Esc</kbd> or <kbd className="px-1 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-[#0c1222] border border-gray-200/60 dark:border-white/[0.06] rounded">?</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}