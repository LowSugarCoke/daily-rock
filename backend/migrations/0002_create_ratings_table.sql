-- Migration: Create ratings table

CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    daily_selection_id TEXT NOT NULL UNIQUE,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
