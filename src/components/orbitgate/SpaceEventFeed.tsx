"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "./SectionHeader";
import {
  Radio,
  Rocket,
  Anchor,
  PersonStanding,
  AlertTriangle,
  Flag,
  Package,
  MapPin,
  Clock,
  Building2,
  Globe,
  ChevronDown,
  ChevronUp,
  Satellite,
  Zap,
  Activity,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EventType = "Launch" | "Docking" | "EVA" | "Deorbit" | "Anomaly" | "Milestone" | "PayloadDeploy";
type Severity = "nominal" | "watch" | "anomaly";

interface SpaceEvent {
  id: string;
  type: EventType;
  severity: Severity;
  headline: string;
  source: string;
  timestamp: Date;
  summary: string;
  fullDescription: string;
  mission: string;
  organization: string;
  location: string;
  relatedEventIds: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EVENT_TYPES: EventType[] = [
  "Launch",
  "Docking",
  "EVA",
  "Deorbit",
  "Anomaly",
  "Milestone",
  "PayloadDeploy",
];

const FILTER_OPTIONS: { key: string; label: string; types: EventType[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "launches", label: "Launches", types: ["Launch"] },
  { key: "dockings", label: "Dockings", types: ["Docking"] },
  { key: "evas", label: "EVAs", types: ["EVA"] },
  { key: "anomalies", label: "Anomalies", types: ["Anomaly"] },
  { key: "payloads", label: "Payloads", types: ["PayloadDeploy"] },
  { key: "milestones", label: "Milestones", types: ["Milestone"] },
];

const TYPE_ICONS: Record<EventType, React.ReactNode> = {
  Launch: <Rocket className="h-3.5 w-3.5" />,
  Docking: <Anchor className="h-3.5 w-3.5" />,
  EVA: <PersonStanding className="h-3.5 w-3.5" />,
  Deorbit: <Globe className="h-3.5 w-3.5" />,
  Anomaly: <AlertTriangle className="h-3.5 w-3.5" />,
  Milestone: <Flag className="h-3.5 w-3.5" />,
  PayloadDeploy: <Package className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<EventType, string> = {
  Launch: "text-cyan-400",
  Docking: "text-sky-400",
  EVA: "text-violet-400",
  Deorbit: "text-amber-400",
  Anomaly: "text-rose-400",
  Milestone: "text-yellow-400",
  PayloadDeploy: "text-teal-400",
};

const TYPE_BG: Record<EventType, string> = {
  Launch: "bg-cyan-400/10 border-cyan-400/20",
  Docking: "bg-sky-400/10 border-sky-400/20",
  EVA: "bg-violet-400/10 border-violet-400/20",
  Deorbit: "bg-amber-400/10 border-amber-400/20",
  Anomaly: "bg-rose-400/10 border-rose-400/20",
  Milestone: "bg-yellow-400/10 border-yellow-400/20",
  PayloadDeploy: "bg-teal-400/10 border-teal-400/20",
};

const SEVERITY_BORDER: Record<Severity, string> = {
  nominal: "border-l-cyan-500",
  watch: "border-l-amber-500",
  anomaly: "border-l-rose-500",
};

const SEVERITY_DOT: Record<Severity, string> = {
  nominal: "bg-cyan-400",
  watch: "bg-amber-400",
  anomaly: "bg-rose-400",
};

const MAP_W = 800;
const MAP_H = 400;

/* Simplified continent outlines as [lat, lon] polygons */
const CONTINENT_POLYS: [number, number][][] = [
  [
    [50,-125],[55,-132],[60,-147],[64,-166],[70,-162],[72,-138],
    [70,-100],[62,-78],[52,-56],[47,-53],[44,-66],[41,-72],
    [35,-75],[30,-81],[25,-80],[25,-97],[20,-105],[15,-92],
    [15,-84],[20,-87],[30,-88],[30,-90],[30,-115],[35,-120],
    [40,-124],[48,-124],[50,-125],
  ],
  [
    [84,-30],[82,-18],[78,-18],[73,-22],[68,-44],[70,-55],
    [76,-68],[80,-65],[83,-40],[84,-30],
  ],
  [
    [12,-72],[10,-62],[7,-55],[2,-50],[-3,-42],[-8,-35],
    [-15,-39],[-22,-41],[-28,-49],[-35,-56],[-40,-62],
    [-46,-65],[-52,-70],[-55,-67],[-54,-72],[-48,-76],
    [-40,-73],[-18,-70],[-5,-81],[0,-78],[5,-77],[10,-75],[12,-72],
  ],
  [
    [36,-9],[38,-9],[43,-9],[46,-2],[48,-5],[51,-5],
    [52,0],[54,0],[56,-3],[58,-5],[57,-2],[55,1],
    [54,2],[52,1],[50,-1],[48,-3],[47,-2],[44,-1],
    [43,3],[40,0],[37,-2],[36,-6],[36,-9],
  ],
  [
    [58,8],[60,5],[63,5],[65,12],[68,15],[70,20],
    [71,28],[70,32],[68,28],[65,24],[63,18],[60,12],
    [58,11],[56,10],[58,8],
  ],
  [
    [42,18],[45,14],[48,17],[50,14],[52,14],[54,14],
    [56,18],[58,22],[60,30],[58,28],[55,22],[52,22],
    [50,20],[48,22],[46,18],[44,20],[42,24],[40,24],
    [38,24],[36,22],[38,20],[40,18],[42,18],
  ],
  [
    [60,30],[62,34],[65,40],[68,45],[70,60],[72,80],
    [73,100],[72,110],[70,130],[65,140],[60,145],[55,135],
    [52,140],[50,130],[48,135],[45,135],[43,132],[42,132],
    [50,130],[53,120],[55,110],[55,100],[52,85],[52,75],
    [52,65],[55,55],[55,45],[55,38],[58,35],[60,30],
  ],
  [
    [72,110],[73,130],[72,150],[70,170],[66,178],
    [62,170],[58,163],[55,155],[52,155],[50,155],
    [48,150],[45,142],[48,135],[50,130],[52,140],
    [55,145],[60,160],[65,170],[68,175],[70,170],
    [72,150],[72,130],[72,110],
  ],
  [
    [42,50],[45,52],[50,55],[52,65],[52,75],[50,80],
    [48,85],[42,80],[38,68],[36,62],[38,58],[40,53],[42,50],
  ],
  [
    [32,35],[35,36],[38,42],[42,44],[42,50],[38,55],
    [32,48],[28,50],[25,57],[22,60],[18,54],[15,42],
    [13,45],[12,44],[14,42],[22,36],[28,34],[30,33],[32,35],
  ],
  [
    [32,68],[35,75],[34,78],[30,78],[28,84],[26,88],
    [22,88],[20,86],[18,83],[15,80],[10,78],[8,77],
    [10,76],[14,74],[20,73],[24,72],[28,68],[30,68],[32,68],
  ],
  [
    [42,80],[45,85],[48,88],[50,100],[53,120],[50,130],
    [45,135],[40,130],[35,128],[32,122],[28,120],[22,108],
    [20,110],[18,108],[16,108],[20,106],[22,100],[24,98],
    [28,97],[32,92],[35,88],[38,85],[40,80],[42,80],
  ],
  [
    [45,142],[44,145],[42,145],[40,140],[36,137],
    [34,133],[33,131],[34,130],[35,133],[37,137],
    [39,140],[41,140],[43,143],[45,142],
  ],
  [
    [22,100],[24,98],[22,98],[20,100],[18,103],
    [16,108],[14,109],[12,110],[10,108],[8,105],
    [6,102],[4,101],[2,104],[4,100],[8,98],
    [10,99],[14,99],[16,98],[18,96],[20,96],[22,100],
  ],
  [
    [7,116],[7,118],[5,119],[2,118],[0,117],
    [-1,116],[-2,115],[-1,110],[1,109],[3,110],
    [5,115],[7,116],
  ],
  [
    [5,95],[4,98],[2,101],[0,104],[-2,106],
    [-4,106],[-6,106],[-7,106],[-8,110],[-8,114],
    [-7,115],[-6,114],[-6,110],[-4,106],[-2,104],
    [0,100],[2,96],[4,95],[5,95],
  ],
  [
    [-12,132],[-14,127],[-17,122],[-22,114],[-28,114],
    [-32,115],[-35,117],[-35,120],[-38,145],[-37,150],
    [-33,152],[-28,153],[-23,150],[-20,149],[-15,145],
    [-12,142],[-11,136],[-12,132],
  ],
];

/* ------------------------------------------------------------------ */
/*  Mock Event Generation Data                                         */
/* ------------------------------------------------------------------ */

const AGENCIES = [
  "NASA", "ESA", "JAXA", "ROSCOSMOS", "SpaceX", "Blue Origin",
  "ISRO", "CNSA", "Arianespace", "Northrop Grumman", "Rocket Lab",
  "ULA", "KARI", "ISA", "SSC",
];

const LOCATIONS = [
  "LEO 408 km", "GEO 35,786 km", "ISS (Exp. 73)", "Tiangong Station",
  "Kennedy SC, FL", "Baikonur, KZ", "Vandenberg SFB, CA",
  "Kourou, French Guiana", "Tanegashima, JP", "Jiuquan, CN",
  "Sriharikota, IN", "Mahia, NZ", "Vostochny, RU",
  "MEO 20,200 km", "HEO Molniya", "Lunar Transfer Orbit",
  "Sun-Synchronous Orbit 567 km", "Polar Orbit 97.4°",
];

const HEADLINES: Record<EventType, string[]> = {
  Launch: [
    "Falcon 9 launches Starlink Group 12-5 into LEO",
    "Soyuz 2.1b delivers Glonass-K navigation satellite",
    "Ariane 6 performs inaugural commercial GEO mission",
    "Electron deploys Earth observation constellation",
    "Long March 5B launches Mengtian lab module component",
    "Vulcan Centaur maiden flight with KuiperSat demo",
    "H-IIA delivers Hayabusa3 asteroid sample return probe",
    "New Glenn lifts off with ESCAPADE Mars mission duo",
    "Falcon Heavy launches Viasat-3 Americas ultra-HD commsat",
    "GSLV Mk III launches Chandrayaan-4 lunar lander mission",
  ],
  Docking: [
    "Progress MS-29 docks with ISS Zvezda module",
    "Crew Dragon Endurance autonomously docks to Harmony nadir",
    "Tianzhou-8 completes automated rendezvous with Tiangong",
    "Cygnus NG-22 captured by Canadarm2 for berthing",
    "Soyuz MS-27 crew ship docks to Rassvet port",
    "Starliner performs first operational ISS docking",
    "Cargo Dragon docks to IDA-3 forward port",
    "Shenzhou-19 completes radial docking at Tiangong",
  ],
  EVA: [
    "US EVA-91: Solar array upgrade on S6 truss segment",
    "Roscosmos VKD-58: External experiment retrieval",
    "Crew members install new thermal radiators on P6",
    "EVA to replace failed GPS antenna on Columbus module",
    "Spacewalk to route power cables for new iROSA array",
    "Chinese taikonauts perform Tiangong exterior maintenance",
    "Predecessor EVA-89 completes antenna deployment",
    "EVA for Alpha Magnetic Spectrometer cooling system repair",
  ],
  Deorbit: [
    "ISS orbital correction burn: 0.8 m/s delta-v",
    "CYGNUS NG-21 completes deorbit over South Pacific",
    "Progress MS-28 performs controlled reentry",
    "Upper stage deorbit maneuver for LEO debris mitigation",
    "Failed satellite performs safe deorbit from GEO",
    "Tiangong reboost to 390 km altitude",
    "Abandoned rocket body burns up over Indian Ocean",
  ],
  Anomaly: [
    "Starlink V2 Mini satellite anomaly: attitude control fault",
    "ISS communication blackout: TDRS-K handover failure",
    "GPS IIF-12 clock drift exceeds operational threshold",
    "Solar proton event triggers crew shelter protocol on ISS",
    "Satellite conjunction alert: 1-in-10,000 collision probability",
    "Thermal cycling anomaly on Landsat-9 thermal sensor",
    "Unplanned thruster firing on Orbital ATK Cygnus",
    "Deep space network antenna DSS-43 offline for maintenance",
  ],
  Milestone: [
    "ISS completes 25 years of continuous human habitation",
    "Starlink constellation reaches 6,000 operational satellites",
    "SpaceX achieves 100th Falcon 9 landing",
    "JWST surpasses 2,000 peer-reviewed papers using its data",
    "Artemis III crew officially named for lunar landing mission",
    "ESA completes first full-scale Mars sample return test",
    "CNSA Chang'e-6 returns first far-side lunar samples",
    "Global space economy exceeds $500B annual revenue",
  ],
  PayloadDeploy: [
    "Starlink Group 12-5 deploys 60 satellites from Falcon 9 S2",
    "Planet Labs SuperDove flock released from Electron",
    "OneWeb Gen2 constellation batch deployed into polar orbit",
    "CubeSat dispenser activates: 12 university payloads released",
    "NOAA JPSS-3 solar arrays and instruments deployed successfully",
    "Galileo FOC FM-26 navigation payload activated",
    "IRIDIUM NEXT spare satellite reaches operational orbit",
    "TDRS-L communications relay payload fully commissioned",
  ],
};

const SUMMARIES: Record<EventType, string[]> = {
  Launch: [
    "Vehicle lifted off from pad on nominal trajectory. All first-stage engines performed as expected. Upper stage separation confirmed.",
    "Successful launch with fairing separation at T+3:22. Second stage ignition nominal. Spacecraft telemetry acquisition confirmed.",
    "Liftoff occurred at the opening of the launch window. Telemetry indicates all systems green. Booster recovery attempted.",
  ],
  Docking: [
    "Approach corridor entry confirmed at 200m range. Final approach rate 0.1 m/s. Hard dock capture with 12 latches engaged.",
    "Automated rendezvous sequence completed successfully. Crew confirmed soft capture. Hooks closed and pressure equalization begun.",
    "Vehicle entered keep-out sphere at 1km. Relative GPS handover complete. Final approach initiated on schedule.",
  ],
  EVA: [
    "Crew member exited airlock at 14:22 UTC. Tether verification complete. Translation to work site in progress via handrails.",
    "Spacewalk duration: 6h 32m. Primary task completed. Secondary task deferred to future EVA. Crew safe inside.",
    "Both EVA crew members at work site. Tool configuration verified. Timeline running 12 minutes ahead of schedule.",
  ],
  Deorbit: [
    "Deorbit burn initiated at designated orbital node. Delta-v: 45 m/s. Reentry interface predicted in 38 minutes over ocean.",
    "Controlled reentry confirmed. Tracking assets observed breakup at 120 km altitude. Debris footprint within exclusion zone.",
    "Orbital maneuver completed successfully. New orbit parameters verified by ground tracking. Decay rate within prediction.",
  ],
  Anomaly: [
    "Spacecraft entered safe mode automatically. Ground controllers assessing telemetry. Recovery plan being developed.",
    "Anomaly detected in subsystem telemetry. Redundant system activated. Impact to primary mission under evaluation.",
    "Off-nominal indication triggered alert. Engineering team convened. Spacecraft status: stable but degraded.",
  ],
  Milestone: [
    "This achievement marks a significant milestone in space exploration history. International cooperation cited as key factor.",
    "Agency leadership commended the team. This represents the culmination of decades of investment and technological development.",
    "Industry partners celebrated the achievement. New operational capabilities enabled by this milestone.",
  ],
  PayloadDeploy: [
    "Deployment sequence initiated at T+61:15. All satellites confirmed separated. Signal acquisition from first spacecraft.",
    "Payload separation confirmed via telemetry. Solar array deployment on primary spacecraft successful. Commissioning begins.",
    "Dispenser activated nominally. All CubeSats released into target orbit. Ground stations acquiring beacon signals.",
  ],
};

const FULL_DESCRIPTIONS: Record<EventType, string[]> = {
  Launch: [
    "The launch vehicle lifted off from the pad at the planned T-0 moment following a flawless countdown. All nine first-stage Merlin 1D engines ignited simultaneously, producing 1.7 million pounds of thrust. The vehicle pitched and rolled onto the planned azimuth, clearing the tower without incident. Maximum dynamic pressure (Max-Q) was experienced at T+1:12 at an altitude of approximately 12 km. First stage separation occurred at T+2:34, followed by second stage MVac engine ignition one second later. Fairing jettison was confirmed at T+3:22. The second stage continued to burn for an additional 5 minutes and 38 seconds, placing the payload into the target parking orbit. Spacecraft separation was confirmed at T+8:47, and initial telemetry from the payload showed all systems nominal.",
    "Following months of preparation and pre-flight checkouts, the launch vehicle conducted a successful ascent profile. The flight computer guided the vehicle through a series of programmed maneuvers including pitch-over, gravity turn, and throttle bucket operations. Range safety confirmed all tracking telemetry was nominal throughout powered flight. The upper stage completed its first burn and entered a coast phase before executing the circularization burn at apogee. Post-separation spacecraft health checks indicate the payload is in excellent condition with power-positive status and communication links established with the ground network.",
  ],
  Docking: [
    "The visiting vehicle completed its multi-day rendezvous profile, executing a series of phasing burns to match the space station's orbital parameters. The final approach began at a range of 4 km, with the vehicle transitioning from the approach ellipsoid into the corridor. Automated navigation using relative GPS, Kurs/ATV rendezvous sensors, and optical cameras guided the vehicle through hold points at 250m and 50m. At 12m range, the crew took manual control briefly for verification before switching back to automated mode for final approach. Soft capture was achieved at a relative velocity of 0.05 m/s, followed by hard mate as 12 active latches engaged. Pressure equalization and leak checks are now underway before hatch opening.",
    "The autonomous docking sequence proceeded flawlessly from the 200m hold point. The vehicle's proximity operations software managed the approach using a combination of LIDAR rangefinding, machine vision, and differential GPS. The docking mechanism alignment was within 0.5° of ideal in all axes. Contact dynamics were nominal with no structural loads exceeding design limits. Following hard dock confirmation, the vehicle-to-station power transfer was established, and the docking adapter heater circuits were activated. The crew will open hatches in approximately 2 hours after completing atmospheric sampling and pressure verification.",
  ],
  EVA: [
    "The extravehicular activity began with airlock depressurization at 13:55 UTC. Both crew members exited through the Quest airlock and translated along the truss structure using handrails and the Canadarm2 as a mobile base. The primary objective involved installing a modification kit on the S6 truss to support future iROSAs (International Space Station Roll-Out Solar Arrays). The crew also retrieved a failed GPS antenna assembly and replaced it with a spare from the ExPRESS Logistics Carrier. Total EVA duration was 6 hours and 42 minutes. Both crew members reported no issues with their suits or life support equipment. All tools were accounted for and returned to the airlock.",
    "During this spacewalk, the crew performed critical exterior maintenance on the space station's thermal control system. The EVA commenced with a translation to the P6 truss segment where the crew replaced a degraded thermal radiator rotary joint. The operation required precise alignment of a 200 kg replacement unit, assisted by the robotic arm. Secondary tasks included installing cable routing for upcoming payload deployments and inspecting a micrometeorite damage site on the Columbus module. The spacewalk concluded 32 minutes ahead of the planned timeline. Suit consumables including oxygen and battery power remained well within margins throughout the EVA.",
  ],
  Deorbit: [
    "The deorbit maneuver was executed at the ascending node of the designated orbit to ensure the reentry footprint over the South Pacific Oceanic Uninhabited Area (SPOUA). The retrograde burn lasted 2 minutes and 15 seconds, providing the necessary delta-v to lower the perigee below 80 km. Ground tracking stations in Australia and New Zealand monitored the vehicle during its final orbits. Reentry interface was confirmed at approximately 120 km altitude, with breakup beginning at 80 km. Debris modeling predicts all surviving fragments will impact within the pre-coordinated exclusion zone. No populated areas are at risk.",
    "The controlled deorbit sequence was initiated following completion of all primary mission objectives and a successful end-of-mission deconfiguration. The spacecraft performed a series of perigee-lowering burns over two orbits to achieve the target reentry trajectory. Final telemetry was received from the vehicle at an altitude of 95 km, showing all systems operating nominally until loss of signal. The reentry trajectory was tracked by multiple ground stations and space-based sensors. Post-reentry analysis confirmed the breakup occurred within the planned corridor, with an estimated 85% of the vehicle mass burning up during reentry.",
  ],
  Anomaly: [
    "At approximately 14:32 UTC, the spacecraft's onboard fault management system detected an off-nominal reading from the reaction wheel assembly. The vehicle automatically transitioned to safe mode, pointing its solar arrays toward the sun and switching to a redundant set of reaction wheels. Ground controllers at the mission operations center were alerted via the Deep Space Network and immediately began analysis of the telemetry data. The anomaly appears to be related to elevated bearing temperatures in RW-3, which exceeded the yellow caution threshold of 65°C before the safe mode transition. The engineering team is evaluating recovery options including wheel desaturation and potential switchover to the backup wheel.",
    "Mission control detected a communication anomaly when the spacecraft failed to respond to a scheduled ground command pass. Subsequent analysis revealed that a single-event upset (SEU) in the flight computer's memory had corrupted the communication scheduler, preventing the transmitter from activating on the planned timeline. The spacecraft autonomously recovered using its built-in watchdog timer, which triggered a processor reset after 45 minutes of inactivity. All systems returned to nominal operation following the reset, and a full memory dump was commanded for detailed analysis. The team is assessing whether additional radiation hardening measures are needed for future passes through the South Atlantic Anomaly.",
  ],
  Milestone: [
    "This historic milestone represents the culmination of years of planning, development, and operations by an international team of engineers, scientists, and astronauts. Since the first crew arrived on November 2, 2000, the space station has been continuously inhabited, serving as a unique microgravity laboratory for scientific research and a testbed for deep space exploration technologies. Over 3,000 research investigations have been conducted aboard the station, resulting in more than 2,500 scientific publications. The station has hosted 270+ crew members from 21 countries and has been visited by over 100 cargo vehicles.",
    "This achievement underscores the rapid maturation of commercial space capabilities and the growing importance of satellite infrastructure for global connectivity. The constellation now provides coverage to over 99% of the world's populated areas, with latency improvements enabling new applications in telemedicine, education, and disaster response. The milestone was reached ahead of the original deployment schedule, demonstrating the effectiveness of the production and launch cadence. Regulatory approvals for additional orbital planes are expected to further enhance coverage in equatorial regions.",
  ],
  PayloadDeploy: [
    "The deployment sequence began at the planned epoch with activation of the deployment dispenser mechanism. Satellites were released in a carefully timed sequence to ensure proper orbital spacing and minimize conjunction risk. Each deployment was confirmed by ground controllers via real-time telemetry showing umbilical separation and initial tumble rates within specification. The first spacecraft's solar arrays deployed autonomously within 30 minutes of separation, and beacon signals were acquired by three ground stations. Full constellation commissioning is expected to take approximately 4-6 weeks, with each satellite undergoing orbit-raising, checkout, and integration into the network.",
    "The payload deployment operation was conducted following a series of pre-deployment checkouts including solar array illumination verification, communication system end-to-end testing, and propulsion system pressurization. The dispenser system activated precisely on schedule, releasing each spacecraft with a relative velocity of approximately 0.5 m/s. Post-deployment tracking by the Space Surveillance Network confirmed all objects are in stable orbits within the expected dispersion ellipsoid. The primary spacecraft's onboard computer has completed initial boot sequence and is executing the automated commissioning timeline. Ground controllers report excellent signal quality and power generation from the newly deployed arrays.",
  ],
};

const MISSIONS: Record<EventType, string[]> = {
  Launch: ["SL-12-5", "GLONASS-K3", "A6-001", "EL-28", "LM-5B-4", "VC-001", "H3-5", "NG-1"],
  Docking: ["ISS Exp.73", "CRS-32", "TZ-8", "NG-22", "MS-27", "SF-1", "CRS-33", "SZ-19"],
  EVA: ["US EVA-91", "VKD-58", "US EVA-92", "US EVA-93", "EVA-SAR", "TAIKO-4", "US EVA-89", "EVA-AMS"],
  Deorbit: ["ISS Reboost #447", "NG-21 Deorbit", "MS-28", "Stage Deorbit", "GEO Cleanup", "TZ Reboost", "RB Deorbit"],
  Anomaly: ["ST-V2M-3021", "ISS Comms", "GPS IIF-12", "ISS SPE", "CONJ-4521", "LS-9 Thermal", "CYG Thruster", "DSN-43"],
  Milestone: ["ISS 25yr", "Starlink 6K", "F9-100L", "JWST 2K", "Artemis III", "Mars SR Test", "CE-6 Far-Side", "Space $500B"],
  PayloadDeploy: ["SL-12-5", "SuperDove-8", "OW Gen2-4", "CubeSat-12", "JPSS-3", "Galileo FOC-26", "Iridium Spare", "TDRS-L"],
};

/* Map marker locations for 5 events */
const MAP_MARKERS: { lat: number; lon: number; type: EventType; label: string }[] = [
  { lat: 28.5, lon: -80.6, type: "Launch", label: "Kennedy SC" },
  { lat: 46.0, lon: 63.3, type: "Launch", label: "Baikonur" },
  { lat: 51.6, lon: -0.1, type: "EVA", label: "ISS Overflight" },
  { lat: 5.2, lon: -52.8, type: "Launch", label: "Kourou" },
  { lat: 31.4, lon: 131.0, type: "Docking", label: "Tanegashima" },
];

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function latLonToSvg(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return [x, y];
}

function polyPoints(coords: [number, number][]): string {
  return coords.map(([lat, lon]) => {
    const [x, y] = latLonToSvg(lat, lon);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

let eventCounter = 0;

function generateEvent(existingEvents: SpaceEvent[]): SpaceEvent {
  eventCounter++;
  const type: EventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)] as EventType;
  const severity: Severity = type === "Anomaly"
    ? (Math.random() > 0.4 ? "anomaly" : "watch")
    : type === "Deorbit"
      ? (Math.random() > 0.6 ? "watch" : "nominal")
      : "nominal";

  const headlineList = HEADLINES[type];
  const summaryList = SUMMARIES[type];
  const descList = FULL_DESCRIPTIONS[type];
  const missionList = MISSIONS[type];

  const headline = headlineList[Math.floor(Math.random() * headlineList.length)];
  const summary = summaryList[Math.floor(Math.random() * summaryList.length)];
  const fullDescription = descList[Math.floor(Math.random() * descList.length)];
  const mission = missionList[Math.floor(Math.random() * missionList.length)];
  const source = AGENCIES[Math.floor(Math.random() * AGENCIES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

  const relatedEventIds = existingEvents
    .filter((e) => e.type === type)
    .slice(0, 3)
    .map((e) => e.id);

  return {
    id: `evt-${Date.now()}-${eventCounter}`,
    type,
    severity,
    headline,
    source,
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 300000)),
    summary,
    fullDescription,
    mission,
    organization: source,
    location,
    relatedEventIds,
  };
}

function generateInitialEvents(): SpaceEvent[] {
  const events: SpaceEvent[] = [];
  for (let i = 0; i < 12; i++) {
    events.push(generateEvent(events));
  }
  return events;
}

/* ------------------------------------------------------------------ */
/*  CSS Keyframes                                                      */
/* ------------------------------------------------------------------ */

const MARQUEE_KEYFRAMES = `
@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes pulse-marker {
  0%, 100% { r: 4; opacity: 1; }
  50% { r: 7; opacity: 0.5; }
}
@keyframes pulse-ring {
  0% { r: 4; opacity: 0.6; }
  100% { r: 14; opacity: 0; }
}
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpaceEventFeed() {
  const [events, setEvents] = useState<SpaceEvent[]>(() => generateInitialEvents());
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Auto-generate new events every 15 seconds */
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => {
        const newEvent = generateEvent(prev);
        return [newEvent, ...prev].slice(0, 50);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  /* Callbacks — defined before any JSX const */
  const handleFilterClick = useCallback((key: string) => {
    setActiveFilter((prev) => (prev === key ? "all" : key));
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleEventSelect = useCallback((id: string) => {
    setSelectedEventId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  /* Derived: filtered events */
  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    const filterDef = FILTER_OPTIONS.find((f) => f.key === activeFilter);
    if (!filterDef || filterDef.types.length === 0) return events;
    return events.filter((e) => filterDef.types.includes(e.type));
  }, [events, activeFilter]);

  /* Derived: filter counts */
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    for (const f of FILTER_OPTIONS) {
      if (f.key === "all") continue;
      counts[f.key] = events.filter((e) => f.types.includes(e.type)).length;
    }
    return counts;
  }, [events]);

  /* Derived: stats */
  const stats = useMemo(() => {
    const today = events.length;
    const evaCount = events.filter((e) => e.type === "EVA").length;
    const launchCount = events.filter((e) => e.type === "Launch").length;
    const anomalyCount = events.filter((e) => e.type === "Anomaly").length;
    const missionCount = Math.max(3, events.filter((e) => e.type === "Docking").length + 2);
    return {
      today,
      activeMissions: missionCount,
      upcomingLaunches: launchCount + Math.floor(Math.random() * 2),
      activeEvas: evaCount,
    };
  }, [events]);

  /* Derived: ticker events (latest 10) */
  const tickerEvents = useMemo(() => {
    return events.slice(0, 10);
  }, [events]);

  /* Derived: selected event */
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) ?? null;
  }, [selectedEventId, events]);

  /* Derived: related events for detail panel */
  const relatedEvents = useMemo(() => {
    if (!selectedEvent) return [];
    return events.filter((e) => selectedEvent.relatedEventIds.includes(e.id)).slice(0, 3);
  }, [selectedEvent, events]);

  /* Derived: continent paths */
  const continentPaths = useMemo(() => {
    return CONTINENT_POLYS.map((poly) => polyPoints(poly));
  }, []);

  /* ── JSX variables ───────────────────────────────────────────── */

  const tickerSection = (
    <div className="relative overflow-hidden rounded-lg border border-white/5 bg-slate-900/60 backdrop-blur-sm mb-4">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-md border border-white/10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">LIVE</span>
      </div>
      <div className="overflow-hidden pl-24">
        <style>{MARQUEE_KEYFRAMES}</style>
        <div
          className="flex gap-8 whitespace-nowrap py-2.5"
          style={{
            animation: "marquee-scroll 60s linear infinite",
          }}
        >
          {[...tickerEvents, ...tickerEvents].map((event, i) => (
            <span
              key={`${event.id}-${i}`}
              className="flex items-center gap-2 text-xs text-gray-300"
            >
              <span className={TYPE_COLORS[event.type]}>{TYPE_ICONS[event.type]}</span>
              <span>{event.headline}</span>
              <span className="text-gray-600">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const filterBar = (
    <div className="flex flex-wrap gap-2 mb-6">
      {FILTER_OPTIONS.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = filterCounts[filter.key] ?? 0;
        return (
          <button
            key={filter.key}
            onClick={() => handleFilterClick(filter.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
              isActive
                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-gray-300 hover:bg-white/[0.06] hover:border-white/10"
            }`}
          >
            {filter.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-white/[0.05] text-gray-500"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );

  const statsCards = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {[
        {
          label: "Events Today",
          value: stats.today,
          icon: <Radio className="h-4 w-4 text-cyan-400" />,
          color: "text-cyan-400",
          bg: "bg-cyan-400/10",
        },
        {
          label: "Active Missions",
          value: stats.activeMissions,
          icon: <Satellite className="h-4 w-4 text-sky-400" />,
          color: "text-sky-400",
          bg: "bg-sky-400/10",
        },
        {
          label: "Upcoming Launches",
          value: stats.upcomingLaunches,
          icon: <Zap className="h-4 w-4 text-amber-400" />,
          color: "text-amber-400",
          bg: "bg-amber-400/10",
        },
        {
          label: "Active EVAs",
          value: stats.activeEvas,
          icon: <Activity className="h-4 w-4 text-violet-400" />,
          color: "text-violet-400",
          bg: "bg-violet-400/10",
        },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-white/5 bg-slate-900/50 backdrop-blur-sm p-3 flex items-center gap-3"
        >
          <div className={`${stat.bg} rounded-lg p-2`}>{stat.icon}</div>
          <div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const eventList = (
    <div
      ref={feedRef}
      className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1"
    >
      <AnimatePresence mode="popLayout">
        {filteredEvents.map((event) => {
          const isExpanded = expandedId === event.id;
          const isSelected = selectedEventId === event.id;
          return (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className={`rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-sm border-l-[3px] ${SEVERITY_BORDER[event.severity]} transition-all duration-200 ${
                isSelected
                  ? "ring-1 ring-cyan-500/30 bg-slate-900/60"
                  : "hover:bg-slate-900/60 hover:border-white/10"
              }`}
            >
              <button
                onClick={() => handleEventSelect(event.id)}
                className="w-full text-left p-3 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${TYPE_COLORS[event.type]}`}>
                    {TYPE_ICONS[event.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-5 border ${TYPE_BG[event.type]} ${TYPE_COLORS[event.type]}`}
                      >
                        {event.type}
                      </Badge>
                      <span className={`inline-flex items-center gap-1 text-[10px] ${TYPE_COLORS[event.type]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[event.severity]}`} />
                        {event.severity}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-200 leading-snug mb-1">
                      {event.headline}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {event.source}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {mounted ? relativeTime(event.timestamp) : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {event.summary}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpand(event.id);
                    }}
                    className="shrink-0 mt-1 p-1 rounded-md hover:bg-white/[0.06] transition-colors text-gray-500 hover:text-gray-300"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-white/5 mt-0">
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {event.fullDescription}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {filteredEvents.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No events match the current filter.
        </div>
      )}
    </div>
  );

  const detailPanel = (
    <AnimatePresence>
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.25 }}
          className="rounded-lg border border-white/5 bg-slate-900/50 backdrop-blur-sm p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200">Event Details</h3>
            <button
              onClick={handleCloseDetail}
              className="p-1 rounded-md hover:bg-white/[0.06] transition-colors text-gray-500 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-5 border ${TYPE_BG[selectedEvent.type]} ${TYPE_COLORS[selectedEvent.type]}`}
              >
                {TYPE_ICONS[selectedEvent.type]}
                <span className="ml-1">{selectedEvent.type}</span>
              </Badge>
              <span className={`inline-flex items-center gap-1 text-[10px] ${TYPE_COLORS[selectedEvent.type]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[selectedEvent.severity]}`} />
                {selectedEvent.severity}
              </span>
            </div>

            <h4 className="text-base font-semibold text-white leading-snug">
              {selectedEvent.headline}
            </h4>

            <p className="text-xs text-gray-300 leading-relaxed">
              {selectedEvent.fullDescription}
            </p>

            <div className="grid grid-cols-1 gap-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Satellite className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="text-gray-500">Mission:</span>
                <span className="text-gray-300">{selectedEvent.mission}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="text-gray-500">Organization:</span>
                <span className="text-gray-300">{selectedEvent.organization}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="text-gray-500">Location:</span>
                <span className="text-gray-300">{selectedEvent.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="text-gray-500">Time:</span>
                <span className="text-gray-300">{mounted ? relativeTime(selectedEvent.timestamp) : "—"}</span>
              </div>
            </div>

            {relatedEvents.length > 0 && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                  Related Events
                </p>
                <div className="space-y-1.5">
                  {relatedEvents.map((re) => (
                    <button
                      key={re.id}
                      onClick={() => handleEventSelect(re.id)}
                      className="w-full text-left p-2 rounded-md hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className={TYPE_COLORS[re.type]}>
                          {TYPE_ICONS[re.type]}
                        </span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-200 truncate transition-colors">
                          {re.headline}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const worldMap = (
    <div className="rounded-lg border border-white/5 bg-slate-900/50 backdrop-blur-sm p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Globe className="h-3 w-3" />
        Event Locations
      </p>
      <div className="relative rounded-md overflow-hidden">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="w-full"
          style={{ aspectRatio: "2 / 1" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{MARQUEE_KEYFRAMES}</style>
          <defs>
            <pattern id="evt-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255,255,255,0.025)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#evt-grid)" />
          <line x1="0" y1={MAP_H / 2} x2={MAP_W} y2={MAP_H / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="6 3" />
          <line x1={MAP_W / 2} y1="0" x2={MAP_W / 2} y2={MAP_H} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="6 3" />

          {continentPaths.map((pts, i) => (
            <polygon
              key={`continent-${i}`}
              points={pts}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          ))}

          {MAP_MARKERS.map((marker, i) => {
            const [cx, cy] = latLonToSvg(marker.lat, marker.lon);
            const color =
              marker.type === "Launch"
                ? "rgba(16,185,129"
                : marker.type === "Docking"
                  ? "rgba(56,189,248"
                  : marker.type === "EVA"
                    ? "rgba(167,139,250"
                    : marker.type === "Anomaly"
                      ? "rgba(251,113,133"
                      : "rgba(250,204,21";
            return (
              <g key={`marker-${i}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={`${color},1)`}
                  style={{ animation: `pulse-marker 2s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="none"
                  stroke={`${color},0.5)`}
                  strokeWidth="1.5"
                  style={{ animation: `pulse-ring 2s ease-out infinite`, animationDelay: `${i * 0.4}s` }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-1.5 right-1.5 flex flex-wrap gap-1.5">
          {(["Launch", "Docking", "EVA", "Anomaly"] as EventType[]).map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 text-[9px] text-gray-400 bg-slate-950/70 px-1.5 py-0.5 rounded border border-white/5"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${TYPE_COLORS[t].replace("text-", "bg-")}`}>{TYPE_ICONS[t]}</span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section id="space-events" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Space Event Feed"
          subtitle="Real-time aggregation of space operations, launches, and orbital events from agencies worldwide"
          icon={<Radio className="h-5 w-5 text-cyan-400" />}
          sectionNumber="SEC-047"
        />

        {tickerSection}
        {statsCards}
        {filterBar}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {eventList}
          </div>
          <div className="space-y-4">
            {detailPanel}
            {worldMap}
          </div>
        </div>
      </div>
    </section>
  );
}
