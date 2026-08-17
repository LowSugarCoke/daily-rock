use std::future::Future;
use std::pin::Pin;

pub mod d1;
pub mod in_memory;
pub mod models;

pub use d1::*;
pub use in_memory::*;
pub use models::*;

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
