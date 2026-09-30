# Redesign spec (in progress)

Source: ui-ux-pro-max skill searches (color "music streaming player", style "music streaming dark immersive", typography "rock music bold editorial"). The generated `--design-system` suggested scroll storytelling and an indigo accent, which were rejected: they fit landing pages, not a two-page daily app.

## Direction
- Style: Dark Mode (OLED), dark only, `color-scheme: dark`.
- Font: Outfit (next/font/google) for headings and body, replacing Geist.
- Motion: subtle only (150-250ms color/opacity), respect `prefers-reduced-motion`. No GSAP.

## Tokens (contrast checked, WCAG)
| Token | Value | Contrast |
|---|---|---|
| bg | #0A0A0B | |
| surface | #151517 | |
| surface-2 | #1E1E21 | |
| border | #2E2E33 | decorative only |
| text | #F4F4F5 | 16.6 on surface |
| text-2 | #A1A1AA | 7.1 on surface |
| text-3 | #8B8B94 | 5.4 on surface |
| accent (text, stars on) | #FF5A52 | 5.9 on surface |
| accent-strong (button bg) | #D92D27 | white text 4.8 |
| success / warning / danger | #4ADE80 / #FBBF24 / #F87171 | all > 6 |
| star-off | #3F3F46 | needs a filled/outline shape change too, not color only |

## Layout changes
- Mobile: tabs move to a fixed bottom bar (Today, History) with SVG icons and `env(safe-area-inset-bottom)` padding. Keep one set of links (tests use `getByRole("link")`).
- Replace the 🔥 emoji with an inline SVG flame (Lucide). Keep the text "day streak" (AppShell test).
- Today: full-bleed 16:9 player on mobile, song title large with `text-wrap: balance`, star buttons at least 44x44 with `aria-pressed`, a visible "Notes" label on the textarea (keep the placeholder), 48px submit button.
- History: 44px filter controls, dark rows, SVG stars.
- Update `manifest.ts` and `layout.tsx` theme colors to #0A0A0B, and regenerate the icons on a dark background.

## Must keep (tests)
Class names `songCard`, `songArtist`, `eraTag`, `genreTag`, `statusBox` (+ `warning`/`error`), one `h1` "Daily Rock", `h2` song title, "Rate this Song", `aria-label` "Rate N star(s)", textarea placeholder "Add private notes...", "Songs Logged" / "Average Rating" / "Current Streak".
