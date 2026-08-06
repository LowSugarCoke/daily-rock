-- Migration: Create songs table and seed with initial chronological song list

CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    era TEXT NOT NULL,
    genre_tags TEXT NOT NULL,
    youtube_id TEXT NOT NULL
);

INSERT OR IGNORE INTO songs (id, title, artist, era, genre_tags, youtube_id) VALUES
('1', 'Johnny B. Goode', 'Chuck Berry', '1950s', '["Rock ''n'' Roll"]', 'T38v3-SSGcM'),
('2', 'Whole Lotta Love', 'Led Zeppelin', '1960s', '["Hard Rock", "Classic Rock"]', 'HQmmM_vIi4I'),
('3', 'Bohemian Rhapsody', 'Queen', '1970s', '["Progressive Rock", "Glam Rock"]', 'fJ9rUzIMcZQ');
