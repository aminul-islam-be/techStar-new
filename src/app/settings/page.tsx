"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/language";
import { useSeasonTheme } from "@/lib/theme";
import { seasons, SEASON_ORDER, type Season } from "@/lib/season";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const { language, setLanguage, t } = useLanguage();
  const { season, isAuto, setSeason, seasonInfo } = useSeasonTheme();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {`← ${t("settings.continueShopping")}`}
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("settings.title")}
        </h1>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div>
              <div className="text-sm font-bold text-white">
                {t("settings.language")}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {t("settings.languageHint")}
              </div>
            </div>

            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1.5 text-xs font-bold transition ${
                  language === "en"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("bn")}
                className={`px-3 py-1.5 text-xs font-bold transition ${
                  language === "bn"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-slate-400 hover:text-white"
                }`}
              >
                বাং
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div>
              <div className="text-sm font-bold text-white">
                {t("settings.darkMode")}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {t("settings.darkModeHint")}
              </div>
            </div>

            <button
              onClick={() => setDarkMode((v) => !v)}
              aria-label="Toggle dark mode"
              className={`relative h-7 w-12 rounded-full transition ${
                darkMode ? "bg-blue-600" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  darkMode ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">{seasonInfo.emoji}</span>
              <div className="text-sm font-bold text-white">
                {t("settings.seasonTheme")}
              </div>
            </div>

            <div className="mb-4 text-xs text-slate-400">
              {t("settings.seasonThemeHint")}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                onClick={() => setSeason("auto")}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                  isAuto
                    ? "border-white/20 bg-white/[0.08] text-white"
                    : "border-white/10 bg-transparent text-slate-400 hover:bg-white/[0.05]"
                }`}
                style={
                  isAuto
                    ? { boxShadow: `0 0 0 1.5px ${seasonInfo.accent}` }
                    : undefined
                }
              >
                <span>🔄</span>
                {t("settings.autoSeason")}
              </button>

              {SEASON_ORDER.map((key: Season) => {
                const info = seasons[key];
                const active = !isAuto && season === key;

                return (
                  <button
                    key={key}
                    onClick={() => setSeason(key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                      active
                        ? "border-white/20 bg-white/[0.08] text-white"
                        : "border-white/10 bg-transparent text-slate-400 hover:bg-white/[0.05]"
                    }`}
                    style={
                      active
                        ? { boxShadow: `0 0 0 1.5px ${info.accent}` }
                        : undefined
                    }
                  >
                    <span>{info.emoji}</span>
                    {language === "bn" ? info.nameBn : info.nameEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
