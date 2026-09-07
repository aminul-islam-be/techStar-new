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
  },
  rainy: {
    key: "rainy",
    nameEn: "Monsoon",
    nameBn: "বর্ষাকাল",
    emoji: "🌧️",
    gradientFrom: "#0284c7",
    gradientTo: "#0891b2",
    accent: "#0ea5e9",
  },
  autumn: {
    key: "autumn",
    nameEn: "Autumn",
    nameBn: "শরৎকাল",
    emoji: "🌾",
    gradientFrom: "#38bdf8",
    gradientTo: "#818cf8",
    accent: "#60a5fa",
  },
  hemanto: {
    key: "hemanto",
    nameEn: "Late Autumn",
    nameBn: "হেমন্তকাল",
    emoji: "🍂",
    gradientFrom: "#f59e0b",
    gradientTo: "#b45309",
    accent: "#f59e0b",
  },
  winter: {
    key: "winter",
    nameEn: "Winter",
    nameBn: "শীতকাল",
    emoji: "❄️",
    gradientFrom: "#22d3ee",
    gradientTo: "#3b82f6",
    accent: "#38bdf8",
  },
  spring: {
    key: "spring",
    nameEn: "Spring",
    nameBn: "বসন্তকাল",
    emoji: "🌸",
    gradientFrom: "#ec4899",
    gradientTo: "#f43f5e",
    accent: "#f472b6",
  },
};

// Approximate Bengali-calendar season windows mapped onto the
// Gregorian calendar (month*100 + day).
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
