//! Genre counts for the History page filter chips.

use crate::store::HistoryItem;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct GenreCount {
    pub name: String,
    pub count: usize,
}

/// How many rated songs carry each genre tag, most heard first; genres with
/// the same count are ordered by name. A song with no tags adds nothing.
pub fn genre_counts(items: &[HistoryItem]) -> Vec<GenreCount> {
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for tag in items.iter().flat_map(|item| &item.genre_tags) {
        *counts.entry(tag.as_str()).or_insert(0) += 1;
    }

    let mut result: Vec<GenreCount> = counts
        .into_iter()
        .map(|(name, count)| GenreCount {
            name: name.to_string(),
            count,
        })
        .collect();
    result.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A history item for one rated song with the given genre tags.
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

    fn count(name: &str, count: usize) -> GenreCount {
        GenreCount {
            name: name.to_string(),
            count,
        }
    }

    #[test]
    fn test_no_history_has_no_genres() {
        assert_eq!(genre_counts(&[]), vec![]);
    }

    #[test]
    fn test_counts_every_tag_of_every_song() {
        let items = vec![
            item("1", &["Hard Rock", "Classic Rock"]),
            item("2", &["Hard Rock"]),
        ];

        assert_eq!(
            genre_counts(&items),
            vec![count("Hard Rock", 2), count("Classic Rock", 1)]
        );
    }

    #[test]
    fn test_most_heard_genre_comes_first() {
        let items = vec![
            item("1", &["Blues Rock"]),
            item("2", &["Punk"]),
            item("3", &["Punk"]),
            item("4", &["Punk"]),
        ];

        assert_eq!(
            genre_counts(&items),
            vec![count("Punk", 3), count("Blues Rock", 1)]
        );
    }

    #[test]
    fn test_ties_are_ordered_by_name() {
        let items = vec![
            item("1", &["Punk", "Glam Rock"]),
            item("2", &["Blues Rock"]),
        ];

        assert_eq!(
            genre_counts(&items),
            vec![
                count("Blues Rock", 1),
                count("Glam Rock", 1),
                count("Punk", 1)
            ]
        );
    }

    #[test]
    fn test_song_without_tags_adds_nothing() {
        let items = vec![item("1", &[]), item("2", &["Grunge"])];

        assert_eq!(genre_counts(&items), vec![count("Grunge", 1)]);
    }
}
