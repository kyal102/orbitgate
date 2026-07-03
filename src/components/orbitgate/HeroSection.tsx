"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { AuroraField } from "./AuroraField";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Activity,
  Terminal,
  Globe2,
} from "lucide-react";

function StatusPulse() {
  const [opacity, setOpacity] = useState(0.4);
  useEffect(() => {
    const timer = setInterval(() => {
      setOpacity((prev) => (prev === 0.4 ? 1 : 0.4));
    }, 1500);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="relative flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full bg-cyan-400"
        style={{
          opacity,
          boxShadow: `0 0 8px rgba(6,182,212,${0.3 * opacity})`,
        }}
      />
    </span>
  );
}

function AnimatedCounter({ target, duration = 2000, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const start = Date.now();

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress >= 1) {
        setIsRunning(false);
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isRunning, start, target, duration]);

  return (
    <span className="tabular-nums text-white font-mono text-sm">
      {isRunning ? count : target}{suffix}
    </span>
  );
}

function StatusIndicator() {
  const [status, setStatus] = useState<"checking" | "online" | "degraded">(
    "checking"
  );

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/orbitgate/status");
        const data = await res.json();
        if (data.sgp4_available && data.tle_fetcher_available) {
          setStatus("online");
        } else {
          setStatus("degraded");
        }
      } catch {
        setStatus("degraded");
      }
    };
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <StatusPulse />
      <span className="text-xs text-gray-400 dark:text-gray-400 font-mono uppercase tracking-wider">
        {status === "checking" && "Verifying..."}
        {status === "online" && "All Systems Nominal"}
        {status === "degraded" && "Partial Service"}
      </span>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
    >
      {/* Space background image — ultra-subtle, more like a texture */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://sfile.chatglm.cn/images-ppt/23f9e9e1dc58.jpg')`,
        }}
      />
      {/* Deep gradient overlay — navy to deep space */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,7,18,0.85)] via-[rgba(3,7,18,0.9)] to-[rgba(3,7,18,0.95)]" />

      {/* Aurora gradient layers — the 2026 signature effect */}
      <div className="aurora-bg absolute inset-0 pointer-events-none opacity-60" />

      {/* Subtle star particles — much less dense than before */}
      <AuroraField count={25} />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Research badge — refined, glass */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Badge
            variant="outline"
            className="mb-8 bg-cyan-500/5 text-cyan-300 border-cyan-500/20 px-4 py-1.5 text-xs font-mono backdrop-blur-sm"
          >
            <ShieldAlert className="h-3 w-3 mr-1.5" />
            Research Prototype — Not Flight Certified
          </Badge>
        </motion.div>

        {/* Title — Clean Orbitron with cyan-violet gradient */}
        <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-4">
          <span className="font-orbitron text-white">Orbit</span>
          <span className="font-orbitron text-gradient-cyan">Gate</span>
        </h1>

        {/* Version badge — minimal pill */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="font-orbitron text-xs font-medium px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300/80 tracking-wider backdrop-blur-sm">
            v0.4
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300/80 border border-violet-500/15">
            2026 Edition
          </span>
        </div>

        {/* Subtitle — larger, clean, no text-shadow glow */}
        <p className="text-lg sm:text-xl md:text-2xl text-gray-300/90 max-w-2xl mx-auto mb-4 leading-relaxed font-light">
          Deterministic Verification-Gate System for AI-Generated Orbital
          Claims · Real SGP4 Propagation
        </p>

        {/* Live status — glass pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
            <StatusIndicator />
            <span className="text-xs text-gray-400">
              <span className="text-gray-200 font-medium">System Status:</span>
            </span>
          </div>
        </motion.div>

        {/* Quote card — modern frosted glass, no animated border */}
        <motion.div
          className="rounded-2xl p-6 sm:p-8 mb-12 max-w-2xl mx-auto bg-white/[0.03] border border-white/[0.06] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="flex items-start gap-4 text-left">
            <div className="mt-1 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/10">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm sm:text-base text-gray-300/90 italic leading-relaxed">
                &ldquo;Before any AI-generated orbital claim reaches a mission
                operator, it must pass through a deterministic verification
                gate — a fixed, auditable, reproducible pipeline that either
                allows the claim through or blocks it with a precise
                reason.&rdquo;
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats row — modern glass panels, minimal */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {[
            { icon: ShieldCheck, value: <AnimatedCounter target={9} />, label: "Verification Gates" },
            { icon: Shield, value: <AnimatedCounter target={160} suffix="+" />, label: "Benchmark Cases" },
            { icon: Activity, value: <AnimatedCounter target={100} suffix="%" />, label: "Deterministic" },
            { icon: Terminal, value: <span className="text-cyan-300 font-mono text-sm font-bold">SGP4</span>, label: "Real Propagation" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-5 py-3.5 flex flex-col items-center gap-1.5 min-w-[130px] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1]"
            >
              <div className="flex items-center gap-2">
                <stat.icon className="h-3.5 w-3.5 text-cyan-400/80" />
                {stat.value}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Feature pills — modern glass, multi-accent */}
        <motion.div
          className="flex flex-wrap justify-center gap-2.5 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          {[
            { label: "Real SGP4", icon: Activity, borderColor: "rgba(6,182,212,0.2)", bg: "bg-cyan-500/5", iconColor: "text-cyan-400" },
            { label: "CelesTrak TLE", icon: Globe2, borderColor: "rgba(14,165,233,0.2)", bg: "bg-sky-500/5", iconColor: "text-sky-400" },
            { label: "Evidence Packs", icon: ShieldCheck, borderColor: "rgba(245,158,11,0.2)", bg: "bg-amber-500/5", iconColor: "text-amber-400" },
          ].map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.1, duration: 0.4 }}
            >
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs text-gray-300/90 border backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 ${feat.bg}`}
                style={{ borderColor: feat.borderColor }}
              >
                <feat.icon className={`h-3.5 w-3.5 ${feat.iconColor}`} />
                <span>{feat.label}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator — minimal, modern */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <div className="h-8 w-5 rounded-full border border-gray-600/50 flex items-start justify-center p-1.5">
            <div className="h-1.5 w-1 rounded-full bg-cyan-400/60" />
          </div>
        </motion.div>
      </motion.div>

      {/* Earth horizon strip — subtle, with fade mask */}
      <div className="absolute bottom-0 left-0 right-0 h-40 md:h-56 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://sfile.chatglm.cn/images-ppt/662b7d93677e.jpg')`,
            maskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
            opacity: 0.25,
          }}
        />
        {/* Bottom fade to match page background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent" />
      </div>

      {/* Light mode: hide space background imagery */}
      <style jsx global>{`
        .light #hero [style*="background-image"] {
          opacity: 0.03 !important;
        }
      `}</style>
    </section>
  );
}