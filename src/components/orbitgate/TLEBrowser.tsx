"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Satellite,
  Loader2,
  Play,
  AlertCircle,
  Radio,
  Globe2,
  Grid3X3,
  Zap,
  Star,
  Navigation,
  X,
  CheckCircle,
  Plus,
} from "lucide-react";
import { useOrbitGateStore, type TLEEntry } from "@/lib/orbitgate-store";
import { SectionHeader } from "./SectionHeader";
import { toast } from "sonner";

const REGIME_COLORS: Record<string, string> = {
  LEO: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
  MEO: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  GEO: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  HEO: "text-purple-400 bg-purple-500/15 border-purple-500/30",
  SSO: "text-teal-400 bg-teal-500/15 border-teal-500/30",
};

const POPULAR_SATELLITES = [
  { name: "ISS (ZARYA)", norad_id: "25544", regime: "LEO" },
  { name: "HUBBLE", norad_id: "20580", regime: "LEO" },
  { name: "HST", norad_id: "43205", regime: "LEO" },
  { name: "NOAA 19", norad_id: "33591", regime: "SSO" },
  { name: "GOES 16", norad_id: "41866", regime: "GEO" },
  { name: "GOES 18", norad_id: "54224", regime: "GEO" },
  { name: "STARLINK-1007", norad_id: "48274", regime: "LEO" },
  { name: "STARLINK-30000", norad_id: "56032", regime: "LEO" },
  { name: "GPS BIIR-2 (PRN 13)", norad_id: "24876", regime: "MEO" },
  { name: "TERRA", norad_id: "25994", regime: "SSO" },
  { name: "AQUA", norad_id: "27424", regime: "SSO" },
  { name: "LANDSAT 9", norad_id: "49260", regime: "SSO" },
];

const TLE_GROUPS = [
  { id: "catalog", label: "Catalog", icon: Grid3X3 },
  { id: "space-station", label: "Space Station", icon: Globe2 },
  { id: "active", label: "Active", icon: Zap },
  { id: "starlink", label: "Starlink", icon: Grid3X3 },
  { id: "gps", label: "GPS", icon: Navigation },
  { id: "cubesat", label: "CubeSat", icon: Radio },
  { id: "weather", label: "Weather", icon: Globe2 },
  { id: "resource", label: "Resource", icon: Satellite },
  { id: "science", label: "Science", icon: Star },
];

function TLEEntryCard({
  entry,
  onPropagate,
  comparisonMode,
  alreadyInComparison,
}: {
  entry: TLEEntry;
  onPropagate: (entry: TLEEntry) => void;
  comparisonMode: boolean;
  alreadyInComparison: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 hover:border-cyan-500/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm shrink-0" aria-hidden="true">🛰️</span>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {entry.name}
                </h4>
                <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" title="Active" />
                <Badge
                  variant="outline"
                  className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-300 dark:border-slate-700 shrink-0"
                >
                  {entry.norad_id}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Satellite className="h-3 w-3" />
                  {entry.epoch}
                </span>
                <span className="text-gray-600">·</span>
                <span>{entry.source}</span>
              </div>
              <div className="mt-2 text-[10px] font-mono text-gray-600 leading-tight truncate">
                {entry.line1}
              </div>
              <div className="text-[10px] font-mono text-gray-600 leading-tight truncate">
                {entry.line2}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onPropagate(entry)}
              disabled={comparisonMode && alreadyInComparison}
              className={`shrink-0 h-8 px-3 text-xs ${
                comparisonMode && alreadyInComparison
                  ? "bg-slate-700 text-gray-500 cursor-not-allowed"
                  : comparisonMode
                    ? "bg-amber-600 hover:bg-amber-500 text-gray-900 dark:text-white"
                    : "bg-cyan-600 hover:bg-cyan-500 text-gray-900 dark:text-white"
              }`}
            >
              {comparisonMode ? (
                alreadyInComparison ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              {comparisonMode
                ? alreadyInComparison
                  ? "Added"
                  : "Add to Compare"
                : "Propagate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TLESkeleton() {
  return (
    <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
      <CardContent className="p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40 bg-gray-100 dark:bg-slate-800" />
          <Skeleton className="h-4 w-16 bg-gray-100 dark:bg-slate-800" />
        </div>
        <Skeleton className="h-3 w-56 bg-gray-100 dark:bg-slate-800" />
        <Skeleton className="h-3 w-full bg-gray-100 dark:bg-slate-800" />
        <Skeleton className="h-3 w-full bg-gray-100 dark:bg-slate-800" />
      </CardContent>
    </Card>
  );
}

export function TLEBrowser() {
  const {
    selectedTLE,
    setSelectedTLE,
    tleEntries,
    setTLEEntries,
    isFetchingTLE,
    setIsFetchingTLE,
    comparisonMode,
    comparisonSatellites,
    addToComparison,
  } = useOrbitGateStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoLoaded = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-load the bundled catalog on first mount
  useEffect(() => {
    if (hasAutoLoaded.current) return;
    const timer = setTimeout(() => {
      hasAutoLoaded.current = true;
      fetchByGroup("catalog");
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return POPULAR_SATELLITES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.norad_id.includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  const fetchByGroup = async (group: string) => {
    setActiveGroup(group);
    setError(null);
    setIsFetchingTLE(true);
    setTLEEntries([]);

    try {
      let entries: TLEEntry[] = [];
      let source = "";

      if (group === "catalog") {
        // Load all bundled TLEs at once (instant, no network)
        const res = await fetch("/api/orbitgate/fetch-tle?mode=catalog");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          entries = data.data.map(
            (e: Record<string, string>) => ({
              name: e.name,
              line1: e.line1,
              line2: e.line2,
              norad_id: e.norad_id,
              source: e.source,
              fetched_at: e.fetched_at,
              epoch: e.epoch,
            })
          );
          source = "bundled";
        }
      } else {
        const res = await fetch(
          `/api/orbitgate/fetch-tle?mode=group&group=${encodeURIComponent(group)}`
        );
        const data = await res.json();

        if (data.success && data.data?.entries) {
          entries = data.data.entries.map(
            (e: Record<string, string>) => ({
              name: e.name,
              line1: e.line1,
              line2: e.line2,
              norad_id: e.norad_id,
              source: e.source,
              fetched_at: e.fetched_at,
              epoch: e.epoch,
            })
          );
          source = data.data.source || group;
        } else {
          setError(data.error || "Failed to fetch TLE group data.");
          toast.error("Failed to fetch TLE data.");
        }
      }

      if (entries.length > 0) {
        setTLEEntries(entries);
        toast.success("TLE Catalog Loaded", { description: `${entries.length} satellites loaded` });
      }
    } catch {
      setError("Network error — unable to reach the API.");
      toast.error("Network error fetching TLE data.");
    } finally {
      setIsFetchingTLE(false);
    }
  };

  const fetchByNorad = async (noradId: string, name: string) => {
    setError(null);
    setIsFetchingTLE(true);
    setTLEEntries([]);
    setShowDropdown(false);

    try {
      const res = await fetch(
        `/api/orbitgate/fetch-tle?mode=norad&norad_id=${encodeURIComponent(noradId)}`
      );
      const data = await res.json();

      if (data.success && data.data?.entries?.length > 0) {
        const entries: TLEEntry[] = data.data.entries.map(
          (e: Record<string, string>) => ({
            name: e.name,
            line1: e.line1,
            line2: e.line2,
            norad_id: e.norad_id,
            source: e.source,
            fetched_at: e.fetched_at,
            epoch: e.epoch,
          })
        );
        setTLEEntries(entries);
        toast.success(`Loaded TLE for ${name || noradId}`);
      } else {
        setError(data.error || `No TLE found for NORAD ID ${noradId}.`);
        toast.error("No TLE data found for that satellite.");
      }
    } catch {
      setError("Network error — unable to reach the API.");
      toast.error("Network error fetching TLE data.");
    } finally {
      setIsFetchingTLE(false);
    }
  };

  const handlePropagate = (entry: TLEEntry) => {
    if (comparisonMode) {
      addToComparison(entry);
      if (comparisonSatellites.length < 4 && !comparisonSatellites.some((s) => s.norad_id === entry.norad_id)) {
        toast.success(`Added ${entry.name} to comparison`);
      }
      return;
    }
    setSelectedTLE(entry);
    toast.success(`Selected ${entry.name} for propagation`);

    // Scroll to propagator section
    const el = document.getElementById("propagator");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isAlreadyInComparison = (noradId: string) =>
    comparisonSatellites.some((s) => s.norad_id === noradId);

  return (
    <section id="tle-browser" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="TLE Browser"
          subtitle="Fetch real TLE data from CelesTrak. Search for satellites or browse by group, then propagate their orbits."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Search Bar */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search satellites (ISS, Hubble, NOAA, Starlink...)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredSuggestions.length > 0) {
                        const s = filteredSuggestions[0];
                        setSearchQuery(s.name);
                        fetchByNorad(s.norad_id, s.name);
                        setActiveGroup(null);
                      }
                    }}
                    className="pl-10 pr-10 bg-gray-50 dark:bg-slate-950/50 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setShowDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                <AnimatePresence>
                  {showDropdown && filteredSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
                    >
                      {filteredSuggestions.map((sat) => (
                        <button
                          key={sat.norad_id}
                          onClick={() => {
                            setSearchQuery(sat.name);
                            fetchByNorad(sat.norad_id, sat.name);
                            setActiveGroup(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 dark:bg-slate-800 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Satellite className="h-3.5 w-3.5 text-cyan-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-200">
                              {sat.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-gray-500">
                            {sat.norad_id}
                          </span>
                          {sat.regime && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${REGIME_COLORS[sat.regime] || "text-gray-400 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700"}`}>
                              {sat.regime}
                            </span>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Group Selector Buttons */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  Browse by Group
                </p>
                <div className="flex flex-wrap gap-2">
                  {TLE_GROUPS.map((group) => {
                    const Icon = group.icon;
                    const isActive = activeGroup === group.id;
                    return (
                      <Button
                        key={group.id}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => fetchByGroup(group.id)}
                        disabled={isFetchingTLE}
                        className={
                          isActive
                            ? "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-gray-900 dark:text-white border-cyan-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                            : "bg-gray-100 dark:bg-slate-800/80 border-gray-300 dark:border-slate-700 text-gray-400 hover:text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-slate-600 hover:bg-gray-100 dark:bg-slate-800"
                        }
                      >
                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                        {group.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Error State */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-rose-400 hover:text-rose-600 dark:text-rose-300 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading Skeletons */}
              {isFetchingTLE && (
                <div className="space-y-2" ref={scrollRef}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TLESkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Results */}
              {!isFetchingTLE && tleEntries.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500 font-medium">
                      {tleEntries.length} satellites loaded
                      {activeGroup && ` · ${activeGroup}`}
                    </p>
                    <div className="flex items-center gap-2">
                      {comparisonMode && comparisonSatellites.length > 0 && (
                        <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
                          <Plus className="h-3 w-3" />
                          {comparisonSatellites.length} satellite{comparisonSatellites.length > 1 ? "s" : ""} selected
                        </Badge>
                      )}
                      {!comparisonMode && selectedTLE && (
                        <Badge className="text-[10px] bg-cyan-500/15 text-cyan-400 border-cyan-500/30 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Selected: {selectedTLE.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="h-[480px]">
                    <div className="space-y-2 pr-3 relative">
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md">
                        <div className="absolute left-0 right-0 h-px bg-cyan-400/10" style={{ animation: "scan-line 4s linear infinite" }} />
                      </div>
                      <AnimatePresence>
                        {tleEntries.map((entry, i) => (
                          <TLEEntryCard
                            key={`${entry.norad_id}-${i}`}
                            entry={entry}
                            onPropagate={handlePropagate}
                            comparisonMode={comparisonMode}
                            alreadyInComparison={isAlreadyInComparison(entry.norad_id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Empty State */}
              {!isFetchingTLE && !error && tleEntries.length === 0 && (
                <div className="text-center py-12">
                  <Satellite className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Search for a satellite or select a group to browse
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Data sourced from CelesTrak in real-time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}