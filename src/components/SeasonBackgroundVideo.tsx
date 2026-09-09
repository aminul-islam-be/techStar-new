"use client";

import { useEffect, useRef } from "react";
import { useSeasonTheme } from "@/lib/theme";

type SeasonBackgroundVideoProps = {
  /** playback speed, e.g. 0.25 for slow-motion ambience */
  speed?: number;
  className?: string;
};

/**
 * Fixed, full-viewport background video for the whole site. Stays put
 * while the page scrolls, fills the mobile screen (object-cover), plays
 * slowed down for a calmer ambience, and swaps its source to match the
 * current ঋতু (season) — e.g. /videos/seasons/season-summer.mp4.
 */
export default function SeasonBackgroundVideo({
  speed = 1,
  className = "",
}: SeasonBackgroundVideoProps) {
  const { seasonInfo } = useSeasonTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed, seasonInfo.key]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen overflow-hidden ${className}`}
    >
      <video
        key={seasonInfo.key}
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = speed;
        }}
      >
        <source
          src={`/videos/seasons/season-${seasonInfo.key}.mp4`}
          type="video/mp4"
        />
      </video>
    </div>
  );
}
