// PRACTICE: Genre stats (exercise 5 in docs/rust-learning-plan.md).
//
// The History page shows a genre filter chip for every genre you have heard,
// with how many times you heard it. Today the frontend counts these itself
// (`genresByCount` in frontend/src/app/history/page.tsx). Move that counting
// into the backend.
//
// Requirement:
// - Input: the listening history, a slice of `HistoryItem` (one per rated song).
// - Output: one entry per genre tag, with the genre's name and how many history
//   items carry that tag.
// - Order: the most heard genre first. Genres with the same count are ordered
//   by name (A to Z).
// - No history gives an empty list. A song with no tags adds nothing.
//
// This week you design it yourself:
// 1. A `pub struct` for one entry and the `pub fn` signature.
// 2. The tests in the `tests` module below, written first, one per rule above.
// 3. The body, until `cargo test genres` passes.

#[cfg(test)]
mod tests {
    use crate::store::HistoryItem;

    /// A history item for one rated song with the given genre tags.
    #[allow(dead_code)]
    fn item(song_id: &str, genres: &[&str]) -> HistoryItem {
        HistoryItem {
            rating_id: format!("r{song_id}"),
            song_id: song_id.to_string(),
            title: format!("Song {song_id}"),
            artist: "Artist".to_string(),
            era: "1970s".to_string(),
            genre_tags: genres.iter().map(|g| g.to_string()).collect(),
            youtube_id: "xxxxxxxxxxx".to_string(),
            album: "Album".to_string(),
            year: 1970,
            cover_url: String::new(),
            cover_color: "#000000".to_string(),
            rating: 4,
            note: None,
            timestamp: "2026-10-07T00:00:00Z".to_string(),
        }
    }
}
