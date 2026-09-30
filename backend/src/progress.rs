use crate::store::Song;
use serde::Serialize;
use std::collections::HashSet;

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
pub struct EraProgress {
    pub era: String,
    pub listened: usize,
    pub total: usize,
}

// PRACTICE: how far through each decade of the catalog are you?
//
// Return one `EraProgress` per era, in the order each era first appears in
// `songs`. `total` counts the era's songs; `listened` counts the ones whose
// `id` is in `rated_ids`.
//
// Run `cargo test progress` until all 5 tests pass. Ask for a hint when you
// get stuck. A verified answer is in `solutions/progress.rs`.
pub fn era_progress(_songs: &[Song], _rated_ids: &HashSet<String>) -> Vec<EraProgress> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn song(id: &str, era: &str) -> Song {
        Song {
            id: id.to_string(),
            title: format!("Song {id}"),
            artist: "Artist".to_string(),
            era: era.to_string(),
            genre_tags: vec![],
            youtube_id: "xxxxxxxxxxx".to_string(),
        }
    }

    fn rated(ids: &[&str]) -> HashSet<String> {
        ids.iter().map(|id| id.to_string()).collect()
    }

    #[test]
    fn test_empty_catalog_has_no_progress() {
        assert_eq!(era_progress(&[], &rated(&[])), vec![]);
    }

    #[test]
    fn test_counts_songs_per_era() {
        let songs = vec![song("1", "1950s"), song("2", "1950s"), song("3", "1960s")];

        assert_eq!(
            era_progress(&songs, &rated(&[])),
            vec![
                EraProgress {
                    era: "1950s".to_string(),
                    listened: 0,
                    total: 2
                },
                EraProgress {
                    era: "1960s".to_string(),
                    listened: 0,
                    total: 1
                },
            ]
        );
    }

    #[test]
    fn test_counts_only_rated_songs_as_listened() {
        let songs = vec![song("1", "1950s"), song("2", "1950s"), song("3", "1960s")];

        assert_eq!(
            era_progress(&songs, &rated(&["2", "3"])),
            vec![
                EraProgress {
                    era: "1950s".to_string(),
                    listened: 1,
                    total: 2
                },
                EraProgress {
                    era: "1960s".to_string(),
                    listened: 1,
                    total: 1
                },
            ]
        );
    }

    #[test]
    fn test_keeps_eras_in_catalog_order() {
        // Song 3 is a 1970s song listed before the 1950s songs in the catalog.
        let songs = vec![song("3", "1970s"), song("4", "1950s"), song("5", "1970s")];

        let eras: Vec<String> = era_progress(&songs, &rated(&["5"]))
            .into_iter()
            .map(|p| p.era)
            .collect();

        assert_eq!(eras, vec!["1970s", "1950s"]);
    }

    #[test]
    fn test_ignores_rated_ids_missing_from_catalog() {
        let songs = vec![song("1", "1950s")];

        assert_eq!(
            era_progress(&songs, &rated(&["1", "999"])),
            vec![EraProgress {
                era: "1950s".to_string(),
                listened: 1,
                total: 1
            }]
        );
    }
}
