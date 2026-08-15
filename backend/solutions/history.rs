// Verified Solution for History Schema, Store, and GET /api/history endpoint
// Full working version of backend history implementation for reference.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json,
    Router,
};
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
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
    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>>;
    fn get_history(&self, query: HistoryQuery) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>>;
}

pub struct InMemorySongStore {
    pub songs: Vec<Song>,
    pub ratings: std::sync::Mutex<Vec<Rating>>,
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

    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let mut ratings = self.ratings.lock().unwrap();
            ratings.retain(|r| r.daily_selection_id != rating.daily_selection_id);
            ratings.push(rating);
            Ok(())
        }))
    }

    fn get_history(&self, query: HistoryQuery) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>> {
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
            items.sort_by(|a, b| b.rating_id.cmp(&a.rating_id));
            Ok(items)
        }))
    }
}

pub struct D1SongStore {
    pub db: worker::d1::D1Database,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct D1HistoryItem {
    pub rating_id: String,
    pub song_id: String,
    pub title: String,
    pub artist: String,
    pub era: String,
    pub genre_tags: String,
    pub youtube_id: String,
    pub rating: u8,
    pub note: Option<String>,
    pub timestamp: String,
}

impl SongStore for D1SongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>> {
        unimplemented!()
    }

    fn save_rating(&self, rating: Rating) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
        unimplemented!()
    }

    fn get_history(&self, query: HistoryQuery) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>> {
        Box::pin(SendFuture::new(async move {
            let mut sql = "SELECT r.id AS rating_id, r.daily_selection_id AS song_id, s.title, s.artist, s.era, s.genre_tags, s.youtube_id, r.rating, r.note, r.timestamp \
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
                binds.push(worker::wasm_bindgen::JsValue::from(format!("%\"{}\"%", genre)));
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
                let genre_tags: Vec<String> = serde_json::from_str(&item.genre_tags).unwrap_or_default();
                items.push(HistoryItem {
                    rating_id: item.rating_id,
                    song_id: item.song_id,
                    title: item.title,
                    artist: item.artist,
                    era: item.era,
                    genre_tags,
                    youtube_id: item.youtube_id,
                    rating: item.rating,
                    note: item.note,
                    timestamp: item.timestamp,
                });
            }
            Ok(items)
        }))
    }
}

// ==========================================
// 2. Handlers (handlers.rs)
// ==========================================

pub async fn get_listening_history(
    State(state): State<crate::AppState>,
    Query(query): Query<HistoryQuery>,
) -> impl IntoResponse {
    match state.song_store.get_history(query).await {
        Ok(history) => Json(history).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(e.to_string())).into_response(),
    }
}
