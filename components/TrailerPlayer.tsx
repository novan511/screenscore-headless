"use client";

import { useState } from "react";

/**
 * Click-to-play YouTube facade: the thumbnail paints immediately and the
 * iframe only loads on demand, so the page ships no third-party JS/cookies
 * until the reader actually asks for the trailer.
 */
export function TrailerPlayer({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  const thumbs = [
    `https://i.ytimg.com/vi/${youtubeId}/hq720.jpg`,
    `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
  ];
  const [thumb, setThumb] = useState(0);
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0_20px_60px_-24px_rgb(23_20_26/0.55)]">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={`Trailer ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-ink-2 shadow-[0_20px_60px_-24px_rgb(23_20_26/0.55)]">
      {/* Thumbnails are dynamic per video — next/image would need a remotePatterns entry per host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbs[thumb]}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        onError={() =>
          setThumb((i) => (i < thumbs.length - 1 ? i + 1 : i))
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/10" />

      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Putar trailer ${title}`}
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
      >
        <span className="press flex h-16 w-16 items-center justify-center rounded-full bg-yellow text-ink shadow-[0_8px_28px_rgb(0_0_0/0.45)] transition group-hover:scale-105 sm:h-20 sm:w-20">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden className="ml-1">
            <path fill="currentColor" d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-white sm:text-sm">
          Putar Trailer
        </span>
      </button>
    </div>
  );
}
