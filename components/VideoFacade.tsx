"use client";

import { useState } from "react";

/**
 * Click-to-play YouTube facade for the homepage promo band.
 *
 * The reference site embeds `youtube.com/embed/<id>` directly, which pulls in
 * the ~168KB player bundle plus the ytembeds runtime before the reader has
 * asked for anything — the two biggest "unused JavaScript" entries in the
 * PageSpeed report. The thumbnail paints for free and the iframe (and all of
 * YouTube's JS) only loads on click.
 */
export function VideoFacade({
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
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <div className="group/vid absolute inset-0">
      {/* Thumbnails are dynamic per video — next/image would need a
          remotePatterns entry per host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbs[thumb]}
        alt=""
        width={1280}
        height={720}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/vid:scale-[1.02]"
        onError={() =>
          setThumb((i) => (i < thumbs.length - 1 ? i + 1 : i))
        }
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/15 to-transparent"
      />
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Putar video: ${title}`}
        className="absolute inset-0 grid place-items-center"
      >
        <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/90 bg-black/45 text-white transition duration-300 group-hover/vid:scale-110 group-hover/vid:border-pink group-hover/vid:bg-pink/90 sm:h-20 sm:w-20">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            className="ml-1"
          >
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
