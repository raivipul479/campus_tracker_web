import React, { useId } from 'react';

/**
 * Aditya brand mark — the two-stroke "A" with the swoosh sweeping across it.
 *
 * Rebuilt as vector rather than shipping the PNG: this renders at 22-38px in
 * the sidebar and login card, where a downscaled raster goes soft. The wordmark
 * is deliberately omitted — at brand-mark size it would be unreadable, and the
 * sidebar already sets the name in text beside it.
 *
 * Gradient ids are per-instance (useId) so two copies on one page cannot
 * collide and blank each other out.
 */
export function AdimoveLogo({ size = 22, title }) {
  const uid = useId().replace(/:/g, '');
  const leftId = `adi-left-${uid}`;
  const rightId = `adi-right-${uid}`;
  const swooshId = `adi-swoosh-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {/* red at the apex falling to orange at the foot */}
        <linearGradient id={leftId} x1="55" y1="8" x2="18" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e01f1f" />
          <stop offset="0.55" stopColor="#ef5b16" />
          <stop offset="1" stopColor="#f7941e" />
        </linearGradient>
        <linearGradient id={rightId} x1="52" y1="8" x2="88" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#29a3ee" />
          <stop offset="0.5" stopColor="#1878cf" />
          <stop offset="1" stopColor="#1b5fbe" />
        </linearGradient>
        {/* purple at the tail, brightening to cyan at the tip */}
        <linearGradient id={swooshId} x1="8" y1="96" x2="98" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7b3fa2" />
          <stop offset="0.45" stopColor="#4a63c0" />
          <stop offset="0.75" stopColor="#2b8ede" />
          <stop offset="1" stopColor="#54c8f5" />
        </linearGradient>
      </defs>

      {/* left stroke of the A */}
      <path d="M44 6 H58 L34 94 H10 Z" fill={`url(#${leftId})`} />
      {/* right stroke of the A */}
      <path d="M44 6 H58 L90 94 H66 Z" fill={`url(#${rightId})`} />
      {/* the swoosh, crossing both strokes */}
      <path d="M2 99 C24 64 56 32 99 20 C60 47 31 75 24 99 Z" fill={`url(#${swooshId})`} />
    </svg>
  );
}
