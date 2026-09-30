export interface Song {
  id: string;
  title: string;
  artist: string;
  era: string;
  genre_tags: string[];
  youtube_id: string;
  album: string;
  year: number;
  cover_url: string;
  cover_color: string;
}

export interface HistoryItem {
  rating_id: string;
  song_id: string;
  title: string;
  artist: string;
  era: string;
  genre_tags: string[];
  youtube_id: string;
  album: string;
  year: number;
  cover_url: string;
  cover_color: string;
  rating: number;
  note: string | null;
  timestamp: string;
}
