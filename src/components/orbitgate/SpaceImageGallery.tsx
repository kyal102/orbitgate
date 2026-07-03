"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ImageIcon,
  Search,
  Heart,
  X,
  Download,
  Share2,
  Eye,
  Image as ImageIconAlt,
  Globe,
  Satellite,
  Rocket,
  Telescope,
  User,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ImageCategory = "Earth from Space" | "Satellites" | "Launches" | "Deep Space" | "Astronauts";

interface SpaceImage {
  id: number;
  title: string;
  category: ImageCategory;
  gradient: string;
  description: string;
  date: string;
  photographer: string;
  likes: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: Array<{ key: ImageCategory | "All"; label: string; icon: React.ReactNode }> = [
  { key: "All", label: "All", icon: <ImageIconAlt className="h-3.5 w-3.5" /> },
  { key: "Earth from Space", label: "Earth", icon: <Globe className="h-3.5 w-3.5" /> },
  { key: "Satellites", label: "Satellites", icon: <Satellite className="h-3.5 w-3.5" /> },
  { key: "Launches", label: "Launches", icon: <Rocket className="h-3.5 w-3.5" /> },
  { key: "Deep Space", label: "Deep Space", icon: <Telescope className="h-3.5 w-3.5" /> },
  { key: "Astronauts", label: "Astronauts", icon: <User className="h-3.5 w-3.5" /> },
];

const CATEGORY_COLORS: Record<ImageCategory, string> = {
  "Earth from Space": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Satellites: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Launches: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Deep Space": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Astronauts: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const SPACE_IMAGES: SpaceImage[] = [
  {
    id: 1,
    title: "Blue Marble — Pacific View",
    category: "Earth from Space",
    gradient: "radial-gradient(ellipse at 30% 50%, #1e3a5f 0%, #0a1628 50%, #000 100%)",
    description:
      "Iconic view of Earth showing the vast Pacific Ocean, cloud formations, and the thin blue line of atmosphere separating our world from the void.",
    date: "2024-03-15",
    photographer: "ISS Expedition 70",
    likes: 247,
  },
  {
    id: 2,
    title: "Hubble Ultra Deep Field",
    category: "Deep Space",
    gradient: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    description:
      "One of the deepest images of the universe ever taken, revealing thousands of galaxies stretching back to within a few hundred million years of the Big Bang.",
    date: "2023-11-22",
    photographer: "Hubble Space Telescope",
    likes: 312,
  },
  {
    id: 3,
    title: "Starship Orbital Test Flight",
    category: "Launches",
    gradient: "radial-gradient(circle at 60% 40%, #f59e0b33 0%, #0a1628 60%)",
    description:
      "SpaceX Starship during its integrated flight test, the world's largest and most powerful rocket ascending through the atmosphere.",
    date: "2024-06-10",
    photographer: "SpaceX Photo Team",
    likes: 189,
  },
  {
    id: 4,
    title: "Aurora Borealis from ISS",
    category: "Earth from Space",
    gradient: "radial-gradient(ellipse at 50% 70%, #06b6d422 0%, #0f172a30 30%, #1e1b4b 50%, #020617 100%)",
    description:
      "Spectacular green aurora dancing above northern latitudes, captured from the International Space Station during a geomagnetic storm.",
    date: "2024-01-28",
    photographer: "Jasmin Moghbeli / NASA",
    likes: 278,
  },
  {
    id: 5,
    title: "CubeSat Deployment",
    category: "Satellites",
    gradient: "linear-gradient(180deg, #0f172a 0%, #1e293b 40%, #475569 70%, #94a3b8 100%)",
    description:
      "A constellation of CubeSats being released from the ISS JEM airlock, beginning their missions in low Earth orbit.",
    date: "2024-05-03",
    photographer: "ISS / Nanoracks",
    likes: 156,
  },
  {
    id: 6,
    title: "Andromeda Galaxy M31",
    category: "Deep Space",
    gradient: "radial-gradient(circle at 45% 55%, #6d28d9 0%, #3b0764 30%, #0c0a1d 60%, #000 100%)",
    description:
      "Our nearest large galactic neighbor, 2.5 million light-years away, containing roughly one trillion stars in its spiral arms.",
    date: "2023-09-14",
    photographer: "JWST NIRCam",
    likes: 295,
  },
  {
    id: 7,
    title: "Spacewalk at Sunset",
    category: "Astronauts",
    gradient: "linear-gradient(to top, #f97316 0%, #ea580c 20%, #1e293b 40%, #0f172a 100%)",
    description:
      "Astronaut performing extravehicular activity as the ISS passes through orbital sunset, bathed in amber light below the solar array backdrop.",
    date: "2024-02-17",
    photographer: "NASA / Oleg Kononenko",
    likes: 334,
  },
  {
    id: 8,
    title: "Falcon Heavy Side Boosters Landing",
    category: "Launches",
    gradient: "radial-gradient(circle at 50% 80%, #ef444466 0%, #7f1d1d 20%, #1c1917 50%, #000 100%)",
    description:
      "Twin Falcon Heavy side boosters performing synchronized landing at Landing Zones 1 and 2 at Cape Canaveral.",
    date: "2024-04-12",
    photographer: "SpaceX",
    likes: 261,
  },
  {
    id: 9,
    title: "Starlink Mega-Constellation",
    category: "Satellites",
    gradient: "repeating-linear-gradient(0deg, transparent 0px, transparent 18px, rgba(148,163,184,0.06) 18px, rgba(148,163,184,0.06) 19px), radial-gradient(ellipse at 50% 50%, #1e293b 0%, #020617 100%)",
    description:
      "Trails of Starlink satellites captured in a long-exposure photograph, showcasing the scale of the largest satellite constellation ever deployed.",
    date: "2024-07-01",
    photographer: "Mallory Vance",
    likes: 198,
  },
  {
    id: 10,
    title: "Carina Nebula — Cosmic Cliffs",
    category: "Deep Space",
    gradient: "radial-gradient(ellipse at 40% 60%, #dc262622 0%, #7e22ce22 25%, #1e1b4b 50%, #0a0a0a 100%)",
    description:
      "JWST's breathtaking view of the edge of a nearby, young, star-forming region called NGC 3324, resembling craggy mountains.",
    date: "2023-08-05",
    photographer: "JWST / NASA ESA CSA",
    likes: 342,
  },
  {
    id: 11,
    title: "Crew Dragon Endeavour Docking",
    category: "Astronauts",
    gradient: "linear-gradient(160deg, #0284c7 0%, #0369a1 15%, #0f172a 40%, #000 100%)",
    description:
      "Crew Dragon Endeavour approaching the ISS Harmony module during a commercial crew rotation mission.",
    date: "2024-03-08",
    photographer: "ISS / NASA",
    likes: 225,
  },
  {
    id: 12,
    title: "Noctilucent Clouds Over Europe",
    category: "Earth from Space",
    gradient: "linear-gradient(to bottom, #000 0%, #0f172a 30%, #38bdf822 50%, #bae6fd11 70%, #0f172a 85%, #000 100%)",
    description:
      "Rare noctilucent clouds shining electric blue at the mesopause (~80 km altitude), photographed from ISS over Northern Europe.",
    date: "2024-06-22",
    photographer: "Matthew Dominick / NASA",
    likes: 203,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpaceImageGallery() {
  const [activeCategory, setActiveCategory] = useState<ImageCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [selectedImage, setSelectedImage] = useState<SpaceImage | null>(null);

  const filteredImages = useMemo(() => {
    return SPACE_IMAGES.filter((img) => {
      const matchCategory = activeCategory === "All" || img.category === activeCategory;
      const matchSearch =
        !searchQuery || img.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const totalLikes = useMemo(() => {
    return Math.max(...SPACE_IMAGES.map((img) => img.likes + (likedIds.has(img.id) ? 1 : 0)));
  }, [likedIds]);

  const mostLikedImage = useMemo(() => {
    return SPACE_IMAGES.reduce(
      (max, img) => (img.likes > max.likes ? img : max),
      SPACE_IMAGES[0]
    );
  }, []);

  const toggleLike = useCallback((id: number) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <section id="space-gallery" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader
          icon={<ImageIcon className="h-6 w-6 text-cyan-400" />}
          title="Space Image Gallery"
          subtitle="Explore the cosmos through stunning visual captures from missions, telescopes, and astronauts"
          sectionNumber="§51"
        />

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Images", value: SPACE_IMAGES.length, icon: <ImageIconAlt className="h-4 w-4" /> },
            { label: "Categories", value: CATEGORIES.length - 1, icon: <Satellite className="h-4 w-4" /> },
            { label: "Most Liked", value: mostLikedImage.likes, icon: <Heart className="h-4 w-4" /> },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-lg p-3 text-center glass-card-interactive">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="text-cyan-400">{stat.icon}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                  {stat.value}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images by title..."
              className="pl-10 h-9 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800 text-sm placeholder:text-gray-400 focus:border-cyan-500/50 focus:ring-cyan-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200 ${
                  activeCategory === cat.key
                    ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                    : "bg-white/40 dark:bg-slate-900/40 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-800 hover:border-cyan-500/20 hover:text-cyan-400"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Masonry Grid ── */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredImages.map((img, i) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="break-inside-avoid"
              >
                <Card className="group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 overflow-hidden card-hover-lift glass-card-interactive cursor-pointer"
                  onClick={() => setSelectedImage(img)}
                >
                  {/* Image area with gradient */}
                  <div
                    className="relative w-full overflow-hidden"
                    style={{
                      background: img.gradient,
                      minHeight: `${140 + (img.id % 3) * 40}px`,
                    }}
                  >
                    {/* Category badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono border ${CATEGORY_COLORS[img.category]}`}
                      >
                        {img.category}
                      </span>
                    </div>

                    {/* Like button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(img.id);
                      }}
                      className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
                      aria-label={likedIds.has(img.id) ? "Unlike" : "Like"}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 transition-colors ${
                          likedIds.has(img.id) ? "fill-rose-400 text-rose-400" : "text-white/80"
                        }`}
                      />
                    </button>

                    {/* View overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight mb-1.5 line-clamp-1">
                      {img.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        {img.date}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <Heart
                          className={`h-3 w-3 ${
                            likedIds.has(img.id) ? "fill-rose-400 text-rose-400" : ""
                          }`}
                        />
                        {img.likes + (likedIds.has(img.id) ? 1 : 0)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 h-7 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(img);
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredImages.length === 0 && (
          <div className="text-center py-16">
            <ImageIconAlt className="h-10 w-10 text-gray-600 dark:text-gray-500 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No images match your search</p>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Full-size gradient art */}
              <div
                className="w-full"
                style={{
                  background: selectedImage.gradient,
                  minHeight: "280px",
                  maxHeight: "360px",
                }}
              />

              {/* Details */}
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {selectedImage.title}
                    </h2>
                    <span
                      className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-mono border ${CATEGORY_COLORS[selectedImage.category]}`}
                    >
                      {selectedImage.category}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {selectedImage.description}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50/80 dark:bg-slate-800/40 rounded-lg p-3">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                      Date
                    </span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white font-mono">
                      {selectedImage.date}
                    </span>
                  </div>
                  <div className="bg-gray-50/80 dark:bg-slate-800/40 rounded-lg p-3">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                      Photographer / Mission
                    </span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {selectedImage.photographer}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLike(selectedImage.id)}
                    className={`flex-1 h-9 text-xs transition-colors ${
                      likedIds.has(selectedImage.id)
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                        : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-rose-400 hover:border-rose-500/30"
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 mr-1.5 ${
                        likedIds.has(selectedImage.id) ? "fill-rose-400" : ""
                      }`}
                    />
                    Like ({selectedImage.likes + (likedIds.has(selectedImage.id) ? 1 : 0)})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-cyan-400 hover:border-cyan-500/30"
                    onClick={() => setSelectedImage(null)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-cyan-400 hover:border-cyan-500/30"
                    onClick={() => setSelectedImage(null)}
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}