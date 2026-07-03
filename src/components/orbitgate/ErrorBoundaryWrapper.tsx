"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { toast } from "sonner";

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
}

interface ErrorBoundaryWrapperState {
  hasError: boolean;
  error: Error | null;
}

/* ── Inline satellite SVG icon ─────────────────────────────── */
function SatelliteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Solar panels */}
      <rect
        x="4"
        y="22"
        width="18"
        height="20"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <line
        x1="10"
        y1="22"
        x2="10"
        y2="42"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
      <line
        x1="16"
        y1="22"
        x2="16"
        y2="42"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
      <rect
        x="42"
        y="22"
        width="18"
        height="20"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <line
        x1="48"
        y1="22"
        x2="48"
        y2="42"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
      <line
        x1="54"
        y1="22"
        x2="54"
        y2="42"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
      {/* Body */}
      <rect
        x="24"
        y="20"
        width="16"
        height="24"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Antenna dish */}
      <circle
        cx="32"
        cy="20"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="32"
        y1="15"
        x2="32"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="9" r="1.5" fill="currentColor" opacity="0.7" />
      {/* Signal waves */}
      <path
        d="M38 17 Q42 13 38 9"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
        fill="none"
      />
      <path
        d="M26 17 Q22 13 26 9"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
        fill="none"
      />
    </svg>
  );
}

/* ── Subtle star dots background ───────────────────────────── */
function StarPattern() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {Array.from({ length: 60 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.4 + 0.1,
          }}
        />
      ))}
    </div>
  );
}

/* ── Error fallback UI ─────────────────────────────────────── */
function ErrorFallback({
  error,
  onRestart,
  onReport,
}: {
  error: Error | null;
  onRestart: () => void;
  onReport: () => void;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden">
      <StarPattern />

      {/* Radial glow behind content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 50% 45%, rgba(16,185,129,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-lg">
        {/* Satellite icon with pulse ring */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" style={{ margin: "-8px" }} />
          <SatelliteIcon className="w-20 h-20 text-cyan-400" />
        </div>

        {/* Heading */}
        <h1 className="font-orbitron text-2xl md:text-3xl font-bold text-cyan-400 tracking-wide">
          System Anomaly Detected
        </h1>

        {/* Error message */}
        <p className="text-sm text-gray-400 leading-relaxed font-mono max-w-md break-words">
          {error?.message ?? "An unexpected error occurred in the orbital systems."}
        </p>

        {/* Divider */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            onClick={onRestart}
            className="px-6 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium
                       hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Restart Systems
          </button>
          <button
            onClick={onReport}
            className="px-6 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-gray-300 text-sm font-medium
                       hover:bg-slate-700/60 hover:border-slate-600/60 transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-slate-500/40 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Report Issue
          </button>
        </div>

        {/* Subtle footer text */}
        <p className="text-[10px] text-gray-600 mt-4 font-mono tracking-wider uppercase">
          OrbitGate v0.2 — Error Boundary
        </p>
      </div>
    </div>
  );
}

/* ── Error Boundary Class Component ────────────────────────── */
export class ErrorBoundaryWrapper extends Component<
  ErrorBoundaryWrapperProps,
  ErrorBoundaryWrapperState
> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryWrapperState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[OrbitGate ErrorBoundary]", error, errorInfo);
  }

  handleRestart = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReport = (): void => {
    toast.error("Issue reported to mission control", {
      description: this.state.error?.message ?? "Unknown anomaly",
      duration: 4000,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRestart={this.handleRestart}
          onReport={this.handleReport}
        />
      );
    }

    return this.props.children;
  }
}