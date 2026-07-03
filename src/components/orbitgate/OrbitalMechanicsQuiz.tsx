"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Clock,
  Trophy,
  Flame,
  Target,
  Zap,
  Star,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  Lightbulb,
  Award,
  Medal,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ───────────────────────────────────────────────────────────
type QuizMode = "practice" | "timed" | "expert";
type QuizPhase = "idle" | "playing" | "answered" | "results";

interface Question {
  text: string;
  answers: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 1 | 2 | 3;
  topic: string;
  hint: string;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  mode: QuizMode;
  date: string;
  accuracy: number;
  grade: string;
}

interface QuizState {
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  answeredCount: number;
  topicResults: Record<string, { correct: number; total: number }>;
}

// ─── Question Bank (20 questions) ────────────────────────────────────
const QUESTION_BANK: Question[] = [
  {
    text: "According to Kepler's Third Law, how does the orbital period relate to the semi-major axis?",
    answers: [
      "P² is proportional to a³",
      "P is proportional to a²",
      "P³ is proportional to a²",
      "P is proportional to a⁻¹",
    ],
    correctIndex: 0,
    explanation:
      "Kepler's Third Law states that the square of the orbital period (P²) is directly proportional to the cube of the semi-major axis (a³). For Earth orbits: P² = a³ when P is in years and a is in AU.",
    difficulty: 1,
    topic: "Kepler's Laws",
    hint: "Think about the mathematical relationship — it involves squaring one quantity and cubing the other.",
  },
  {
    text: "What is the approximate escape velocity from Earth's surface?",
    answers: ["7.9 km/s", "11.2 km/s", "3.1 km/s", "16.7 km/s"],
    correctIndex: 1,
    explanation:
      "Earth's escape velocity is approximately 11.2 km/s. This is √2 times the orbital velocity at the surface (7.9 km/s). It's the minimum speed needed for an object to escape Earth's gravitational pull without further propulsion.",
    difficulty: 1,
    topic: "Escape Velocity",
    hint: "It's about 1.414 times the circular orbital velocity at Earth's surface.",
  },
  {
    text: "In a Hohmann transfer orbit, when is the second burn performed?",
    answers: [
      "At perigee of the transfer orbit",
      "At apogee of the transfer orbit",
      "At the midpoint of the transfer",
      "After one complete orbit",
    ],
    correctIndex: 1,
    explanation:
      "The second burn of a Hohmann transfer is performed at the apogee of the elliptical transfer orbit. This circularizes the orbit at the higher altitude. The first burn at perigee raises the apogee, and the second burn at apogee raises the perigee to match.",
    difficulty: 2,
    topic: "Hohmann Transfer",
    hint: "The first burn puts you on the ellipse. The second burn must happen at the highest point to circularize.",
  },
  {
    text: "What does the vis-viva equation relate?",
    answers: [
      "Orbital period to semi-major axis",
      "Velocity to orbital radius and semi-major axis",
      "Angular momentum to eccentricity",
      "True anomaly to eccentric anomaly",
    ],
    correctIndex: 1,
    explanation:
      "The vis-viva equation v² = μ(2/r - 1/a) relates the orbital velocity (v) at any point to the distance from the central body (r) and the orbit's semi-major axis (a). It's valid at every point on an elliptical orbit.",
    difficulty: 2,
    topic: "Vis-Viva Equation",
    hint: "It tells you how fast you're going at any distance from the central body.",
  },
  {
    text: "Which orbital inclination provides the best coverage of high-latitude regions?",
    answers: [
      "0° (equatorial)",
      "28.5° (Kennedy Space Center)",
      "98° (sun-synchronous)",
      "90° (polar)",
    ],
    correctIndex: 3,
    explanation:
      "A 90° polar orbit passes over the poles, providing coverage of all latitudes including the highest. Sun-synchronous orbits (~98°) also provide near-global coverage but are slightly retrograde. Equatorial orbits never reach high latitudes.",
    difficulty: 1,
    topic: "Inclination",
    hint: "Think about which orbit path would pass directly over the North and South Poles.",
  },
  {
    text: "What is station-keeping in the context of satellite operations?",
    answers: [
      "Repairing satellite hardware remotely",
      "Maintaining the satellite's intended orbital position",
      "Keeping the satellite powered on continuously",
      "Communicating with ground stations regularly",
    ],
    correctIndex: 1,
    explanation:
      "Station-keeping refers to the maneuvers performed to maintain a satellite in its assigned orbital position and configuration. This includes compensating for perturbations from atmospheric drag, solar radiation pressure, lunar/solar gravitational effects, and Earth's oblateness (J2).",
    difficulty: 1,
    topic: "Station-Keeping",
    hint: "It's about counteracting forces that would push the satellite away from its desired orbit.",
  },
  {
    text: "What is the primary cause of orbital decay for satellites in LEO?",
    answers: [
      "Solar radiation pressure",
      "Atmospheric drag",
      "Lunar gravitational perturbation",
      "Magnetic field interactions",
    ],
    correctIndex: 1,
    explanation:
      "Atmospheric drag is the primary cause of orbital decay in LEO (below ~1000 km). Although the atmosphere is extremely thin at orbital altitudes, it's sufficient to gradually reduce orbital energy and lower the satellite's altitude over time. Solar activity significantly affects drag rates.",
    difficulty: 1,
    topic: "Orbital Decay",
    hint: "Even in space, there's a very thin layer of something that causes friction.",
  },
  {
    text: "A ground track that forms a figure-8 pattern is characteristic of which orbit type?",
    answers: [
      "Geostationary orbit",
      "Molniya orbit",
      "Low Earth orbit",
      "Sun-synchronous orbit",
    ],
    correctIndex: 1,
    explanation:
      "Molniya orbits are highly elliptical with ~12-hour periods and 63.4° inclination. Their high eccentricity causes the satellite to spend most of its time near apogee (over high latitudes), creating a distinctive figure-8 ground track when viewed in a rotating Earth frame.",
    difficulty: 2,
    topic: "Ground Track",
    hint: "This orbit type was developed by the Soviet Union for communications over high latitudes.",
  },
  {
    text: "What is the orbital period of a GPS satellite (altitude ~20,200 km)?",
    answers: ["6 hours", "8 hours", "12 hours", "24 hours"],
    correctIndex: 2,
    explanation:
      "GPS satellites orbit at approximately 20,200 km altitude with a period of about 11 hours 58 minutes (half a sidereal day). This means they complete roughly 2 orbits per day, and their ground track repeats daily, which is intentional for navigation accuracy.",
    difficulty: 2,
    topic: "Orbital Periods",
    hint: "It's designed so the ground track repeats every day. Think about what fraction of a sidereal day that would be.",
  },
  {
    text: "For a Hohmann transfer from LEO (200 km) to GEO (35,786 km), what is the approximate Δv for the first burn?",
    answers: ["1.5 km/s", "2.4 km/s", "3.9 km/s", "5.2 km/s"],
    correctIndex: 1,
    explanation:
      "The first burn of a Hohmann transfer from 200 km LEO to GEO requires approximately 2.44 km/s. This is calculated using the vis-viva equation. The circular velocity at 200 km is ~7.79 km/s, and the transfer orbit perigee velocity is ~10.23 km/s, giving Δv ≈ 2.44 km/s.",
    difficulty: 3,
    topic: "Hohmann Transfer",
    hint: "Use the vis-viva equation. The circular velocity at LEO is about 7.8 km/s.",
  },
  {
    text: "Kepler's Second Law (equal areas in equal times) implies that a satellite moves:",
    answers: [
      "At constant speed throughout its orbit",
      "Fastest at perigee, slowest at apogee",
      "Fastest at apogee, slowest at perigee",
      "At a speed inversely proportional to altitude",
    ],
    correctIndex: 1,
    explanation:
      "Kepler's Second Law states that a line from the central body to the satellite sweeps equal areas in equal time intervals. Since the satellite is closer to Earth at perigee, it must travel faster to sweep the same area as the longer arc near apogee. Conservation of angular momentum explains this.",
    difficulty: 2,
    topic: "Kepler's Laws",
    hint: "Think about conservation of angular momentum — what happens when the satellite is closest to Earth?",
  },
  {
    text: "What is the J2 perturbation caused by?",
    answers: [
      "Solar radiation pressure",
      "Earth's equatorial bulge (oblateness)",
      "Lunar gravitational pull",
      "Atmospheric tides",
    ],
    correctIndex: 1,
    explanation:
      "The J2 perturbation is caused by Earth's oblateness — the equatorial bulge makes Earth slightly wider than tall. This asymmetry creates a torque on satellites, causing precession of the ascending node (RAAN) and argument of perigee. It's the dominant perturbation for most Earth orbits.",
    difficulty: 2,
    topic: "Orbital Perturbations",
    hint: "J2 refers to the second zonal harmonic coefficient in Earth's gravitational field model.",
  },
  {
    text: "A geostationary orbit must have which combination of parameters?",
    answers: [
      "Altitude 35,786 km, inclination 0°, period 24h",
      "Altitude 20,200 km, inclination 55°, period 12h",
      "Altitude 408 km, inclination 51.6°, period 90min",
      "Altitude 800 km, inclination 98.7°, period 101min",
    ],
    correctIndex: 0,
    explanation:
      "A geostationary orbit (GEO) has an altitude of 35,786 km, zero inclination, and matches Earth's rotation period of approximately 23h 56m 4s (sidereal day). This makes the satellite appear stationary relative to a point on Earth's surface — essential for communications and weather satellites.",
    difficulty: 1,
    topic: "Orbital Periods",
    hint: "The satellite must match Earth's rotation — it needs to be at just the right altitude for a 24-hour period.",
  },
  {
    text: "What is a sun-synchronous orbit and why is it useful?",
    answers: [
      "An orbit that always stays in sunlight — useful for power",
      "An orbit whose plane precesses to track the sun — useful for consistent lighting in imaging",
      "An orbit at Earth-Sun L1 point — useful for solar observation",
      "An orbit synchronized with the solar day — useful for communications",
    ],
    correctIndex: 1,
    explanation:
      "A sun-synchronous orbit (SSO) is a nearly polar orbit (~98° inclination) where the orbital plane precesses at the same rate as Earth's orbit around the Sun (~1°/day). This ensures the satellite passes over any given point at the same local solar time, providing consistent illumination conditions for Earth observation.",
    difficulty: 2,
    topic: "Ground Track",
    hint: "The key benefit is consistent lighting conditions for every pass over the same location.",
  },
  {
    text: "In the vis-viva equation v² = μ(2/r - 1/a), what does μ represent?",
    answers: [
      "The mass of the satellite",
      "The gravitational parameter (G × M) of the central body",
      "The mean motion of the orbit",
      "The semi-minor axis",
    ],
    correctIndex: 1,
    explanation:
      "In the vis-viva equation, μ (mu) is the standard gravitational parameter, equal to G × M where G is the gravitational constant and M is the mass of the central body. For Earth, μ ≈ 398,600 km³/s². This parameter combines G and M since their product can be measured more precisely than either alone.",
    difficulty: 1,
    topic: "Vis-Viva Equation",
    hint: "It's a property of the central body being orbited, not the satellite itself.",
  },
  {
    text: "What is the approximate orbital velocity of the ISS at 408 km altitude?",
    answers: ["5.2 km/s", "7.66 km/s", "11.2 km/s", "3.07 km/s"],
    correctIndex: 1,
    explanation:
      "The ISS orbits at approximately 7.66 km/s at its 408 km altitude. This is calculated from v = √(μ/r) where r = 6371 + 408 = 6779 km and μ = 398,600 km³/s². At this speed, it completes an orbit in about 92.5 minutes.",
    difficulty: 2,
    topic: "Orbital Velocity",
    hint: "Use the circular orbit velocity formula. Earth's radius plus 408 km gives the orbital radius.",
  },
  {
    text: "What is the argument of perigee (ω)?",
    answers: [
      "The angle from the vernal equinox to the ascending node",
      "The angle from the ascending node to the perigee, measured in the orbital plane",
      "The angle between the orbital plane and the equatorial plane",
      "The true anomaly at the current position",
    ],
    correctIndex: 1,
    explanation:
      "The argument of perigee (ω) is the angle measured at the focus (Earth's center) from the ascending node to the perigee point, along the direction of motion in the orbital plane. Combined with RAAN (Ω) and inclination (i), it fully specifies the orientation of the orbit.",
    difficulty: 3,
    topic: "Orbital Elements",
    hint: "It's measured in the orbital plane from a specific reference point on the orbit.",
  },
  {
    text: "Which factor most significantly accelerates orbital decay during solar maximum?",
    answers: [
      "Increased solar radiation pressure",
      "Expansion of Earth's upper atmosphere due to heating",
      "Stronger solar magnetic field interactions",
      "Increased solar wind particle density",
    ],
    correctIndex: 1,
    explanation:
      "During solar maximum, increased extreme ultraviolet radiation heats and expands Earth's upper atmosphere (thermosphere), significantly increasing atmospheric density at orbital altitudes. This expanded atmosphere causes much greater drag on LEO satellites, accelerating orbital decay. Satellites can lose several km of altitude per month.",
    difficulty: 3,
    topic: "Orbital Decay",
    hint: "Think about what happens to the thin atmosphere at orbital altitudes when the Sun is very active.",
  },
  {
    text: "What is a bi-elliptic transfer and when is it more efficient than a Hohmann transfer?",
    answers: [
      "A transfer using two elliptical orbits — always more efficient",
      "A transfer via a very high intermediate orbit — more efficient when the radius ratio exceeds ~11.94",
      "A transfer between two elliptical orbits of equal eccentricity",
      "A transfer that avoids the Van Allen radiation belts",
    ],
    correctIndex: 1,
    explanation:
      "A bi-elliptic transfer uses three burns: first to a highly elliptical orbit, second at the apoapsis to adjust, and third to circularize. It's more Δv-efficient than Hohmann when the ratio of final to initial orbit radii exceeds approximately 11.94. Despite requiring more burns and time, the total Δv can be lower for very large orbit changes.",
    difficulty: 3,
    topic: "Hohmann Transfer",
    hint: "It involves going much higher than your target before coming back down to it.",
  },
  {
    text: "For a retrograde orbit, which statement is true?",
    answers: [
      "It has an inclination of 0° and moves eastward",
      "It has an inclination between 0° and 90°",
      "It has an inclination greater than 90° and moves counter to Earth's rotation",
      "It cannot be achieved from equatorial launch sites",
    ],
    correctIndex: 2,
    explanation:
      "A retrograde orbit has an inclination greater than 90° (up to 180°). The satellite moves opposite to Earth's rotation (westward). These orbits require more Δv to achieve from Earth's surface because you must overcome Earth's rotational velocity (~465 m/s at the equator) rather than using it as a boost.",
    difficulty: 2,
    topic: "Inclination",
    hint: "Retrograde means going backward. In orbital mechanics, this is defined by the inclination angle.",
  },
];

// ─── Mode Config ──────────────────────────────────────────────────────
const MODE_CONFIG: Record<QuizMode, { label: string; icon: React.ReactNode; multiplier: number; timer: number; hints: boolean }> = {
  practice: { label: "Practice", icon: <Brain className="h-4 w-4" />, multiplier: 1, timer: 0, hints: true },
  timed: { label: "Timed Challenge", icon: <Clock className="h-4 w-4" />, multiplier: 2, timer: 60, hints: false },
  expert: { label: "Expert", icon: <Star className="h-4 w-4" />, multiplier: 3, timer: 0, hints: false },
};

const QUESTIONS_PER_ROUND = 10;
const LEADERBOARD_KEY = "orbitgate-quiz-leaderboard";
const BASE_SCORE = 10;

// ─── Helper: Shuffle ─────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Helper: Grade ───────────────────────────────────────────────────
function getGrade(accuracy: number): { letter: string; color: string; icon: React.ReactNode } {
  if (accuracy >= 90) return { letter: "A", color: "text-cyan-400", icon: <Award className="h-8 w-8 text-cyan-400" /> };
  if (accuracy >= 75) return { letter: "B", color: "text-sky-400", icon: <Medal className="h-8 w-8 text-sky-400" /> };
  if (accuracy >= 60) return { letter: "C", color: "text-amber-400", icon: <ShieldCheck className="h-8 w-8 text-amber-400" /> };
  if (accuracy >= 40) return { letter: "D", color: "text-orange-400", icon: <Target className="h-8 w-8 text-orange-400" /> };
  return { letter: "F", color: "text-rose-400", icon: <Flame className="h-8 w-8 text-rose-400" /> };
}

// ─── Component ───────────────────────────────────────────────────────
export function OrbitalMechanicsQuiz() {
  const [phase, setPhase] = useState<QuizPhase>("idle");
  const [mode, setMode] = useState<QuizMode>("practice");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [totalTime, setTotalTime] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>({
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    answeredCount: 0,
    topicResults: {},
  });
  const [displayScore, setDisplayScore] = useState(0);
  const [scorePop, setScorePop] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [copied, setCopied] = useState(false);
  const [animatingScore, setAnimatingScore] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // Load leaderboard from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LEADERBOARD_KEY);
      if (stored) setLeaderboard(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Animated score counter
  useEffect(() => {
    if (displayScore === quizState.score) return;
    const diff = quizState.score - displayScore;
    const step = Math.max(1, Math.ceil(Math.abs(diff) / 10));
    animFrameRef.current = requestAnimationFrame(function tick() {
      setDisplayScore((prev) => {
        const next = prev + (diff > 0 ? step : -step);
        if ((diff > 0 && next >= quizState.score) || (diff < 0 && next <= quizState.score)) return quizState.score;
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [quizState.score, displayScore]);

  // Timer
  useEffect(() => {
    if (phase === "playing" && MODE_CONFIG[mode].timer > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            finishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, mode, currentIndex]);

  // Save leaderboard
  const saveLeaderboard = useCallback((entry: LeaderboardEntry) => {
    setLeaderboard((prev) => {
      const updated = [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 5);
      try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  // Start quiz
  const startQuiz = useCallback((selectedMode: QuizMode) => {
    setMode(selectedMode);
    const shuffled = shuffleArray(QUESTION_BANK);
    // For expert mode, prefer harder questions
    const pool = selectedMode === "expert"
      ? [...shuffled.filter(q => q.difficulty >= 2), ...shuffled].slice(0, QUESTIONS_PER_ROUND)
      : shuffled.slice(0, QUESTIONS_PER_ROUND);
    setQuestions(pool);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowHint(false);
    setTimeLeft(MODE_CONFIG[selectedMode].timer);
    setTotalTime(0);
    setQuizState({
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      answeredCount: 0,
      topicResults: {},
    });
    setDisplayScore(0);
    setPhase("playing");
    startTimeRef.current = Date.now();
  }, []);

  // Select answer
  const handleAnswer = useCallback((answerIndex: number) => {
    if (phase !== "playing" || selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    setPhase("answered");

    const q = questions[currentIndex];
    const isCorrect = answerIndex === q.correctIndex;
    const modeMultiplier = MODE_CONFIG[mode].multiplier;
    const pointsEarned = isCorrect ? BASE_SCORE * q.difficulty * modeMultiplier : 0;

    setQuizState((prev) => {
      const newTopicResults = { ...prev.topicResults };
      if (!newTopicResults[q.topic]) newTopicResults[q.topic] = { correct: 0, total: 0 };
      newTopicResults[q.topic] = {
        correct: newTopicResults[q.topic].correct + (isCorrect ? 1 : 0),
        total: newTopicResults[q.topic].total + 1,
      };

      return {
        score: prev.score + pointsEarned,
        streak: isCorrect ? prev.streak + 1 : 0,
        maxStreak: isCorrect ? Math.max(prev.maxStreak, prev.streak + 1) : prev.maxStreak,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        answeredCount: prev.answeredCount + 1,
        topicResults: newTopicResults,
      };
    });

    if (isCorrect) {
      setScorePop(true);
      setTimeout(() => setScorePop(false), 600);
    }

    // Stop timer on last question
    if (currentIndex === QUESTIONS_PER_ROUND - 1) {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [phase, selectedAnswer, questions, currentIndex, mode]);

  // Next question
  const nextQuestion = useCallback(() => {
    if (currentIndex >= QUESTIONS_PER_ROUND - 1) {
      finishQuiz();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowHint(false);
    setPhase("playing");
    if (MODE_CONFIG[mode].timer > 0) {
      setTimeLeft(MODE_CONFIG[mode].timer);
    }
  }, [currentIndex, mode]);

  // Finish quiz
  const finishQuiz = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTotalTime(elapsed);
    setPhase("results");
  }, [currentIndex]);

  // Restart
  const restartQuiz = useCallback(() => {
    setPhase("idle");
    setSelectedAnswer(null);
    setCurrentIndex(0);
    setQuestions([]);
    setPlayerName("");
  }, []);

  // Save to leaderboard
  const saveScore = useCallback(() => {
    if (!playerName.trim()) return;
    const accuracy = quizState.answeredCount > 0 ? Math.round((quizState.correctCount / quizState.answeredCount) * 100) : 0;
    const grade = getGrade(accuracy);
    saveLeaderboard({
      name: playerName.trim(),
      score: quizState.score,
      mode,
      date: new Date().toLocaleDateString(),
      accuracy,
      grade: grade.letter,
    });
  }, [playerName, quizState, mode, saveLeaderboard]);

  // Share score
  const shareScore = useCallback(() => {
    const accuracy = quizState.answeredCount > 0 ? Math.round((quizState.correctCount / quizState.answeredCount) * 100) : 0;
    const grade = getGrade(accuracy);
    const mins = Math.floor(totalTime / 60);
    const secs = totalTime % 60;
    const text = `🚀 OrbitGate Orbital Mechanics Quiz\nGrade: ${grade.letter} | Score: ${quizState.score} | Accuracy: ${accuracy}%\nMode: ${MODE_CONFIG[mode].label} | Time: ${mins}:${secs.toString().padStart(2, "0")}\nMax Streak: ${quizState.maxStreak} 🔥`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [quizState, totalTime, mode]);

  // Toggle hint
  const toggleHint = useCallback(() => {
    setShowHint((prev) => !prev);
  }, []);

  // ─── Derived ───────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex] ?? null;
  const accuracy = quizState.answeredCount > 0 ? Math.round((quizState.correctCount / quizState.answeredCount) * 100) : 0;
  const grade = getGrade(accuracy);
  const progressPercent = ((quizState.answeredCount) / QUESTIONS_PER_ROUND) * 100;

  // Weak topics for results
  const weakTopics = Object.entries(quizState.topicResults)
    .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.6)
    .map(([topic, v]) => ({ topic, accuracy: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // ─── JSX Constants ─────────────────────────────────────────────────
  const modeButtons = (
    <div className="flex flex-wrap gap-2 justify-center mb-6">
      {(Object.keys(MODE_CONFIG) as QuizMode[]).map((m) => {
        const cfg = MODE_CONFIG[m];
        const isActive = phase !== "idle" && mode === m;
        return (
          <button
            key={m}
            onClick={() => phase === "idle" && startQuiz(m)}
            disabled={phase !== "idle"}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
              isActive
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                : phase === "idle"
                ? "bg-slate-800/60 border-slate-700/50 text-gray-300 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-slate-800"
                : "bg-slate-900/40 border-slate-800/30 text-gray-600 cursor-not-allowed"
            }`}
          >
            {cfg.icon}
            {cfg.label}
            {cfg.multiplier > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">
                ×{cfg.multiplier}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const statsBar = phase !== "idle" && (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-3 text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Score</div>
        <motion.div
          className={`text-xl font-bold font-mono ${scorePop ? "text-cyan-400" : "text-white"}`}
          animate={scorePop ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          {displayScore}
        </motion.div>
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-3 text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Streak</div>
        <div className="text-xl font-bold font-mono text-white flex items-center justify-center gap-1">
          <Flame className={`h-4 w-4 ${quizState.streak >= 3 ? "text-orange-400" : "text-gray-500"}`} />
          {quizState.streak}
        </div>
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-3 text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Accuracy</div>
        <div className="text-xl font-bold font-mono text-white">{accuracy}%</div>
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-3 text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Progress</div>
        <div className="text-xl font-bold font-mono text-white">
          {quizState.answeredCount}/{QUESTIONS_PER_ROUND}
        </div>
      </div>
    </div>
  );

  const timerDisplay = mode === "timed" && (phase === "playing" || phase === "answered") && (
    <div className="flex items-center gap-2 mb-4">
      <Timer className="h-4 w-4 text-amber-400" />
      <div className="text-sm font-mono text-gray-300">
        Time: <span className={timeLeft <= 10 ? "text-rose-400 font-bold animate-pulse" : "text-white font-bold"}>{timeLeft}s</span>
      </div>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-2">
        <motion.div
          className={`h-full rounded-full ${timeLeft <= 10 ? "bg-rose-500" : "bg-amber-500"}`}
          animate={{ width: `${(timeLeft / MODE_CONFIG[mode].timer) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );

  // ─── Idle Screen ───────────────────────────────────────────────────
  const idleScreen = phase === "idle" && (
    <div className="text-center space-y-6">
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Choose Your Mode</h3>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Test your knowledge of orbital mechanics with 20 questions spanning Kepler&apos;s laws, transfer orbits,
          vis-viva, ground tracks, and more. Each round presents 10 random questions.
        </p>
        {modeButtons}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {([
            { m: "practice" as QuizMode, desc: "No timer, hints available. Great for learning.", color: "text-sky-400" },
            { m: "timed" as QuizMode, desc: "60s per question. 2× score multiplier. Race the clock!", color: "text-amber-400" },
            { m: "expert" as QuizMode, desc: "No hints, harder questions. 3× score multiplier. Prove mastery.", color: "text-rose-400" },
          ]).map((item) => (
            <div
              key={item.m}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                {MODE_CONFIG[item.m].icon}
                <span className={`text-xs font-semibold ${item.color}`}>{MODE_CONFIG[item.m].label}</span>
              </div>
              <p className="text-[11px] text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
          </div>
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div
                key={`${entry.date}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5"
              >
                <span className="text-lg font-bold font-mono w-6 text-center text-gray-500">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{entry.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {MODE_CONFIG[entry.mode].label} · {entry.date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-cyan-400">{entry.score}</div>
                  <div className="text-[11px] text-gray-500">{entry.grade} · {entry.accuracy}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Playing / Answered Screen ─────────────────────────────────────
  const questionScreen = (phase === "playing" || phase === "answered") && currentQuestion && (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Mode tabs (compact) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {MODE_CONFIG[mode].icon}
          <span className="text-xs font-medium text-gray-400">{MODE_CONFIG[mode].label} Mode</span>
          {MODE_CONFIG[mode].multiplier > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">
              ×{MODE_CONFIG[mode].multiplier}
            </span>
          )}
        </div>
        <button
          onClick={restartQuiz}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> Quit
        </button>
      </div>

      {statsBar}
      {timerDisplay}

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>Question {quizState.answeredCount + (phase === "playing" ? 1 : 0)} of {QUESTIONS_PER_ROUND}</span>
          <span className="font-mono">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 font-mono">
            {currentQuestion.topic}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3].map((d) => (
              <span
                key={d}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  d <= currentQuestion.difficulty ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-gray-600"
                }`}
              >
                {"★".repeat(d)}
              </span>
            ))}
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
          {currentQuestion.text}
        </h3>
      </div>

      {/* Answers 2x2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentQuestion.answers.map((answer, i) => {
          let btnClass = "border-slate-700/50 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-800/80 text-gray-200";
          if (phase === "answered") {
            if (i === currentQuestion.correctIndex) {
              btnClass = "border-cyan-500 bg-cyan-500/20 text-cyan-300";
            } else if (i === selectedAnswer && i !== currentQuestion.correctIndex) {
              btnClass = "border-rose-500 bg-rose-500/20 text-rose-300";
            } else {
              btnClass = "border-slate-800/30 bg-slate-900/30 text-gray-600";
            }
          }
          return (
            <motion.button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={phase === "answered"}
              whileHover={phase === "playing" ? { scale: 1.02 } : {}}
              whileTap={phase === "playing" ? { scale: 0.98 } : {}}
              className={`rounded-xl border p-4 text-left text-sm transition-all duration-200 ${btnClass} ${
                phase === "playing" ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full border border-current/30 flex items-center justify-center text-[11px] font-mono mt-0.5">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="leading-relaxed">{answer}</span>
              </div>
              {phase === "answered" && i === currentQuestion.correctIndex && (
                <span className="ml-9 mt-1 text-[11px] text-cyan-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Correct
                </span>
              )}
              {phase === "answered" && i === selectedAnswer && i !== currentQuestion.correctIndex && (
                <span className="ml-9 mt-1 text-[11px] text-rose-400">✗ Incorrect</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Hint button (practice mode only) */}
      {mode === "practice" && phase === "playing" && (
        <button
          onClick={toggleHint}
          className="flex items-center gap-2 text-xs text-amber-400/80 hover:text-amber-400 transition-colors mx-auto"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {showHint ? "Hide Hint" : "Show Hint"}
        </button>
      )}

      {/* Hint display */}
      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/90"
        >
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Hint</span>
          </div>
          {currentQuestion.hint}
        </motion.div>
      )}

      {/* Explanation + Next (after answer) */}
      {phase === "answered" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explanation</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
            {selectedAnswer === currentQuestion.correctIndex && (
              <div className="mt-3 text-sm text-cyan-400 font-medium flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                +{BASE_SCORE * currentQuestion.difficulty * MODE_CONFIG[mode].multiplier} points
                {quizState.streak >= 3 && (
                  <span className="ml-2 text-xs text-orange-400">
                    🔥 {quizState.streak} streak!
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <button
              onClick={nextQuestion}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              {currentIndex >= QUESTIONS_PER_ROUND - 1 ? "View Results" : "Next Question"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );

  // ─── Results Screen ────────────────────────────────────────────────
  const resultsScreen = phase === "results" && (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {grade.icon}
        <h3 className="text-3xl font-bold text-white mt-3">
          Grade: <span className={grade.color}>{grade.letter}</span>
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          {accuracy >= 90 ? "Outstanding! You're an orbital mechanics expert! 🌟" :
           accuracy >= 75 ? "Great job! Solid understanding of orbital mechanics. 🚀" :
           accuracy >= 60 ? "Good effort! Keep studying the fundamentals. 📚" :
           accuracy >= 40 ? "Room for improvement. Review the topics below. 💪" :
           "Keep practicing! Orbital mechanics takes time to master. 🎯"}
        </p>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Score", value: quizState.score.toString(), sub: `×${MODE_CONFIG[mode].multiplier} mode` },
          { label: "Accuracy", value: `${accuracy}%`, sub: `${quizState.correctCount}/${quizState.answeredCount} correct` },
          { label: "Time", value: `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, "0")}`, sub: "total" },
          { label: "Best Streak", value: `${quizState.maxStreak}`, sub: "consecutive" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-4 text-center"
          >
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-2xl font-bold font-mono text-white">{stat.value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Topic breakdown */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-5">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-cyan-400" /> Topic Breakdown
        </h4>
        <div className="space-y-2.5">
          {Object.entries(quizState.topicResults)
            .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
            .map(([topic, v]) => {
              const pct = Math.round((v.correct / v.total) * 100);
              return (
                <div key={topic} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{topic}</span>
                    <span className={`font-mono ${pct >= 80 ? "text-cyan-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                      {v.correct}/{v.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${pct >= 80 ? "bg-cyan-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Weak areas */}
      {weakTopics.length > 0 && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
          <h4 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4" /> Areas to Improve
          </h4>
          <div className="space-y-1.5">
            {weakTopics.map((t) => (
              <div key={t.topic} className="flex items-center justify-between text-xs text-rose-300/80">
                <span>{t.topic}</span>
                <span className="font-mono">{t.accuracy}% accuracy</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save to leaderboard */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-5">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" /> Save to Leaderboard
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter your name..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveScore()}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            maxLength={20}
          />
          <button
            onClick={saveScore}
            disabled={!playerName.trim()}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Leaderboard after save */}
      {leaderboard.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Medal className="h-4 w-4 text-amber-400" /> Top Scores
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {leaderboard.map((entry, i) => (
              <div
                key={`${entry.date}-${entry.name}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
                <span className="text-base w-6 text-center">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{entry.name}</div>
                  <div className="text-[10px] text-gray-500">{MODE_CONFIG[entry.mode].label} · {entry.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-cyan-400">{entry.score}</div>
                  <div className="text-[10px] text-gray-500">{entry.grade} · {entry.accuracy}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={restartQuiz}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <RotateCcw className="h-4 w-4" /> Try Again
        </button>
        <button
          onClick={shareScore}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-gray-300 text-sm font-medium transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-cyan-400" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Share Score"}
        </button>
      </div>
    </div>
  );

  // ─── Main Render ───────────────────────────────────────────────────
  return (
    <section id="orbital-quiz" className="py-16 sm:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="Orbital Mechanics Quiz"
          subtitle="Test your knowledge of orbital mechanics — from Kepler's laws to Hohmann transfers and beyond."
          icon={<Brain className="h-6 w-6 text-cyan-400" />}
          sectionNumber="SEC-46"
        />

        <AnimatePresence mode="wait">
          {idleScreen && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {idleScreen}
            </motion.div>
          )}
          {questionScreen && (
            <motion.div key="question" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              {questionScreen}
            </motion.div>
          )}
          {resultsScreen && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              {resultsScreen}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}