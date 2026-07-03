"use client";

import { useState, useMemo } from "react";
import { Flame, Search, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, ChevronUp, GitCompare, BarChart3 } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

type EngineType = "Liquid" | "Solid" | "Hybrid" | "Electric" | "Nuclear";

type SortField = "name" | "thrust" | "isp" | "twr";
type SortDir = "asc" | "desc";

interface RocketEngine {
  id: string;
  name: string;
  country: string;
  flag: string;
  type: EngineType;
  thrustKN: number;
  ispVac: number;
  ispSL: number;
  propellant: string;
  cycles: string;
  twr: number;
  chamberPressureBar: number;
  mixtureRatio: number;
  throttleRange: string;
  usedBy: string[];
  massKg: number;
}

// ─── Real Engine Data ────────────────────────────────────────────────────────

const ENGINES: RocketEngine[] = [
  {
    id: "merlin-1d",
    name: "Merlin 1D",
    country: "USA",
    flag: "🇺🇸",
    type: "Liquid",
    thrustKN: 845,
    ispVac: 311,
    ispSL: 282,
    propellant: "LOX / RP-1",
    cycles: "Gas Generator",
    twr: 180,
    chamberPressureBar: 97,
    mixtureRatio: 2.56,
    throttleRange: "57–100%",
    usedBy: ["Falcon 9", "Falcon Heavy"],
    massKg: 470,
  },
  {
    id: "raptor",
    name: "Raptor V2",
    country: "USA",
    flag: "🇺🇸",
    type: "Liquid",
    thrustKN: 2650,
    ispVac: 350,
    ispSL: 327,
    propellant: "LOX / CH₄",
    cycles: "Full-Flow Staged",
    twr: 195,
    chamberPressureBar: 350,
    mixtureRatio: 3.6,
    throttleRange: "20–100%",
    usedBy: ["Starship", "Super Heavy"],
    massKg: 1380,
  },
  {
    id: "rs-25",
    name: "RS-25 (SSME)",
    country: "USA",
    flag: "🇺🇸",
    type: "Liquid",
    thrustKN: 2279,
    ispVac: 452,
    ispSL: 366,
    propellant: "LOX / LH₂",
    cycles: "Fuel-Rich Staged",
    twr: 73,
    chamberPressureBar: 206,
    mixtureRatio: 6.0,
    throttleRange: "67–109%",
    usedBy: ["Space Shuttle", "SLS"],
    massKg: 3177,
  },
  {
    id: "rd-180",
    name: "RD-180",
    country: "Russia",
    flag: "🇷🇺",
    type: "Liquid",
    thrustKN: 4152,
    ispVac: 338,
    ispSL: 311,
    propellant: "LOX / RP-1",
    cycles: "Ox-Rich Staged",
    twr: 78,
    chamberPressureBar: 257,
    mixtureRatio: 2.72,
    throttleRange: "47–100%",
    usedBy: ["Atlas V"],
    massKg: 5480,
  },
  {
    id: "be-4",
    name: "BE-4",
    country: "USA",
    flag: "🇺🇸",
    type: "Liquid",
    thrustKN: 2400,
    ispVac: 340,
    ispSL: 310,
    propellant: "LOX / CH₄",
    cycles: "Ox-Rich Staged",
    twr: 95,
    chamberPressureBar: 134,
    mixtureRatio: 3.4,
    throttleRange: "50–100%",
    usedBy: ["New Glenn", "Vulcan Centaur"],
    massKg: 2580,
  },
  {
    id: "ce-20",
    name: "CE-20",
    country: "India",
    flag: "🇮🇳",
    type: "Liquid",
    thrustKN: 200,
    ispVac: 443,
    ispSL: 0,
    propellant: "LOX / LH₂",
    cycles: "Gas Generator",
    twr: 42,
    chamberPressureBar: 58,
    mixtureRatio: 5.0,
    throttleRange: "Fixed",
    usedBy: ["GSLV Mk III", "LVM3"],
    massKg: 587,
  },
  {
    id: "vulcain-2",
    name: "Vulcain 2",
    country: "France",
    flag: "🇫🇷",
    type: "Liquid",
    thrustKN: 1390,
    ispVac: 434,
    ispSL: 318,
    propellant: "LOX / LH₂",
    cycles: "Gas Generator",
    twr: 55,
    chamberPressureBar: 115,
    mixtureRatio: 6.7,
    throttleRange: "Fixed",
    usedBy: ["Ariane 5 ECA", "Ariane 5 ES"],
    massKg: 2560,
  },
  {
    id: "le-7a",
    name: "LE-7A",
    country: "Japan",
    flag: "🇯🇵",
    type: "Liquid",
    thrustKN: 1098,
    ispVac: 440,
    ispSL: 338,
    propellant: "LOX / LH₂",
    cycles: "Staged Combustion",
    twr: 55,
    chamberPressureBar: 122,
    mixtureRatio: 6.0,
    throttleRange: "Fixed",
    usedBy: ["H-IIA", "H-IIB"],
    massKg: 2040,
  },
  {
    id: "rl-10",
    name: "RL-10C-1-1",
    country: "USA",
    flag: "🇺🇸",
    type: "Liquid",
    thrustKN: 110,
    ispVac: 453,
    ispSL: 0,
    propellant: "LOX / LH₂",
    cycles: "Expander",
    twr: 57,
    chamberPressureBar: 47,
    mixtureRatio: 5.5,
    throttleRange: "50–100%",
    usedBy: ["Centaur V", "Delta IV Upper", "SLS ICPS"],
    massKg: 196,
  },
  {
    id: "rutherford",
    name: "Rutherford",
    country: "NZ/USA",
    flag: "🇳🇿",
    type: "Electric",
    thrustKN: 25.8,
    ispVac: 303,
    ispSL: 0,
    propellant: "LOX / RP-1",
    cycles: "Electric Pump-fed",
    twr: 140,
    chamberPressureBar: 65,
    mixtureRatio: 2.5,
    throttleRange: "Fixed",
    usedBy: ["Electron"],
    massKg: 35,
  },
  {
    id: "f-1",
    name: "F-1",
    country: "USA",
    flag: "🇺🇸",
    type: "Liquid",
    thrustKN: 6770,
    ispVac: 304,
    ispSL: 263,
    propellant: "LOX / RP-1",
    cycles: "Gas Generator",
    twr: 94,
    chamberPressureBar: 70,
    mixtureRatio: 2.27,
    throttleRange: "Fixed",
    usedBy: ["Saturn V"],
    massKg: 7360,
  },
  {
    id: "j-2",
    name: "J-2",
    country: "USA",
    flag: "🇺🇸",
    type: "Liquid",
    thrustKN: 1033,
    ispVac: 421,
    ispSL: 200,
    propellant: "LOX / LH₂",
    cycles: "Gas Generator",
    twr: 58,
    chamberPressureBar: 53,
    mixtureRatio: 5.0,
    throttleRange: "Fixed",
    usedBy: ["Saturn V (S-II/S-IVB)", "Saturn IB"],
    massKg: 1814,
  },
  {
    id: "sr-118",
    name: "SRB (ATK)",
    country: "USA",
    flag: "🇺🇸",
    type: "Solid",
    thrustKN: 12500,
    ispVac: 268,
    ispSL: 242,
    propellant: "PBAN / APCP",
    cycles: "Solid Propellant",
    twr: 70,
    chamberPressureBar: 63,
    mixtureRatio: 0,
    throttleRange: "Fixed",
    usedBy: ["Space Shuttle", "SLS"],
    massKg: 58600,
  },
];

// ─── Type Badge Colors ───────────────────────────────────────────────────────

const TYPE_STYLES: Record<EngineType, { bg: string; text: string; border: string }> = {
  Liquid: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  Solid: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  Hybrid: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  Electric: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  Nuclear: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function RocketEngineDatabase() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("thrust");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const filtered = useMemo(() => {
    let list = [...ENGINES];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q) ||
          e.propellant.toLowerCase().includes(q) ||
          e.usedBy.some((r) => r.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== "all") {
      list = list.filter((e) => e.type === typeFilter);
    }

    list.sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      if (sortField === "name") {
        va = a.name;
        vb = b.name;
      } else if (sortField === "thrust") {
        va = a.thrustKN;
        vb = b.thrustKN;
      } else if (sortField === "isp") {
        va = a.ispVac;
        vb = b.ispVac;
      } else {
        va = a.twr;
        vb = b.twr;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });

    return list;
  }, [search, typeFilter, sortField, sortDir]);

  const comparedEngines = useMemo(
    () => ENGINES.filter((e) => compareIds.has(e.id)),
    [compareIds]
  );

  const maxThrust = Math.max(...ENGINES.map((e) => e.thrustKN));
  const maxTwr = Math.max(...ENGINES.map((e) => e.twr));

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
    );
  }

  return (
    <section id="rocket-engines" className="scroll-mt-24">
      <SectionHeader icon={<Flame className="h-6 w-6 text-cyan-400" />} sectionNumber="§48" title="Rocket Engine Database" />

      <div className="space-y-6 mt-6">
        {/* ── Filter Bar ── */}
        <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              placeholder="Search engines, propellants, rockets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white/5 border-white/10 text-sm focus-glow"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[170px] h-9 bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Engine Type" />
            </SelectTrigger>
            <SelectContent className="bg-popover/95 backdrop-blur-xl border-white/10">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Liquid">Liquid</SelectItem>
              <SelectItem value="Solid">Solid</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
              <SelectItem value="Electric">Electric</SelectItem>
              <SelectItem value="Nuclear">Nuclear</SelectItem>
            </SelectContent>
          </Select>
          {compareIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => setShowCompare(!showCompare)}
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare ({compareIds.size})
            </Button>
          )}
        </div>

        {/* ── Sort Bar ── */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Sort by:</span>
          {([
            ["name", "Name"],
            ["thrust", "Thrust"],
            ["isp", "Isp"],
            ["twr", "T/W Ratio"],
          ] as [SortField, string][]).map(([field, label]) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                sortField === field
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {label}
              <SortIcon field={field} />
            </button>
          ))}
        </div>

        {/* ── Comparison Table ── */}
        {showCompare && comparedEngines.length >= 2 && (
          <div className="glass-card rounded-xl p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-cyan-400" />
                Engine Comparison
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCompareIds(new Set());
                  setShowCompare(false);
                }}
              >
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Spec</th>
                    {comparedEngines.map((e) => (
                      <th key={e.id} className="text-left py-2 px-3 font-semibold text-foreground">
                        {e.flag} {e.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(
                    [
                      ["Type", (e: RocketEngine) => e.type],
                      ["Thrust (kN)", (e: RocketEngine) => e.thrustKN.toLocaleString()],
                      ["Isp vac (s)", (e: RocketEngine) => e.ispVac],
                      ["Isp SL (s)", (e: RocketEngine) => e.ispSL || "—"],
                      ["Propellant", (e: RocketEngine) => e.propellant],
                      ["Cycle", (e: RocketEngine) => e.cycles],
                      ["T/W Ratio", (e: RocketEngine) => e.twr + ":1"],
                      ["Chamber P (bar)", (e: RocketEngine) => e.chamberPressureBar],
                      ["Mixture Ratio", (e: RocketEngine) => e.mixtureRatio || "—"],
                      ["Throttle", (e: RocketEngine) => e.throttleRange],
                      ["Engine Mass (kg)", (e: RocketEngine) => e.massKg.toLocaleString()],
                      ["Used By", (e: RocketEngine) => e.usedBy.join(", ")],
                    ] as [string, (e: RocketEngine) => string][]
                  ).map(([label, fn]) => (
                    <tr key={label} className="hover:bg-white/[0.02]">
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{label}</td>
                      {comparedEngines.map((e) => (
                        <td key={e.id} className="py-2 px-3 text-foreground whitespace-nowrap">
                          {fn(e)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Engine Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((engine, i) => {
            const ts = TYPE_STYLES[engine.type];
            const isCompared = compareIds.has(engine.id);
            const isExpanded = expandedId === engine.id;
            const thrustPct = (engine.thrustKN / maxThrust) * 100;

            return (
              <div
                key={engine.id}
                className={`glass-card glass-card-interactive card-hover-lift rounded-xl p-5 animate-fade-in-up ${
                  isCompared ? "border-cyan-500/40 glow-cyan" : ""
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" role="img" aria-label={engine.country}>
                        {engine.flag}
                      </span>
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {engine.name}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{engine.country}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${ts.bg} ${ts.text} ${ts.border} border text-[10px] px-2 py-0 font-medium shrink-0`}
                  >
                    {engine.type}
                  </Badge>
                </div>

                {/* Key Specs Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">Thrust</span>
                    <p className="text-foreground font-medium">
                      {engine.thrustKN.toLocaleString()} <span className="text-muted-foreground font-normal">kN</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Isp (vac)</span>
                    <p className="text-foreground font-medium">
                      {engine.ispVac} <span className="text-muted-foreground font-normal">s</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Propellant</span>
                    <p className="text-foreground font-medium truncate">{engine.propellant}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cycle</span>
                    <p className="text-foreground font-medium truncate">{engine.cycles}</p>
                  </div>
                </div>

                {/* T/W Ratio Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">T/W Ratio</span>
                    <span className="text-cyan-400 font-mono font-medium">{engine.twr}:1</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/90 transition-all duration-700"
                      style={{ width: `${(engine.twr / maxTwr) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Thrust Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Thrust</span>
                    <span className="text-cyan-400 font-mono font-medium">
                      {thrustPct.toFixed(0)}% of max
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500/50 to-cyan-400/80 transition-all duration-700"
                      style={{ width: `${thrustPct}%` }}
                    />
                  </div>
                </div>

                {/* Used By Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Used by</span>
                  {engine.usedBy.map((rocket) => (
                    <span
                      key={rocket}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-foreground/80 border border-white/5"
                    >
                      {rocket}
                    </span>
                  ))}
                </div>

                {/* Expandable Details */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : engine.id)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" /> Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" /> Show Details
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs animate-fade-in-up">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-muted-foreground">Chamber P</span>
                        <p className="text-foreground font-medium">{engine.chamberPressureBar} bar</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mix Ratio</span>
                        <p className="text-foreground font-medium">
                          {engine.mixtureRatio || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mass</span>
                        <p className="text-foreground font-medium">{engine.massKg.toLocaleString()} kg</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Throttle Range</span>
                      <p className="text-foreground font-medium">{engine.throttleRange}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Isp Sea Level</span>
                      <p className="text-foreground font-medium">
                        {engine.ispSL ? `${engine.ispSL} s` : "Vacuum only"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Compare Button */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  <Button
                    variant={isCompared ? "default" : "outline"}
                    size="sm"
                    className={`w-full h-8 text-xs gap-1.5 ${
                      isCompared
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/30"
                        : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
                    }`}
                    onClick={() => toggleCompare(engine.id)}
                  >
                    <GitCompare className="w-3 h-3" />
                    {isCompared ? "Selected for Compare" : "Add to Compare"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Flame className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No engines match your filters.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs text-cyan-400"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Engine count */}
        <p className="text-center text-xs text-muted-foreground/60">
          Showing {filtered.length} of {ENGINES.length} engines
        </p>
      </div>
    </section>
  );
}
