// Verified Solution for Ratings Schema, Store, and POST /api/ratings endpoint
// Full working version of backend ratings implementation for reference.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json,
    Router,
};
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use tower_service::Service;
use worker::send::SendFuture;
use worker::*;

// ==========================================
// 1. Types & Models (store.rs)
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: Vec<String>,
    pub youtube_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Rating {
    pub id: String,
    pub daily_selection_id: String,
    pub rating: u8, // 1 to 5
    pub note: Option<String>,
    pub timestamp: Option<String>,
}

pub trait SongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>>;
    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>>;
}

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

impl SongStore for InMemorySongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let rated_ids: Vec<String> = self
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

    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let mut ratings = self.ratings.lock().unwrap();
            ratings.retain(|r| r.daily_selection_id != rating.daily_selection_id);
            ratings.push(rating);
            Ok(())
        }))
    }
}

pub struct D1SongStore {
    pub db: worker::d1::D1Database,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct D1Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: String,
    pub youtube_id: String,
}

impl D1SongStore {
    async fn fetch_daily_selection(&self) -> Option<Song> {
        let statement = self.db.prepare(
            "SELECT s.id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id \
             FROM songs s \
             LEFT JOIN ratings r ON s.id = r.daily_selection_id \
             WHERE r.id IS NULL \
             ORDER BY s.id ASC LIMIT 1"
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
}

// ==========================================
// 2. Handlers (handlers.rs)
// ==========================================

#[derive(Deserialize, Serialize)]
pub struct CreateRatingRequest {
    pub daily_selection_id: String,
    pub rating: u8,
    pub note: Option<String>,
}

pub async fn submit_rating(
    State(state): State<Arc<dyn SongStore + Send + Sync>>, // simplified representation
    Json(payload): Json<CreateRatingRequest>,
) -> impl IntoResponse {
    if payload.rating < 1 || payload.rating > 5 {
        return (StatusCode::BAD_REQUEST, Json("Rating must be between 1 and 5")).into_response();
    }

    let rating_id = {
        #[cfg(target_arch = "wasm32")]
        {
            format!("r_{}", worker::js_sys::Date::now() as u64)
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            format!(
                "r_{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
            )
        }
    };

    let rating = Rating {
        id: rating_id,
        daily_selection_id: payload.daily_selection_id,
        rating: payload.rating,
        note: payload.note,
        timestamp: None,
    };

    match state.save_rating(rating).await {
        Ok(_) => (StatusCode::CREATED, Json("Rating saved")).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(e.to_string())).into_response(),
    }
}
