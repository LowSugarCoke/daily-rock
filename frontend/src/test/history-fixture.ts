// Three rated songs, newest first, shared by the History page tests.
import type { HistoryItem } from "@/lib/types";

export const mockHistory: HistoryItem[] = [
  {
    rating_id: "r3",
    song_id: "3",
    title: "Whole Lotta Love",
    artist: "Led Zeppelin",
    era: "1970s",
    genre_tags: ["Hard Rock", "Classic Rock"],
    youtube_id: "HQmmM_vIi4I",
    album: "Led Zeppelin II",
    year: 1969,
    cover_url:
      "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/x/600x600bb.jpg",
    cover_color: "#b28470",
    rating: 5,
    note: "That riff never gets old",
    timestamp: "2026-08-15 09:00:00",
  },
  {
    rating_id: "r2",
    song_id: "2",
    title: "Paranoid",
    artist: "Black Sabbath",
    era: "1970s",
    genre_tags: ["Heavy Metal"],
    youtube_id: "xyz",
    album: "Paranoid",
    year: 1970,
    cover_url:
      "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/x/600x600bb.jpg",
    cover_color: "#c992a0",
    rating: 4,
    note: null,
    timestamp: "2026-08-14 09:00:00",
  },
  {
    rating_id: "r1",
    song_id: "1",
    title: "Johnny B. Goode",
    artist: "Chuck Berry",
    era: "1950s",
    genre_tags: ["Rock 'n' Roll"],
    youtube_id: "T38v3-SSGcM",
    album: "Berry Is On Top",
    year: 1958,
    cover_url:
      "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/x/600x600bb.jpg",
    cover_color: "#eda273",
    rating: 3,
    note: null,
    timestamp: "2026-08-13 09:00:00",
  },
];
