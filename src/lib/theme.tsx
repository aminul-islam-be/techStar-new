"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { seasons, getCurrentSeason, type Season, type SeasonInfo } from "./season";

const THEME_STORAGE_KEY = "techstar-season-theme";
export type ThemeMode = Season | "none" | "auto";

type ThemeContextType = {
  season: Season | "none";
  seasonInfo: SeasonInfo;
  isAuto: boolean;
  setSeason: (value: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const noneSeasonInfo: SeasonInfo = {
  key: "summer",
  nameEn: "Light Theme",
  nameBn: "সাদা থিম",
  emoji: "☀️",
  gradientFrom: "#ffffff",
  gradientTo: "#f8fafc",
  accent: "#2563eb",
  secondary: "#ef4444",
  glowPrimary: "rgba(37,99,235,0.2)",
  glowSecondary: "rgba(239,68,68,0.2)",
  particle: "none",
  moodBn: "ক্লিন ও সতেজ",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isAuto, setIsAuto] = useState(true);
  const [season, setSeasonState] = useState<Season | "none">("summer");

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "none") {
      setIsAuto(false); setSeasonState("none");
    } else if (saved && saved !== "auto" && saved in seasons) {
      setIsAuto(false); setSeasonState(saved as Season);
    } else {
      setIsAuto(true); setSeasonState(getCurrentSeason());
    }
  }, []);

  useEffect(() => {
    if (!isAuto) return;
    const interval = setInterval(() => setSeasonState(getCurrentSeason()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuto]);

  function setSeason(value: ThemeMode) {
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    if (value === "auto") {
      setIsAuto(true); setSeasonState(getCurrentSeason());
    } else {
      setIsAuto(false); setSeasonState(value);
    }
  }

  const seasonInfo = season === "none" ? noneSeasonInfo : (seasons[season as Season] || noneSeasonInfo);

  const cssVars = useMemo(() => ({
    "--season-from": seasonInfo.gradientFrom,
    "--season-to": seasonInfo.gradientTo,
    "--season-accent": seasonInfo.accent,
    "--season-secondary": seasonInfo.secondary,
    "--season-glow-primary": seasonInfo.glowPrimary,
    "--season-glow-secondary": seasonInfo.glowSecondary,
  }) as CSSProperties, [seasonInfo]);

  const value = useMemo(() => ({ season, seasonInfo, isAuto, setSeason }), [season, seasonInfo, isAuto]);

  return (
    <ThemeContext.Provider value={value}>
      <div style={cssVars} className={season === "none" ? "light-mode-active" : ""}>
        {season === "none" && (
          <style>{`
            body { background-color: #ffffff !important; }
            .light-mode-active, .light-mode-active main {
              background: #ffffff !important;
              color: #000000 !important;
            }
            .light-mode-active .text-white { color: #000000 !important; }
            .light-mode-active .bg-slate-950, .light-mode-active .bg-slate-900 {
              background-color: #ffffff !important;
            }
            .light-mode-active .text-slate-400, .light-mode-active .text-slate-300 {
              color: #475569 !important;
            }
            .light-mode-active .border-white\\/10, .light-mode-active .border-white\\/\\[0\\.08\\] { 
              border-color: #e2e8f0 !important; 
            }
            .light-mode-active .bg-white\\/\\[0\\.03\\], .light-mode-active .bg-white\\/\\[0\\.04\\] { 
              background-color: #f1f5f9 !important; 
            }
          `}</style>
        )}
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useSeasonTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useSeasonTheme must be used inside ThemeProvider");
  return context;
}
