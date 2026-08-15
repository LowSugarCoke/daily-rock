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

// TODO: Define your `Rating` struct here.
// It needs to be serializable/deserializable, cloneable, and comparable.
// Fields:
// - id: String
// - daily_selection_id: String
// - rating: u8 (1 to 5)
// - note: Option<String>
// - timestamp: Option<String>
//
// Hint: C++ analogy for Option<T> is std::optional<T>. Use `pub` on fields.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Rating {
    pub id: String,
    pub daily_selection_id: String,
    pub rating: u8,
    pub note: Option<String>,
    pub timestamp: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct HistoryItem {
    pub rating_id: String,
    pub song_id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: Vec<String>,
    pub youtube_id: String,
    pub rating: u8,
    pub note: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct HistoryQuery {
    pub era: Option<String>,
    pub artist: Option<String>,
    pub genre: Option<String>,
}

pub trait SongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>>;

    // TODO: Add `save_rating` method to the trait.
    // It should accept a `rating` of type `Rating` and return a boxed Future yielding `worker::Result<()>`.
    // Signature pattern matches `get_daily_selection`, but returns `worker::Result<()>` instead of `Option<Song>`.
    fn save_rating(
        &self,
        rating: Rating,
    ) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>>;

    fn get_history(
        &self,
        query: HistoryQuery,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>>;
}

pub struct InMemorySongStore {
    pub songs: Vec<Song>,
    // TODO: Add a mutable in-memory storage for ratings.
    // Rust fields are immutable by default. To mutate ratings from an immutable `&self` reference,
    // we use "interior mutability". In a multithreaded context, wrap the vector in a Mutex:
    // `pub ratings: std::sync::Mutex<Vec<Rating>>`
    // C++ analogy: std::mutex guarding a std::vector<Rating>.
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
            // TODO: Initialize your ratings mutex here
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
                        if !song.genre_tags.iter().any(|g| g.eq_ignore_ascii_case(genre_filter)) {
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
                        timestamp: r.timestamp.clone().unwrap_or_else(|| "2026-08-15 00:00:00".to_string()),
                    });
                }
            }
            // Sort by rating_id DESC (showing newest listens first)
            items.sort_by(|a, b| b.rating_id.cmp(&a.rating_id));
            Ok(items)
        }))
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

#[derive(Debug, Serialize, Deserialize)]
pub struct D1HistoryItem {
    pub rating_id: String,
    pub song_id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: String, // stored as JSON array string
    pub youtube_id: String,
    pub rating: u8,
    pub note: Option<String>,
    pub timestamp: String,
}

pub struct D1SongStore {
    pub db: worker::d1::D1Database,
}

impl D1SongStore {
    pub fn new(db: worker::d1::D1Database) -> Self {
        Self { db }
    }

    // A helper method that performs the D1 database query and deserializes the fields.
    async fn fetch_daily_selection(&self) -> Option<Song> {
        let statement = self.db.prepare(
            "SELECT s.id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id \
             FROM songs s \
             LEFT JOIN ratings r ON s.id = r.daily_selection_id \
             WHERE r.id IS NULL \
             ORDER BY s.id ASC LIMIT 1",
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

    fn save_rating(
        &self,
        rating: Rating,
    ) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let statement = self.db.prepare(
                "INSERT INTO ratings (id, daily_selection_id, rating, note) VALUES (?1, ?2, ?3, ?4) \
                 ON CONFLICT(daily_selection_id) DO UPDATE SET rating=?3, note=?4, timestamp=CURRENT_TIMESTAMP"
            );
            let statement = statement.bind(&[
                rating.id.into(),
                rating.daily_selection_id.into(),
                rating.rating.into(),
                rating.note.into(),
            ])?;
            statement.run().await?;
            Ok(())
        }))
    }

    fn get_history(
        &self,
        _query: HistoryQuery,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>> {
        // TODO: Implement history retrieval from D1 Database.
        //
        // Acceptable criteria / Steps:
        // 1. Construct the base SQL query joining `ratings` and `songs` on `daily_selection_id = s.id`.
        //    Select fields: r.id, r.daily_selection_id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id, r.rating, r.note, r.timestamp
        // 2. Build a vector of conditions (e.g. `s.era = ?`) and `worker::wasm_bindgen::JsValue` binds based on `query` filters.
        //    Hint: For `query.genre`, use `s.genre_tags LIKE ?` and format `%"genre"%`.
        //    Hint: In Rust, you can use `worker::wasm_bindgen::JsValue::from("value")` to convert to serializable JS values.
        // 3. Append the WHERE clause (if conditions is not empty) and order by `r.timestamp DESC, r.id DESC`.
        // 4. Prepare the statement and bind parameters if there are any parameters to bind.
        // 5. Call `statement.all().await?` to get a `D1Result`, then deserialize using `result.results::<D1HistoryItem>()?`.
        // 6. Map the vector of `D1HistoryItem` elements to `HistoryItem` (including deserializing JSON array `genre_tags` using `serde_json::from_str`).
        //    Hint: Use `unwrap_or_default()` when handling deserialization fallbacks.
        Box::pin(SendFuture::new(async move {
            // Stub return
            Ok(Vec::new())
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
    }

    #[tokio::test]
    async fn test_in_memory_song_store_gating_progression() {
        let store = InMemorySongStore::new();

        // Initially, first song is "1"
        let song1 = store.get_daily_selection().await.unwrap();
        assert_eq!(song1.id, "1");

        // Rate song 1
        let rating1 = Rating {
            id: "r1".to_string(),
            daily_selection_id: "1".to_string(),
            rating: 5,
            note: Some("Awesome track".to_string()),
            timestamp: None,
        };
        store.save_rating(rating1).await.unwrap();

        // Now, first song should be "2"
        let song2 = store.get_daily_selection().await.unwrap();
        assert_eq!(song2.id, "2");
        assert_eq!(song2.title, "Whole Lotta Love");

        // Rate song 2
        let rating2 = Rating {
            id: "r2".to_string(),
            daily_selection_id: "2".to_string(),
            rating: 4,
            note: None,
            timestamp: None,
        };
        store.save_rating(rating2).await.unwrap();

        // Now, first song should be "3"
        let song3 = store.get_daily_selection().await.unwrap();
        assert_eq!(song3.id, "3");
    }

    #[tokio::test]
    async fn test_in_memory_song_store_concurrency() {
        use std::sync::Arc;
        let store = Arc::new(InMemorySongStore::new());
        let mut handles = vec![];

        for i in 1..=10 {
            let store_clone = Arc::clone(&store);
            let handle = tokio::spawn(async move {
                let rating = Rating {
                    id: format!("r_{}", i),
                    daily_selection_id: "1".to_string(),
                    rating: ((i % 5) + 1) as u8,
                    note: Some(format!("Concurrency note {}", i)),
                    timestamp: None,
                };
                store_clone.save_rating(rating).await.unwrap();
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let ratings = store.ratings.lock().unwrap();
        assert_eq!(ratings.len(), 1);
        assert_eq!(ratings[0].daily_selection_id, "1");
    }
}
