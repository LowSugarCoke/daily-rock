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

pub trait SongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>>;

    // TODO: Add `save_rating` method to the trait.
    // It should accept a `rating` of type `Rating` and return a boxed Future yielding `worker::Result<()>`.
    // Signature pattern matches `get_daily_selection`, but returns `worker::Result<()>` instead of `Option<Song>`.
    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>>;
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
        // TODO: Update this method so that it only returns the first song that hasn't been rated yet.
        //
        // Hints:
        // 1. Lock the mutex: `self.ratings.lock().unwrap()` (C++ analogy: std::lock_guard).
        // 2. Map rated ratings to their `daily_selection_id` strings: `.iter().map(|r| r.daily_selection_id.clone()).collect::<Vec<String>>()`
        //    (C++ analogy: transforming a collection using lambda [] (auto& r) { return r.daily_selection_id; })
        // 3. Find the first song whose `id` is not in the rated IDs: `self.songs.iter().find(|s| !rated_ids.contains(&s.id)).cloned()`
        //    (C++ analogy: std::find_if)
        Box::pin(SendFuture::new(async move {
            // STUB: Always returns the first song without considering ratings
            self.songs.first().cloned()
        }))
    }

    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        // TODO: Implement rating storage with "Upsert" logic in memory.
        // If a rating for the same `daily_selection_id` already exists, overwrite it.
        //
        // Hints:
        // 1. Lock your mutex: `let mut ratings = self.ratings.lock().unwrap();`
        // 2. Remove existing rating with same selection ID: `ratings.retain(|r| r.daily_selection_id != rating.daily_selection_id)`
        //    (C++ analogy: `std::remove_if` or `erase-remove` idiom)
        // 3. Push the new rating: `ratings.push(rating);`
        // 4. Return success: `Ok(())`
        Box::pin(SendFuture::new(async move {
            // STUB: Do nothing and return Ok
            Ok(())
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

pub struct D1SongStore {
    pub db: worker::d1::D1Database,
}

impl D1SongStore {
    pub fn new(db: worker::d1::D1Database) -> Self {
        Self { db }
    }

    // A helper method that performs the D1 database query and deserializes the fields.
    async fn fetch_daily_selection(&self) -> Option<Song> {
        // TODO: Update this SQL statement to perform a LEFT JOIN with the `ratings` table,
        // and filter using `WHERE r.id IS NULL` to ensure we only get songs that have not been rated yet.
        //
        // Query pattern:
        // "SELECT s.id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id \
        //  FROM songs s \
        //  LEFT JOIN ratings r ON s.id = r.daily_selection_id \
        //  WHERE r.id IS NULL \
        //  ORDER BY s.id ASC LIMIT 1"
        let statement = self.db.prepare(
            "SELECT s.id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id FROM songs s ORDER BY s.id ASC LIMIT 1"
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

    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        // TODO: Implement the SQL Upsert (INSERT ON CONFLICT) statement for SQLite.
        // SQL Syntax:
        // "INSERT INTO ratings (id, daily_selection_id, rating, note) VALUES (?1, ?2, ?3, ?4) \
        //  ON CONFLICT(daily_selection_id) DO UPDATE SET rating=?3, note=?4, timestamp=CURRENT_TIMESTAMP"
        //
        // Hints:
        // 1. Prepare statement: `let statement = self.db.prepare("...");`
        // 2. Bind parameters: `let statement = statement.bind(&[rating.id.into(), rating.daily_selection_id.into(), rating.rating.into(), rating.note.into()])?;`
        //    (The `?` operator is a Rust idiom that returns the error immediately if a call fails, similar to throwing an exception).
        // 3. Execute statement: `statement.run().await?;`
        // 4. Return success: `Ok(())`
        Box::pin(SendFuture::new(async move {
            // STUB: Do nothing and return Ok
            Ok(())
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
}
