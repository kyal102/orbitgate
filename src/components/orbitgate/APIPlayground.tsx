"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "./SectionHeader";
import { Terminal, Send, Copy, Check, RotateCcw, History, ChevronRight, Loader2, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST";

interface EndpointDef {
  method: HttpMethod;
  url: string;
  label: string;
  exampleBody: string;
  mockResponse: Record<string, unknown>;
  mockStatus: number;
}

interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  body: string;
  status: number;
  duration: number;
  timestamp: number;
  response: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint Definitions
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINTS: EndpointDef[] = [
  {
    method: "GET",
    url: "/api/orbitgate/status",
    label: "System Status",
    exampleBody: "",
    mockResponse: {
      status: "operational",
      version: "0.2.0",
      uptime_seconds: 48293,
      active_gates: 7,
      satellites_tracked: 14832,
      last_check: "2026-06-27T04:35:00.000Z",
      sgp4_engine: "ready",
      database: "connected",
      queue_depth: 3,
    },
    mockStatus: 200,
  },
  {
    method: "POST",
    url: "/api/orbitgate/check-claim",
    label: "Check Claim",
    exampleBody: JSON.stringify(
      {
        satellite_id: "NORAD 25544",
        claim: "ISS is currently over the Pacific Ocean at 42.3°N, 175.2°W, altitude 418.2 km",
        claim_type: "POSITION",
        claimed_at: "2026-06-27T04:30:00.000Z",
      },
      null,
      2
    ),
    mockResponse: {
      decision: "ALLOW",
      confidence: 0.94,
      gates: [
        { name: "TLE Freshness", status: "PASS", detail: "TLE updated 2.1h ago" },
        { name: "Temporal Bounds", status: "PASS", detail: "Within propagation window" },
        { name: "Orbit Feasibility", status: "PASS", detail: "Claimed position within 12 km of propagated" },
        { name: "Cross-Source", status: "PASS", detail: "Space-Track agrees within tolerance" },
      ],
      risk_score: 0.03,
    },
    mockStatus: 200,
  },
  {
    method: "GET",
    url: "/api/orbitgate/fetch-tle",
    label: "Fetch TLE Catalog",
    exampleBody: "",
    mockResponse: {
      satellites: [
        {
          norad_id: 25544,
          name: "ISS (ZARYA)",
          tle_line1: "1 25544U 98067A   26178.50000000  .00016717  00000+0  30186-3 0  9993",
          tle_line2: "2 25544  51.6400 208.9163 0006703  40.5932 319.5729 15.50201996456784",
          epoch: "2026-06-27T12:00:00.000Z",
          age_hours: 2.1,
        },
        {
          norad_id: 48274,
          name: "STARLINK-1007",
          tle_line1: "1 48274U 21027A   26178.50000000  .00001000  00000+0  14506-3 0  9995",
          tle_line2: "2 48274  53.0540 120.3840 0001400  90.0000 270.0000 15.06000000100005",
          epoch: "2026-06-27T12:00:00.000Z",
          age_hours: 4.5,
        },
      ],
      total: 14832,
      fetched_at: "2026-06-27T04:35:00.000Z",
    },
    mockStatus: 200,
  },
  {
    method: "POST",
    url: "/api/orbitgate/propagate",
    label: "Propagate Orbit",
    exampleBody: JSON.stringify(
      {
        satellite_id: "NORAD 25544",
        tle_line1: "1 25544U 98067A   26178.50000000  .00016717  00000+0  30186-3 0  9993",
        tle_line2: "2 25544  51.6400 208.9163 0006703  40.5932 319.5729 15.50201996456784",
        target_time: "2026-06-27T06:00:00.000Z",
      },
      null,
      2
    ),
    mockResponse: {
      satellite_id: "NORAD 25544",
      propagated_position: {
        latitude: 38.8721,
        longitude: -77.0169,
        altitude_km: 418.3,
        velocity_kms: 7.662,
      },
      propagation_time: "2026-06-27T06:00:00.000Z",
      computation_ms: 2.4,
      engine: "SGP4",
    },
    mockStatus: 200,
  },
  {
    method: "POST",
    url: "/api/orbitgate/evidence-pack",
    label: "Evidence Pack",
    exampleBody: JSON.stringify(
      {
        claim_id: "clm_7f3a2b1c",
        format: "json",
        include_raw_tle: true,
        include_propagation: true,
      },
      null,
      2
    ),
    mockResponse: {
      pack_id: "epk_a1b2c3d4",
      claim_id: "clm_7f3a2b1c",
      created_at: "2026-06-27T04:35:12.000Z",
      evidence: [
        { type: "TLE_SOURCE", source: "CelesTrak", retrieved_at: "2026-06-27T04:30:00.000Z" },
        { type: "PROPAGATION_OUTPUT", engine: "SGP4", compute_ms: 2.4 },
        { type: "GATE_DECISION", decision: "ALLOW", confidence: 0.94 },
      ],
      hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      size_bytes: 4096,
    },
    mockStatus: 200,
  },
  {
    method: "GET",
    url: "/api/orbitgate/telemetry",
    label: "Telemetry Stream",
    exampleBody: "",
    mockResponse: {
      stream_active: true,
      satellites_online: 147,
      packets_received_last_hour: 18429,
      average_snr_db: 12.4,
      ground_stations: [
        { name: "McMurdo", status: "online", packets: 4821 },
        { name: "Svalbard", status: "online", packets: 6293 },
        { name: "Wallops", status: "degraded", packets: 2103 },
      ],
    },
    mockStatus: 200,
  },
  {
    method: "POST",
    url: "/api/orbitgate/export-report",
    label: "Export Report",
    exampleBody: JSON.stringify(
      {
        claim_ids: ["clm_7f3a2b1c", "clm_9d8e7f6a"],
        format: "json",
        include_evidence: true,
      },
      null,
      2
    ),
    mockResponse: {
      report_id: "rpt_x1y2z3w4",
      claims_included: 2,
      format: "json",
      generated_at: "2026-06-27T04:36:00.000Z",
      download_url: "/api/orbitgate/reports/rpt_x1y2z3w4.json",
      summary: {
        total_allow: 1,
        total_block: 0,
        total_needs_review: 1,
        avg_confidence: 0.87,
      },
    },
    mockStatus: 200,
  },
  {
    method: "GET",
    url: "/api/orbitgate/verification-history",
    label: "Verification History",
    exampleBody: "",
    mockResponse: {
      entries: [
        { id: "h1", claim: "ISS over Pacific", decision: "ALLOW", confidence: 0.94, time: "2026-06-27T04:30:00.000Z" },
        { id: "h2", claim: "Starlink-1007 reentry", decision: "BLOCK", confidence: 0.98, time: "2026-06-27T04:25:00.000Z" },
        { id: "h3", claim: "Hubble altitude 535 km", decision: "NEEDS_REVIEW", confidence: 0.62, time: "2026-06-27T04:20:00.000Z" },
      ],
      total: 12847,
      page: 1,
      per_page: 10,
    },
    mockStatus: 200,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Quick-Fill Templates
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_TEMPLATES: { label: string; endpointIndex: number; overrideBody?: string }[] = [
  { label: "ISS Status", endpointIndex: 0 },
  {
    label: "Verify Orbit Claim",
    endpointIndex: 1,
    overrideBody: JSON.stringify(
      {
        satellite_id: "NORAD 25544",
        claim: "ISS is passing over the Eastern Seaboard at 38.9°N, 77.0°W, altitude 418 km",
        claim_type: "POSITION",
        claimed_at: "2026-06-27T04:35:00.000Z",
      },
      null,
      2
    ),
  },
  { label: "Fetch TLE Catalog", endpointIndex: 2 },
  {
    label: "Propagate ISS Orbit",
    endpointIndex: 3,
    overrideBody: JSON.stringify(
      {
        satellite_id: "NORAD 25544",
        tle_line1: "1 25544U 98067A   26178.50000000  .00016717  00000+0  30186-3 0  9993",
        tle_line2: "2 25544  51.6400 208.9163 0006703  40.5932 319.5729 15.50201996456784",
        target_time: "2026-06-27T06:30:00.000Z",
      },
      null,
      2
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// JSON Syntax Highlighter
// ─────────────────────────────────────────────────────────────────────────────

function highlightJson(json: string): React.ReactNode {
  try {
    const parsed = JSON.parse(json);
    const formatted = JSON.stringify(parsed, null, 2);
    const parts: React.ReactNode[] = [];
    let i = 0;
    const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(formatted)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`t-${i++}`} className="text-gray-400">
            {formatted.slice(lastIndex, match.index)}
          </span>
        );
      }
      if (match[1] !== undefined) {
        // Key
        parts.push(
          <span key={`k-${i++}`} className="text-cyan-400">
            {match[1]}
          </span>
        );
      } else if (match[2] !== undefined) {
        // String value
        parts.push(
          <span key={`s-${i++}`} className="text-amber-300">
            {match[2]}
          </span>
        );
      } else if (match[3] !== undefined) {
        // Boolean / null
        parts.push(
          <span key={`b-${i++}`} className="text-purple-400">
            {match[3]}
          </span>
        );
      } else if (match[4] !== undefined) {
        // Number
        parts.push(
          <span key={`n-${i++}`} className="text-sky-400">
            {match[4]}
          </span>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < formatted.length) {
      parts.push(
        <span key={`t-${i++}`} className="text-gray-400">
          {formatted.slice(lastIndex)}
        </span>
      );
    }
    return parts;
  } catch {
    return <span className="text-red-400">{json}</span>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Method Badge
// ─────────────────────────────────────────────────────────────────────────────

function MethodBadge({ method, size = "sm" }: { method: HttpMethod; size?: "sm" | "md" }) {
  const isGet = method === "GET";
  const base = isGet
    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    : "bg-amber-500/20 text-amber-400 border-amber-500/30";
  const sz = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1 font-bold";
  return (
    <span className={`inline-flex items-center rounded-md border font-mono font-bold ${base} ${sz}`}>
      {method}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  let color: string;
  if (status >= 200 && status < 300) {
    color = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
  } else if (status >= 400 && status < 500) {
    color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
  } else {
    color = "bg-red-500/20 text-red-400 border-red-500/30";
  }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-bold ${color}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function APIPlayground() {
  // ── State ──
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [requestUrl, setRequestUrl] = useState(ENDPOINTS[0].url);
  const [requestBody, setRequestBody] = useState(ENDPOINTS[0].exampleBody);
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const responseRef = useRef<HTMLPreElement>(null);
  const historyIdRef = useRef(0);

  // ── Select Endpoint ──
  const handleSelectEndpoint = useCallback((ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setRequestUrl(ep.url);
    setRequestBody(ep.exampleBody);
  }, []);

  // ── Quick Template ──
  const handleQuickTemplate = useCallback(
    (template: (typeof QUICK_TEMPLATES)[number]) => {
      const ep = ENDPOINTS[template.endpointIndex];
      handleSelectEndpoint(ep);
      if (template.overrideBody) {
        setRequestBody(template.overrideBody);
      }
    },
    [handleSelectEndpoint]
  );

  // ── Send Request ──
  const handleSend = useCallback(async () => {
    setLoading(true);
    setResponseText("");
    setResponseStatus(null);
    setResponseTime(null);

    const startTime = performance.now();

    // Simulate network delay (200–500ms)
    const delay = 200 + Math.random() * 300;

    try {
      await new Promise((resolve) => setTimeout(resolve, delay));

      const ep = ENDPOINTS.find(
        (e) => e.url === requestUrl
      );

      let status: number;
      let body: string;

      if (ep) {
        status = ep.mockStatus;
        body = JSON.stringify(ep.mockResponse, null, 2);
      } else {
        status = 404;
        body = JSON.stringify({ error: "Endpoint not found", url: requestUrl }, null, 2);
      }

      const elapsed = Math.round(performance.now() - startTime);

      setResponseStatus(status);
      setResponseTime(elapsed);
      setResponseText(body);

      // Add to history
      const entry: HistoryEntry = {
        id: `hist_${++historyIdRef.current}`,
        method: selectedEndpoint.method,
        url: requestUrl,
        body: requestBody,
        status,
        duration: elapsed,
        timestamp: Date.now(),
        response: body,
      };
      setHistory((prev) => [entry, ...prev].slice(0, 10));
    } catch {
      const elapsed = Math.round(performance.now() - startTime);
      setResponseStatus(500);
      setResponseTime(elapsed);
      setResponseText(JSON.stringify({ error: "Request failed", message: "Network or parsing error" }, null, 2));
    } finally {
      setLoading(false);
    }
  }, [requestUrl, requestBody, selectedEndpoint.method]);

  // ── Replay from History ──
  const handleReplay = useCallback(
    (entry: HistoryEntry) => {
      const ep = ENDPOINTS.find((e) => e.url === entry.url);
      if (ep) {
        handleSelectEndpoint(ep);
        setRequestBody(entry.body);
      } else {
        setRequestUrl(entry.url);
        setRequestBody(entry.body);
      }
    },
    [handleSelectEndpoint]
  );

  // ── Clear History ──
  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // ── Copy Response ──
  const handleCopy = useCallback(async () => {
    if (!responseText) return;
    try {
      await navigator.clipboard.writeText(responseText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = responseText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [responseText]);

  // ── Scroll response into view ──
  useEffect(() => {
    if (responseText && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [responseText]);

  // ── Derived ──
  const isGet = selectedEndpoint.method === "GET";

  // ── JSX Variables ──
  const endpointListItems = ENDPOINTS.map((ep) => {
    const isActive = ep.url === selectedEndpoint.url;
    return (
      <button
        key={ep.url}
        onClick={() => handleSelectEndpoint(ep)}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left transition-all duration-200 group ${
          isActive
            ? "bg-cyan-500/10 border border-cyan-500/30"
            : "hover:bg-white/5 border border-transparent"
        }`}
      >
        <MethodBadge method={ep.method} />
        <span
          className={`text-xs font-mono truncate flex-1 ${
            isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
          }`}
        >
          {ep.url}
        </span>
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${
            isActive ? "text-cyan-400 rotate-90" : "text-gray-600"
          }`}
        />
      </button>
    );
  });

  const quickTemplateButtons = QUICK_TEMPLATES.map((t) => (
    <Button
      key={t.label}
      variant="outline"
      size="sm"
      onClick={() => handleQuickTemplate(t)}
      className="bg-white/5 border-slate-700/60 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-400 text-gray-300 text-xs font-mono transition-all duration-200"
    >
      <Zap className="h-3 w-3 mr-1.5" />
      {t.label}
    </Button>
  ));

  const historyListItems = history.map((entry) => (
    <button
      key={entry.id}
      onClick={() => handleReplay(entry)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-slate-700/50 transition-all duration-200 group"
    >
      <div className="flex items-center gap-2 mb-1">
        <MethodBadge method={entry.method} />
        <span className="text-[10px] font-mono text-gray-500 truncate flex-1">{entry.url}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={entry.status} />
        <span className="text-[10px] text-gray-500 font-mono">{entry.duration}ms</span>
        <span className="text-[10px] text-gray-600 font-mono ml-auto">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </button>
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <section id="api-playground" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="API Playground"
          subtitle="Test OrbitGate verification endpoints with a live request builder"
          icon={<Terminal className="h-6 w-6 text-cyan-400" />}
          sectionNumber="§32"
        />

        {/* Quick Template Buttons */}
        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          {quickTemplateButtons}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ── Left Column: Endpoint List + History ── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Endpoint Selector */}
            <div className="glass-card rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white font-mono">Endpoints</h3>
              </div>
              <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                {endpointListItems}
              </div>
            </div>

            {/* History Sidebar */}
            <div className="glass-card rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <button
                  onClick={() => setShowHistory((p) => !p)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <History className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white font-mono">History</h3>
                  {history.length > 0 && (
                    <span className="text-[10px] font-mono text-gray-500 bg-slate-800 rounded-full px-1.5 py-0.5">
                      {history.length}
                    </span>
                  )}
                </button>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="Clear history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {history.length === 0 ? (
                        <p className="text-[11px] text-gray-600 text-center py-4 font-mono">
                          No requests yet
                        </p>
                      ) : (
                        historyListItems
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right Column: Request + Response ── */}
          <div className="lg:col-span-9 space-y-4">
            {/* Request Builder */}
            <div className="glass-card rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white font-mono">Request Builder</h3>
                <div className="flex items-center gap-2">
                  <MethodBadge method={selectedEndpoint.method} size="md" />
                  <span className="text-[10px] text-gray-500 font-mono">{selectedEndpoint.label}</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* URL Bar */}
                <div className="flex items-stretch gap-2">
                  <div className="flex items-center px-3 rounded-lg bg-black/40 border border-slate-700/60 shrink-0">
                    <MethodBadge method={selectedEndpoint.method} />
                  </div>
                  <input
                    type="text"
                    value={requestUrl}
                    onChange={(e) => setRequestUrl(e.target.value)}
                    className="flex-1 bg-black/40 border border-slate-700/60 rounded-lg px-3 py-2 text-sm font-mono text-cyan-400 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    placeholder="/api/orbitgate/..."
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading}
                    className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm px-4 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" />
                        Send
                      </>
                    )}
                  </Button>
                </div>

                {/* Body Editor (POST only) */}
                {!isGet && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                        Request Body (JSON)
                      </label>
                      <button
                        onClick={() => setRequestBody(selectedEndpoint.exampleBody)}
                        className="text-[10px] text-gray-500 hover:text-cyan-400 transition-colors font-mono flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    </div>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={8}
                      className="w-full bg-black/40 border border-slate-700/60 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all resize-y custom-scrollbar"
                      spellCheck={false}
                    />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Response Panel */}
            <div className="glass-card rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white font-mono">Response</h3>
                <div className="flex items-center gap-3">
                  {responseStatus !== null && (
                    <>
                      <StatusBadge status={responseStatus} />
                      {responseTime !== null && (
                        <span className="text-[11px] font-mono text-gray-500">
                          {responseTime}ms
                        </span>
                      )}
                    </>
                  )}
                  {responseText && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-cyan-400 transition-colors font-mono"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                      <span className="text-xs text-gray-500 font-mono">Sending request...</span>
                    </div>
                  </div>
                ) : responseText ? (
                  <pre
                    ref={responseRef}
                    className="bg-black/40 border border-slate-700/40 rounded-lg p-4 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar leading-relaxed"
                  >
                    {highlightJson(responseText)}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Terminal className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                      <p className="text-xs text-gray-600 font-mono">
                        Select an endpoint and click Send to see the response
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}