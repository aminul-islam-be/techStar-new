"use client";

import { useEffect, useState } from "react";

// Minimal shape of the browser's install prompt event (not in lib.dom).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Registers the service worker and shows an "Install app" banner when the browser allows it. */
export default function PwaInstaller() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault(); // we show our own button instead
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent || dismissed) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl sm:left-auto sm:right-4 sm:w-96">
      <span className="font-semibold">TechStar app hishebe install korun</span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10"
        >
          Pore
        </button>
        <button
          onClick={install}
          className="rounded-xl bg-indigo-600 px-3 py-2 font-bold text-white hover:bg-indigo-500"
        >
          Install
        </button>
      </div>
    </div>
  );
}
