"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/categories";
import { useLanguage } from "@/lib/language";

export default function CategoriesPage() {
  const router = useRouter();
  const { t } = useLanguage();

  function openCategory(name: string) {
    sessionStorage.setItem("techstar_pending_category", name);
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href="/"
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {"←"}
          </Link>

          <h1 className="text-xl font-extrabold tracking-tight">
            {t("categories.title")}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map(([icon, name, description]) => (
            <button
              key={name}
              onClick={() => openCategory(name)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-8 text-center transition duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-slate-800/80"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-2xl transition group-hover:bg-blue-500/10">
                {icon}
              </div>

              <div>
                <div className="text-[15px] font-bold text-white">
                  {name}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
