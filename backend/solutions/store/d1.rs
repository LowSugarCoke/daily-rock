use super::models::{HistoryItem, HistoryQuery, Rating, Song};
use super::SongStore;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::future::Future;
use std::pin::Pin;
use worker::send::SendFuture;

#[derive(Debug, Serialize, Deserialize)]
pub struct D1Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: String, // Stored as a JSON-serialized array in SQLite/D1
    pub youtube_id: String,
    pub album: String,
    pub year: u16,
    pub cover_url: String,
    pub cover_color: String,
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
    pub album: String,
    pub year: u16,
    pub cover_url: String,
    pub cover_color: String,
    pub rating: u8,
    pub note: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Deserialize)]
struct D1RatedId {
    daily_selection_id: String,
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
            "SELECT s.id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id, s.album, s.year, s.cover_url, s.cover_color \
             FROM songs s \
             LEFT JOIN ratings r ON s.id = r.daily_selection_id \
             WHERE r.id IS NULL \
             ORDER BY CAST(s.id AS INTEGER) ASC LIMIT 1",
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
            album: d1_song.album,
            year: d1_song.year,
            cover_url: d1_song.cover_url,
            cover_color: d1_song.cover_color,
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
        query: HistoryQuery,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let mut sql = "SELECT r.id AS rating_id, r.daily_selection_id AS song_id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id, s.album, s.year, s.cover_url, s.cover_color, r.rating, r.note, r.timestamp \
                           FROM ratings r \
                           JOIN songs s ON r.daily_selection_id = s.id".to_string();

            let mut conditions = Vec::new();
            let mut binds: Vec<worker::wasm_bindgen::JsValue> = Vec::new();

            if let Some(ref era) = query.era {
                conditions.push("s.era = ?".to_string());
                binds.push(worker::wasm_bindgen::JsValue::from(era.clone()));
            }
            if let Some(ref artist) = query.artist {
                conditions.push("s.artist = ?".to_string());
                binds.push(worker::wasm_bindgen::JsValue::from(artist.clone()));
            }
            if let Some(ref genre) = query.genre {
                conditions.push("s.genre_tags LIKE ?".to_string());
                binds.push(worker::wasm_bindgen::JsValue::from(format!(
                    "%\"{}\"%",
                    genre
                )));
            }

            if !conditions.is_empty() {
                sql.push_str(" WHERE ");
                sql.push_str(&conditions.join(" AND "));
            }

            sql.push_str(" ORDER BY r.timestamp DESC, r.id DESC");

            let statement = self.db.prepare(&sql);
            let statement = if !binds.is_empty() {
                statement.bind(&binds)?
            } else {
                statement
            };

            let d1_result = statement.all().await?;
            let d1_items: Vec<D1HistoryItem> = d1_result.results()?;

            let mut items = Vec::new();
            for item in d1_items {
                let genre_tags: Vec<String> =
                    serde_json::from_str(&item.genre_tags).unwrap_or_default();
                items.push(HistoryItem {
                    rating_id: item.rating_id,
                    song_id: item.song_id,
                    title: item.title,
                    artist: item.artist,
                    era: item.era,
                    genre_tags,
                    youtube_id: item.youtube_id,
                    album: item.album,
                    year: item.year,
                    cover_url: item.cover_url,
                    cover_color: item.cover_color,
                    rating: item.rating,
                    note: item.note,
                    timestamp: item.timestamp,
                });
            }
            Ok(items)
        }))
    }

    fn get_catalog(&self) -> Pin<Box<dyn Future<Output = worker::Result<Vec<Song>>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let statement = self.db.prepare(
                "SELECT id, title, artist, era, genre_tags, youtube_id, album, year, cover_url, cover_color                  FROM songs ORDER BY CAST(id AS INTEGER) ASC",
            );
            let d1_songs: Vec<D1Song> = statement.all().await?.results()?;
            Ok(d1_songs
                .into_iter()
                .map(|s| Song {
                    id: s.id,
                    title: s.title,
                    artist: s.artist,
                    era: s.era,
                    genre_tags: serde_json::from_str(&s.genre_tags).unwrap_or_default(),
                    youtube_id: s.youtube_id,
                    album: s.album,
                    year: s.year,
                    cover_url: s.cover_url,
                    cover_color: s.cover_color,
                })
                .collect())
        }))
    }

    fn get_rated_ids(
        &self,
    ) -> Pin<Box<dyn Future<Output = worker::Result<HashSet<String>>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let statement = self.db.prepare("SELECT daily_selection_id FROM ratings");
            let rows: Vec<D1RatedId> = statement.all().await?.results()?;
            Ok(rows.into_iter().map(|r| r.daily_selection_id).collect())
        }))
    }

    fn update_rating(
        &self,
        id: String,
        rating: Option<u8>,
        note: Option<String>,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Option<Rating>>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            // NULL keeps the column and an empty note becomes NULL. The timestamp stays,
            // so editing a rating does not move the day the song was heard.
            let statement = self.db.prepare(
                "UPDATE ratings \
                 SET rating = COALESCE(?2, rating), \
                     note = CASE WHEN ?3 IS NULL THEN note ELSE NULLIF(?3, '') END \
                 WHERE id = ?1 \
                 RETURNING id, daily_selection_id, rating, note, timestamp",
            );
            let null = worker::wasm_bindgen::JsValue::NULL;
            let statement = statement.bind(&[
                id.into(),
                rating.map_or(null.clone(), Into::into),
                note.map_or(null, Into::into),
            ])?;
            statement.first::<Rating>(None).await
        }))
    }
}
