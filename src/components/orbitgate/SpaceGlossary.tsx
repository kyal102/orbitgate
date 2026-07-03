"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Category = "Orbits" | "Propulsion" | "Communications" | "Operations" | "Legal";

interface GlossaryTerm {
  term: string;
  category: Category;
  shortDefinition: string;
  detailedExplanation: string;
  relatedTerms: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: Array<{ key: Category | "All"; label: string }> = [
  { key: "All", label: "All" },
  { key: "Orbits", label: "Orbits" },
  { key: "Propulsion", label: "Propulsion" },
  { key: "Communications", label: "Communications" },
  { key: "Operations", label: "Operations" },
  { key: "Legal", label: "Legal" },
];

const CATEGORY_COLORS: Record<Category, string> = {
  Orbits: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Propulsion: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Communications: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Operations: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Legal: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const TERMS: GlossaryTerm[] = [
  {
    term: "Apogee",
    category: "Orbits",
    shortDefinition: "The farthest point in an orbit from Earth's center",
    detailedExplanation:
      "Apogee is the point of maximum distance between a satellite and Earth's center of mass during its elliptical orbit. For a satellite with semi-major axis a and eccentricity e, the apogee radius equals a(1+e). At apogee, orbital velocity is at its minimum (vis-viva equation). Communication satellites in highly elliptical orbits (e.g., Molniya) spend significant time near apogee, providing extended coverage of high-latitude regions.",
    relatedTerms: ["Perigee", "Eccentricity", "Semi-Major Axis", "Molniya Orbit"],
  },
  {
    term: "Perigee",
    category: "Orbits",
    shortDefinition: "The closest point in an orbit to Earth's center",
    detailedExplanation:
      "Perigee is the point of minimum distance between a satellite and Earth's center. The perigee radius equals a(1-e). Orbital velocity is at its maximum at perigee. Low perigee heights (below ~200 km) experience significant atmospheric drag, causing orbital decay. Many satellites perform perigee-raising maneuvers to extend orbital lifetime.",
    relatedTerms: ["Apogee", "Eccentricity", "Semi-Major Axis"],
  },
  {
    term: "RAAN",
    category: "Orbits",
    shortDefinition: "Right Ascension of the Ascending Node — the longitude where an orbit crosses the equator northward",
    detailedExplanation:
      "RAAN (Ω) is one of the six classical orbital elements. It measures the angle in the equatorial plane from the vernal equinox (First Point of Aries) to the ascending node — the point where the satellite crosses the equatorial plane from south to north. RAAN ranges from 0° to 360°. It is analogous to longitude on Earth's surface. For Sun-synchronous orbits, RAAN precesses at ~0.986° per day to maintain a constant orientation relative to the Sun.",
    relatedTerms: ["Inclination", "Argument of Perigee", "Sun Synchronous"],
  },
  {
    term: "Argument of Perigee",
    category: "Orbits",
    shortDefinition: "The angle from the ascending node to the perigee, measured along the orbital plane",
    detailedExplanation:
      "Argument of Perigee (ω) is the angle measured in the orbital plane from the ascending node to the perigee point, in the direction of satellite motion. Combined with RAAN and inclination, it fully defines the orientation of the orbital ellipse in 3D space. For critically inclined orbits (63.4° or 116.6°), argument of perigee remains nearly constant, making them ideal for Molniya-type orbits.",
    relatedTerms: ["RAAN", "Perigee", "Inclination", "Molniya Orbit"],
  },
  {
    term: "Eccentricity",
    category: "Orbits",
    shortDefinition: "A measure of how elongated an orbit is, ranging from 0 (circular) to 1 (parabolic)",
    detailedExplanation:
      "Eccentricity (e) quantifies the deviation of an orbit from a perfect circle. e = 0 for circular orbits, 0 < e < 1 for elliptical, e = 1 for parabolic (escape), and e > 1 for hyperbolic. Most Earth satellites have e < 0.01 (near-circular). Geostationary transfer orbits have e ≈ 0.73. Molniya orbits have e ≈ 0.74. The semi-minor axis b = a√(1-e²).",
    relatedTerms: ["Apogee", "Perigee", "Semi-Major Axis", "Molniya Orbit"],
  },
  {
    term: "Inclination",
    category: "Orbits",
    shortDefinition: "The tilt of an orbital plane relative to Earth's equatorial plane",
    detailedExplanation:
      "Inclination (i) is the angle between the orbital plane and Earth's equatorial plane, ranging from 0° to 180°. Prograde orbits: 0° < i < 90°; retrograde: 90° < i ≤ 180°. Polar orbits have i ≈ 90°. Sun-synchronous orbits use i ≈ 97-99° to achieve their precession rate. Launch sites impose minimum inclination constraints — e.g., Cape Canaveral can directly inject into inclinations ≥ 28.5°.",
    relatedTerms: ["RAAN", "Sun Synchronous", "LEO", "Ground Track"],
  },
  {
    term: "TLE",
    category: "Operations",
    shortDefinition: "Two-Line Element — a standardized data format for encoding satellite orbital parameters",
    detailedExplanation:
      "A Two-Line Element Set (TLE) is a compact, standardized format developed by NORAD for communicating satellite orbital elements. Each TLE consists of two 69-character lines containing: satellite catalog number, classification, international designator, epoch (reference time), first and second time derivatives of mean motion, BSTAR drag coefficient, ephemeris type, element set number, inclination, RAAN, eccentricity, argument of perigee, mean anomaly, mean motion, and revolution number.",
    relatedTerms: ["NORAD", "Two-Line Element", "SGP4", "Orbital Period"],
  },
  {
    term: "SGP4",
    category: "Operations",
    shortDefinition: "Simplified General Perturbations 4 — the standard propagator for near-Earth satellite orbits",
    detailedExplanation:
      "SGP4 is an analytical orbit propagator developed by the US Air Force and widely used by space surveillance organizations. It models Earth's gravitational field (J2-J4 zonal harmonics), atmospheric drag, luni-solar perturbations, and solar radiation pressure. SGP4 takes a TLE as input and produces ECI (Earth-Centered Inertial) position and velocity vectors. Accuracy degrades beyond ~15 days from the TLE epoch. It is the de facto standard for operational space situational awareness.",
    relatedTerms: ["TLE", "NORAD", "Two-Line Element", "Eccentricity"],
  },
  {
    term: "Hohmann Transfer",
    category: "Propulsion",
    shortDefinition: "An energy-efficient two-impulse maneuver to transfer between two circular coplanar orbits",
    detailedExplanation:
      "The Hohmann transfer orbit is the most fuel-efficient two-impulse transfer between two circular, coplanar orbits. It consists of: (1) a prograde burn at the inner orbit to enter an elliptical transfer orbit, and (2) a second prograde burn at apoapsis to circularize at the outer orbit. The total Δv = √(μ/r₁)·(√(2r₂/(r₁+r₂))-1) + √(μ/r₂)·(1-√(2r₁/(r₁+r₂))). Transfer time equals half the period of the elliptical orbit. LEO to GEO transfer takes ~5.3 hours.",
    relatedTerms: ["Delta-V", "Specific Impulse", "Perigee", "Apogee"],
  },
  {
    term: "Delta-V",
    category: "Propulsion",
    shortDefinition: "The change in velocity required for an orbital maneuver, measured in km/s or m/s",
    detailedExplanation:
      "Delta-V (Δv) represents the magnitude of velocity change needed to perform a specific orbital maneuver. It is the fundamental currency of space mission design — every maneuver costs Δv. The Tsiolkovsky rocket equation: Δv = Isp·g₀·ln(m₀/mf) relates Δv to specific impulse and mass ratio. LEO to GEO requires ~3.9 km/s. Earth escape requires ~11.2 km/s (from surface). Δv budgets are critical mission design parameters.",
    relatedTerms: ["Specific Impulse", "Hohmann Transfer", "LEO", "GEO"],
  },
  {
    term: "Specific Impulse",
    category: "Propulsion",
    shortDefinition: "A measure of rocket engine efficiency — thrust produced per unit of propellant flow rate",
    detailedExplanation:
      "Specific Impulse (Isp) measures how effectively a rocket engine uses propellant. Isp = Thrust / (ṁ·g₀), with units of seconds. Higher Isp means more thrust per kilogram of propellant per second. Chemical rockets: 250-450s (LOX/LH2 ~450s). Electric propulsion (ion): 1500-5000s. Nuclear thermal: 800-1000s. Hall-effect thrusters: 1500-2000s. The tradeoff is that high-Isp engines typically produce lower thrust, requiring longer burn times.",
    relatedTerms: ["Delta-V", "Hohmann Transfer"],
  },
  {
    term: "Kessler Syndrome",
    category: "Operations",
    shortDefinition: "A cascading collision scenario where debris density creates an exponentially growing debris population",
    detailedExplanation:
      "Proposed by NASA scientist Donald Kessler in 1978, Kessler Syndrome describes a scenario where the density of objects in LEO reaches a critical threshold. Collisions between objects generate debris, which increases the collision probability, creating a self-sustaining cascade. Once initiated, it could render certain orbital regimes unusable for generations. Current models suggest LEO is approaching but has not yet reached this threshold. Active debris removal is considered the primary mitigation strategy.",
    relatedTerms: ["Space Debris", "LEO", "NORAD"],
  },
  {
    term: "Space Debris",
    category: "Operations",
    shortDefinition: "Non-functional human-made objects in orbit, including fragments, defunct satellites, and rocket bodies",
    detailedExplanation:
      "Space debris encompasses all non-operational human-made objects in Earth orbit. As of 2024, the US Space Surveillance Network tracks ~35,000 objects larger than 10 cm, with an estimated 1 million objects between 1-10 cm and 130 million below 1 cm. Orbital velocities (~7.8 km/s in LEO) mean even small debris carries enormous kinetic energy. The majority resides in LEO (below 2000 km). Mitigation guidelines include: 25-year post-mission disposal, passivation, and collision avoidance maneuvers.",
    relatedTerms: ["Kessler Syndrome", "LEO", "NORAD", "Ground Track"],
  },
  {
    term: "Ground Track",
    category: "Orbits",
    shortDefinition: "The path traced by a satellite's sub-satellite point on Earth's surface",
    detailedExplanation:
      "The ground track is the projection of a satellite's position onto Earth's surface, following the point directly below (nadir point). For a non-sun-synchronous LEO satellite, the ground track shifts westward each orbit (~22.5° for a 400 km orbit) due to Earth's rotation. The pattern of ascending and descending passes creates a characteristic sinusoidal trace. Repeat ground track orbits revisit the same points after a fixed number of orbits, essential for remote sensing and reconnaissance missions.",
    relatedTerms: ["Footprint", "LEO", "Inclination", "Sun Synchronous"],
  },
  {
    term: "Footprint",
    category: "Communications",
    shortDefinition: "The area on Earth's surface visible to a satellite at a given time",
    detailedExplanation:
      "A satellite's footprint (or coverage area) is the region on Earth's surface from which the satellite is above the local horizon. For a satellite at altitude h, the footprint radius ≈ Rₑ·arccos(Rₑ/(Rₑ+h)). A GEO satellite sees ~42% of Earth's surface. LEO satellites have footprints of ~4,500 km diameter, requiring constellations for global coverage. The footprint determines communication windows, remote sensing swath width, and ground station visibility.",
    relatedTerms: ["Ground Track", "GEO", "LEO", "Telemetry"],
  },
  {
    term: "Eclipse",
    category: "Orbits",
    shortDefinition: "The period when a satellite passes through Earth's shadow and loses direct sunlight",
    detailedExplanation:
      "An orbital eclipse occurs when a satellite enters Earth's umbra or penumbra, cutting off solar illumination. In LEO, eclipse duration varies with orbital altitude and beta angle (angle between orbit plane and Sun direction). Maximum eclipse fraction is ~36% of the orbital period. Satellites must rely on batteries during eclipse. For GEO, eclipses occur around equinoxes for ~45 minutes/day for ~45 days. Eclipse prediction is critical for power system sizing and thermal analysis.",
    relatedTerms: ["LEO", "GEO", "Semi-Major Axis", "Orbital Period"],
  },
  {
    term: "Sun Synchronous",
    category: "Orbits",
    shortDefinition: "An orbit that precesses at the same rate as Earth's revolution around the Sun, maintaining constant lighting conditions",
    detailedExplanation:
      "A Sun-Synchronous Orbit (SSO) uses Earth's oblateness (J2 perturbation) to precess the orbital plane at approximately 0.986°/day, matching Earth's orbital motion around the Sun. This keeps the local solar time of the ascending node constant, ensuring consistent illumination conditions for each pass. Typical SSO altitude is 500-1000 km with inclination 96.8°-99.0°. SSO is ideal for remote sensing, weather satellites, and Earth observation missions. The 10:30 AM descending node is a popular configuration.",
    relatedTerms: ["Inclination", "RAAN", "LEO", "Ground Track"],
  },
  {
    term: "Molniya Orbit",
    category: "Orbits",
    shortDefinition: "A highly elliptical orbit with 12-hour period and 63.4° inclination, optimized for high-latitude coverage",
    detailedExplanation:
      "Molniya orbits (named after the Soviet Molniya communications satellites) are characterized by: high eccentricity (~0.74), 12-hour period, and 63.4° inclination (critical inclination where argument of perigee does not drift). The satellite spends ~8-10 hours near apogee (40,000+ km), providing extended visibility over high-latitude regions where GEO satellites are poorly visible. Two or three Molniya satellites provide continuous coverage. The high apogee also provides excellent signal strength for northern regions.",
    relatedTerms: ["Apogee", "Eccentricity", "Inclination", "Argument of Perigee", "HEO"],
  },
  {
    term: "LEO",
    category: "Orbits",
    shortDefinition: "Low Earth Orbit — altitudes from 160 km to 2,000 km above Earth's surface",
    detailedExplanation:
      "Low Earth Orbit (LEO) spans altitudes of approximately 160-2,000 km. Orbital periods range from ~88 minutes to ~127 minutes. LEO offers low launch costs, high-resolution imaging capability, and lower communication latency. It is the most populated orbital regime, hosting the ISS (~408 km), Starlink (~550 km), and most Earth observation satellites. Below ~200 km, atmospheric drag causes rapid orbital decay. The Kármán line at 100 km marks the boundary of space but is below stable LEO.",
    relatedTerms: ["MEO", "GEO", "HEO", "Space Debris", "Kessler Syndrome"],
  },
  {
    term: "MEO",
    category: "Orbits",
    shortDefinition: "Medium Earth Orbit — altitudes from 2,000 km to 35,786 km, home to navigation constellations",
    detailedExplanation:
      "Medium Earth Orbit (MEO) occupies the region between LEO and GEO, approximately 2,000-35,786 km altitude. Orbital periods range from 2-24 hours. MEO is primarily used by navigation satellite constellations: GPS (~20,200 km, 12-hour period), GLONASS (~19,100 km), Galileo (~23,222 km), and BeiDou (mixed MEO/GEO/IGSO). MEO offers a balance between coverage area and signal latency compared to LEO and GEO. The Van Allen radiation belts pass through MEO, requiring radiation-hardened electronics.",
    relatedTerms: ["LEO", "GEO", "Orbital Period", "Eclipse"],
  },
  {
    term: "GEO",
    category: "Orbits",
    shortDefinition: "Geostationary Earth Orbit — circular equatorial orbit at 35,786 km with 24-hour period",
    detailedExplanation:
      "GEO is a circular, equatorial orbit at approximately 35,786 km altitude (42,164 km from Earth's center) with a period matching Earth's sidereal rotation (~23h 56m 4s). A satellite in GEO appears stationary relative to a point on Earth's surface, making it ideal for communications, weather monitoring, and broadcast services. The orbital velocity is ~3.07 km/s. Only a limited number of GEO slots are available, managed by the ITU. The GEO ring is monitored for conjunction threats due to the high value of GEO satellites.",
    relatedTerms: ["LEO", "MEO", "Eclipse", "Footprint", "Orbital Period"],
  },
  {
    term: "HEO",
    category: "Orbits",
    shortDefinition: "Highly Elliptical Orbit — orbits with high eccentricity that transition between low and very high altitudes",
    detailedExplanation:
      "Highly Elliptical Orbits (HEO) have eccentricities typically greater than 0.5, with perigees in LEO and apogees well beyond GEO. They combine advantages of LEO (low perigee for observations/launch efficiency) with extended high-altitude dwell times. Besides Molniya orbits, other HEO types include Tundra orbits (24-hour period, 63.4° inclination) used for Sirius XM radio. HEO satellites experience significant thermal cycling and radiation variation between perigee and apogee passes.",
    relatedTerms: ["Molniya Orbit", "Eccentricity", "Apogee", "Perigee", "LEO"],
  },
  {
    term: "Telemetry",
    category: "Communications",
    shortDefinition: "The automated transmission of spacecraft health, status, and scientific data to ground stations",
    detailedExplanation:
      "Telemetry (TM) is the stream of measurement data transmitted from a spacecraft to ground, including: housekeeping data (temperatures, voltages, currents, pressures), attitude data (quaternions, gyroscope readings), orbital state vectors, and payload/science data. Telemetry is typically encoded with error-correcting codes (Reed-Solomon, convolutional codes) and transmitted via S-band (~2.2 GHz) or X-band (~8.4 GHz). CCSDS standards define the packet format used internationally.",
    relatedTerms: ["Telecommand", "Footprint", "Ground Track", "Eclipse"],
  },
  {
    term: "Telecommand",
    category: "Communications",
    shortDefinition: "Uplink commands sent from ground control to a spacecraft to control its operations",
    detailedExplanation:
      "Telecommand (TC) is the transmission of control instructions from ground stations to a spacecraft. Commands include: mode changes, attitude maneuvers, payload operations, orbit maintenance burns, and software uploads. Telecommand links require high reliability — incorrect commands can endanger the mission. Authentication, encryption, and command verification protocols (e.g., CCSDS TC Space Data Link Protocol) ensure command integrity. Command sequencing accounts for light-time delay (e.g., ~240ms to GEO).",
    relatedTerms: ["Telemetry", "Footprint", "NORAD"],
  },
  {
    term: "NORAD",
    category: "Operations",
    shortDefinition: "North American Aerospace Defense Command — tracks all detectable objects in Earth orbit",
    detailedExplanation:
      "NORAD (now part of US Space Command / CSpOC) maintains the definitive catalog of all tracked space objects. The catalog includes ~48,000+ tracked objects with TLEs publicly distributed via Space-Track.org and CelesTrak. NORAD operates a global network of radar and optical sensors (SSN — Space Surveillance Network) to detect, track, and characterize objects. They issue conjunction warnings (via 18th SDS), maintain catalog accuracy, and support space situational awareness for all operators.",
    relatedTerms: ["TLE", "Two-Line Element", "SGP4", "Space Debris", "Kessler Syndrome"],
  },
  {
    term: "Two-Line Element",
    category: "Operations",
    shortDefinition: "See TLE — the standard NORAD format for communicating satellite orbital elements",
    detailedExplanation:
      "Two-Line Element (TLE) Set is the specific 2-line format (69 characters per line) standardized by NORAD/CSpOC for distributing satellite ephemeris data. Line 1 contains: line number, satellite number, classification (U=unclassified), international designator, epoch year/day, first derivative of mean motion (ṅ), second derivative, BSTAR drag term, ephemeris type, element set number. Line 2 contains: line number, satellite number, inclination, RAAN, eccentricity, argument of perigee, mean anomaly, mean motion, revolution number.",
    relatedTerms: ["TLE", "NORAD", "SGP4", "Eccentricity", "Inclination"],
  },
  {
    term: "Orbital Period",
    category: "Orbits",
    shortDefinition: "The time for a satellite to complete one full orbit, given by Kepler's third law",
    detailedExplanation:
      "Orbital period (T) is the time required for a satellite to complete one revolution, calculated from Kepler's third law: T = 2π√(a³/μ), where a is the semi-major axis and μ is Earth's gravitational parameter (398,600.4418 km³/s²). LEO (~400 km): ~92.5 min. MEO (GPS, ~20,200 km): ~12 hours. GEO (~35,786 km): ~23h 56m 4s. The period determines revisit times, communication windows, and eclipse durations. For elliptical orbits, the period depends only on the semi-major axis, not eccentricity.",
    relatedTerms: ["Semi-Major Axis", "LEO", "MEO", "GEO", "Eclipse"],
  },
  {
    term: "Semi-Major Axis",
    category: "Orbits",
    shortDefinition: "Half the longest diameter of an elliptical orbit — defines the orbit's size and energy",
    detailedExplanation:
      "The semi-major axis (a) is one of the most fundamental orbital parameters, representing half the longest axis of the orbital ellipse. It determines the orbital energy (ε = -μ/2a), period (T = 2π√(a³/μ)), and size. For an elliptical orbit: a = (rₐ + rₚ)/2, where rₐ is apogee radius and rₚ is perigee radius. The vis-viva equation v = √(μ(2/r - 1/a)) relates velocity at any point to the semi-major axis. Changes in a correspond to changes in orbital energy through maneuvers.",
    relatedTerms: ["Apogee", "Perigee", "Eccentricity", "Orbital Period", "Delta-V"],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpaceGlossary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [hoveredRelated, setHoveredRelated] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    let result = TERMS;

    // Filter by category
    if (activeCategory !== "All") {
      result = result.filter((t) => t.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.shortDefinition.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.relatedTerms.some((r) => r.toLowerCase().includes(q))
      );
    }

    return result;
  }, [searchQuery, activeCategory]);

  const toggleTerm = useCallback((term: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: TERMS.length };
    for (const t of TERMS) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  return (
    <section id="space-glossary" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Space Glossary"
          subtitle="Interactive reference for orbital mechanics, space operations, and space law terminology"
          icon={<BookOpen className="h-6 w-6 text-cyan-400" />}
          sectionNumber="§46"
        />

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, definitions, categories..."
              className="pl-10 h-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800 text-sm placeholder:text-gray-400 focus:border-cyan-500/50 focus:ring-cyan-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-8"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-medium shadow-sm shadow-cyan-500/10"
                    : "bg-white/40 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                {cat.label}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {categoryCounts[cat.key] ?? 0}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Terms grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredTerms.map((term, index) => {
              const isExpanded = expandedTerms.has(term.term);
              const isHovered = hoveredRelated === term.term;

              return (
                <motion.div
                  key={term.term}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.25,
                    delay: index * 0.03,
                    layout: { duration: 0.2 },
                  }}
                >
                  <Card
                    className={`group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border transition-all duration-300 overflow-hidden ${
                      isHovered
                        ? "border-cyan-500/40 shadow-md shadow-cyan-500/10"
                        : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
                    }`}
                    onMouseEnter={() => setHoveredRelated(term.term)}
                    onMouseLeave={() => setHoveredRelated(null)}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                          {term.term}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono shrink-0 ${CATEGORY_COLORS[term.category]}`}
                        >
                          {term.category}
                        </Badge>
                      </div>

                      {/* Short definition */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                        {term.shortDefinition}
                      </p>

                      {/* Related terms */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {term.relatedTerms.map((related) => (
                          <button
                            key={related}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(related);
                              setActiveCategory("All");
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800/60 text-gray-500 dark:text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 transition-colors duration-200 border border-transparent hover:border-cyan-500/20"
                          >
                            {related}
                          </button>
                        ))}
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleTerm(term.term)}
                        className="flex items-center gap-1 text-[11px] text-cyan-500/80 hover:text-cyan-400 transition-colors duration-200 w-full"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        {isExpanded ? "Show Less" : "Learn More"}
                      </button>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-slate-700/50">
                              <p className="text-xs text-gray-400 dark:text-gray-300 leading-relaxed">
                                {term.detailedExplanation}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredTerms.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No terms match &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="mt-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              Clear all filters
            </button>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 text-center text-xs text-gray-400"
        >
          {filteredTerms.length} of {TERMS.length} terms
          {searchQuery && ` matching "${searchQuery}"`}
          {activeCategory !== "All" && ` in ${activeCategory}`}
        </motion.div>
      </div>
    </section>
  );
}