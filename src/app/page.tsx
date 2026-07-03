"use client";

import dynamic from "next/dynamic";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

// --- Static imports (critical / small) ---
import { HeroSection } from "@/components/orbitgate/HeroSection";
import { SystemOverview } from "@/components/orbitgate/SystemOverview";
import { ClaimChecker } from "@/components/orbitgate/ClaimChecker";
import { GateActivityFeed } from "@/components/orbitgate/GateActivityFeed";
import { GateRulesReference } from "@/components/orbitgate/GateRulesReference";
import { BatchClaimVerifier } from "@/components/orbitgate/BatchClaimVerifier";
import { OrbitAnalyticsDashboard } from "@/components/orbitgate/OrbitAnalyticsDashboard";
import { GatePerformanceCards } from "@/components/orbitgate/GatePerformanceCards";

// --- Dynamic imports (lazy-loaded) ---
const TelemetryStream = dynamic(() => import("@/components/orbitgate/TelemetryStream").then(m => ({ default: m.TelemetryStream })), { loading: () => <SectionSkeleton />, ssr: false });
const TLEBrowser = dynamic(() => import("@/components/orbitgate/TLEBrowser").then(m => ({ default: m.TLEBrowser })), { loading: () => <SectionSkeleton />, ssr: false });
const SatelliteDetailView = dynamic(() => import("@/components/orbitgate/SatelliteDetailView").then(m => ({ default: m.SatelliteDetailView })), { loading: () => <SectionSkeleton />, ssr: false });
const PropagationVisualizer = dynamic(() => import("@/components/orbitgate/PropagationVisualizer").then(m => ({ default: m.PropagationVisualizer })), { loading: () => <SectionSkeleton />, ssr: false });
const ConjunctionAnalysis = dynamic(() => import("@/components/orbitgate/ConjunctionAnalysis").then(m => ({ default: m.ConjunctionAnalysis })), { loading: () => <SectionSkeleton />, ssr: false });
const EvidencePackExplorer = dynamic(() => import("@/components/orbitgate/EvidencePackExplorer").then(m => ({ default: m.EvidencePackExplorer })), { loading: () => <SectionSkeleton />, ssr: false });
const BenchmarkDashboard = dynamic(() => import("@/components/orbitgate/BenchmarkDashboard").then(m => ({ default: m.BenchmarkDashboard })), { loading: () => <SectionSkeleton />, ssr: false });
const ClaimBoundaryExplorer = dynamic(() => import("@/components/orbitgate/ClaimBoundaryExplorer").then(m => ({ default: m.ClaimBoundaryExplorer })), { loading: () => <SectionSkeleton />, ssr: false });
const CertificateDisplay = dynamic(() => import("@/components/orbitgate/CertificateDisplay").then(m => ({ default: m.CertificateDisplay })), { loading: () => <SectionSkeleton />, ssr: false });
const EvidenceReplaySection = dynamic(() => import("@/components/orbitgate/EvidenceReplaySection").then(m => ({ default: m.EvidenceReplaySection })), { loading: () => <SectionSkeleton />, ssr: false });
const ClaimHistoryPanel = dynamic(() => import("@/components/orbitgate/ClaimHistoryPanel").then(m => ({ default: m.ClaimHistoryPanel })), { loading: () => <SectionSkeleton />, ssr: false });
const LimitationsSection = dynamic(() => import("@/components/orbitgate/LimitationsSection").then(m => ({ default: m.LimitationsSection })), { loading: () => <SectionSkeleton />, ssr: false });
const OrbitalCalculator = dynamic(() => import("@/components/orbitgate/OrbitalCalculator").then(m => ({ default: m.OrbitalCalculator })), { loading: () => <SectionSkeleton />, ssr: false });
const MissionSimulator = dynamic(() => import("@/components/orbitgate/MissionSimulator").then(m => ({ default: m.MissionSimulator })), { loading: () => <SectionSkeleton />, ssr: false });
const SatelliteComparison = dynamic(() => import("@/components/orbitgate/SatelliteComparison").then(m => ({ default: m.SatelliteComparison })), { loading: () => <SectionSkeleton />, ssr: false });
const GroundStationTracker = dynamic(() => import("@/components/orbitgate/GroundStationTracker").then(m => ({ default: m.GroundStationTracker })), { loading: () => <SectionSkeleton />, ssr: false });
const MissionTimeline = dynamic(() => import("@/components/orbitgate/MissionTimeline").then(m => ({ default: m.MissionTimeline })), { loading: () => <SectionSkeleton />, ssr: false });
const PowerSystemDashboard = dynamic(() => import("@/components/orbitgate/PowerSystemDashboard").then(m => ({ default: m.PowerSystemDashboard })), { loading: () => <SectionSkeleton />, ssr: false });
const MissionControlDashboard = dynamic(() => import("@/components/orbitgate/MissionControlDashboard").then(m => ({ default: m.MissionControlDashboard })), { loading: () => <SectionSkeleton />, ssr: false });
const ReentryPredictor = dynamic(() => import("@/components/orbitgate/ReentryPredictor").then(m => ({ default: m.ReentryPredictor })), { loading: () => <SectionSkeleton />, ssr: false });
const ConstellationDesigner = dynamic(() => import("@/components/orbitgate/ConstellationDesigner").then(m => ({ default: m.ConstellationDesigner })), { loading: () => <SectionSkeleton />, ssr: false });
const MissionDatabase = dynamic(() => import("@/components/orbitgate/MissionDatabase").then(m => ({ default: m.MissionDatabase })), { loading: () => <SectionSkeleton />, ssr: false });
const OrbitalMechanicsQuiz = dynamic(() => import("@/components/orbitgate/OrbitalMechanicsQuiz").then(m => ({ default: m.OrbitalMechanicsQuiz })), { loading: () => <SectionSkeleton />, ssr: false });
const SpaceEventFeed = dynamic(() => import("@/components/orbitgate/SpaceEventFeed").then(m => ({ default: m.SpaceEventFeed })), { loading: () => <SectionSkeleton />, ssr: false });
const LiveTrackingDashboard = dynamic(() => import("@/components/orbitgate/LiveTrackingDashboard").then(m => ({ default: m.LiveTrackingDashboard })), { loading: () => <SectionSkeleton />, ssr: false });
const ExportCenter = dynamic(() => import("@/components/orbitgate/ExportCenter").then(m => ({ default: m.ExportCenter })), { loading: () => <SectionSkeleton />, ssr: false });
const SpaceGlossary = dynamic(() => import("@/components/orbitgate/SpaceGlossary").then(m => ({ default: m.SpaceGlossary })), { loading: () => <SectionSkeleton />, ssr: false });
const SpaceMissionPlanner = dynamic(() => import("@/components/orbitgate/SpaceMissionPlanner").then(m => ({ default: m.SpaceMissionPlanner })), { loading: () => <SectionSkeleton />, ssr: false });
const RocketEngineDatabase = dynamic(() => import("@/components/orbitgate/RocketEngineDatabase").then(m => ({ default: m.RocketEngineDatabase })), { loading: () => <SectionSkeleton />, ssr: false });
const AsteroidTracker = dynamic(() => import("@/components/orbitgate/AsteroidTracker").then(m => ({ default: m.AsteroidTracker })), { loading: () => <SectionSkeleton />, ssr: false });
const SpaceTourismDashboard = dynamic(() => import("@/components/orbitgate/SpaceTourismDashboard").then(m => ({ default: m.SpaceTourismDashboard })), { loading: () => <SectionSkeleton />, ssr: false });
const SpaceImageGallery = dynamic(() => import("@/components/orbitgate/SpaceImageGallery").then(m => ({ default: m.SpaceImageGallery })), { loading: () => <SectionSkeleton />, ssr: false });
const SpacecraftDesigner = dynamic(() => import("@/components/orbitgate/SpacecraftDesigner").then(m => ({ default: m.SpacecraftDesigner })), { loading: () => <SectionSkeleton />, ssr: false });
const SpaceLawPanel = dynamic(() => import("@/components/orbitgate/SpaceLawPanel").then(m => ({ default: m.SpaceLawPanel })), { loading: () => <SectionSkeleton />, ssr: false });
const SatelliteHealthMonitor = dynamic(() => import("@/components/orbitgate/SatelliteHealthMonitor").then(m => ({ default: m.SatelliteHealthMonitor })), { loading: () => <SectionSkeleton />, ssr: false });
const OrbitDetermination = dynamic(() => import("@/components/orbitgate/OrbitDetermination").then(m => ({ default: m.OrbitDetermination })), { loading: () => <SectionSkeleton />, ssr: false });
const LaunchWindowCalc = dynamic(() => import("@/components/orbitgate/LaunchWindowCalc").then(m => ({ default: m.LaunchWindowCalc })), { loading: () => <SectionSkeleton />, ssr: false });
const APIPlayground = dynamic(() => import("@/components/orbitgate/APIPlayground").then(m => ({ default: m.APIPlayground })), { loading: () => <SectionSkeleton />, ssr: false });
const ThermalModel = dynamic(() => import("@/components/orbitgate/ThermalModel").then(m => ({ default: m.ThermalModel })), { loading: () => <SectionSkeleton />, ssr: false });
const CommsTimeline = dynamic(() => import("@/components/orbitgate/CommsTimeline").then(m => ({ default: m.CommsTimeline })), { loading: () => <SectionSkeleton />, ssr: false });
const SignalVisualizer = dynamic(() => import("@/components/orbitgate/SignalVisualizer").then(m => ({ default: m.SignalVisualizer })), { loading: () => <SectionSkeleton />, ssr: false });
const SpaceWeatherPanel = dynamic(() => import("@/components/orbitgate/SpaceWeatherPanel").then(m => ({ default: m.SpaceWeatherPanel })), { loading: () => <SectionSkeleton />, ssr: false });
const DebrisTracker = dynamic(() => import("@/components/orbitgate/DebrisTracker").then(m => ({ default: m.DebrisTracker })), { loading: () => <SectionSkeleton />, ssr: false });
const AttitudeControlSim = dynamic(() => import("@/components/orbitgate/AttitudeControlSim").then(m => ({ default: m.AttitudeControlSim })), { loading: () => <SectionSkeleton />, ssr: false });
const OrbitVisualization3D = dynamic(() => import("@/components/orbitgate/OrbitVisualization3D").then(m => ({ default: m.OrbitVisualization3D })), { loading: () => <SectionSkeleton />, ssr: false });
const MissionClock = dynamic(() => import("@/components/orbitgate/MissionClock").then(m => ({ default: m.MissionClock })), { loading: () => <SectionSkeleton />, ssr: false });

// --- Non-section components ---
import { GateDetailDialog } from "@/components/orbitgate/GateDetailDialog";
import { CommandPalette } from "@/components/orbitgate/CommandPalette";
import { KeyboardShortcutsOverlay } from "@/components/orbitgate/KeyboardShortcutsOverlay";
import { LiveFeedProvider } from "@/components/orbitgate/LiveFeedProvider";
import { ErrorBoundaryWrapper } from "@/components/orbitgate/ErrorBoundaryWrapper";
import { SystemStatusBar } from "@/components/orbitgate/SystemStatusBar";
import { SpaceAssistant } from "@/components/orbitgate/SpaceAssistant";
import { GlobalStatsCounter } from "@/components/orbitgate/GlobalStatsCounter";

// --- Navigation ---
import { NavHeader } from "@/components/orbitgate/NavHeader";
import { DotBar } from "@/components/orbitgate/DotBar";
import { PAGE_GROUPS } from "@/lib/nav-config";
import { useOrbitGateStore } from "@/lib/orbitgate-store";

import { ShieldAlert } from "lucide-react";

// --- Component map: componentKey → JSX ---
// Built once via useMemo to avoid re-creating on every render
function useComponentMap() {
  return useMemo(() => ({
    SystemOverview: <SystemOverview />,
    GatePerformanceCards: <GatePerformanceCards />,
    GateActivityFeed: <GateActivityFeed />,
    GateRulesReference: <GateRulesReference />,
    ClaimChecker: <ClaimChecker />,
    BatchClaimVerifier: <BatchClaimVerifier />,
    OrbitAnalyticsDashboard: <OrbitAnalyticsDashboard />,
    BenchmarkDashboard: <BenchmarkDashboard />,
    ClaimBoundaryExplorer: <ClaimBoundaryExplorer />,
    CertificateDisplay: <CertificateDisplay />,
    EvidenceReplaySection: <EvidenceReplaySection />,
    EvidencePackExplorer: <EvidencePackExplorer />,
    ClaimHistoryPanel: <ClaimHistoryPanel />,
    LimitationsSection: <LimitationsSection />,
    OrbitalCalculator: <OrbitalCalculator />,
    MissionSimulator: <MissionSimulator />,
    OrbitVisualization3D: <OrbitVisualization3D />,
    TLEBrowser: <TLEBrowser />,
    SatelliteDetailView: <SatelliteDetailView />,
    SatelliteComparison: <SatelliteComparison />,
    PropagationVisualizer: <PropagationVisualizer />,
    ConjunctionAnalysis: <ConjunctionAnalysis />,
    LiveTrackingDashboard: <LiveTrackingDashboard />,
    TelemetryStream: <TelemetryStream />,
    GroundStationTracker: <GroundStationTracker />,
    DebrisTracker: <DebrisTracker />,
    AsteroidTracker: <AsteroidTracker />,
    MissionTimeline: <MissionTimeline />,
    MissionControlDashboard: <MissionControlDashboard />,
    MissionDatabase: <MissionDatabase />,
    SpaceMissionPlanner: <SpaceMissionPlanner />,
    LaunchWindowCalc: <LaunchWindowCalc />,
    ReentryPredictor: <ReentryPredictor />,
    ConstellationDesigner: <ConstellationDesigner />,
    MissionClock: <MissionClock />,
    PowerSystemDashboard: <PowerSystemDashboard />,
    ThermalModel: <ThermalModel />,
    CommsTimeline: <CommsTimeline />,
    SignalVisualizer: <SignalVisualizer />,
    AttitudeControlSim: <AttitudeControlSim />,
    OrbitDetermination: <OrbitDetermination />,
    SatelliteHealthMonitor: <SatelliteHealthMonitor />,
    SpaceLawPanel: <SpaceLawPanel />,
    SpaceWeatherPanel: <SpaceWeatherPanel />,
    SpaceGlossary: <SpaceGlossary />,
    SpaceEventFeed: <SpaceEventFeed />,
    APIPlayground: <APIPlayground />,
    ExportCenter: <ExportCenter />,
    OrbitalMechanicsQuiz: <OrbitalMechanicsQuiz />,
    SpacecraftDesigner: <SpacecraftDesigner />,
    SpaceTourismDashboard: <SpaceTourismDashboard />,
    SpaceImageGallery: <SpaceImageGallery />,
    RocketEngineDatabase: <RocketEngineDatabase />,
  }), []);
}

// --- Sub-components ---

function SectionSkeleton() {
  return <div className="min-h-[300px] animate-pulse bg-white/5 rounded-xl" />;
}

function SpaceDivider() {
  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 via-violet-500/5 to-transparent" />
      <div className="relative h-1 w-1 rounded-full bg-cyan-400/40" style={{ boxShadow: '0 0 8px rgba(6,182,212,0.15)' }} />
    </div>
  );
}

function PageSectionRenderer({ pageId, componentMap }: { pageId: string; componentMap: Record<string, React.ReactNode> }) {
  const group = PAGE_GROUPS.find((g) => g.id === pageId);
  if (!group) return null;

  return (
    <motion.div
      key={pageId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-0"
    >
      {group.sections.map((section, idx) => (
        <div key={section.id}>
          {idx > 0 && <SpaceDivider />}
          <div id={section.id} className="scroll-mt-20">
            {componentMap[section.componentKey] ?? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Component &quot;{section.componentKey}&quot; not found
              </div>
            )}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function Footer() {
  return (
    <footer className="footer-gradient-border mt-auto relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.02] pointer-events-none dark:opacity-[0.05]" style={{ backgroundImage: "url('https://sfile.chatglm.cn/images-ppt/662b7d93677e.jpg')" }} />
      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-orbitron text-gray-900 dark:text-white font-bold">Orbit<span className="text-gradient-cyan">Gate</span></span>
              <span className="text-gray-400 dark:text-gray-600 font-mono text-sm">v0.4</span>
            </div>
            <p className="text-xs text-gray-500 max-w-sm">
              Public Research Prototype — Deterministic Verification-Gate System
              for AI-Generated Orbital Claims
            </p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {PAGE_GROUPS.map((group) => (
              <span key={group.id} className="text-[10px] text-gray-400 bg-gray-100 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-full px-2.5 py-0.5">
                {group.label}
                <span className="text-gray-300 dark:text-gray-600 ml-1">{group.sections.length}</span>
              </span>
            ))}
          </div>
        </div>

        <SpaceDivider />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>
              Does not control spacecraft. Does not provide flight certification.
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Built with</span>
            {[
              { name: "Next.js", color: "text-gray-700 dark:text-white" },
              { name: "SGP4", color: "text-cyan-600 dark:text-cyan-400" },
              { name: "Tailwind CSS", color: "text-sky-600 dark:text-sky-400" },
              { name: "shadcn/ui", color: "text-gray-600 dark:text-gray-300" },
            ].map((tech) => (
              <span
                key={tech.name}
                className={`text-xs font-medium ${tech.color} bg-gray-100 dark:bg-slate-900/50 border border-gray-200/60 dark:border-white/[0.06] rounded-lg px-2.5 py-0.5 transition-all duration-300 hover:border-cyan-500/20 dark:hover:border-cyan-500/20`}
              >
                {tech.name}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-700">
          © 2026 OrbitGate Research Project
        </p>
        <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-1">
          Made with ☄️ for space safety
        </p>
      </div>
    </footer>
  );
}

// --- Main Page ---

export default function HomePage() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const currentPage = useOrbitGateStore((s) => s.currentPage);
  const componentMap = useComponentMap();

  // Global `?` key listener
  useEffect(() => {
    function handleQuestionMark(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable =
        (e.target as HTMLElement).isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT";
      if (isEditable) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleQuestionMark);
    return () => window.removeEventListener("keydown", handleQuestionMark);
  }, []);

  // Update document title based on current page
  useEffect(() => {
    const group = PAGE_GROUPS.find((g) => g.id === currentPage);
    if (group) {
      document.title = `${group.label} — OrbitGate v0.4`;
    }
  }, [currentPage]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundaryWrapper>
      <LiveFeedProvider>
      <div className="min-h-screen flex flex-col bg-background noise-overlay starfield">
        <div className="starfield-layer-3" />
        <NavHeader />
        <SystemStatusBar />
        <DotBar />

        <main className="flex-1 main-radial-bg pr-12 md:pr-14">
          {/* Hero only on dashboard page */}
          {currentPage === "dashboard" && <HeroSection />}

          {/* Page content */}
          <div className="max-w-6xl mx-auto px-4">
            <AnimatePresence mode="wait">
              <PageSectionRenderer
                pageId={currentPage}
                componentMap={componentMap}
              />
            </AnimatePresence>
          </div>

          <SpaceAssistant />
          <GateDetailDialog />
          <CommandPalette />
          <KeyboardShortcutsOverlay
            open={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />
        </main>
        <Footer />
        <GlobalStatsCounter />
      </div>
      </LiveFeedProvider>
      </ErrorBoundaryWrapper>
    </QueryClientProvider>
  );
}