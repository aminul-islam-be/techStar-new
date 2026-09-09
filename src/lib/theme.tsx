"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  seasons,
  getCurrentSeason,
  type Season,
  type SeasonInfo,
} from "./season";

const THEME_STORAGE_KEY = "techstar-season-theme";

type ThemeContextType = {
  season: Season;
  seasonInfo: SeasonInfo;
  isAuto: boolean;
  setSeason: (value: Season | "auto") => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isAuto, setIsAuto] = useState(true);
  const [season, setSeasonState] = useState<Season>("summer");

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (saved && saved !== "auto" && saved in seasons) {
      setIsAuto(false);
      setSeasonState(saved as Season);
    } else {
      setIsAuto(true);
      setSeasonState(getCurrentSeason());
    }
  }, []);

  useEffect(() => {
    if (!isAuto) return;

    const interval = setInterval(() => {
      setSeasonState(getCurrentSeason());
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuto]);

  function setSeason(value: Season | "auto") {
    if (value === "auto") {
      window.localStorage.setItem(THEME_STORAGE_KEY, "auto");
      setIsAuto(true);
      setSeasonState(getCurrentSeason());
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
      setIsAuto(false);
      setSeasonState(value);
    }
  }

  const seasonInfo = seasons[season];

  const cssVars = useMemo(
    () =>
      ({
        "--season-from": seasonInfo.gradientFrom,
        "--season-to": seasonInfo.gradientTo,
        "--season-accent": seasonInfo.accent,
        "--season-secondary": seasonInfo.secondary,
        "--season-glow-primary": seasonInfo.glowPrimary,
        "--season-glow-secondary": seasonInfo.glowSecondary,
      }) as CSSProperties,
    [seasonInfo]
  );

  const value = useMemo(
    () => ({ season, seasonInfo, isAuto, setSeason }),
    [season, seasonInfo, isAuto]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div style={cssVars}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useSeasonTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useSeasonTheme must be used inside ThemeProvider"
    );
  }

  return context;
}
