use serde::{Deserialize, Serialize};

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
