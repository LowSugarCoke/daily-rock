# Design: the album leads

The design gets its character from real content, not from style choices. Two earlier attempts were rejected as AI-looking: a dark theme with one accent color, and a paper "record sleeve" with monospace type. Both got their look from font and color picks that AI tools default to.

## Rules
- Each song's real album cover is the main visual. The page background is a soft tint of the cover's color (`--cover`, set in `app/page.tsx`). Near-black, near-white and grey covers keep the neutral background (`lib/cover-tint.ts`).
- The credits are real: album and year from the iTunes catalog, matched by hand to each song's original album (migration 0004).
- Type: the system font stack only, in normal case with normal tracking. No uppercase eyebrow labels, pill tags or icon set.
- Desktop: two columns (cover and player | title, credits, rating, notes). Phone: cover thumbnail beside the title, then a full-width player.
- Rating: words (Skip / Meh / Good / Great / Classic). History shows the word, not stars.

## Listening diary (chosen 2026-09-30)
The first cover-led version looked too tidy, so you picked the "listening diary" direction from three mockups (`.lavish/less-tidy-directions.html`). It breaks the grid on purpose:
- The cover is taped to the page at an angle. The player and the notes card are tilted too.
- The date is a rubber stamp, and "Day N" is the song's place in the journey (its id).
- The chosen rating is circled in pen, in the cover's accent colour.
- Notes are handwritten (Caveat, the only extra font) on a ruled index card.
- History is a scrapbook wall of taped covers. Each entry opens `/history/<ratingId>`, laid out like Today: play the song again, with your rating circled and your note on the card.
- Shared pieces: `SongSpread` (cover, player, stamp, credits), `RatingScale` and `NoteCard` in `components/Diary.tsx`, and `useCoverTheme` for the tint and accent.

## Must keep (tests)
Class names `songCard`, `songArtist`, `eraTag`, `genreTag` (span), and `statusBox` (+ `warning`/`error`). One `h1` "Daily Rock", an `h2` song title, "Rate this Song", `aria-label` "Rate N star(s)", the textarea placeholder "Add private notes...", the search placeholder "Search title or artist", and the labels "Songs Logged" / "Average Rating" / "Current Streak".
