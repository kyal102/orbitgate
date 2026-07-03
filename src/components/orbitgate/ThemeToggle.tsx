"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    toast("Theme Changed", { description: `Switched to ${next} mode` });
  };

  return (
    <button
      onClick={handleToggle}
      className="h-7 w-7 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-700 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center"
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.span
        key={resolvedTheme}
        initial={{ rotate: 0 }}
        animate={{ rotate: 180 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </motion.span>
    </button>
  );
}