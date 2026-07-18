// Single source of truth for the app's name/identity.
// Change APP_NAME here to rebrand everywhere the <Wordmark/> is used.
import React from 'react';

export const APP_NAME = 'Tutti';
export const APP_EMOJI = '🎵';
export const APP_TAGLINE = 'Everyone on the same song.';
export const BRAND_COLOR = '#0d9488'; // teal accent

// Reusable wordmark/logo. Drop it at the top of a page/card.
export function Wordmark({ tagline = true, size = 34 }) {
  return (
    <div className="text-center mb-3">
      <div className="fw-bold" style={{ fontSize: size, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
        <span aria-hidden="true">{APP_EMOJI} </span>
        <span style={{ color: BRAND_COLOR }}>{APP_NAME}</span>
      </div>
      {tagline && (
        <div className="text-muted" style={{ fontSize: 13 }}>{APP_TAGLINE}</div>
      )}
    </div>
  );
}
