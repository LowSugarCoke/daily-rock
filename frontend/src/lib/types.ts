export interface Song {
  id: string;
  title: string;
  artist: string;
  era: string;
  genre_tags: string[];
  youtube_id: string;
}

export interface HistoryItem {
  rating_id: string;
  song_id: string;
  title: string;
  artist: string;
  era: string;
  genre_tags: string[];
  youtube_id: string;
  rating: number;
  note: string | null;
  timestamp: string;
}
