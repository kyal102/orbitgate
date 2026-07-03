"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
  sectionNumber?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  align = "center",
  className = "",
  sectionNumber,
}: SectionHeaderProps) {
  return (
    <motion.div
      className={`mb-10 ${align === "center" ? "text-center" : ""} ${className}`}
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={`inline-flex items-center gap-2.5 ${align === "center" ? "justify-center" : ""}`}>
        {/* Accent dot — soft cyan, no harsh shimmer */}
        <span
          className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 shrink-0"
          style={{ boxShadow: '0 0 8px rgba(6, 182, 212, 0.2)' }}
        />
        {icon && (
          <span className="shrink-0 text-cyan-400/80">
            {icon}
          </span>
        )}
        {sectionNumber && (
          <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest shrink-0">
            {sectionNumber}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      {/* Gradient line — cyan to violet, subtle */}
      <div className={`mt-3 h-px w-24 ${align === "center" ? "mx-auto" : ""} bg-gradient-to-r from-cyan-400/40 via-violet-400/20 to-transparent`} />
      {subtitle && (
        <p className="text-gray-400 dark:text-gray-500 max-w-xl mx-auto mt-3 text-sm leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}