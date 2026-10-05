use crate::store::{Song, SongStore};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct EraProgress {
    pub era: String,
    pub listened: usize,
    pub total: usize,
}

/// One `EraProgress` per era, in the order each era first appears in `songs`.
/// `total` counts the era's songs; `listened` counts the ones whose `id` is in
/// `rated_ids`.
pub fn era_progress(songs: &[Song], rated_ids: &HashSet<String>) -> Vec<EraProgress> {
    let mut progress: Vec<EraProgress> = Vec::new();

    for song in songs {
        let index = match progress.iter().position(|p| p.era == song.era) {
            Some(index) => index,
            None => {
                progress.push(EraProgress {
                    era: song.era.clone(),
                    listened: 0,
                    total: 0,
                });
                progress.len() - 1
            }
        };

        let entry = &mut progress[index];
        entry.total += 1;
        if rated_ids.contains(&song.id) {
            entry.listened += 1;
        }
    }

    progress
}

/// Era progress for the whole catalog: reads the catalog and the rated song
/// ids from `store`, then counts them with `era_progress`. A store error is
/// returned to the caller unchanged.
pub async fn load_progress(
    store: &(dyn SongStore + Send + Sync),
) -> worker::Result<Vec<EraProgress>> {
    let songs = store.get_catalog().await?;
    let rated_ids = store.get_rated_ids().await?;
    Ok(era_progress(&songs, &rated_ids))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::{HistoryItem, HistoryQuery, InMemorySongStore, Rating};
    use std::future::Future;
    use std::pin::Pin;

    fn song(id: &str, era: &str) -> Song {
        Song {
            id: id.to_string(),
            title: format!("Song {id}"),
            artist: "Artist".to_string(),
            era: era.to_string(),
            genre_tags: vec![],
            youtube_id: "xxxxxxxxxxx".to_string(),
            album: "Album".to_string(),
            year: 1970,
            cover_url: String::new(),
            cover_color: "#000000".to_string(),
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

    fn rating_for(song_id: &str) -> Rating {
        Rating {
            id: format!("r{song_id}"),
            daily_selection_id: song_id.to_string(),
            rating: 4,
            note: None,
            timestamp: None,
        }
    }

    /// A store whose catalog or ratings query fails, like D1 being down.
    struct FailingStore {
        catalog_fails: bool,
    }

    impl SongStore for FailingStore {
        fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>> {
            Box::pin(async { None })
        }

        fn save_rating(
            &self,
            _rating: Rating,
        ) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>> {
            Box::pin(async { Ok(()) })
        }

        fn get_history(
            &self,
            _query: HistoryQuery,
        ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>> {
            Box::pin(async { Ok(vec![]) })
        }

        fn get_catalog(
            &self,
        ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<Song>>> + Send + '_>> {
            let fails = self.catalog_fails;
            Box::pin(async move {
                if fails {
                    Err(worker::Error::RustError("catalog query failed".to_string()))
                } else {
                    Ok(vec![song("1", "1950s")])
                }
            })
        }

        fn get_rated_ids(
            &self,
        ) -> Pin<Box<dyn Future<Output = worker::Result<HashSet<String>>> + Send + '_>> {
            Box::pin(async { Err(worker::Error::RustError("ratings query failed".to_string())) })
        }

        fn update_rating(
            &self,
            _id: String,
            _rating: Option<u8>,
            _note: Option<String>,
        ) -> Pin<Box<dyn Future<Output = worker::Result<Option<Rating>>> + Send + '_>> {
            Box::pin(async { Ok(None) })
        }
    }

    #[tokio::test]
    async fn test_load_progress_with_no_ratings() {
        let store = InMemorySongStore::new();

        assert_eq!(
            load_progress(&store).await.unwrap(),
            vec![
                EraProgress {
                    era: "1950s".to_string(),
                    listened: 0,
                    total: 1
                },
                EraProgress {
                    era: "1960s".to_string(),
                    listened: 0,
                    total: 1
                },
                EraProgress {
                    era: "1970s".to_string(),
                    listened: 0,
                    total: 1
                },
            ]
        );
    }

    #[tokio::test]
    async fn test_load_progress_counts_saved_ratings() {
        let store = InMemorySongStore::new();
        store.save_rating(rating_for("2")).await.unwrap();

        let progress = load_progress(&store).await.unwrap();

        assert_eq!(
            progress[1],
            EraProgress {
                era: "1960s".to_string(),
                listened: 1,
                total: 1
            }
        );
        assert_eq!(progress[0].listened, 0);
    }

    #[tokio::test]
    async fn test_load_progress_returns_catalog_error() {
        let store = FailingStore {
            catalog_fails: true,
        };

        let error = load_progress(&store).await.unwrap_err();

        assert_eq!(error.to_string(), "catalog query failed");
    }

    #[tokio::test]
    async fn test_load_progress_returns_ratings_error() {
        let store = FailingStore {
            catalog_fails: false,
        };

        let error = load_progress(&store).await.unwrap_err();

        assert_eq!(error.to_string(), "ratings query failed");
    }
}
