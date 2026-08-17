use std::future::Future;
use std::pin::Pin;

pub mod models;
pub mod in_memory;
pub mod d1;

pub use models::*;
pub use in_memory::*;
pub use d1::*;

pub trait SongStore {
    fn get_daily_selection(&self) -> Pin<Box<dyn Future<Output = Option<Song>> + Send + '_>>;

    fn save_rating(
        &self,
        rating: Rating,
    ) -> Pin<Box<dyn Future<Output = worker::Result<()>> + Send + '_>>;

    fn get_history(
        &self,
        query: HistoryQuery,
    ) -> Pin<Box<dyn Future<Output = worker::Result<Vec<HistoryItem>>> + Send + '_>>;
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
