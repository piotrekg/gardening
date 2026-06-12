/**
 * Decorative botanical line-art used across the botanical-atlas chrome.
 * Purely ornamental — all elements are aria-hidden.
 */

/** Concentric-circle ornament flanked by hairlines; a section divider. */
export function BotanicalOrnament() {
  return (
    <div className="my-12 flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <svg
        width="34"
        height="34"
        viewBox="0 0 52 52"
        fill="none"
        className="shrink-0 opacity-35"
        stroke="var(--color-copper)"
        strokeWidth="1"
      >
        {/* Centered at 26,26 within a 52 box; r=22 leaves a 4px margin so the
            radiating marks at r=20..25 stay fully inside the viewBox (P5). */}
        <circle cx="26" cy="26" r="5" />
        <circle cx="26" cy="26" r="13" />
        <circle cx="26" cy="26" r="22" />
        <path d="M26 1v6M26 45v6M1 26h6M45 26h6" stroke="var(--color-copper)" />
      </svg>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Generic foliage line-art layer for the hero (when no photo). */
export function HeroBotanical() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
      viewBox="0 0 800 540"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1"
      aria-hidden="true"
    >
      <path d="M400 540 C 400 380 380 300 320 220 M400 420 C 360 400 320 360 300 320 M400 360 C 440 340 480 300 500 260 M400 300 C 360 285 330 255 315 220 M400 250 C 440 235 470 205 485 175" />
      <ellipse cx="300" cy="318" rx="40" ry="16" transform="rotate(-30 300 318)" />
      <ellipse cx="500" cy="258" rx="40" ry="16" transform="rotate(30 500 258)" />
      <ellipse cx="315" cy="218" rx="34" ry="13" transform="rotate(-35 315 218)" />
      <ellipse cx="485" cy="173" rx="34" ry="13" transform="rotate(35 485 173)" />
      <circle cx="400" cy="150" r="22" />
      <circle cx="400" cy="150" r="10" />
      <path d="M120 540 C 120 440 110 380 90 320 M90 380 C 70 365 55 335 48 305 M120 420 C 150 405 175 375 185 345" />
      <path d="M690 540 C 690 440 700 380 720 320 M720 380 C 740 365 755 335 762 305 M690 420 C 660 405 635 375 625 345" />
    </svg>
  );
}
