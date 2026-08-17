"use client";

import { useState } from "react";

const categories = [
  ["⚡", "Electrical", "Switches, breakers & wiring"],
  ["◉", "Electronics", "Components & modules"],
  ["✦", "Lighting", "LEDs, bulbs & fixtures"],
  ["◈", "Automation", "Smart control & IoT"],
  ["⌁", "Tools", "Professional equipment"],
  ["⌘", "Accessories", "Useful tech accessories"],
];

export default function Home() {
  const [search, setSearch] = useState("");

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-black shadow-lg shadow-blue-600/20">
              T
            </div>
            <div>
              <div className="text-[18px] font-extrabold tracking-tight">
                TechStar
              </div>
              <div className="hidden text-[10px] font-medium tracking-[0.18em] text-slate-500 sm:block">
                SMART MARKETPLACE
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-[14px] font-medium text-slate-400 lg:flex">
            <a href="#" className="text-white transition hover:text-blue-400">
              Home
            </a>
            <a href="#products" className="transition hover:text-white">
              Products
            </a>
            <a href="#categories" className="transition hover:text-white">
              Categories
            </a>
            <a href="#about" className="transition hover:text-white">
              About
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white sm:px-3">
              USD
            </button>

            <button className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white sm:px-3">
              EN
            </button>

            <button className="ml-1 hidden rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-slate-200 sm:block">
              Sign In
            </button>

            <button className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-lg text-slate-300 transition hover:bg-white/10 lg:hidden">
              ☰
            </button>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[110px]" />
        <div className="pointer-events-none absolute -right-32 top-20 h-[380px] w-[380px] rounded-full bg-indigo-600/10 blur-[110px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="mb-7 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-500/[0.08] px-4 py-2 text-xs font-semibold text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Electrical & Electronics Marketplace
            </div>
          </div>

          <div className="text-center">
            <h1 className="mx-auto max-w-5xl text-[42px] font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl xl:text-[82px]">
              Power your ideas.
              <span className="block bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Build something better.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              Discover electrical, electronics, automation, lighting and
              technology products in one simple marketplace.
            </p>
          </div>

          <div className="mx-auto mt-9 max-w-3xl">
            <div className="flex h-[58px] items-stretch rounded-2xl border border-white/10 bg-white/[0.055] p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl transition focus-within:border-blue-500/40">
              <div className="flex min-w-0 flex-1 items-center">
                <span className="pl-3 pr-2 text-lg text-slate-500">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm text-white outline-none placeholder:text-slate-500 sm:text-[15px]"
                />
              </div>

              <button className="shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.98] sm:px-6">
                <span className="hidden sm:inline">Search</span>
                <span className="text-base sm:hidden">→</span>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span>English</span>
              <span>বাংলা</span>
              <span>Banglish</span>
              <span>Smart search</span>
            </div>
          </div>

          {search && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Searching for{" "}
              <span className="font-semibold text-slate-300">
                “{search}”
              </span>
            </p>
          )}

          <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-x-7 gap-y-3 text-xs text-slate-500">
            <span>✓ Guest browsing</span>
            <span>✓ Secure checkout</span>
            <span>✓ Global language support</span>
          </div>
        </div>
      </section>

      <section
        id="categories"
        className="border-y border-white/[0.07] bg-white/[0.018]"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8">
            <div className="mb-2 text-[11px] font-bold tracking-[0.2em] text-blue-400">
              EXPLORE
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Shop by category
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map(([icon, name, description]) => (
              <button
                key={name}
                className="group rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-slate-800/80 sm:p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-xl transition group-hover:bg-blue-500/10">
                  {icon}
                </div>
                <div className="mt-4 text-sm font-bold">{name}</div>
                <div className="mt-1 text-[10px] leading-4 text-slate-500">
                  {description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="products"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mb-8">
          <div className="mb-2 text-[11px] font-bold tracking-[0.2em] text-blue-400">
            MARKETPLACE
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Products
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Real products added by TechStar will appear here.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-20 text-center">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-slate-900 text-4xl shadow-2xl">
            🛍️
          </div>

          <h3 className="mt-6 text-xl font-bold">No Products Available</h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Products will appear here automatically when they are added by
            the TechStar administrator.
          </p>
        </div>
      </section>

      <section
        id="about"
        className="border-y border-white/[0.07] bg-white/[0.018]"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
                🌍
              </div>
              <h3 className="mt-5 font-bold">Global experience</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Multiple languages and currencies designed for customers
                around the world.
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
                🔐
              </div>
              <h3 className="mt-5 font-bold">Secure shopping</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Browse freely as a guest and sign in only when you need to
                complete checkout.
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
                ✦
              </div>
              <h3 className="mt-5 font-bold">TechStar AI</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                An AI assistant designed to understand English, Bangla and
                Banglish.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black">
              T
            </div>
            <span className="font-bold">TechStar</span>
          </div>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} TechStar. All rights reserved.
          </p>
        </div>
      </footer>

      <button
        aria-label="Open TechStar AI"
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-blue-400/20 bg-blue-600 text-xl shadow-2xl shadow-blue-600/30 transition duration-300 hover:scale-105 hover:bg-blue-500 active:scale-95 sm:right-6"
      >
        ✦
      </button>
    </main>
  );
}
