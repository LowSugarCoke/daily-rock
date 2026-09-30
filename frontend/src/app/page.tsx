"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import type { Song } from "@/lib/types";
import { useCoverTheme } from "@/lib/use-cover-theme";
import SongSpread from "@/components/SongSpread";
import { NoteCard, RatingScale, diaryStyles } from "@/components/Diary";

export default function Home() {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noSong, setNoSong] = useState<boolean>(false);

  // Rating and progression states
  const [rating, setRating] = useState<number | null>(null);
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

  useCoverTheme(song?.cover_color);

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
          (await (
            typeof response.clone === "function" ? response.clone() : response
          )
            .json()
            .catch(() => null)) || (await response.text().catch(() => null));
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

  const stampDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.heroRow}>
          <span className={styles.eyebrow}>Today&apos;s Selection</span>
        </p>

        {loading && !submitSuccess && (
          <div className={styles.statusBox}>
            <span className={styles.spinner} aria-hidden="true"></span>
            {"Loading today's selection..."}
          </div>
        )}

        {submitSuccess && (
          <div className={`${styles.statusBox} ${styles.success}`}>
            <span>Success! Loading next selection...</span>
          </div>
        )}

        {error && (
          <div className={`${styles.statusBox} ${styles.error}`}>
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
          <SongSpread
            song={song}
            stamp={`${stampDate} · Day ${Number(song.id)}`}
          >
            <section className={styles.ratingSection}>
              <h3 className={styles.ratingTitle}>Rate this Song</h3>
              <RatingScale
                value={rating}
                onChange={(value) => {
                  setRating(value);
                  setValidationError(null);
                }}
                disabled={submitting}
              />

              <label className={styles.noteLabel} htmlFor="song-note">
                Notes
              </label>
              <NoteCard>
                <textarea
                  id="song-note"
                  className={diaryStyles.noteInput}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add private notes about this song (optional)..."
                  rows={4}
                  disabled={submitting}
                  maxLength={1024}
                />
                <span className={styles.noteCount}>{note.length} / 1024</span>
              </NoteCard>

              {validationError && (
                <p className={styles.validationError} role="alert">
                  {validationError}
                </p>
              )}

              <button
                type="button"
                className={styles.submitButton}
                onClick={handleSubmitRating}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Rating"}
              </button>
            </section>
          </SongSpread>
        )}
      </main>
    </div>
  );
}
