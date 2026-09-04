"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/language";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const { language, setLanguage } = useLanguage();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {"← Continue Shopping"}
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Settings
        </h1>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div>
              <div className="text-sm font-bold text-white">
                Language
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Choose your preferred language
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
                Dark Mode
              </div>
              <div className="mt-1 text-xs text-slate-400">
                TechStar currently uses the dark theme
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
        </div>
      </div>
    </main>
  );
}
