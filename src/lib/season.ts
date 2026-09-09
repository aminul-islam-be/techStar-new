export type Season =
  | "summer"
  | "rainy"
  | "autumn"
  | "hemanto"
  | "winter"
  | "spring";

export type SeasonInfo = {
  key: Season;
  nameEn: string;
  nameBn: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  secondary: string;
  glowPrimary: string;
  glowSecondary: string;
  particle: string;
  moodBn: string;
};

export const SEASON_ORDER: Season[] = [
  "summer",
  "rainy",
  "autumn",
  "hemanto",
  "winter",
  "spring",
];

export const seasons: Record<Season, SeasonInfo> = {
  summer: {
    key: "summer",
    nameEn: "Summer",
    nameBn: "গ্রীষ্মকাল",
    emoji: "☀️",
    gradientFrom: "#f97316",
    gradientTo: "#ef4444",
    accent: "#f97316",
    secondary: "#facc15",
    glowPrimary: "rgba(249, 115, 22, 0.22)",
    glowSecondary: "rgba(250, 204, 21, 0.14)",
    particle: "☀️",
    moodBn: "রোদ ঝলমলে দুপুর",
  },
  rainy: {
    key: "rainy",
    nameEn: "Monsoon",
    nameBn: "বর্ষাকাল",
    emoji: "🌧️",
    gradientFrom: "#0284c7",
    gradientTo: "#0891b2",
    accent: "#0ea5e9",
    secondary: "#334155",
    glowPrimary: "rgba(14, 165, 233, 0.20)",
    glowSecondary: "rgba(51, 65, 85, 0.28)",
    particle: "🌧️",
    moodBn: "মেঘলা আকাশ, ঝুম বৃষ্টি",
  },
  autumn: {
    key: "autumn",
    nameEn: "Autumn",
    nameBn: "শরৎকাল",
    emoji: "🌾",
    gradientFrom: "#38bdf8",
    gradientTo: "#818cf8",
    accent: "#38bdf8",
    secondary: "#e2e8f0",
    glowPrimary: "rgba(56, 189, 248, 0.20)",
    glowSecondary: "rgba(226, 232, 240, 0.16)",
    particle: "🌾",
    moodBn: "কাশফুল আর নীল আকাশ",
  },
  hemanto: {
    key: "hemanto",
    nameEn: "Late Autumn",
    nameBn: "হেমন্তকাল",
    emoji: "🍂",
    gradientFrom: "#f59e0b",
    gradientTo: "#b45309",
    accent: "#f59e0b",
    secondary: "#84cc16",
    glowPrimary: "rgba(245, 158, 11, 0.20)",
    glowSecondary: "rgba(132, 204, 22, 0.14)",
    particle: "🍂",
    moodBn: "সোনালি ধানের ক্ষেত",
  },
  winter: {
    key: "winter",
    nameEn: "Winter",
    nameBn: "শীতকাল",
    emoji: "❄️",
    gradientFrom: "#22d3ee",
    gradientTo: "#3b82f6",
    accent: "#38bdf8",
    secondary: "#f59e0b",
    glowPrimary: "rgba(56, 189, 248, 0.18)",
    glowSecondary: "rgba(245, 158, 11, 0.12)",
    particle: "❄️",
    moodBn: "কুয়াশা আর আগুন পোহানো",
  },
  spring: {
    key: "spring",
    nameEn: "Spring",
    nameBn: "বসন্তকাল",
    emoji: "🌸",
    gradientFrom: "#ec4899",
    gradientTo: "#f43f5e",
    accent: "#f472b6",
    secondary: "#fb923c",
    glowPrimary: "rgba(244, 114, 182, 0.22)",
    glowSecondary: "rgba(251, 146, 60, 0.14)",
    particle: "🌸",
    moodBn: "ফুল ফোটা, পাখির গান",
  },
};

export function getSeasonForDate(date: Date): Season {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const md = month * 100 + day;

  if (md >= 415 && md <= 614) return "summer";
  if (md >= 615 && md <= 814) return "rainy";
  if (md >= 815 && md <= 1014) return "autumn";
  if (md >= 1015 && md <= 1214) return "hemanto";
  if (md >= 1215 || md <= 213) return "winter";
  return "spring";
}

export function getCurrentSeason(): Season {
  return getSeasonForDate(new Date());
}
