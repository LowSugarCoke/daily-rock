use super::models::{HistoryItem, HistoryQuery, Rating, Song};
use super::SongStore;
use std::future::Future;
use std::pin::Pin;
use worker::send::SendFuture;

pub struct InMemorySongStore {
    pub songs: Vec<Song>,
    pub ratings: std::sync::Mutex<Vec<Rating>>,
}

impl InMemorySongStore {
    pub fn new() -> Self {
        Self {
            songs: vec![
                Song {
                    id: "1".to_string(),
                    title: "Johnny B. Goode".to_string(),
                    artist: "Chuck Berry".to_string(),
                    era: "1950s".to_string(),
                    genre_tags: vec!["Rock 'n' Roll".to_string()],
                    youtube_id: "T38v3-SSGcM".to_string(),
                },
                Song {
                    id: "2".to_string(),
                    title: "Whole Lotta Love".to_string(),
                    artist: "Led Zeppelin".to_string(),
                    era: "1960s".to_string(),
                    genre_tags: vec!["Hard Rock".to_string(), "Classic Rock".to_string()],
                    youtube_id: "HQmmM_vIi4I".to_string(),
                },
                Song {
                    id: "3".to_string(),
                    title: "Bohemian Rhapsody".to_string(),
                    artist: "Queen".to_string(),
                    era: "1970s".to_string(),
                    genre_tags: vec!["Progressive Rock".to_string(), "Glam Rock".to_string()],
                    youtube_id: "fJ9rUzIMcZQ".to_string(),
                },
            ],
            ratings: std::sync::Mutex::new(Vec::new()),
        }
    }
}

impl Default for InMemorySongStore {
    fn default() -> Self {
        Self::new()
    }
}

impl SongStore for InMemorySongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let rated_ids: std::collections::HashSet<String> = self
                .ratings
                .lock()
                .unwrap()
                .iter()
                .map(|r| r.daily_selection_id.clone())
                .collect();
            self.songs
                .iter()
                .find(|s| !rated_ids.contains(&s.id))
                .cloned()
        }))
    }

    fn save_rating(
        &self,
        rating: Rating,
    ) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let mut ratings = self.ratings.lock().unwrap();
            ratings.retain(|r| r.daily_selection_id != rating.daily_selection_id);
            ratings.push(rating);
            Ok(())
        }))
    }

    fn get_history(
        &self,
        query: HistoryQuery,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let ratings = self.ratings.lock().unwrap();
            let mut items = Vec::new();
            for r in ratings.iter() {
                if let Some(song) = self.songs.iter().find(|s| s.id == r.daily_selection_id) {
                    if let Some(ref era_filter) = query.era {
                        if song.era != *era_filter {
                            continue;
                        }
                    }
                    if let Some(ref artist_filter) = query.artist {
                        if !song.artist.eq_ignore_ascii_case(artist_filter) {
                            continue;
                        }
                    }
                    if let Some(ref genre_filter) = query.genre {
                        if !song
                            .genre_tags
                            .iter()
                            .any(|g| g.eq_ignore_ascii_case(genre_filter))
                        {
                            continue;
                        }
                    }

                    items.push(HistoryItem {
                        rating_id: r.id.clone(),
                        song_id: song.id.clone(),
                        title: song.title.clone(),
                        artist: song.artist.clone(),
                        era: song.era.clone(),
                        genre_tags: song.genre_tags.clone(),
                        youtube_id: song.youtube_id.clone(),
                        rating: r.rating,
                        note: r.note.clone(),
                        timestamp: r
                            .timestamp
                            .clone()
                            .unwrap_or_else(|| "2026-08-15 00:00:00".to_string()),
                    });
                }
            }
            items.sort_by(|a, b| b.rating_id.cmp(&a.rating_id));
            Ok(items)
        }))
    }
}
