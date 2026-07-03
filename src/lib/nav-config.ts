import {
  LayoutDashboard,
  ShieldCheck,
  Orbit,
  Radar,
  Rocket,
  Cpu,
  BookOpen,
  Palette,
  type LucideIcon,
} from "lucide-react";

export interface NavSection {
  id: string;
  label: string;
  componentKey: string;
}

export interface PageGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: NavSection[];
}

export const PAGE_GROUPS: PageGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    sections: [
      { id: "overview", label: "System Overview", componentKey: "SystemOverview" },
      { id: "gate-performance", label: "Gate Performance", componentKey: "GatePerformanceCards" },
      { id: "activity-feed", label: "Activity Feed", componentKey: "GateActivityFeed" },
    ],
  },
  {
    id: "verification",
    label: "Verification",
    icon: ShieldCheck,
    sections: [
      { id: "gate-rules", label: "Gate Rules", componentKey: "GateRulesReference" },
      { id: "claim-checker", label: "Claim Checker", componentKey: "ClaimChecker" },
      { id: "batch-verify", label: "Batch Verify", componentKey: "BatchClaimVerifier" },
      { id: "analytics", label: "Analytics", componentKey: "OrbitAnalyticsDashboard" },
      { id: "benchmarks", label: "Benchmarks", componentKey: "BenchmarkDashboard" },
      { id: "boundaries", label: "Boundaries", componentKey: "ClaimBoundaryExplorer" },
      { id: "certificate", label: "Certificate", componentKey: "CertificateDisplay" },
      { id: "evidence", label: "Evidence Replay", componentKey: "EvidenceReplaySection" },
      { id: "evidence-pack", label: "Evidence Pack", componentKey: "EvidencePackExplorer" },
      { id: "claim-history", label: "Claim History", componentKey: "ClaimHistoryPanel" },
      { id: "limitations", label: "Limitations", componentKey: "LimitationsSection" },
    ],
  },
  {
    id: "orbital",
    label: "Orbital",
    icon: Orbit,
    sections: [
      { id: "calculator", label: "Calculator", componentKey: "OrbitalCalculator" },
      { id: "mission-sim", label: "Mission Sim", componentKey: "MissionSimulator" },
      { id: "orbit-3d", label: "3D Orbits", componentKey: "OrbitVisualization3D" },
      { id: "tle-browser", label: "TLE Browser", componentKey: "TLEBrowser" },
      { id: "satellite-detail", label: "Satellite Detail", componentKey: "SatelliteDetailView" },
      { id: "sat-compare", label: "Satellite Compare", componentKey: "SatelliteComparison" },
      { id: "propagator", label: "Propagator", componentKey: "PropagationVisualizer" },
      { id: "conjunction", label: "Conjunction", componentKey: "ConjunctionAnalysis" },
    ],
  },
  {
    id: "tracking",
    label: "Tracking",
    icon: Radar,
    sections: [
      { id: "live-tracking", label: "Live Tracking", componentKey: "LiveTrackingDashboard" },
      { id: "telemetry", label: "Telemetry", componentKey: "TelemetryStream" },
      { id: "ground-stations", label: "Ground Stations", componentKey: "GroundStationTracker" },
      { id: "debris-tracker", label: "Debris", componentKey: "DebrisTracker" },
      { id: "asteroid-tracker", label: "Asteroids", componentKey: "AsteroidTracker" },
    ],
  },
  {
    id: "missions",
    label: "Missions",
    icon: Rocket,
    sections: [
      { id: "mission-timeline", label: "Timeline", componentKey: "MissionTimeline" },
      { id: "mission-control", label: "Mission Control", componentKey: "MissionControlDashboard" },
      { id: "mission-database", label: "Database", componentKey: "MissionDatabase" },
      { id: "mission-planner", label: "Planner", componentKey: "SpaceMissionPlanner" },
      { id: "launch-window", label: "Launch Window", componentKey: "LaunchWindowCalc" },
      { id: "reentry-predictor", label: "Reentry", componentKey: "ReentryPredictor" },
      { id: "constellation-designer", label: "Constellation", componentKey: "ConstellationDesigner" },
      { id: "mission-clock", label: "Mission Clock", componentKey: "MissionClock" },
    ],
  },
  {
    id: "systems",
    label: "Systems",
    icon: Cpu,
    sections: [
      { id: "power-system", label: "Power", componentKey: "PowerSystemDashboard" },
      { id: "thermal-model", label: "Thermal", componentKey: "ThermalModel" },
      { id: "comms-timeline", label: "Communications", componentKey: "CommsTimeline" },
      { id: "signal-viz", label: "Signal", componentKey: "SignalVisualizer" },
      { id: "attitude-control", label: "ADCS", componentKey: "AttitudeControlSim" },
      { id: "orbit-determination", label: "ODTS", componentKey: "OrbitDetermination" },
      { id: "health-monitor", label: "Health", componentKey: "SatelliteHealthMonitor" },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    icon: BookOpen,
    sections: [
      { id: "space-law", label: "Space Law", componentKey: "SpaceLawPanel" },
      { id: "space-weather", label: "Space Weather", componentKey: "SpaceWeatherPanel" },
      { id: "space-glossary", label: "Glossary", componentKey: "SpaceGlossary" },
      { id: "space-events", label: "Events", componentKey: "SpaceEventFeed" },
      { id: "api-playground", label: "API", componentKey: "APIPlayground" },
      { id: "export-center", label: "Export", componentKey: "ExportCenter" },
      { id: "orbital-quiz", label: "Quiz", componentKey: "OrbitalMechanicsQuiz" },
    ],
  },
  {
    id: "creative",
    label: "Creative",
    icon: Palette,
    sections: [
      { id: "spacecraft-designer", label: "Spacecraft", componentKey: "SpacecraftDesigner" },
      { id: "space-tourism", label: "Tourism", componentKey: "SpaceTourismDashboard" },
      { id: "space-gallery", label: "Gallery", componentKey: "SpaceImageGallery" },
      { id: "rocket-engines", label: "Engines", componentKey: "RocketEngineDatabase" },
    ],
  },
];

/** Get flat list of all section IDs (for backward compat) */
export function getAllSectionIds(): string[] {
  return PAGE_GROUPS.flatMap((g) => g.sections.map((s) => s.id));
}

/** Get flat NAV_ITEMS style array (for footer etc) */
export function getFlatNavItems(): { id: string; label: string; pageId: string }[] {
  return PAGE_GROUPS.flatMap((g) =>
    g.sections.map((s) => ({ id: s.id, label: s.label, pageId: g.id }))
  );
}

/** Find which page a section belongs to */
export function findPageForSection(sectionId: string): string | undefined {
  return PAGE_GROUPS.find((g) => g.sections.some((s) => s.id === sectionId))?.id;
}