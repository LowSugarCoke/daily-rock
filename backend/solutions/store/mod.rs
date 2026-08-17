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
