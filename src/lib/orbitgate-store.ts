import { create } from "zustand";
import type {
  ClaimResult,
  BenchmarkCase,
  Certificate,
} from "@/lib/orbitgate-constants";
import { findPageForSection } from "@/lib/nav-config";

// Phase 2 Types
export interface TLEEntry {
  name: string;
  line1: string;
  line2: string;
  norad_id: string;
  source: string;
  fetched_at: string;
  epoch: string;
}

export interface PropagationPoint {
  t_min: number;
  altitude_km: number;
  latitude_deg: number;
  longitude_deg: number;
  speed_kms: number;
}

export interface OrbitalElements {
  inclination_deg: number;
  eccentricity: number;
  raan_deg: number;
  arg_perigee_deg: number;
  mean_anomaly_deg: number;
  mean_motion_rev_per_day: number;
  b_star: number;
  period_min: number;
  regime: string;
}

export interface PropagationSummary {
  altitude_min_km: number;
  altitude_max_km: number;
  altitude_mean_km: number;
  altitude_range_km: number;
  speed_min_kms: number;
  speed_max_kms: number;
  speed_mean_kms: number;
  orbital_elements: OrbitalElements;
  period_estimated_min: number;
  regime: string;
}

export interface PropagationResult {
  norad_id: string;
  satellite_name: string;
  tle_source: string;
  tle_epoch: string;
  num_points: number;
  points: PropagationPoint[];
  summary: PropagationSummary;
  propagation_hash: string;
  errors: string[];
  sgp4_available: boolean;
}

export interface EvidencePackEntry {
  name: string;
  line1: string;
  line2: string;
  norad_id: string;
  source: string;
  epoch: string;
  tle_validation?: Record<string, unknown>;
  propagation_summary?: {
    altitude_range_km: number;
    regime: string;
    [key: string]: unknown;
  };
  gate_result?: {
    decision: string;
    gate: string;
    reason: string;
    [key: string]: unknown;
  };
}

export interface EvidencePack {
  pack_hash: string;
  timestamp: string;
  num_entries: number;
  sgp4_status: string;
  entries: EvidencePackEntry[];
}

export interface ComparisonResult {
  name: string;
  norad_id: string;
  data: PropagationResult;
  color: string;
}

// Mission Simulation
export type MissionPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface MissionClaim {
  id: string;
  text: string;
  expectedGate?: string;
  expectedDecision?: string;
  priority: MissionPriority;
}

export interface MissionResult {
  step: number;
  claim: string;
  gate: string;
  decision: string;
  risk_label: string;
  reason: string;
  duration_ms: number;
}

export interface MissionState {
  name: string;
  description: string;
  claims: MissionClaim[];
  results: MissionResult[];
  currentStep: number; // 1=builder, 2=runner, 3=report
  isRunning: boolean;
  startTime: number;
}

// Notifications
export interface AppNotification {
  id: string;
  type: "verification" | "system" | "telemetry" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: string; // lucide icon name
}

// Telemetry
export interface TelemetryPoint {
  timestamp: string;
  altitude: number;
  velocity: number;
  temperature: number;
  power: number;
  signal: number;
  battery: number;
}

interface OrbitGateState {
  // Claim checker
  claimInput: string;
  setClaimInput: (input: string) => void;
  claimResult: ClaimResult | null;
  setClaimResult: (result: ClaimResult | null) => void;
  isCheckingClaim: boolean;
  setIsCheckingClaim: (checking: boolean) => void;

  // Benchmark
  benchmarkCases: BenchmarkCase[];
  setBenchmarkCases: (cases: BenchmarkCase[]) => void;
  benchmarkFilter: string;
  setBenchmarkFilter: (filter: string) => void;
  isRunningBenchmark: boolean;
  setIsRunningBenchmark: (running: boolean) => void;

  // Certificate
  certificate: Certificate | null;
  setCertificate: (cert: Certificate | null) => void;

  // Active section for scroll nav
  activeSection: string;
  setActiveSection: (section: string) => void;

  // Page navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;
  navigateToSection: (sectionId: string) => void;

  // Phase 2: TLE Browser
  selectedTLE: TLEEntry | null;
  setSelectedTLE: (tle: TLEEntry | null) => void;
  tleEntries: TLEEntry[];
  setTLEEntries: (entries: TLEEntry[]) => void;
  isFetchingTLE: boolean;
  setIsFetchingTLE: (fetching: boolean) => void;

  // Phase 2: Propagation Visualizer
  propagationResult: PropagationResult | null;
  setPropagationResult: (result: PropagationResult | null) => void;
  propagationSettings: { duration_min: number; step_min: number };
  setPropagationSettings: (settings: { duration_min: number; step_min: number }) => void;
  isPropagating: boolean;
  setIsPropagating: (propagating: boolean) => void;

  // Phase 2: Evidence Pack
  evidencePack: EvidencePack | null;
  setEvidencePack: (pack: EvidencePack | null) => void;
  isGeneratingPack: boolean;
  setIsGeneratingPack: (generating: boolean) => void;

  // Phase 3: Comparison Mode
  comparisonMode: boolean;
  setComparisonMode: (mode: boolean) => void;
  comparisonSatellites: TLEEntry[];
  setComparisonSatellites: (sats: TLEEntry[]) => void;
  comparisonResults: ComparisonResult[];
  setComparisonResults: (results: ComparisonResult[]) => void;
  addToComparison: (entry: TLEEntry) => void;
  removeFromComparison: (noradId: string) => void;
  clearComparison: () => void;

  // Telemetry Stream
  telemetryData: TelemetryPoint[];
  setTelemetryData: (data: TelemetryPoint[]) => void;
  telemetrySatellite: string;
  setTelemetrySatellite: (sat: string) => void;
  telemetryStreaming: boolean;
  setTelemetryStreaming: (streaming: boolean) => void;

  // WebSocket Live Feed
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  wsConnectedClients: number;
  setWsConnectedClients: (count: number) => void;

  // Gate Detail Dialog
  selectedGateForDetail: string | null;
  setSelectedGateForDetail: (gateId: string | null) => void;

  // Claim History
  claimHistory: Array<{
    id: string;
    claim: string;
    decision: string;
    gate: string;
    risk_label: string;
    reason: string;
    evidence: string[];
    missing_evidence: string[];
    timestamp: string;
  }>;
  setClaimHistory: (history: Array<{
    id: string;
    claim: string;
    decision: string;
    gate: string;
    risk_label: string;
    reason: string;
    evidence: string[];
    missing_evidence: string[];
    timestamp: string;
  }>) => void;
  mergeHistoryEntries: (entries: Array<{
    id: string;
    claim: string;
    decision: string;
    gate: string;
    risk_label: string;
    reason: string;
    evidence: string[];
    missing_evidence: string[];
    timestamp: string;
  }>) => void;

  // Mission Simulation
  missionState: MissionState;
  setMissionState: (state: MissionState) => void;
  addMissionClaim: (claim: MissionClaim) => void;
  removeMissionClaim: (id: string) => void;
  reorderMissionClaims: (fromIndex: number, toIndex: number) => void;
  resetMission: () => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

// localStorage persistence for claim history
const HISTORY_KEY = "orbitgate-claim-history";
const MAX_PERSISTED_HISTORY = 100;

export const useOrbitGateStore = create<OrbitGateState>((set) => ({
  claimInput: "",
  setClaimInput: (input) => set({ claimInput: input }),
  claimResult: null,
  setClaimResult: (result) => set({ claimResult: result }),
  isCheckingClaim: false,
  setIsCheckingClaim: (checking) => set({ isCheckingClaim: checking }),

  benchmarkCases: [],
  setBenchmarkCases: (cases) => set({ benchmarkCases: cases }),
  benchmarkFilter: "all",
  setBenchmarkFilter: (filter) => set({ benchmarkFilter: filter }),
  isRunningBenchmark: false,
  setIsRunningBenchmark: (running) => set({ isRunningBenchmark: running }),

  certificate: null,
  setCertificate: (cert) => set({ certificate: cert }),

  activeSection: "hero",
  setActiveSection: (section) => set({ activeSection: section }),

  // Page navigation
  currentPage: "dashboard",
  setCurrentPage: (page) => {
    set({ currentPage: page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
  navigateToSection: (sectionId) => {
    const pageId = findPageForSection(sectionId);
    if (pageId) {
      set({ currentPage: pageId });
      // Scroll to section after a tick so the page renders first
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  },

  // Phase 2 defaults
  selectedTLE: null,
  setSelectedTLE: (tle) => set({ selectedTLE: tle }),
  tleEntries: [],
  setTLEEntries: (entries) => set({ tleEntries: entries }),
  isFetchingTLE: false,
  setIsFetchingTLE: (fetching) => set({ isFetchingTLE: fetching }),

  propagationResult: null,
  setPropagationResult: (result) => set({ propagationResult: result }),
  propagationSettings: { duration_min: 100, step_min: 1 },
  setPropagationSettings: (settings) => set({ propagationSettings: settings }),
  isPropagating: false,
  setIsPropagating: (propagating) => set({ isPropagating: propagating }),

  evidencePack: null,
  setEvidencePack: (pack) => set({ evidencePack: pack }),
  isGeneratingPack: false,
  setIsGeneratingPack: (generating) => set({ isGeneratingPack: generating }),

  // Phase 3: Comparison defaults
  comparisonMode: false,
  setComparisonMode: (mode) => set({ comparisonMode: mode, comparisonResults: [] }),
  comparisonSatellites: [],
  setComparisonSatellites: (sats) => set({ comparisonSatellites: sats }),
  comparisonResults: [],
  setComparisonResults: (results) => set({ comparisonResults: results }),
  addToComparison: (entry) =>
    set((state) => {
      if (state.comparisonSatellites.length >= 4) return state;
      if (state.comparisonSatellites.some((s) => s.norad_id === entry.norad_id)) return state;
      return { comparisonSatellites: [...state.comparisonSatellites, entry] };
    }),
  removeFromComparison: (noradId) =>
    set((state) => ({
      comparisonSatellites: state.comparisonSatellites.filter((s) => s.norad_id !== noradId),
      comparisonResults: state.comparisonResults.filter((r) => r.norad_id !== noradId),
    })),
  clearComparison: () =>
    set({ comparisonSatellites: [], comparisonResults: [] }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
  wsConnectedClients: 0,
  setWsConnectedClients: (count) => set({ wsConnectedClients: count }),

  selectedGateForDetail: null,
  setSelectedGateForDetail: (gateId) => set({ selectedGateForDetail: gateId }),

  // Telemetry defaults
  telemetryData: [],
  setTelemetryData: (data) => set({ telemetryData: data }),
  telemetrySatellite: "ISS (25544)",
  setTelemetrySatellite: (sat) => set({ telemetrySatellite: sat }),
  telemetryStreaming: true,
  setTelemetryStreaming: (streaming) => set({ telemetryStreaming: streaming }),

  claimHistory: [],
  setClaimHistory: (history) => {
    set({ claimHistory: history });
    // Persist to localStorage (client-side only)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_PERSISTED_HISTORY)));
      } catch {
        // localStorage full or unavailable
      }
    }
  },
  mergeHistoryEntries: (entries) =>
    set((state) => {
      const existingIds = new Set(state.claimHistory.map((e) => e.id));
      const newEntries = entries.filter((e) => !existingIds.has(e.id));
      if (newEntries.length === 0) return state;
      const merged = [...newEntries, ...state.claimHistory].slice(0, MAX_PERSISTED_HISTORY);
      // Persist to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
        } catch {
          // localStorage full or unavailable
        }
      }
      return { claimHistory: merged };
    }),

  // Mission Simulation
  missionState: {
    name: "",
    description: "",
    claims: [],
    results: [],
    currentStep: 1,
    isRunning: false,
    startTime: 0,
  },
  setMissionState: (state) => set({ missionState: state }),
  addMissionClaim: (claim) =>
    set((state) => ({
      missionState: {
        ...state.missionState,
        claims: [...state.missionState.claims, claim],
      },
    })),
  removeMissionClaim: (id) =>
    set((state) => ({
      missionState: {
        ...state.missionState,
        claims: state.missionState.claims.filter((c) => c.id !== id),
      },
    })),
  reorderMissionClaims: (fromIndex, toIndex) =>
    set((state) => {
      const claims = [...state.missionState.claims];
      const [moved] = claims.splice(fromIndex, 1);
      claims.splice(toIndex, 0, moved);
      return { missionState: { ...state.missionState, claims } };
    }),
  resetMission: () =>
    set({
      missionState: {
        name: "",
        description: "",
        claims: [],
        results: [],
        currentStep: 1,
        isRunning: false,
        startTime: 0,
      },
    }),

  // Notifications
  notifications: [],
  addNotification: (notification) =>
    set((state) => {
      const now = Date.now();
      // Auto-cleanup: remove read ones older than 30 minutes
      const thirtyMinAgo = now - 30 * 60 * 1000;
      const cleaned = state.notifications.filter(
        (n) => !(n.read && new Date(n.timestamp).getTime() < thirtyMinAgo)
      );
      const newNotif: AppNotification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updated = [newNotif, ...cleaned].slice(0, 50);
      return { notifications: updated };
    }),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));

// Hydrate claim history from localStorage after mount
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        useOrbitGateStore.setState({ claimHistory: parsed.slice(0, MAX_PERSISTED_HISTORY) });
      }
    }
  } catch {
    // ignore
  }
}