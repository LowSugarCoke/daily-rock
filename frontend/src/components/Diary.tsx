import styles from "./Diary.module.css";
import { RATING_WORDS } from "@/lib/rating";

export function PenCircle({ animate = false }: { animate?: boolean }) {
  return (
    <svg
      className={`${styles.penCircle} ${animate ? styles.penDraw : ""}`}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M6 24 C 8 6, 90 2, 95 18 C 99 34, 22 40, 8 30 C 2 24, 18 10, 52 8" />
    </svg>
  );
}

// The five rating words with the chosen one circled in pen. Pass onChange to
// make it a control; without it, it shows a past rating read-only.
export function RatingScale({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange?: (value: number) => void;
  disabled?: boolean;
}) {
  if (!onChange) {
    return (
      <p
        className={styles.words}
        role="img"
        aria-label={`Your rating: ${RATING_WORDS[(value ?? 0) - 1] ?? "none"}`}
      >
        {RATING_WORDS.map((word, index) => (
          <span
            key={word}
            className={`${styles.word} ${value === index + 1 ? styles.wordOn : ""}`}
          >
            {word}
            {value === index + 1 && <PenCircle />}
          </span>
        ))}
      </p>
    );
  }

  return (
    <div className={styles.words} role="group" aria-label="Rating">
      {RATING_WORDS.map((word, index) => {
        const rating = index + 1;
        const isOn = value === rating;
        return (
          <button
            key={word}
            type="button"
            className={`${styles.word} ${styles.wordButton} ${isOn ? styles.wordOn : ""}`}
            onClick={() => onChange(rating)}
            aria-label={`Rate ${rating} star${rating > 1 ? "s" : ""}`}
            aria-pressed={isOn}
            disabled={disabled}
          >
            {word}
            {isOn && <PenCircle animate />}
          </button>
        );
      })}
    </div>
  );
}

// A ruled index card. Holds the notes textarea on Today, or a past note.
export function NoteCard({ children }: { children: React.ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}

export const diaryStyles = styles;
