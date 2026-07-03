"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "./SectionHeader";
import {
  Scale,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Radio,
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Clock,
  MapPin,
} from "lucide-react";

// ── Treaty Data ──────────────────────────────────────────────────────

interface Treaty {
  name: string;
  year: string;
  principle: string;
  status: "widely-ratified" | "partial" | "limited";
  articles: string[];
}

const TREATIES: Treaty[] = [
  {
    name: "Outer Space Treaty",
    year: "1967",
    principle: "Space is the province of all mankind; no sovereign claims allowed in outer space.",
    status: "widely-ratified",
    articles: [
      "Art. I — Exploration and use of outer space for the benefit of all countries",
      "Art. II — Outer space is not subject to national appropriation",
      "Art. VI — States bear international responsibility for national activities in space",
      "Art. IX — States must avoid harmful contamination of space and celestial bodies",
    ],
  },
  {
    name: "Rescue Agreement",
    year: "1968",
    principle: "Astronauts in distress must be rescued and returned promptly to their launching state.",
    status: "widely-ratified",
    articles: [
      "Art. 1 — Immediate notification of distress to launching authority",
      "Art. 2 — All possible assistance to personnel in distress",
      "Art. 3 — Safe and prompt return of spacecraft personnel",
      "Art. 5 — Expenses borne by launching authority unless otherwise agreed",
    ],
  },
  {
    name: "Liability Convention",
    year: "1972",
    principle: "Launching states are absolutely liable for surface damage and liable for fault in space.",
    status: "widely-ratified",
    articles: [
      "Art. II — Absolute liability for damage caused on Earth's surface or to aircraft in flight",
      "Art. III — Fault-based liability for damage in space",
      "Art. IV — Joint and several liability for joint launches",
      "Art. XII — Three-year statute of limitations for claims",
    ],
  },
  {
    name: "Registration Convention",
    year: "1976",
    principle: "All objects launched into orbit must be registered with the UN to maintain transparency.",
    status: "partial",
    articles: [
      "Art. II — Launching state must maintain a national registry of space objects",
      "Art. IV — Mandatory submission to UN Secretary-General's register",
      "Art. V — Registration includes orbital parameters, purpose, and launch date",
      "Art. VI — State of registry retains jurisdiction and control over object",
    ],
  },
  {
    name: "Moon Agreement",
    year: "1979",
    principle: "The Moon and its resources are the common heritage of mankind, not subject to appropriation.",
    status: "limited",
    articles: [
      "Art. 4 — Prohibition of military bases, weapons testing, and hostile acts on the Moon",
      "Art. 11 — Non-appropriation and common heritage principle for lunar resources",
      "Art. 15 — State parties must inform UN of lunar activities",
      "Art. 18 — Consultation required if activities may cause harmful interference",
    ],
  },
  {
    name: "ITU Radio Regulations",
    year: "Ongoing",
    principle: "All radio frequency usage in space must be coordinated through the ITU to prevent interference.",
    status: "widely-ratified",
    articles: [
      "Art. 5 — Frequency allocation table for all radio services including space",
      "Art. 21 — Coordination procedures for satellite networks",
      "Art. 22 — Harmful interference definitions and resolution",
      "Art. 25 — Obligation to cease harmful interference immediately",
    ],
  },
  {
    name: "COPUOS Guidelines",
    year: "2007+",
    principle: "Voluntary guidelines for long-term sustainability of outer space activities.",
    status: "partial",
    articles: [
      "Guideline 2 — Policy and regulatory framework for space debris mitigation",
      "Guideline 6 — Protection of critical space infrastructure",
      "Guideline 7 — Sharing of space weather data and forecasts",
      "Guideline 9 — Registration of space objects and transparency",
    ],
  },
  {
    name: "National Licensing",
    year: "Varies",
    principle: "Each nation must authorize and continuously supervise its non-governmental space activities.",
    status: "partial",
    articles: [
      "FCC Part 25 — Licensing of satellite earth stations and space stations (USA)",
      "47 USC §301 — FCC authority over radio communications",
      "OSTP Directive — Space policy coordination framework",
      "National space acts — Country-specific authorization requirements",
    ],
  },
];

// ── Frequency Allocation Data ────────────────────────────────────────

interface FreqBand {
  band: string;
  range: string;
  service: string;
  coordination: "none" | "required" | "critical";
  status: "available" | "coordination" | "congested";
}

const FREQUENCY_BANDS: FreqBand[] = [
  { band: "VHF", range: "137–138 MHz", service: "Meteorological Sat (downlink)", coordination: "none", status: "available" },
  { band: "UHF", range: "400–403 MHz", service: "Earth Observation (downlink)", coordination: "none", status: "available" },
  { band: "S-band", range: "2.025–2.3 GHz", service: "TT&C / Weather (downlink)", coordination: "required", status: "coordination" },
  { band: "X-band", range: "8.025–8.4 GHz", service: "Earth Observation (downlink)", coordination: "required", status: "coordination" },
  { band: "Ku-band", range: "12.75–13.25 GHz", service: "Fixed Satellite (FSS)", coordination: "critical", status: "congested" },
  { band: "Ka-band", range: "25.5–27 GHz", service: "Broadband Satellite (HTS)", coordination: "critical", status: "congested" },
];

// ── Debris Mitigation Checklist ──────────────────────────────────────

interface ChecklistItem {
  id: string;
  description: string;
  reference: string;
  defaultStatus: "compliant" | "partial" | "non-compliant";
}

const DEBRIS_CHECKLIST: ChecklistItem[] = [
  { id: "deorbit", description: "25-year deorbit rule compliance (post-mission disposal within 25 years)", reference: "IADC Guidelines §4.2 / FCC 2024 Rule", defaultStatus: "compliant" },
  { id: "passivation", description: "Propellant & battery passivation at end of mission life", reference: "IADC Guidelines §4.3.1", defaultStatus: "compliant" },
  { id: "trackability", description: "Object trackability via ground-based radar/optical assets", reference: "USG ODMSP §4.1.2", defaultStatus: "compliant" },
  { id: "collision-avoidance", description: "Collision avoidance maneuver capability & conjunction assessment", reference: "COPUOS Guideline 4 / CCSDS 508.0", defaultStatus: "partial" },
  { id: "reentry-risk", description: "Controlled or uncontrolled reentry casualty risk < 1:10,000", reference: "IADC Guidelines §5.1 / NASA STD-8719.14", defaultStatus: "compliant" },
  { id: "breakup-prevention", description: "Design to prevent accidental fragmentation (battery, pressure vessels)", reference: "IADC Guidelines §4.3.2", defaultStatus: "compliant" },
  { id: "shielding", description: "Protection against small debris and meteoroid penetration", reference: "ESA Space Debris Mitigation §3.3", defaultStatus: "partial" },
  { id: "registration", description: "UN registration of space object before and after launch", reference: "Registration Convention Art. IV", defaultStatus: "compliant" },
  { id: "insurance", description: "Third-party liability insurance or financial guarantee", reference: "Liability Convention Art. VI / National law", defaultStatus: "non-compliant" },
  { id: "debris-assessment", description: "Pre-launch debris environment and collision probability assessment", reference: "NASA ODMSP / IADC §3", defaultStatus: "partial" },
];

// ── Wizard Data ──────────────────────────────────────────────────────

const COUNTRIES = [
  { value: "usa", label: "United States (FCC/FAA)" },
  { value: "eu", label: "Europe (ESA/EU)" },
  { value: "russia", label: "Russia (Roscosmos)" },
  { value: "china", label: "China (CNSA)" },
  { value: "india", label: "India (ISRO)" },
  { value: "japan", label: "Japan (JAXA)" },
  { value: "brazil", label: "Brazil (AEB)" },
  { value: "other", label: "Other / International" },
];

const OPERATION_TYPES = [
  { value: "comm", label: "Communications" },
  { value: "earth-obs", label: "Earth Observation" },
  { value: "nav", label: "Navigation" },
  { value: "science", label: "Scientific Research" },
  { value: "tech-demo", label: "Technology Demonstration" },
];

const ORBIT_TYPES = [
  { value: "leo", label: "Low Earth Orbit (LEO)" },
  { value: "meo", label: "Medium Earth Orbit (MEO)" },
  { value: "geo", label: "Geostationary Orbit (GEO)" },
  { value: "sso", label: "Sun-Synchronous Orbit (SSO)" },
  { value: "elliptical", label: "Highly Elliptical Orbit (HEO)" },
];

const BAND_OPTIONS = [
  { value: "vhf", label: "VHF (137–138 MHz)" },
  { value: "uhf", label: "UHF (400–403 MHz)" },
  { value: "s-band", label: "S-band (2.025–2.3 GHz)" },
  { value: "x-band", label: "X-band (8.025–8.4 GHz)" },
  { value: "ku-band", label: "Ku-band (12.75–13.25 GHz)" },
  { value: "ka-band", label: "Ka-band (25.5–27 GHz)" },
];

interface LicenseRequirement {
  name: string;
  agency: string;
  timeline: string;
  priority: "high" | "medium" | "low";
}

function generateLicenseReqs(
  country: string,
  opType: string,
  orbit: string,
  bands: string[]
): LicenseRequirement[] {
  const reqs: LicenseRequirement[] = [];

  // Spectrum license — always needed
  const countryLabels: Record<string, string> = {
    usa: "FCC", eu: "ESA/EU Agency", russia: "Roscosmos/GLONASS", china: "CNSA/MIIT",
    india: "ISRO/WPC", japan: "JAXA/MIC", brazil: "Anatel/AEB", other: "National Authority",
  };
  const agency = countryLabels[country] ?? "National Authority";

  bands.forEach((b) => {
    reqs.push({
      name: `${b.toUpperCase()} Spectrum License`,
      agency,
      timeline: "6–12 months",
      priority: "high",
    });
  });

  // Launch license
  if (country === "usa") {
    reqs.push({ name: "FAA Launch/Reentry License", agency: "FAA/AST", timeline: "6–9 months", priority: "high" });
  }
  reqs.push({ name: "Launch Vehicle License", agency, timeline: "6–12 months", priority: "high" });

  // Operation-specific
  if (opType === "comm") {
    reqs.push({ name: "Telecommunications Operating License", agency, timeline: "3–6 months", priority: "high" });
  }
  if (opType === "earth-obs") {
    reqs.push({ name: "Remote Sensing Permit", agency, timeline: "3–6 months", priority: "medium" });
  }
  if (opType === "nav") {
    reqs.push({ name: "Radionavigation Service License", agency, timeline: "6–9 months", priority: "high" });
  }

  // Orbit-specific
  if (orbit === "geo") {
    reqs.push({ name: "GEO Orbital Slot Assignment", agency: "ITU", timeline: "7+ years (advance filing)", priority: "high" });
  }

  // Universal
  reqs.push({ name: "UN Space Object Registration", agency: "UN/UNOOSA", timeline: "Before + after launch", priority: "high" });
  reqs.push({ name: "Debris Mitigation Plan Filing", agency, timeline: "Pre-launch", priority: "medium" });
  reqs.push({ name: "Third-Party Liability Insurance", agency: "Insurance Provider", timeline: "Pre-launch", priority: "medium" });
  if (orbit === "leo") {
    reqs.push({ name: "End-of-Life Deorbit Plan Approval", agency, timeline: "Pre-launch", priority: "medium" });
  }

  return reqs;
}

// ── Jurisdiction Data ────────────────────────────────────────────────

interface Jurisdiction {
  id: string;
  name: string;
  agency: string;
  path: string; // SVG path data (simplified continental outline)
  requirements: string[];
}

const JURISDICTIONS: Jurisdiction[] = [
  {
    id: "usa",
    name: "United States",
    agency: "FCC / FAA",
    path: "M160,140 L170,135 L185,132 L195,130 L210,135 L218,140 L215,148 L220,155 L215,165 L205,168 L195,175 L185,185 L175,190 L165,195 L158,192 L152,185 L148,175 L145,165 L148,155 Z",
    requirements: [
      "FCC Part 25 license for space stations",
      "FAA/AST launch or reentry license",
      "NOAA license for remote sensing",
      "DOT registration for liability",
    ],
  },
  {
    id: "europe",
    name: "Europe",
    agency: "ESA / EU",
    path: "M440,120 L455,115 L470,118 L485,122 L495,130 L490,140 L495,148 L490,155 L480,160 L470,165 L460,162 L450,158 L440,150 L435,140 L438,130 Z",
    requirements: [
      "ESA frequency coordination filing",
      "National ITU filing via administration",
      "EU Space Surveillance & Tracking registration",
      "National space act compliance (varies by state)",
    ],
  },
  {
    id: "russia",
    name: "Russia",
    agency: "Roscosmos",
    path: "M560,100 L580,95 L610,100 L630,110 L640,120 L635,135 L620,140 L600,138 L585,130 L570,120 L558,110 Z",
    requirements: [
      "Roscosmos state license for space activities",
      "Glonass frequency coordination",
      "Russian Federal Space Agency registration",
      "Military coordination for certain orbits",
    ],
  },
  {
    id: "china",
    name: "China",
    agency: "CNSA",
    path: "M690,140 L710,135 L730,140 L740,150 L745,165 L740,180 L730,190 L715,195 L700,192 L690,180 L685,165 L682,155 Z",
    requirements: [
      "CNSA/MRIT frequency allocation approval",
      "State Administration for Science licensing",
      "Beidou coordination if applicable",
      "ITAR-equivalent technology export restrictions",
    ],
  },
  {
    id: "india",
    name: "India",
    agency: "ISRO",
    path: "M665,210 L680,205 L695,210 L700,225 L698,240 L690,250 L675,255 L665,245 L660,230 Z",
    requirements: [
      "ISRO/IN-SPACe authorization",
      "WPC (Wireless Planning Commission) spectrum",
      "DoS (Department of Space) NOC",
      "Satcom Policy compliance for commercial ops",
    ],
  },
];

// ── Status Helpers ───────────────────────────────────────────────────

function statusBadge(status: Treaty["status"]) {
  switch (status) {
    case "widely-ratified":
      return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30">Widely Ratified</Badge>;
    case "partial":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">Partial Adoption</Badge>;
    case "limited":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Limited Ratification</Badge>;
  }
}

function freqStatusColor(status: FreqBand["status"]) {
  switch (status) {
    case "available":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "coordination":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "congested":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

function freqDotColor(status: FreqBand["status"]) {
  switch (status) {
    case "available":
      return "bg-cyan-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]";
    case "coordination":
      return "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]";
    case "congested":
      return "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]";
  }
}

function complianceIcon(status: string) {
  switch (status) {
    case "compliant":
      return <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />;
    case "partial":
      return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
    default:
      return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
  }
}

function complianceLabel(status: string) {
  switch (status) {
    case "compliant":
      return <span className="text-cyan-400 text-xs font-medium">Compliant</span>;
    case "partial":
      return <span className="text-amber-400 text-xs font-medium">Partial</span>;
    default:
      return <span className="text-red-400 text-xs font-medium">Non-Compliant</span>;
  }
}

// ── Component ────────────────────────────────────────────────────────

export function SpaceLawPanel() {
  // Treaty expansion
  const [expandedTreaty, setExpandedTreaty] = useState<string | null>(null);

  // Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [complianceOverrides, setComplianceOverrides] = useState<Record<string, string>>({});

  // Wizard
  const [wizardStep, setWizardStep] = useState(0);
  const [wizCountry, setWizCountry] = useState("");
  const [wizOpType, setWizOpType] = useState("");
  const [wizOrbit, setWizOrbit] = useState("");
  const [wizBands, setWizBands] = useState<string[]>([]);

  // Jurisdiction map
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);

  // ── Callbacks ──────────────────────────────────────────────────────

  const handleTreatyToggle = useCallback((id: string) => {
    setExpandedTreaty((prev) => (prev === id ? null : id));
  }, []);

  const handleCheckToggle = useCallback((id: string, checked: boolean) => {
    setChecklist((prev) => ({ ...prev, [id]: checked }));
  }, []);

  const handleComplianceChange = useCallback((id: string, status: string) => {
    setComplianceOverrides((prev) => ({ ...prev, [id]: status }));
  }, []);

  const handleWizardNext = useCallback(() => {
    setWizardStep((prev) => Math.min(prev + 1, 2));
  }, []);

  const handleWizardBack = useCallback(() => {
    setWizardStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleBandToggle = useCallback((band: string) => {
    setWizBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]
    );
  }, []);

  const handleJurisdictionClick = useCallback((id: string) => {
    setSelectedJurisdiction((prev) => (prev === id ? null : id));
  }, []);

  // ── Derived values ────────────────────────────────────────────────

  const complianceScore = useMemo(() => {
    let total = 0;
    let score = 0;
    DEBRIS_CHECKLIST.forEach((item) => {
      total += 1;
      const status = complianceOverrides[item.id] ?? item.defaultStatus;
      if (status === "compliant") score += 1;
      else if (status === "partial") score += 0.5;
    });
    return total > 0 ? Math.round((score / total) * 100) : 0;
  }, [complianceOverrides]);

  const licenseRequirements = useMemo(() => {
    if (wizardStep < 2) return [];
    return generateLicenseReqs(wizCountry, wizOpType, wizOrbit, wizBands);
  }, [wizardStep, wizCountry, wizOpType, wizOrbit, wizBands]);

  const selectedJurData = useMemo(
    () => JURISDICTIONS.find((j) => j.id === selectedJurisdiction) ?? null,
    [selectedJurisdiction]
  );

  const checkedCount = useMemo(() => {
    return DEBRIS_CHECKLIST.filter((item) => checklist[item.id]).length;
  }, [checklist]);

  // ── Sub-components (as const) ─────────────────────────────────────

  const treatyCards = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {TREATIES.map((treaty, idx) => {
        const treatyId = treaty.name.toLowerCase().replace(/\s+/g, "-");
        const isExpanded = expandedTreaty === treatyId;
        return (
          <motion.div
            key={treaty.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
          >
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-md hover:border-cyan-500/20 transition-all duration-300 cursor-pointer" onClick={() => handleTreatyToggle(treatyId)}>
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-semibold text-white truncate">{treaty.name}</CardTitle>
                      <span className="text-[10px] font-mono text-gray-500 shrink-0">{treaty.year}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{treaty.principle}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {statusBadge(treaty.status)}
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </motion.div>
                  </div>
                </div>
              </CardHeader>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="px-5 pb-4 pt-0">
                      <div className="border-t border-white/5 pt-3">
                        <p className="text-[10px] uppercase tracking-wider text-cyan-500/60 font-mono mb-2">Key Articles (Satellite Ops)</p>
                        <ul className="space-y-1.5">
                          {treaty.articles.map((article, aIdx) => (
                            <li key={aIdx} className="flex items-start gap-2 text-xs text-gray-300">
                              <ChevronRight className="h-3 w-3 text-cyan-500/50 shrink-0 mt-0.5" />
                              <span>{article}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  const freqTable = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono px-4 py-3">Band</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono px-4 py-3">Frequency Range</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono px-4 py-3">Service Type</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono px-4 py-3">Coordination</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {FREQUENCY_BANDS.map((band) => (
            <tr key={band.band} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 font-medium text-white">{band.band}</td>
              <td className="px-4 py-3 text-gray-300 font-mono text-xs">{band.range}</td>
              <td className="px-4 py-3 text-gray-300 text-xs">{band.service}</td>
              <td className="px-4 py-3">
                {band.coordination === "none" && <span className="text-cyan-400 text-xs">Not Required</span>}
                {band.coordination === "required" && <span className="text-amber-400 text-xs">Required</span>}
                {band.coordination === "critical" && <span className="text-red-400 text-xs">Critical / Advance Filing</span>}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${freqDotColor(band.status)}`} />
                  <span className={`text-xs px-2 py-0.5 rounded-md border ${freqStatusColor(band.status)}`}>
                    {band.status === "available" ? "Available" : band.status === "coordination" ? "Coord. Needed" : "Congested"}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const debrisChecklist = (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{checkedCount}/{DEBRIS_CHECKLIST.length} items checked</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Overall:</span>
            <span className={`text-sm font-bold ${complianceScore >= 80 ? "text-cyan-400" : complianceScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {complianceScore}%
            </span>
          </div>
        </div>
      </div>
      <Progress
        value={complianceScore}
        className={`h-2 ${complianceScore >= 80 ? "[&>div]:bg-cyan-500" : complianceScore >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`}
      />
      <div className="max-h-[420px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {DEBRIS_CHECKLIST.map((item) => {
          const status = complianceOverrides[item.id] ?? item.defaultStatus;
          return (
            <Card key={item.id} className="border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checklist[item.id] ?? false}
                    onCheckedChange={(checked) => handleCheckToggle(item.id, !!checked)}
                    className="mt-0.5 border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 leading-relaxed">{item.description}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">{item.reference}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {complianceIcon(status)}
                    <select
                      value={status}
                      onChange={(e) => handleComplianceChange(item.id, e.target.value)}
                      className="bg-transparent text-[10px] border border-white/10 rounded px-1.5 py-0.5 text-gray-400 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                    >
                      <option value="compliant" className="bg-slate-900 text-gray-200">Compliant</option>
                      <option value="partial" className="bg-slate-900 text-gray-200">Partial</option>
                      <option value="non-compliant" className="bg-slate-900 text-gray-200">Non-Compliant</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const licensingWizard = (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step < wizardStep
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : step === wizardStep
                  ? "bg-cyan-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-white/5 text-gray-500 border border-white/10"
              }`}
            >
              {step < wizardStep ? <CheckCircle2 className="h-4 w-4" /> : step + 1}
            </div>
            {step < 2 && (
              <div className={`h-px w-8 sm:w-16 transition-colors duration-300 ${step < wizardStep ? "bg-cyan-500/40" : "bg-white/10"}`} />
            )}
          </div>
        ))}
        <div className="ml-3 text-xs text-gray-400">
          {wizardStep === 0 && "Step 1: Country & Operation Type"}
          {wizardStep === 1 && "Step 2: Orbit & Frequency Bands"}
          {wizardStep === 2 && "Step 3: Required Licenses & Permits"}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={wizardStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {wizardStep === 0 && (
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-md">
              <CardContent className="p-5 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Licensing Country / Authority</label>
                  <Select value={wizCountry} onValueChange={setWizCountry}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-gray-200">
                      <SelectValue placeholder="Select country..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-gray-200">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Operation Type</label>
                  <Select value={wizOpType} onValueChange={setWizOpType}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-gray-200">
                      <SelectValue placeholder="Select operation type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATION_TYPES.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-gray-200">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {wizardStep === 1 && (
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-md">
              <CardContent className="p-5 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Orbit Type</label>
                  <Select value={wizOrbit} onValueChange={setWizOrbit}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-gray-200">
                      <SelectValue placeholder="Select orbit type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ORBIT_TYPES.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-gray-200">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Frequency Bands (click to toggle)</label>
                  <div className="flex flex-wrap gap-2">
                    {BAND_OPTIONS.map((b) => {
                      const isSelected = wizBands.includes(b.value);
                      return (
                        <button
                          key={b.value}
                          onClick={() => handleBandToggle(b.value)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                              : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {wizardStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-gray-200 font-medium">
                  {licenseRequirements.length} required licenses & permits
                </span>
              </div>
              <div className="max-h-[360px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {licenseRequirements.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-8">Complete previous steps to see requirements</p>
                )}
                {licenseRequirements.map((req, idx) => (
                  <motion.div
                    key={`${req.name}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                  >
                    <Card className="border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            req.priority === "high"
                              ? "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                              : req.priority === "medium"
                              ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                              : "bg-cyan-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-200 font-medium truncate">{req.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{req.agency}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span className="text-[10px] whitespace-nowrap">{req.timeline}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleWizardBack}
          disabled={wizardStep === 0}
          className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
        </Button>
        {wizardStep < 2 ? (
          <Button
            size="sm"
            onClick={handleWizardNext}
            disabled={
              (wizardStep === 0 && (!wizCountry || !wizOpType)) ||
              (wizardStep === 1 && (!wizOrbit || wizBands.length === 0))
            }
            className="bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30"
          >
            Next <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setWizardStep(0);
              setWizCountry("");
              setWizOpType("");
              setWizOrbit("");
              setWizBands([]);
            }}
            className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
          >
            Reset Wizard
          </Button>
        )}
      </div>
    </div>
  );

  const jurisdictionMap = (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-md">
        <svg viewBox="0 0 900 400" className="w-full h-auto" aria-label="World jurisdiction map">
          {/* Background grid */}
          <defs>
            <pattern id="law-grid" width="45" height="45" patternUnits="userSpaceOnUse">
              <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="900" height="400" fill="url(#law-grid)" />

          {/* Simplified continent outlines (decorative) */}
          <path d="M120,160 L140,140 L160,130 L180,125 L200,128 L220,138 L230,150 L225,165 L220,175 L210,185 L195,195 L180,200 L165,198 L150,190 L140,178 L128,170 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <path d="M160,210 L185,205 L210,215 L230,230 L240,250 L235,270 L220,280 L200,282 L180,275 L165,260 L155,240 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <path d="M440,110 L460,105 L480,108 L500,118 L510,132 L505,148 L495,158 L478,162 L460,158 L445,148 L435,135 L438,120 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <path d="M460,180 L480,175 L500,185 L510,200 L505,218 L495,228 L475,230 L460,220 L450,205 L452,190 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <path d="M555,90 L580,82 L610,85 L640,95 L655,110 L650,128 L640,140 L620,148 L598,145 L578,135 L560,118 L552,105 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <path d="M685,130 L710,122 L740,130 L755,148 L758,168 L750,185 L735,198 L718,202 L700,195 L688,180 L682,162 L680,148 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <path d="M750,280 L770,272 L790,278 L800,290 L798,305 L788,315 L772,318 L758,312 L748,300 L745,288 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

          {/* Jurisdiction highlights */}
          {JURISDICTIONS.map((j) => {
            const isSelected = selectedJurisdiction === j.id;
            return (
              <g
                key={j.id}
                className="cursor-pointer"
                onClick={() => handleJurisdictionClick(j.id)}
              >
                <motion.path
                  d={j.path}
                  fill={isSelected ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.08)"}
                  stroke={isSelected ? "rgba(16,185,129,0.6)" : "rgba(16,185,129,0.25)"}
                  strokeWidth={isSelected ? 2 : 1}
                  whileHover={{ fill: "rgba(16,185,129,0.15)", stroke: "rgba(16,185,129,0.5)" }}
                  style={{ transition: "fill 0.2s, stroke 0.2s" }}
                />
                {/* Label */}
                <text
                  x={j.id === "usa" ? 180 : j.id === "europe" ? 465 : j.id === "russia" ? 595 : j.id === "china" ? 710 : 675}
                  y={j.id === "usa" ? 165 : j.id === "europe" ? 140 : j.id === "russia" ? 120 : j.id === "china" ? 165 : 230}
                  textAnchor="middle"
                  className="text-[9px] font-mono pointer-events-none select-none"
                  fill={isSelected ? "rgba(16,185,129,0.9)" : "rgba(255,255,255,0.4)"}
                  fontWeight="500"
                >
                  {j.name}
                </text>
              </g>
            );
          })}

          {/* Equator line */}
          <line x1="0" y1="200" x2="900" y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Jurisdiction info panel */}
      <AnimatePresence>
        {selectedJurData && (
          <motion.div
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-cyan-500/20 bg-cyan-500/5 backdrop-blur-md">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                    <CardTitle className="text-sm font-semibold text-white">{selectedJurData.name}</CardTitle>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{selectedJurData.agency}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-[10px] uppercase tracking-wider text-cyan-500/60 font-mono mb-2">Key Regulatory Requirements</p>
                <ul className="space-y-1.5">
                  {selectedJurData.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                      <ChevronRight className="h-3 w-3 text-cyan-500/50 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedJurisdiction && (
        <p className="text-xs text-gray-500 text-center">Click a highlighted region to view regulatory requirements</p>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <section id="space-law" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          sectionNumber="§38"
          title="Space Law & Regulatory Compliance"
          subtitle="International treaties, frequency allocations, debris mitigation, and licensing frameworks for satellite operations"
          icon={<Scale className="h-6 w-6 text-cyan-400" />}
        />

        {/* Sub-section tabs / layout */}
        <div className="space-y-12">
          {/* 1. Treaty Reference Cards */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Treaty Reference Cards</h3>
              <span className="text-[10px] text-gray-500 font-mono">8 international frameworks</span>
            </div>
            {treatyCards}
          </div>

          {/* 2. Frequency Allocation Table */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Radio className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Frequency Allocation Table</h3>
            </div>
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
              {freqTable}
            </Card>
          </div>

          {/* 3. Debris Mitigation Checklist */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Debris Mitigation Compliance</h3>
              <span className="text-[10px] text-gray-500 font-mono">{DEBRIS_CHECKLIST.length} checklist items</span>
            </div>
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              {debrisChecklist}
            </Card>
          </div>

          {/* 4. Licensing Wizard */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <FileText className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Licensing Wizard</h3>
              <span className="text-[10px] text-gray-500 font-mono">3-step guide</span>
            </div>
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              {licensingWizard}
            </Card>
          </div>

          {/* 5. Jurisdiction Map */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Globe className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Licensing Jurisdiction Map</h3>
              <span className="text-[10px] text-gray-500 font-mono">5 major authorities</span>
            </div>
            {jurisdictionMap}
          </div>
        </div>
      </div>
    </section>
  );
}