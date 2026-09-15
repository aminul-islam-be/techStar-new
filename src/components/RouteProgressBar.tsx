"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A thin progress bar fixed to the top of the screen (like YouTube/GitHub)
 * that fills in while navigating between pages, so a slow route change
 * (e.g. Next.js compiling a page for the first time in dev) doesn't feel
 * like the app has frozen.
 */
export default function RouteProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const isFirstRender = useRef(true);

  // Finish the bar whenever the route actually changes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setWidth(100);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);

    return () => clearTimeout(hideTimer);
  }, [pathname]);

  // Start the bar as soon as an internal link is clicked.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const anchor = (event.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target === "_blank") return;
      if (/^([a-z]+:)?\/\//i.test(href) && !href.startsWith(window.location.origin))
        return;

      setVisible(true);
      setWidth(20);

      let current = 20;
      intervalRef.current = setInterval(() => {
        current = Math.min(current + Math.random() * 10, 88);
        setWidth(current);
      }, 200);
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
