"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export interface Song {
  id: string;
  title: string;
  artist: string;
  era: string;
  genre_tags: string[];
  youtube_id: string;
}

export default function Home() {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noSong, setNoSong] = useState<boolean>(false);

  // Rating and progression states
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  useEffect(() => {
    fetch("/api/daily_selection")
      .then((res) => {
        if (res.status === 404) {
          setNoSong(true);
          setLoading(false);
          setSubmitSuccess(false); // Reset success state when no song is found
          return null;
        }
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Song | null) => {
        if (data) {
          setSong(data);
          setLoading(false);
          setSubmitSuccess(false); // Clear success state once new song is fetched
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
        setSubmitSuccess(false); // Reset success state on error
      });
  }, [fetchTrigger]);

  const handleSubmitRating = async () => {
    if (!song) return;

    if (rating === null || rating < 1 || rating > 5) {
      setValidationError("Please select a rating of 1 to 5 stars.");
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          daily_selection_id: song.id,
          rating,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const errData =
          (await response.json().catch(() => null)) ||
          (await response.text().catch(() => null));
        const errMsg =
          typeof errData === "string"
            ? errData
            : errData
              ? JSON.stringify(errData)
              : response.statusText;
        throw new Error(errMsg);
      }

      setSubmitSuccess(true);
      setSong(null); // Clear the rated song state immediately to prevent regression/residual UI
      setRating(null);
      setNote("");
      setHoverRating(null);
      setLoading(true);
      setError(null);
      setNoSong(false);
      setFetchTrigger((prev) => prev + 1);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.brand}>
            <span className={styles.rockEmoji}>🎸</span>
            <h1 className={styles.title}>Daily Rock</h1>
          </div>
          <p className={styles.tagline}>
            Systematically listening to rock music, one song a day. Tracking
            history, ratings, and classic rock evolution.
          </p>

          <div className={styles.selectionSection}>
            {loading && !submitSuccess && (
              <div className={styles.statusBox}>
                <span className={styles.spinner}></span>
                {"Loading today's selection..."}
              </div>
            )}

            {submitSuccess && (
              <div className={`${styles.statusBox} ${styles.success}`}>
                <span className={styles.spinner}></span>
                <span>Success! Loading next selection...</span>
              </div>
            )}

            {error && (
              <div className={`${styles.statusBox} ${styles.error}`}>
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: "#ff4d4f" }}
                ></span>
                <div className={styles.errorContent}>
                  <h3 className={styles.errorTitle}>
                    {"Failed to load today's selection"}
                  </h3>
                  <p className={styles.errorMessage}>{error}</p>
                </div>
              </div>
            )}

            {noSong && (
              <div className={`${styles.statusBox} ${styles.warning}`}>
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: "#faad14" }}
                ></span>
                <div className={styles.warningContent}>
                  <h3 className={styles.warningTitle}>
                    No daily selection available
                  </h3>
                  <p className={styles.warningMessage}>
                    There are no songs loaded in the database yet.
                  </p>
                </div>
              </div>
            )}

            {song && !loading && (
              <div className={styles.songCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardBadge}>
                    {"Today's Selection"}
                  </span>
                  <span className={styles.eraTag}>{song.era}</span>
                </div>
                <h2 className={styles.songTitle}>{song.title}</h2>
                <p className={styles.songArtist}>{song.artist}</p>
                <div className={styles.genreTags}>
                  {song.genre_tags.map((tag) => (
                    <span key={tag} className={styles.genreTag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className={styles.mediaPlaceholder}>
                  <span className={styles.playIcon}>▶</span>
                  <span>YouTube Player Placeholder (Issue #7)</span>
                </div>

                <div className={styles.ratingSection}>
                  <h3 className={styles.ratingTitle}>Rate this Song</h3>

                  <div className={styles.starContainer}>
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isFilled =
                        hoverRating !== null
                          ? starValue <= hoverRating
                          : starValue <= (rating || 0);
                      return (
                        <button
                          key={starValue}
                          type="button"
                          className={`${styles.starButton} ${isFilled ? styles.filled : ""}`}
                          onClick={() => {
                            setRating(starValue);
                            setValidationError(null);
                          }}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(null)}
                          aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
                          disabled={submitting}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    className={styles.noteInput}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add private notes about this song (optional)..."
                    rows={3}
                    disabled={submitting}
                    maxLength={1024}
                  />

                  {validationError && (
                    <p className={styles.validationError}>{validationError}</p>
                  )}

                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={handleSubmitRating}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Rating"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="https://github.com/LowSugarCoke/daily-rock"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repo
          </a>
          <a
            className={styles.secondary}
            href="/api/daily_selection"
            target="_blank"
            rel="noopener noreferrer"
          >
            Direct API Check
          </a>
        </div>
      </main>
    </div>
  );
}
