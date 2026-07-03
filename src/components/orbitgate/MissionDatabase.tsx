"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "./SectionHeader";
import {
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  Rocket,
  Users,
  Clock,
  MapPin,
  Globe2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  CalendarClock,
  Ruler,
  Target,
  Award,
  TrendingUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Era = "1960s" | "1970s" | "1980s" | "1990s" | "2000s" | "2010s" | "2020s";
type MissionType = "Crewed" | "Robotic" | "Cargo" | "Probe";
type Destination = "LEO" | "Moon" | "Mars" | "Deep Space";
type MissionStatus = "Complete" | "Active" | "Failed" | "Planned";
type Agency = "NASA" | "ESA" | "Roscosmos" | "CNSA" | "ISRO" | "JAXA" | "SpX";

interface Milestone {
  date: string;
  event: string;
}

interface Mission {
  id: string;
  name: string;
  year: number;
  era: Era;
  type: MissionType;
  destination: Destination;
  status: MissionStatus;
  agency: Agency;
  crewSize?: number;
  payloadType?: string;
  achievement: string;
  duration: string;
  distance: string;
  description: string;
  launchVehicle: string;
  launchSite: string;
  orbitParams: string;
  milestones: Milestone[];
  outcome: string;
}

/* ------------------------------------------------------------------ */
/*  Mission Data (20 real missions)                                     */
/* ------------------------------------------------------------------ */
const MISSIONS: Mission[] = [
  {
    id: "vostok1",
    name: "Vostok 1",
    year: 1961,
    era: "1960s",
    type: "Crewed",
    destination: "LEO",
    status: "Complete",
    agency: "Roscosmos",
    crewSize: 1,
    achievement: "First human in space and first orbital flight",
    duration: "1h 48m",
    distance: "327 km altitude",
    description:
      "Vostok 1 carried Soviet cosmonaut Yuri Gagarin into orbit, making him the first human to journey into outer space and complete a full orbit of Earth. The mission demonstrated that humans could survive weightlessness and reentry.",
    launchVehicle: "Vostok-K 8K72K",
    launchSite: "Baikonur Cosmodrome, Site 1",
    orbitParams: "181 × 327 km, 64.9° inclination",
    milestones: [
      { date: "Apr 12, 1961", event: "Launch at 06:07 UTC" },
      { date: "Apr 12, 1961", event: "Single orbit completed in 108 min" },
      { date: "Apr 12, 1961", event: "Ejection at 7 km, parachute landing" },
    ],
    outcome:
      "Complete success. Gagarin became an international hero and the mission opened the era of human spaceflight.",
  },
  {
    id: "apollo11",
    name: "Apollo 11",
    year: 1969,
    era: "1960s",
    type: "Crewed",
    destination: "Moon",
    status: "Complete",
    agency: "NASA",
    crewSize: 3,
    achievement: "First crewed landing on the Moon",
    duration: "8d 3h 18m",
    distance: "384,400 km (Earth–Moon)",
    description:
      "Apollo 11 was the first crewed mission to land on the Moon. Commander Neil Armstrong and lunar module pilot Buzz Aldrin landed the Eagle module while Michael Collins orbited above in the command module Columbia.",
    launchVehicle: "Saturn V SA-506",
    launchSite: "Kennedy Space Center, LC-39A",
    orbitParams: "Trans-lunar injection, lunar orbit 110 km",
    milestones: [
      { date: "Jul 16, 1969", event: "Launch from Kennedy Space Center" },
      { date: "Jul 19, 1969", event: "Lunar orbit insertion" },
      { date: "Jul 20, 1969", event: "First steps on the Moon at 20:17 UTC" },
      { date: "Jul 24, 1969", event: "Pacific Ocean splashdown" },
    ],
    outcome:
      "Complete success. Returned 21.5 kg of lunar samples. Broadcast live to an estimated 600 million viewers worldwide.",
  },
  {
    id: "viking1",
    name: "Viking 1",
    year: 1975,
    era: "1970s",
    type: "Probe",
    destination: "Mars",
    status: "Complete",
    agency: "NASA",
    payloadType: "Orbiter & Lander",
    achievement: "First successful Mars landing and surface operations",
    duration: "6 yr 3 mo (landed)",
    distance: "225 M km (Earth–Mars)",
    description:
      "Viking 1 consisted of an orbiter and a lander, becoming the first spacecraft to successfully operate on the Martian surface. It conducted biological experiments searching for life and transmitted the first color photos from Mars.",
    launchVehicle: "Titan IIIE / Centaur",
    launchSite: "Cape Canaveral, LC-41",
    orbitParams: "Mars orbit: 300 × 51,900 km, 34.5°",
    milestones: [
      { date: "Aug 20, 1975", event: "Launch from Cape Canaveral" },
      { date: "Jun 19, 1976", event: "Mars orbit insertion" },
      { date: "Jul 20, 1976", event: "Landing in Chryse Planitia" },
      { date: "Nov 1982", event: "Contact lost after 1,400+ days" },
    ],
    outcome:
      "Complete success. Returned over 1,400 images, atmospheric data, and soil analysis. No definitive evidence of life was found.",
  },
  {
    id: "voyager1",
    name: "Voyager 1",
    year: 1977,
    era: "1970s",
    type: "Probe",
    destination: "Deep Space",
    status: "Active",
    agency: "NASA",
    payloadType: "Science Instruments",
    achievement: "Farthest human-made object from Earth, interstellar space",
    duration: "47+ years",
    distance: "24.4+ billion km",
    description:
      "Voyager 1 conducted a grand tour of the outer planets, flying by Jupiter and Saturn with unprecedented detail. In 2012, it became the first spacecraft to enter interstellar space, crossing the heliopause boundary.",
    launchVehicle: "Titan IIIE / Centaur",
    launchSite: "Cape Canaveral, LC-41",
    orbitParams: "Hyperbolic escape trajectory, Jupiter/Saturn flybys",
    milestones: [
      { date: "Sep 5, 1977", event: "Launch from Cape Canaveral" },
      { date: "Mar 1979", event: "Jupiter flyby — discovered Io volcanoes" },
      { date: "Nov 1980", event: "Saturn flyby — detailed ring structure" },
      { date: "Aug 2012", event: "Crossed heliopause into interstellar space" },
    ],
    outcome:
      "Ongoing success. Still transmitting data from interstellar space over 160 AU from the Sun. Expected to operate until ~2025.",
  },
  {
    id: "sts1",
    name: "STS-1 (Columbia)",
    year: 1981,
    era: "1980s",
    type: "Crewed",
    destination: "LEO",
    status: "Complete",
    agency: "NASA",
    crewSize: 2,
    achievement: "First flight of the Space Shuttle program",
    duration: "2d 6h 13m",
    distance: "1.74 million km (orbital)",
    description:
      "STS-1 was the maiden flight of the Space Shuttle Columbia, the first reusable crewed spacecraft. Astronauts John Young and Robert Crippen orbited Earth 36 times, proving the shuttle concept for future operations.",
    launchVehicle: "Space Shuttle (Columbia OV-102)",
    launchSite: "Kennedy Space Center, LC-39A",
    orbitParams: "241 × 251 km, 40.3° inclination",
    milestones: [
      { date: "Apr 12, 1981", event: "First shuttle launch" },
      { date: "Apr 14, 1981", event: "Edwards AFB landing" },
    ],
    outcome:
      "Success despite losing 16 heat shield tiles. Validated the reusable spacecraft concept that defined NASA operations for 30 years.",
  },
  {
    id: "hubble",
    name: "Hubble Space Telescope",
    year: 1990,
    era: "1990s",
    type: "Robotic",
    destination: "LEO",
    status: "Active",
    agency: "NASA",
    payloadType: "Space Telescope",
    achievement: "Deep-field imagery revealing billions of galaxies",
    duration: "34+ years",
    distance: "547 km altitude (LEO)",
    description:
      "The Hubble Space Telescope is one of NASA's Great Observatories, providing unprecedented views of the universe from low Earth orbit. After initial mirror issues were corrected by a 1993 servicing mission, Hubble has revolutionized astronomy.",
    launchVehicle: "Space Shuttle Discovery (STS-31)",
    launchSite: "Kennedy Space Center, LC-39B",
    orbitParams: "535 × 547 km, 28.5° inclination",
    milestones: [
      { date: "Apr 24, 1990", event: "Deployed from Discovery payload bay" },
      { date: "Dec 1993", event: "Servicing Mission 1 — corrective optics installed" },
      { date: "1995", event: "Hubble Deep Field released" },
      { date: "2009", event: "Final servicing mission (STS-125)" },
    ],
    outcome:
      "Ongoing success. Contributed to 18,000+ scientific papers. Confirmed accelerated expansion of the universe and age of the cosmos.",
  },
  {
    id: "cassini",
    name: "Cassini–Huygens",
    year: 1997,
    era: "1990s",
    type: "Probe",
    destination: "Deep Space",
    status: "Complete",
    agency: "NASA",
    payloadType: "Orbiter & Lander (ESA)",
    achievement: "First landing in outer Solar System (Titan) + Saturn system science",
    duration: "19 yr 11 mo",
    distance: "1.2 billion km (Saturn)",
    description:
      "Cassini–Huygens was a joint NASA-ESA mission to Saturn. The Cassini orbiter studied Saturn and its rings for 13 years while the ESA-built Huygens probe made the first landing on Titan, revealing a methane-rich world with weather and lakes.",
    launchVehicle: "Titan IVB / Centaur",
    launchSite: "Cape Canaveral, LC-40",
    orbitParams: "Saturn orbit: 108,000–1.2M km, varied inclination",
    milestones: [
      { date: "Oct 15, 1997", event: "Launch from Cape Canaveral" },
      { date: "Jul 2004", event: "Saturn orbit insertion" },
      { date: "Jan 14, 2005", event: "Huygens landing on Titan" },
      { date: "Sep 15, 2017", event: "Grand Finale — atmospheric entry" },
    ],
    outcome:
      "Complete success. Discovered Enceladus subsurface ocean, mapped Titan's surface, studied Saturn's ring structure in unprecedented detail.",
  },
  {
    id: "shenzhou5",
    name: "Shenzhou 5",
    year: 2003,
    era: "2000s",
    type: "Crewed",
    destination: "LEO",
    status: "Complete",
    agency: "CNSA",
    crewSize: 1,
    achievement: "First Chinese astronaut (taikonaut) in space",
    duration: "21h 23m",
    distance: "343 km altitude",
    description:
      "Shenzhou 5 carried Yang Liwei into orbit, making China the third nation to independently send a human into space. The mission marked China's emergence as a major spacefaring power and paved the way for Tiangong space station development.",
    launchVehicle: "Long March 2F",
    launchSite: "Jiuquan Satellite Launch Center",
    orbitParams: "343 km circular, 42.4° inclination",
    milestones: [
      { date: "Oct 15, 2003", event: "Launch at 01:00 UTC" },
      { date: "Oct 15, 2003", event: "14 orbits completed" },
      { date: "Oct 16, 2003", event: "Safe landing in Inner Mongolia" },
    ],
    outcome:
      "Complete success. Yang Liwei became a national hero. China joined the US and Russia as independent crewed spaceflight-capable nations.",
  },
  {
    id: "mars-express",
    name: "Mars Express",
    year: 2003,
    era: "2000s",
    type: "Probe",
    destination: "Mars",
    status: "Active",
    agency: "ESA",
    payloadType: "Orbiter & Lander",
    achievement: "First European Mars mission, detected subsurface water ice",
    duration: "21+ years",
    distance: "225 M km (Earth–Mars)",
    description:
      "Mars Express is ESA's first planetary mission, consisting of an orbiter and the Beagle 2 lander. While the lander failed, the orbiter has been operating for over two decades, discovering subsurface water ice and mapping Mars's atmosphere in detail.",
    launchVehicle: "Soyuz-FG / Fregat",
    launchSite: "Baikonur Cosmodrome",
    orbitParams: "Mars orbit: 298 × 10,107 km, 86.9°",
    milestones: [
      { date: "Jun 2, 2003", event: "Launch from Baikonur" },
      { date: "Dec 25, 2003", event: "Mars orbit insertion" },
      { date: "Jan 2005", event: "MARSIS radar deployed — found subsurface ice" },
      { date: "Dec 2023", event: "20th anniversary of Mars orbit" },
    ],
    outcome:
      "Orbiter: ongoing success. Beagle 2 lander: failed deployment. The orbiter continues to produce valuable science about Mars's atmosphere and geology.",
  },
  {
    id: "curiosity",
    name: "Mars Science Laboratory (Curiosity)",
    year: 2011,
    era: "2010s",
    type: "Robotic",
    destination: "Mars",
    status: "Active",
    agency: "NASA",
    payloadType: "Rover (899 kg)",
    achievement: "Most advanced Mars rover, confirmed ancient habitable conditions",
    duration: "12+ years",
    distance: "225 M km (Earth–Mars)",
    description:
      "Curiosity is a car-sized rover exploring Gale Crater on Mars. It confirmed that Mars once had conditions suitable for microbial life, with evidence of ancient lakes, organic molecules, and methane in the atmosphere.",
    launchVehicle: "Atlas V 541",
    launchSite: "Cape Canaveral, LC-41",
    orbitParams: "Surface operations in Gale Crater, 4.5°S latitude",
    milestones: [
      { date: "Nov 26, 2011", event: "Launch from Cape Canaveral" },
      { date: "Aug 6, 2012", event: "Sky Crane landing in Gale Crater" },
      { date: "Mar 2013", event: "Confirmed ancient habitable lakebed" },
      { date: "2014", event: "Reached Mount Sharp base" },
    ],
    outcome:
      "Ongoing success. Has traveled over 31 km. Discovered organic molecules, seasonal methane variations, and confirmed past water activity.",
  },
  {
    id: "hayabusa2",
    name: "Hayabusa2",
    year: 2014,
    era: "2010s",
    type: "Robotic",
    destination: "Deep Space",
    status: "Complete",
    agency: "JAXA",
    payloadType: "Asteroid Sample Return",
    achievement: "Second asteroid sample return, subsurface material collected",
    duration: "6 yr 2 mo",
    distance: "5.24 billion km (round trip)",
    description:
      "Hayabusa2 traveled to near-Earth asteroid Ryugu, deployed multiple small landers, collected surface and subsurface samples, and returned them to Earth. It was the first mission to collect subsurface material from an asteroid.",
    launchVehicle: "H-IIA 202",
    launchSite: "Tanegashima Space Center",
    orbitParams: "Heliocentric orbit to asteroid Ryugu",
    milestones: [
      { date: "Dec 3, 2014", event: "Launch from Tanegashima" },
      { date: "Jun 2018", event: "Arrival at asteroid Ryugu" },
      { date: "Feb 2019", event: "Subsurface sample collection (impactor)" },
      { date: "Dec 5, 2020", event: "Sample capsule returned to Woomera, Australia" },
    ],
    outcome:
      "Complete success. Returned ~5.4 g of samples. Analysis revealed amino acids and other prebiotic organic compounds.",
  },
  {
    id: "chandrayaan2",
    name: "Chandrayaan-2",
    year: 2019,
    era: "2010s",
    type: "Probe",
    destination: "Moon",
    status: "Failed",
    agency: "ISRO",
    payloadType: "Orbiter, Lander & Rover",
    achievement: "Orbiter continues mapping lunar surface with high-res instruments",
    duration: "5+ years (orbiter)",
    distance: "384,400 km (Earth–Moon)",
    description:
      "Chandrayaan-2 was India's second lunar mission comprising an orbiter, lander (Vikram), and rover (Pragyan). While the lander lost contact during descent, the orbiter continues to operate and has mapped the lunar surface with high-resolution cameras.",
    launchVehicle: "GSLV Mk III-M1",
    launchSite: "Satish Dhawan Space Centre",
    orbitParams: "Lunar orbit: 100 km circular, polar",
    milestones: [
      { date: "Jul 22, 2019", event: "Launch from Sriharikota" },
      { date: "Aug 20, 2019", event: "Lunar orbit insertion" },
      { date: "Sep 2, 2019", event: "Vikram lander separated from orbiter" },
      { date: "Sep 7, 2019", event: "Vikram lander lost contact during descent" },
    ],
    outcome:
      "Partial failure. Orbiter fully operational with 8 instruments. Lander-rover portion failed during soft landing attempt. Led to Chandrayaan-3 success in 2023.",
  },
  {
    id: "crew-dragon-demo2",
    name: "Crew Dragon Demo-2",
    year: 2020,
    era: "2020s",
    type: "Crewed",
    destination: "LEO",
    status: "Complete",
    agency: "SpX",
    crewSize: 2,
    achievement: "First commercial crewed orbital flight",
    duration: "63d 23h",
    distance: "420 km altitude (ISS)",
    description:
      "SpaceX Demo-2 was the first crewed orbital spaceflight by a commercial company. NASA astronauts Bob Behnken and Doug Hurley launched on a Falcon 9 to the International Space Station, restoring US crew launch capability.",
    launchVehicle: "Falcon 9 Block 5 / Crew Dragon",
    launchSite: "Kennedy Space Center, LC-39A",
    orbitParams: "ISS orbit: 408 × 420 km, 51.6° inclination",
    milestones: [
      { date: "May 30, 2020", event: "First crewed Falcon 9 launch" },
      { date: "May 31, 2020", event: "Docking with ISS" },
      { date: "Aug 2, 2020", event: "Gulf of Mexico splashdown" },
    ],
    outcome:
      "Complete success. Ended US reliance on Russian Soyuz for ISS crew transport. Opened the commercial crew era.",
  },
  {
    id: "perseverance",
    name: "Mars 2020 (Perseverance)",
    year: 2020,
    era: "2020s",
    type: "Robotic",
    destination: "Mars",
    status: "Active",
    agency: "NASA",
    payloadType: "Rover + Ingenuity Helicopter",
    achievement: "First powered flight on another planet, caching samples for Earth return",
    duration: "4+ years",
    distance: "225 M km (Earth–Mars)",
    description:
      "Perseverance is exploring Jezero Crater, an ancient river delta, searching for signs of ancient microbial life. It carries the Ingenuity helicopter which achieved the first powered flight on another world, and is caching rock samples for future Earth return.",
    launchVehicle: "Atlas V 541",
    launchSite: "Cape Canaveral, LC-41",
    orbitParams: "Surface ops in Jezero Crater, 18.4°N latitude",
    milestones: [
      { date: "Jul 30, 2020", event: "Launch from Cape Canaveral" },
      { date: "Feb 18, 2021", event: "Landing in Jezero Crater" },
      { date: "Apr 19, 2021", event: "Ingenuity first powered flight on Mars" },
      { date: "2023", event: "Sample depot cached 10 tubes for Earth return" },
    ],
    outcome:
      "Ongoing success. Ingenuity completed 72 flights. 20+ rock core samples cached. Discovered diverse igneous and sedimentary rocks.",
  },
  {
    id: "jwst",
    name: "James Webb Space Telescope",
    year: 2021,
    era: "2020s",
    type: "Robotic",
    destination: "Deep Space",
    status: "Active",
    agency: "NASA",
    payloadType: "Infrared Space Telescope",
    achievement: "Deepest infrared images of the universe, exoplanet atmosphere analysis",
    duration: "3+ years (10+ yr design life)",
    distance: "1.5 million km (L2 point)",
    description:
      "JWST is the most powerful space telescope ever built, positioned at the Sun-Earth L2 Lagrange point. Its 6.5m segmented gold mirror and infrared instruments peer back to the earliest galaxies and analyze exoplanet atmospheres for biosignatures.",
    launchVehicle: "Ariane 5 ECA",
    launchSite: "Centre Spatial Guyanais, Kourou",
    orbitParams: "Halo orbit around Sun-Earth L2 point",
    milestones: [
      { date: "Dec 25, 2021", event: "Launch on Ariane 5" },
      { date: "Jan 2022", event: "Sunshield and mirror deployment complete" },
      { date: "Jul 2022", event: "First full-color images released" },
      { date: "2023", event: "Discovered earliest galaxies at z > 13" },
    ],
    outcome:
      "Ongoing success. Already revolutionizing astronomy with discoveries of early galaxies, exoplanet atmospheres, and stellar nurseries.",
  },
  {
    id: "artemis1",
    name: "Artemis I",
    year: 2022,
    era: "2020s",
    type: "Robotic",
    destination: "Moon",
    status: "Complete",
    agency: "NASA",
    payloadType: "Orion Spacecraft (uncrewed)",
    achievement: "First SLS launch, Orion's lunar flyby and return",
    duration: "25d 10h 63m",
    distance: "432,210 km from Earth (record)",
    description:
      "Artemis I was the first integrated flight test of NASA's Space Launch System and Orion spacecraft. The uncrewed Orion flew around the Moon, reaching a record distance of 432,210 km from Earth before splashing down successfully.",
    launchVehicle: "SLS Block 1",
    launchSite: "Kennedy Space Center, LC-39B",
    orbitParams: "Distant retrograde lunar orbit, 40,000+ km from Moon",
    milestones: [
      { date: "Nov 16, 2022", event: "First SLS launch" },
      { date: "Nov 21, 2022", event: "Lunar flyby at 130 km altitude" },
      { date: "Nov 25, 2022", event: "Reached record distance: 432,210 km" },
      { date: "Dec 11, 2022", event: "Pacific Ocean splashdown" },
    ],
    outcome:
      "Complete success. Validated SLS and Orion for future crewed lunar missions. Set new distance record for a crew-rated spacecraft.",
  },
  {
    id: "chandrayaan3",
    name: "Chandrayaan-3",
    year: 2023,
    era: "2020s",
    type: "Probe",
    destination: "Moon",
    status: "Complete",
    agency: "ISRO",
    payloadType: "Lander & Rover",
    achievement: "First successful landing near the lunar south pole",
    duration: "14 days (lunar day)",
    distance: "384,400 km (Earth–Moon)",
    description:
      "Chandrayaan-3 achieved a historic soft landing near the Moon's south pole, making India the fourth nation to land on the Moon and the first to do so near the south pole. The Vikram lander and Pragyan rover operated for one lunar day.",
    launchVehicle: "LVM3-M4",
    launchSite: "Satish Dhawan Space Centre",
    orbitParams: "Landed at 69.37°S, 32.32°E (near south pole)",
    milestones: [
      { date: "Jul 14, 2023", event: "Launch from Sriharikota" },
      { date: "Aug 5, 2023", event: "Lunar orbit insertion" },
      { date: "Aug 23, 2023", event: "Successful soft landing near south pole" },
      { date: "Sep 2, 2023", event: "Vikram lander put into sleep mode" },
    ],
    outcome:
      "Complete success. Confirmed sulfur, aluminum, calcium, and iron near the south pole. Demonstrated precise landing capability at high-latitude sites.",
  },
  {
    id: "starship-ifc3",
    name: "Starship IFC-3",
    year: 2024,
    era: "2020s",
    type: "Robotic",
    destination: "LEO",
    status: "Complete",
    agency: "SpX",
    payloadType: "Test Vehicle (uncrewed)",
    achievement: "First successful Starship orbital test with booster catch",
    duration: "65 min",
    distance: "260 km altitude",
    description:
      "Starship's third integrated flight test achieved a full orbital trajectory attempt for the first time. The Super Heavy booster was caught by the chopstick arms at the launch tower, and the Ship completed a controlled reentry over the Indian Ocean.",
    launchVehicle: "Starship (Super Heavy + Ship)",
    launchSite: "Starbase, Boca Chica, Texas",
    orbitParams: "Suborbital, ~260 km apogee, eastward trajectory",
    milestones: [
      { date: "Mar 14, 2024", event: "Launch from Starbase" },
      { date: "Mar 14, 2024", event: "First successful Super Heavy tower catch" },
      { date: "Mar 14, 2024", event: "Ship reentry and controlled ocean landing" },
    ],
    outcome:
      "Major milestone success. Demonstrated rapid reusability concept. Two of three primary objectives achieved on first try.",
  },
  {
    id: "clipper",
    name: "Europa Clipper",
    year: 2024,
    era: "2020s",
    type: "Probe",
    destination: "Deep Space",
    status: "Active",
    agency: "NASA",
    payloadType: "Jupiter Orbiter",
    achievement: "Largest interplanetary spacecraft ever launched, en route to Jupiter's moon Europa",
    duration: "En route (2030 arrival)",
    distance: "628 M km (Earth–Jupiter)",
    description:
      "Europa Clipper is NASA's largest interplanetary spacecraft, launched to investigate Jupiter's moon Europa for conditions suitable for life. It will conduct ~45 flybys of Europa, studying its ice shell, subsurface ocean, and geology with nine science instruments.",
    launchVehicle: "Falcon Heavy",
    launchSite: "Kennedy Space Center, LC-39A",
    orbitParams: "Heliocentric, Jupiter orbit 2029–2030",
    milestones: [
      { date: "Oct 14, 2024", event: "Launch on Falcon Heavy" },
      { date: "Mar 2025", event: "Mars gravity assist flyby" },
      { date: "Dec 2026", event: "Earth gravity assist flyby" },
      { date: "Apr 2030", event: "Jupiter orbit insertion" },
    ],
    outcome:
      "In transit. Successfully deployed and operating nominally. Will spend 4 years studying Europa beginning in 2030.",
  },
  {
    id: "artemis3",
    name: "Artemis III",
    year: 2026,
    era: "2020s",
    type: "Crewed",
    destination: "Moon",
    status: "Planned",
    agency: "NASA",
    crewSize: 4,
    achievement: "First crewed lunar landing since Apollo 17 (planned)",
    duration: "~30 days (planned)",
    distance: "384,400 km (Earth–Moon)",
    description:
      "Artemis III will land the first woman and first person of color on the Moon's south pole region. Using a SpaceX Starship Human Landing System launched separately, four astronauts will perform multiple EVAs and collect samples near the lunar south pole.",
    launchVehicle: "SLS Block 1B + Starship HLS",
    launchSite: "Kennedy Space Center, LC-39B",
    orbitParams: "Near-Rectilinear Halo Orbit (NRHO), lunar south pole landing",
    milestones: [
      { date: "~2026", event: "SLS launch with Orion + crew" },
      { date: "~2026", event: "Starship HLS rendezvous in NRHO" },
      { date: "~2026", event: "South pole landing and surface EVA" },
      { date: "~2026", event: "Return to Earth via Orion" },
    ],
    outcome:
      "Planned. Will mark humanity's return to the lunar surface after 54 years. Gateway rendezvous and Starship landing system are key challenges.",
  },
];

/* ------------------------------------------------------------------ */
/*  Filter Options                                                     */
/* ------------------------------------------------------------------ */
const ERAS: { value: Era | "all"; label: string }[] = [
  { value: "all", label: "All Eras" },
  { value: "1960s", label: "1960s" },
  { value: "1970s", label: "1970s" },
  { value: "1980s", label: "1980s" },
  { value: "1990s", label: "1990s" },
  { value: "2000s", label: "2000s" },
  { value: "2010s", label: "2010s" },
  { value: "2020s", label: "2020s" },
];

const TYPES: { value: MissionType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "Crewed", label: "Crewed" },
  { value: "Robotic", label: "Robotic" },
  { value: "Cargo", label: "Cargo" },
  { value: "Probe", label: "Probe" },
];

const DESTINATIONS: { value: Destination | "all"; label: string }[] = [
  { value: "all", label: "All Destinations" },
  { value: "LEO", label: "LEO" },
  { value: "Moon", label: "Moon" },
  { value: "Mars", label: "Mars" },
  { value: "Deep Space", label: "Deep Space" },
];

const STATUSES: { value: MissionStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "Complete", label: "Complete" },
  { value: "Active", label: "Active" },
  { value: "Failed", label: "Failed" },
  { value: "Planned", label: "Planned" },
];

const AGENCIES: { value: Agency | "all"; label: string }[] = [
  { value: "all", label: "All Agencies" },
  { value: "NASA", label: "NASA" },
  { value: "ESA", label: "ESA" },
  { value: "Roscosmos", label: "Roscosmos" },
  { value: "CNSA", label: "CNSA" },
  { value: "ISRO", label: "ISRO" },
  { value: "JAXA", label: "JAXA" },
  { value: "SpX", label: "SpX" },
];

/* ------------------------------------------------------------------ */
/*  Color Helpers                                                      */
/* ------------------------------------------------------------------ */
const DESTINATION_COLORS: Record<Destination, string> = {
  LEO: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Moon: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Mars: "bg-red-500/20 text-red-400 border-red-500/30",
  "Deep Space": "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const STATUS_CONFIG: Record<MissionStatus, { color: string; icon: React.ReactNode }> = {
  Complete: {
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  Active: {
    color: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  Failed: {
    color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    icon: <XCircle className="h-3 w-3" />,
  },
  Planned: {
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: <CalendarClock className="h-3 w-3" />,
  },
};

const AGENCY_COLORS: Record<Agency, string> = {
  NASA: "bg-blue-600/20 text-blue-400 border-blue-500/30",
  ESA: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30",
  Roscosmos: "bg-red-600/20 text-red-400 border-red-500/30",
  CNSA: "bg-orange-600/20 text-orange-400 border-orange-500/30",
  ISRO: "bg-cyan-600/20 text-cyan-400 border-cyan-500/30",
  JAXA: "bg-pink-600/20 text-pink-400 border-pink-500/30",
  SpX: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const PIE_COLORS: Record<string, string> = {
  NASA: "#3b82f6",
  ESA: "#eab308",
  Roscosmos: "#ef4444",
  CNSA: "#f97316",
  ISRO: "#06b6d4",
  JAXA: "#ec4899",
};

/* ------------------------------------------------------------------ */
/*  Items Per Page                                                     */
/* ------------------------------------------------------------------ */
const ITEMS_PER_PAGE = 6;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function MissionDatabase() {
  const [search, setSearch] = useState("");
  const [eraFilter, setEraFilter] = useState<Era | "all">("all");
  const [typeFilter, setTypeFilter] = useState<MissionType | "all">("all");
  const [destFilter, setDestFilter] = useState<Destination | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MissionStatus | "all">("all");
  const [agencyFilter, setAgencyFilter] = useState<Agency | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleEraChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEraFilter(e.target.value as Era | "all");
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as MissionType | "all");
    setCurrentPage(1);
  }, []);

  const handleDestChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDestFilter(e.target.value as Destination | "all");
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as MissionStatus | "all");
    setCurrentPage(1);
  }, []);

  const handleAgencyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setAgencyFilter(e.target.value as Agency | "all");
    setCurrentPage(1);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /* ---- Filtering ---- */
  const filteredMissions = useMemo(() => {
    return MISSIONS.filter((m) => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (eraFilter !== "all" && m.era !== eraFilter) return false;
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (destFilter !== "all" && m.destination !== destFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (agencyFilter !== "all" && m.agency !== agencyFilter) return false;
      return true;
    });
  }, [search, eraFilter, typeFilter, destFilter, statusFilter, agencyFilter]);

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(filteredMissions.length / ITEMS_PER_PAGE));
  const pagedMissions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMissions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMissions, currentPage]);

  /* ---- Statistics ---- */
  const stats = useMemo(() => {
    const byAgency: Record<string, number> = {};
    const byDecade: Record<string, number> = {};
    let complete = 0;
    let total = MISSIONS.length;

    MISSIONS.forEach((m) => {
      byAgency[m.agency] = (byAgency[m.agency] || 0) + 1;
      const decade = `${Math.floor(m.year / 10) * 10}s`;
      byDecade[decade] = (byDecade[decade] || 0) + 1;
      if (m.status === "Complete" || m.status === "Active") complete++;
    });

    return { byAgency, byDecade, complete, total, rate: Math.round((complete / total) * 100) };
  }, []);

  /* ---- SVG Pie Chart ---- */
  const pieSlices = useMemo(() => {
    const entries = Object.entries(stats.byAgency);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    let angle = -90;
    return entries.map(([agency, count]) => {
      const fraction = count / total;
      const sweep = fraction * 360;
      const startAngle = angle;
      const endAngle = angle + sweep;
      angle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const r = 60;
      const cx = 80;
      const cy = 80;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = sweep > 180 ? 1 : 0;

      const midRad = ((startAngle + sweep / 2) * Math.PI) / 180;
      const labelR = r * 0.65;
      const lx = cx + labelR * Math.cos(midRad);
      const ly = cy + labelR * Math.sin(midRad);

      return {
        agency,
        count,
        fraction,
        path:
          sweep >= 359.9
            ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
            : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        lx,
        ly,
        color: PIE_COLORS[agency] || "#6b7280",
      };
    });
  }, [stats]);

  /* ---- SVG Bar Chart ---- */
  const barData = useMemo(() => {
    const decades = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
    return decades.map((d) => ({
      label: d,
      value: stats.byDecade[d] || 0,
    }));
  }, [stats]);

  const barMax = Math.max(...barData.map((d) => d.value), 1);

  /* ---- Progress Ring ---- */
  const progressRing = useMemo(() => {
    const r = 45;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (stats.rate / 100) * circumference;
    return { r, circumference, offset };
  }, [stats]);

  /* ---- Select Styling ---- */
  const selectClass =
    "glass-card glass-card-hover text-xs text-gray-300 rounded-lg px-3 py-2 border border-white/10 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50 bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8";

  return (
    <section id="mission-database" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Mission Database"
          subtitle="Browse historical and planned space missions from the dawn of the Space Age to the Artemis era"
          icon={<Database className="h-6 w-6 text-cyan-400" />}
          sectionNumber="SEC-44"
        />

        {/* Search & Filter Bar */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex flex-col gap-3">
            {/* Search Row */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={search}
                onChange={handleSearch}
                placeholder="Search missions by name..."
                className="pl-9 h-9 text-sm bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-500 focus-visible:ring-cyan-500/50 rounded-lg"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <div className="relative">
                <select
                  value={eraFilter}
                  onChange={handleEraChange}
                  className={selectClass}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
                >
                  {ERAS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={handleTypeChange}
                  className={selectClass}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={destFilter}
                  onChange={handleDestChange}
                  className={selectClass}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={handleStatusChange}
                  className={selectClass}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={agencyFilter}
                  onChange={handleAgencyChange}
                  className={selectClass}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
                >
                  {AGENCIES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {filteredMissions.length} of {MISSIONS.length} missions
              </span>
              {(eraFilter !== "all" || typeFilter !== "all" || destFilter !== "all" || statusFilter !== "all" || agencyFilter !== "all" || search) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setEraFilter("all");
                    setTypeFilter("all");
                    setDestFilter("all");
                    setStatusFilter("all");
                    setAgencyFilter("all");
                    setCurrentPage(1);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Layout: Cards + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mission Cards Grid */}
          <div className="flex-1 min-w-0">
            {pagedMissions.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <Rocket className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No missions match your filters</p>
                <p className="text-gray-500 text-xs mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {pagedMissions.map((mission) => {
                    const isExpanded = expandedId === mission.id;
                    const statusCfg = STATUS_CONFIG[mission.status];
                    return (
                      <motion.div
                        key={mission.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="col-span-1"
                      >
                        <div
                          className="glass-card glass-card-hover rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                          onClick={() => toggleExpand(mission.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExpand(mission.id);
                            }
                          }}
                          aria-expanded={isExpanded}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-white truncate">
                                {mission.name}
                              </h3>
                              <p className="text-xs text-gray-500 font-mono">{mission.year}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-cyan-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${AGENCY_COLORS[mission.agency]}`}
                            >
                              {mission.agency}
                            </span>
                            <span
                              className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${DESTINATION_COLORS[mission.destination]}`}
                            >
                              {mission.destination}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusCfg.color}`}
                            >
                              {statusCfg.icon}
                              {mission.status}
                            </span>
                          </div>

                          {/* Crew/Payload */}
                          <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400">
                            {mission.crewSize ? (
                              <>
                                <Users className="h-3 w-3" />
                                <span>Crew: {mission.crewSize}</span>
                              </>
                            ) : (
                              <>
                                <Target className="h-3 w-3" />
                                <span>{mission.payloadType}</span>
                              </>
                            )}
                          </div>

                          {/* Achievement */}
                          <p className="text-xs text-gray-300 leading-relaxed mb-2">
                            {mission.achievement}
                          </p>

                          {/* Stats Row */}
                          <div className="flex items-center gap-4 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {mission.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" />
                              {mission.distance}
                            </span>
                          </div>

                          {/* Expanded Detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                                  {/* Description */}
                                  <p className="text-xs text-gray-400 leading-relaxed">
                                    {mission.description}
                                  </p>

                                  {/* Launch Details */}
                                  <div className="grid grid-cols-1 gap-2">
                                    <div className="glass-card rounded-lg p-2.5 space-y-1.5">
                                      <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">
                                        Launch Details
                                      </p>
                                      <div className="space-y-1 text-xs text-gray-400">
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Vehicle</span>
                                          <span className="text-gray-300 text-right max-w-[60%] truncate">
                                            {mission.launchVehicle}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Site</span>
                                          <span className="text-gray-300 text-right max-w-[60%] truncate">
                                            {mission.launchSite}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Orbit</span>
                                          <span className="text-gray-300 text-right max-w-[60%] truncate">
                                            {mission.orbitParams}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Milestones */}
                                  <div className="glass-card rounded-lg p-2.5">
                                    <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mb-2">
                                      Key Milestones
                                    </p>
                                    <div className="space-y-2">
                                      {mission.milestones.map((ms, i) => (
                                        <div key={i} className="flex gap-2 text-xs">
                                          <div className="flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-cyan-500/60 mt-0.5 shrink-0" />
                                            {i < mission.milestones.length - 1 && (
                                              <div className="w-px flex-1 bg-cyan-500/20" />
                                            )}
                                          </div>
                                          <div className="min-w-0 pb-1">
                                            <span className="text-gray-500 font-mono text-[10px]">
                                              {ms.date}
                                            </span>
                                            <p className="text-gray-300">{ms.event}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Outcome */}
                                  <div className="flex items-start gap-2 glass-card rounded-lg p-2.5">
                                    <Award className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                      <span className="text-gray-300 font-medium">Outcome: </span>
                                      {mission.outcome}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 p-0 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`h-8 w-8 p-0 text-xs ${
                      page === currentPage
                        ? "bg-cyan-600 text-white hover:bg-cyan-500"
                        : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 p-0 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Statistics Sidebar — Desktop Only */}
          <div className="hidden lg:block w-72 shrink-0 space-y-4">
            {/* Total Missions */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe2 className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Statistics</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
              <p className="text-xs text-gray-500">Total missions in database</p>
            </div>

            {/* Success Rate Ring */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Success Rate</h3>
              </div>
              <div className="flex items-center justify-center">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={progressRing.r}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={progressRing.r}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={progressRing.circumference}
                    strokeDashoffset={progressRing.offset}
                    transform="rotate(-90 60 60)"
                    className="transition-all duration-1000"
                  />
                  <text
                    x="60"
                    y="55"
                    textAnchor="middle"
                    className="fill-white text-2xl font-bold"
                    fontSize="24"
                    fontWeight="700"
                  >
                    {stats.rate}%
                  </text>
                  <text
                    x="60"
                    y="72"
                    textAnchor="middle"
                    className="fill-gray-500"
                    fontSize="10"
                  >
                    {stats.complete} / {stats.total} successful
                  </text>
                </svg>
              </div>
            </div>

            {/* Agency Pie Chart */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">By Agency</h3>
              </div>
              <div className="flex justify-center mb-3">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  {pieSlices.map((slice) => (
                    <path
                      key={slice.agency}
                      d={slice.path}
                      fill={slice.color}
                      opacity={0.8}
                      className="transition-opacity hover:opacity-100"
                    >
                      <title>{`${slice.agency}: ${slice.count} (${Math.round(slice.fraction * 100)}%)`}</title>
                    </path>
                  ))}
                  <circle cx="80" cy="80" r="30" fill="rgba(0,0,0,0.3)" />
                  <text
                    x="80"
                    y="76"
                    textAnchor="middle"
                    className="fill-white"
                    fontSize="14"
                    fontWeight="600"
                  >
                    {Object.keys(stats.byAgency).length}
                  </text>
                  <text
                    x="80"
                    y="90"
                    textAnchor="middle"
                    className="fill-gray-400"
                    fontSize="9"
                  >
                    agencies
                  </text>
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {Object.entries(stats.byAgency).map(([agency, count]) => (
                  <div key={agency} className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className="h-2 w-2 rounded-sm shrink-0"
                      style={{ backgroundColor: PIE_COLORS[agency] || "#6b7280" }}
                    />
                    <span className="text-gray-400 truncate">{agency}</span>
                    <span className="text-gray-300 font-mono ml-auto">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decade Bar Chart */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">By Decade</h3>
              </div>
              <div className="space-y-2">
                {barData.map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-mono w-10 text-right shrink-0">
                      {d.label}
                    </span>
                    <div className="flex-1 h-4 bg-white/5 rounded-sm overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(d.value / barMax) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-sm"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono w-4 text-right shrink-0">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}