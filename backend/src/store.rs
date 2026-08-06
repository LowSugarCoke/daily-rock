use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;
use worker::send::SendFuture;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: Vec<String>,
    pub youtube_id: String,
}

pub trait SongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>>;
}

pub struct InMemorySongStore {
    pub songs: Vec<Song>,
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
        Box::pin(SendFuture::new(async move { self.songs.first().cloned() }))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct D1Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: String, // Stored as a JSON-serialized array in SQLite/D1
    pub youtube_id: String,
}

pub struct D1SongStore {
    pub db: worker::d1::D1Database,
}

impl D1SongStore {
    pub fn new(db: worker::d1::D1Database) -> Self {
        Self { db }
    }

    // A helper method that performs the D1 database query and deserializes the fields.
    // This separation avoids having the complex Pin/Box wrapper logic directly mixed in.
    async fn fetch_daily_selection(&self) -> Option<Song> {
        let statement = self.db.prepare(
            "SELECT id, title, artist, era, genre_tags, youtube_id FROM songs ORDER BY id ASC LIMIT 1"
        );
        let d1_song = statement.first::<D1Song>(None).await.ok()??;
        let genre_tags: Vec<String> = serde_json::from_str(&d1_song.genre_tags).unwrap_or_default();
        Some(Song {
            id: d1_song.id,
            title: d1_song.title,
            artist: d1_song.artist,
            era: d1_song.era,
            genre_tags,
            youtube_id: d1_song.youtube_id,
        })
    }
}

impl SongStore for D1SongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            self.fetch_daily_selection().await
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_in_memory_song_store_returns_first_song() {
        let store = InMemorySongStore::new();
        let current = store.get_daily_selection().await;
        assert!(current.is_some());
        let song = current.unwrap();
        assert_eq!(song.id, "1");
        assert_eq!(song.title, "Johnny B. Goode");
        assert_eq!(song.artist, "Chuck Berry");
        assert_eq!(song.era, "1950s");
        assert_eq!(song.genre_tags, vec!["Rock 'n' Roll".to_string()]);
        assert_eq!(song.youtube_id, "T38v3-SSGcM");
    }
}
