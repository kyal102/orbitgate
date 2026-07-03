"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plane,
  Users,
  Rocket,
  Clock,
  Globe,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  Activity,
  Zap,
  DollarSign,
  Mountain,
  Timer,
  GraduationCap,
  Gauge,
  Sparkles,
  CheckCircle2,
  Stethoscope,
  Dumbbell,
  Calendar,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CounterCard {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  trend: "up" | "down";
  trendValue: string;
}

interface Provider {
  company: string;
  vehicle: string;
  altitude: string;
  duration: string;
  price: string;
  status: "Active" | "In Development" | "Planned" | "Suspended";
  flights: number;
  description: string;
}

interface ComparisonFeature {
  icon: React.ReactNode;
  label: string;
  suborbital: string;
  orbital: string;
}

interface FunnelStep {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  timeline: string;
}

interface PricePoint {
  year: number;
  price: number;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COUNTER_CARDS: CounterCard[] = [
  {
    icon: <Users className="h-5 w-5" />,
    value: 24,
    label: "Total Space Tourists",
    trend: "up",
    trendValue: "+6 this year",
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    value: 12,
    label: "Total Flights",
    trend: "up",
    trendValue: "+3 this year",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    value: 67,
    suffix: " days",
    label: "Cumulative Days in Space",
    trend: "up",
    trendValue: "+18 days",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    value: 16,
    label: "Countries Represented",
    trend: "up",
    trendValue: "+4 new",
  },
];

const PROVIDERS: Provider[] = [
  {
    company: "SpaceX",
    vehicle: "Dragon / Starship",
    altitude: "200–1,200 km",
    duration: "3–10 days",
    price: "$55M",
    status: "Active",
    flights: 8,
    description: "Orbital missions to ISS and free-flyer orbits. Crew Dragon operational, Starship in testing for point-to-point tourism.",
  },
  {
    company: "Blue Origin",
    vehicle: "New Shepard",
    altitude: "107 km",
    duration: "11 min",
    price: "$250K–$1.25M",
    status: "Active",
    flights: 26,
    description: "Suborbital vertical-takeoff experience with 3–4 min of weightlessness. Capsule carries 6 passengers.",
  },
  {
    company: "Virgin Galactic",
    vehicle: "VSS Unity",
    altitude: "86 km",
    duration: "90 min total",
    price: "$450K",
    status: "Suspended",
    flights: 7,
    description: "Air-launched suborbital spaceplane. Experienced a flight anomaly in 2024, operations paused.",
  },
  {
    company: "Axiom Space",
    vehicle: "Crew Dragon (charter)",
    altitude: "408 km (ISS)",
    duration: "8–17 days",
    price: "$50M–$55M",
    status: "Active",
    flights: 4,
    description: "Leases Dragon capsules for private missions to ISS. Full orbital experience with professional crew.",
  },
  {
    company: "Space Adventures",
    vehicle: "Soyuz / Dragon",
    altitude: "400 km",
    duration: "8–12 days",
    price: "$20M–$50M",
    status: "Planned",
    flights: 9,
    description: "Pioneered orbital tourism via Soyuz. Currently arranging lunar flyby missions and future Dragon charters.",
  },
  {
    company: "Boeing",
    vehicle: "Starliner",
    altitude: "408 km (ISS)",
    duration: "7–14 days",
    price: "TBD",
    status: "In Development",
    flights: 0,
    description: "Crew capsule still completing certification. Future tourism potential once operational flights resume.",
  },
];

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "In Development": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Planned: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Suspended: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    icon: <Mountain className="h-4 w-4" />,
    label: "Altitude",
    suborbital: "80–110 km",
    orbital: "200–420 km",
  },
  {
    icon: <Timer className="h-4 w-4" />,
    label: "Duration",
    suborbital: "3–11 min",
    orbital: "3–17 days",
  },
  {
    icon: <GraduationCap className="h-4 w-4" />,
    label: "Training Required",
    suborbital: "1–3 days",
    orbital: "3–6 months",
  },
  {
    icon: <DollarSign className="h-4 w-4" />,
    label: "Cost Range",
    suborbital: "$250K–$1.25M",
    orbital: "$20M–$55M",
  },
  {
    icon: <Gauge className="h-4 w-4" />,
    label: "G-Force",
    suborbital: "Up to 3–6 G",
    orbital: "Up to 3–4 G",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    label: "Experience",
    suborbital: "Weightlessness, Earth view",
    orbital: "Days in space, ISS docking",
  },
];

const FUNNEL_STEPS: FunnelStep[] = [
  {
    step: 1,
    icon: <Rocket className="h-5 w-5" />,
    title: "Select Mission",
    description: "Choose your flight profile — suborbital joyride, orbital ISS visit, or lunar flyby. Compare providers, dates, and pricing.",
    timeline: "1–2 weeks",
  },
  {
    step: 2,
    icon: <Stethoscope className="h-5 w-5" />,
    title: "Medical Clearance",
    description: "Complete FAA Class II medical exam. Assess cardiovascular health, bone density, and psychological fitness for spaceflight.",
    timeline: "2–4 weeks",
  },
  {
    step: 3,
    icon: <Dumbbell className="h-5 w-5" />,
    title: "Training Program",
    description: "Centrifuge training, zero-G parabolic flights, emergency procedures, and spacecraft systems orientation.",
    timeline: "3 days – 6 months",
  },
  {
    step: 4,
    icon: <Calendar className="h-5 w-5" />,
    title: "Launch Day",
    description: "Final medical checks, suit-up, crew briefing, launch commit, and the experience of a lifetime.",
    timeline: "T–12 hours",
  },
];

const PRICE_HISTORY: PricePoint[] = [
  { year: 2001, price: 20, label: "Tito (Soyuz)" },
  { year: 2002, price: 20, label: "Shuttleworth" },
  { year: 2005, price: 20, label: "Olsen" },
  { year: 2006, price: 25, label: "Ansari" },
  { year: 2007, price: 25, label: "Simonyi #1" },
  { year: 2008, price: 30, label: "Garriott" },
  { year: 2009, price: 35, label: "Simonyi #2" },
  { year: 2010, price: 35, label: "Laliberté" },
  { year: 2021, price: 55, label: "Inspiration4" },
  { year: 2022, price: 55, label: "AX-1" },
  { year: 2023, price: 55, label: "AX-2" },
  { year: 2024, price: 0.45, label: "NS-25" },
  { year: 2025, price: 0.25, label: "NS-28" },
  { year: 2026, price: 0.25, label: "Projected" },
];

/* ------------------------------------------------------------------ */
/*  Animated Counter Hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedCounter(target: number, isActive: boolean, duration = 2000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, isActive, duration]);

  return count;
}

/* ------------------------------------------------------------------ */
/*  SVG Price Chart                                                    */
/* ------------------------------------------------------------------ */

function PriceHistoryChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const width = 700;
  const height = 260;
  const pad = { top: 30, right: 30, bottom: 40, left: 60 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxX = Math.max(...PRICE_HISTORY.map((p) => p.year));
  const minX = Math.min(...PRICE_HISTORY.map((p) => p.year));
  const maxPrice = 60;

  const toX = (year: number) => pad.left + ((year - minX) / (maxX - minX)) * chartW;
  const toY = (price: number) => pad.top + chartH - (price / maxPrice) * chartH;

  const pathData = PRICE_HISTORY.map((p, i) => {
    const x = toX(p.year);
    const y = toY(p.price);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const areaData = `${pathData} L ${toX(maxX)} ${pad.top + chartH} L ${toX(minX)} ${pad.top + chartH} Z`;

  const gridLines = [0, 10, 20, 30, 40, 50, 60];

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 card-hover-lift">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Space Tourism Price Trends</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Orbital vs Suborbital pricing evolution (2001–2026) · Note: log-scale split for suborbital prices
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(16,185,129,0.25)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((val) => (
          <g key={val}>
            <line
              x1={pad.left}
              y1={toY(val)}
              x2={width - pad.right}
              y2={toY(val)}
              stroke="rgba(148,163,184,0.1)"
              strokeDasharray="4 4"
            />
            <text
              x={pad.left - 8}
              y={toY(val) + 4}
              textAnchor="end"
              className="fill-gray-500 dark:fill-gray-400"
              style={{ fontSize: 9 }}
            >
              ${val}M
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {PRICE_HISTORY.filter((_, i) => i % 2 === 0 || i === PRICE_HISTORY.length - 1).map((p) => (
          <text
            key={p.year}
            x={toX(p.year)}
            y={height - 8}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400"
            style={{ fontSize: 9 }}
          >
            {p.year}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaData} fill="url(#priceGrad)" />

        {/* Line */}
        <path d={pathData} fill="none" stroke="url(#lineGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {PRICE_HISTORY.map((p, i) => {
          const isHovered = hoveredPoint === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              {isHovered && (
                <>
                  <line
                    x1={toX(p.year)}
                    y1={toY(p.price)}
                    x2={toX(p.year)}
                    y2={pad.top + chartH}
                    stroke="rgba(16,185,129,0.3)"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={toX(p.year) - 52}
                    y={toY(p.price) - 42}
                    width={104}
                    height={36}
                    rx={6}
                    className="fill-slate-800 stroke-cyan-500/40"
                    strokeWidth={1}
                  />
                  <text
                    x={toX(p.year)}
                    y={toY(p.price) - 26}
                    textAnchor="middle"
                    className="fill-cyan-400"
                    style={{ fontSize: 10, fontWeight: 600 }}
                  >
                    ${p.price}M
                  </text>
                  <text
                    x={toX(p.year)}
                    y={toY(p.price) - 14}
                    textAnchor="middle"
                    className="fill-gray-300"
                    style={{ fontSize: 8 }}
                  >
                    {p.label}
                  </text>
                </>
              )}
              <circle
                cx={toX(p.year)}
                cy={toY(p.price)}
                r={isHovered ? 5 : 3}
                className="fill-cyan-400"
                stroke={isHovered ? "#fff" : "transparent"}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Counter Card (uses hook, must be a component)                       */
/* ------------------------------------------------------------------ */

function CounterCardItem({
  card,
  isActive,
  index,
}: {
  card: (typeof COUNTER_CARDS)[number];
  isActive: boolean;
  index: number;
}) {
  const count = useAnimatedCounter(card.value, isActive);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="animate-fade-in-up-stagger"
    >
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 card-hover-lift glass-card-interactive">
        <div className="flex items-center justify-between mb-3">
          <span className="text-cyan-400">{card.icon}</span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              card.trend === "up"
                ? "bg-cyan-500/15 text-cyan-400"
                : "bg-rose-500/15 text-rose-400"
            }`}
          >
            {card.trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {card.trendValue}
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
          {count}
          {card.suffix && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
              {card.suffix}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpaceTourismDashboard() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredProvider, setHoveredProvider] = useState<number | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting) setIsVisible(true);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleIntersection, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleIntersection]);

  return (
    <section id="space-tourism" ref={sectionRef} className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader
          icon={<Plane className="h-6 w-6 text-cyan-400" />}
          title="Space Tourism Dashboard"
          subtitle="Commercial human spaceflight metrics, provider analysis, and booking insights"
          sectionNumber="§50"
        />

        {/* ── Industry Statistics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {COUNTER_CARDS.map((card, i) => (
            <CounterCardItem key={card.label} card={card} isActive={isVisible} index={i} />
          ))}
        </div>

        {/* ── Provider Comparison Table ── */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden mb-8 card-hover-lift">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Provider Comparison</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              6 commercial space tourism providers · Hover for details
            </p>
          </div>
          <div className="overflow-x-auto custom-scrollbar max-h-[440px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50/80 dark:bg-slate-900/90 backdrop-blur-sm">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Vehicle
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Altitude
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Duration
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Price
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Flights
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                {PROVIDERS.map((provider, i) => (
                  <motion.tr
                    key={provider.company}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onMouseEnter={() => setHoveredProvider(i)}
                    onMouseLeave={() => setHoveredProvider(null)}
                    className={`transition-colors duration-200 ${
                      hoveredProvider === i
                        ? "bg-cyan-500/5"
                        : "hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {provider.company}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {provider.vehicle}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono">
                      {provider.altitude}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {provider.duration}
                    </td>
                    <td className="px-4 py-3 text-cyan-400 font-semibold whitespace-nowrap">
                      {provider.price}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${STATUS_STYLES[provider.status]}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                            provider.status === "Active"
                              ? "bg-cyan-400 dot-pulse-green"
                              : provider.status === "Suspended"
                              ? "bg-rose-400"
                              : provider.status === "In Development"
                              ? "bg-amber-400 dot-pulse-amber"
                              : "bg-sky-400"
                          }`}
                        />
                        {provider.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono tabular-nums">
                      {provider.flights}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hover detail panel */}
          {hoveredProvider !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 sm:px-6 py-3 border-t border-cyan-500/20 bg-cyan-500/5"
            >
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <span className="font-semibold text-gray-900 dark:text-white">{PROVIDERS[hoveredProvider].company}:</span>{" "}
                {PROVIDERS[hoveredProvider].description}
              </p>
            </motion.div>
          )}
        </div>

        {/* ── Suborbital vs Orbital Comparison ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {(
            [
              {
                title: "Suborbital",
                subtitle: "Edge of space experience",
                icon: <Zap className="h-5 w-5 text-amber-400" />,
                accent: "amber",
                features: COMPARISON_FEATURES.map((f) => f.suborbital),
              },
              {
                title: "Orbital",
                subtitle: "Full spaceflight experience",
                icon: <Activity className="h-5 w-5 text-sky-400" />,
                accent: "sky",
                features: COMPARISON_FEATURES.map((f) => f.orbital),
              },
            ] as const
          ).map((side, si) => (
            <motion.div
              key={side.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: si * 0.1 }}
            >
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-xl p-5 h-full card-hover-lift glass-card-interactive">
                <div className="flex items-center gap-2.5 mb-4">
                  {side.icon}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{side.title}</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{side.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {COMPARISON_FEATURES.map((feat, fi) => (
                    <div
                      key={feat.label}
                      className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-800/50 last:border-0"
                    >
                      <span className="text-gray-400 shrink-0">{feat.icon}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 w-24 shrink-0">
                        {feat.label}
                      </span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {side.features[fi]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Booking Funnel ── */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 mb-8 card-hover-lift">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Booking Funnel</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              From selection to launch — the tourist journey
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FUNNEL_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
                className="relative"
              >
                <div className="bg-gray-50/80 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/50 rounded-lg p-4 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-cyan-500/15 text-cyan-400">
                      {step.icon}
                    </div>
                    <span className="text-[10px] font-mono text-cyan-500/60 font-bold">
                      STEP {step.step}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1">{step.title}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                    {step.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 dark:text-gray-500">
                    <Clock className="h-3 w-3" />
                    {step.timeline}
                  </span>
                </div>
                {/* Arrow connector (not on last) */}
                {i < FUNNEL_STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-4 w-4 text-cyan-500/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Price History Chart ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <PriceHistoryChart />
        </motion.div>
      </div>
    </section>
  );
}