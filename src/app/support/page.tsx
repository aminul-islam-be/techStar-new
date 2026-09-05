"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";

export default function SupportPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {`← ${t("settings.continueShopping")}`}
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("support.title")}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          {t("support.subtitle")}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:support@techstar.com"
            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.06]"
          >
            <div className="text-2xl">📧</div>
            <div className="text-sm font-bold text-white">
              {t("support.emailSupport")}
            </div>
            <div className="text-xs text-slate-400">support@techstar.com</div>
          </a>

          <a
            href="tel:+8801000000000"
            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.06]"
          >
            <div className="text-2xl">📞</div>
            <div className="text-sm font-bold text-white">
              {t("support.callUs")}
            </div>
            <div className="text-xs text-slate-400">+880 1000-000000</div>
          </a>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-bold text-white">
            {t("support.faqTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {t("support.faqHint")}
          </p>
        </div>
      </div>
    </main>
  );
}
