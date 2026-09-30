# Design: record sleeve

Each day's song is laid out like the back of a single's sleeve, and History is a printed tracklist. It replaced a dark redesign that you rejected as AI-looking (dark background with one accent, rounded cards, pill tags, bold geometric sans, stock icons). Avoid that set of choices.

## Rules
- Paper and ink. One print red for the catalog number, the active tab and focus. No rounded corners, shadows, gradients, or icon set.
- Structure comes from rules: 4px ink rules open a section, 1px rules separate items.
- Type: Anton (uppercase) for titles, IBM Plex Mono for everything else.
- Tags are written as text: `1960s / Hard Rock`.
- The rating is a strip of five tick boxes (number plus caption). The selected box is filled with ink.
- Notes go on ruled lines.

## Tokens (WCAG contrast on paper)
| Token | Value | Contrast |
|---|---|---|
| paper | #F2EEE5 | |
| paper-2 (hover) | #E8E2D5 | |
| ink | #161512 | 15.8 |
| ink-2 | #57524A | 6.7 |
| ink-3 (placeholders, captions) | #6B655B | 5.0 |
| red | #B8321F | 5.2 |
| green (success) | #2F6B3A | 5.5 |
| rule-soft (note lines) | #CFC7B6 | decorative |

## Must keep (tests)
Class names `songCard`, `songArtist`, `eraTag`, `genreTag` (span), and `statusBox` (+ `warning`/`error`). One `h1` "Daily Rock", an `h2` song title, "Rate this Song", `aria-label` "Rate N star(s)", the textarea placeholder "Add private notes...", the search placeholder "Search title or artist", and the labels "Songs Logged" / "Average Rating" / "Current Streak".
