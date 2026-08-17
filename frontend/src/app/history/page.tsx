"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import {
  computeAverageRating,
  computeCurrentStreak,
  formatDayMonth,
} from "@/lib/history-stats";
import type { HistoryItem } from "@/lib/types";

const ALL = "";

function distinctSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [era, setEra] = useState<string>(ALL);
  const [genre, setGenre] = useState<string>(ALL);
  const [artist, setArtist] = useState<string>(ALL);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: HistoryItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  const eraOptions = useMemo(
    () => distinctSorted(items.map((i) => i.era)),
    [items]
  );
  const genreOptions = useMemo(
    () => distinctSorted(items.flatMap((i) => i.genre_tags)),
    [items]
  );
  const artistOptions = useMemo(
    () => distinctSorted(items.map((i) => i.artist)),
    [items]
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (era && item.era !== era) return false;
      if (artist && item.artist !== artist) return false;
      if (genre && !item.genre_tags.includes(genre)) return false;
      if (
        query &&
        !item.title.toLowerCase().includes(query) &&
        !item.artist.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [items, search, era, artist, genre]);

  const songsLogged = items.length;
  const averageRating = computeAverageRating(items);
  const currentStreak = computeCurrentStreak(items);

  const hasActiveFilters = Boolean(search || era || genre || artist);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.head}>
          <h2 className={styles.heading}>Listening History</h2>
          <p className={styles.subheading}>
            Every song you&apos;ve rated, filterable by era, artist, and genre.
          </p>
        </div>

        {loading && (
          <div className={styles.statusBox}>
            <span className={styles.spinner}></span>
            Loading your history...
          </div>
        )}

        {error && (
          <div className={`${styles.statusBox} ${styles.error}`}>
            Failed to load history: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className={styles.statRow}>
              <div className={styles.statTile}>
                <div className={styles.statLabel}>Songs Logged</div>
                <div className={styles.statValue}>{songsLogged}</div>
              </div>
              <div className={styles.statTile}>
                <div className={styles.statLabel}>Average Rating</div>
                <div className={styles.statValue}>
                  {averageRating} <small>★</small>
                </div>
              </div>
              <div className={styles.statTile}>
                <div className={styles.statLabel}>Current Streak</div>
                <div className={styles.statValue}>
                  {currentStreak} <small>days</small>
                </div>
              </div>
            </div>

            <div className={styles.filterBar}>
              <input
                type="search"
                className={styles.filterSearch}
                placeholder="Search title or artist…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <label className={styles.filterField}>
                <span className={styles.filterFieldLabel}>Era</span>
                <select
                  className={styles.filterSelect}
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                >
                  <option value={ALL}>All eras</option>
                  {eraOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.filterField}>
                <span className={styles.filterFieldLabel}>Genre</span>
                <select
                  className={styles.filterSelect}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  <option value={ALL}>All genres</option>
                  {genreOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.filterField}>
                <span className={styles.filterFieldLabel}>Artist</span>
                <select
                  className={styles.filterSelect}
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                >
                  <option value={ALL}>All artists</option>
                  {artistOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  className={styles.clearFilters}
                  onClick={() => {
                    setSearch("");
                    setEra(ALL);
                    setGenre(ALL);
                    setArtist(ALL);
                  }}
                >
                  Clear filters ×
                </button>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                No results for the current filters — clear a filter to see more.
              </div>
            ) : (
              <ul className={styles.list}>
                {filteredItems.map((item) => {
                  const { day, month } = formatDayMonth(item.timestamp);
                  return (
                    <li key={item.rating_id} className={styles.row}>
                      <div className={styles.rowDate}>
                        <span className={styles.rowDateDay}>{day}</span>
                        <span className={styles.rowDateMonth}>{month}</span>
                      </div>
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitleLine}>
                          <span className={styles.rowTitle}>{item.title}</span>
                          <span className={styles.rowArtist}>
                            {item.artist}
                          </span>
                        </div>
                        <div className={styles.rowTags}>
                          <span className={styles.rowEra}>{item.era}</span>
                          {item.genre_tags.map((tag) => (
                            <span key={tag} className={styles.rowGenre}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        {item.note && (
                          <div className={styles.rowNote}>
                            &ldquo;{item.note}&rdquo;
                          </div>
                        )}
                      </div>
                      <div className={styles.rowRating}>
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <span
                            key={starValue}
                            className={`${styles.rowStar} ${
                              starValue <= item.rating ? styles.rowStarOn : ""
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
