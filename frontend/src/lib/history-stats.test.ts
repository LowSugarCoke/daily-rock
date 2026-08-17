import { describe, expect, test } from "vitest";
import {
  computeAverageRating,
  computeCurrentStreak,
  dateKey,
  formatDayMonth,
} from "./history-stats";
import type { HistoryItem } from "./types";

function item(overrides: Partial<HistoryItem>): HistoryItem {
  return {
    rating_id: "r1",
    song_id: "1",
    title: "Johnny B. Goode",
    artist: "Chuck Berry",
    era: "1950s",
    genre_tags: ["Rock 'n' Roll"],
    youtube_id: "T38v3-SSGcM",
    rating: 5,
    note: null,
    timestamp: "2026-08-15 12:00:00",
    ...overrides,
  };
}

describe("dateKey", () => {
  test("extracts the calendar date from a D1-style timestamp", () => {
    expect(dateKey("2026-08-15 12:34:56")).toBe("2026-08-15");
  });
});

describe("formatDayMonth", () => {
  test("formats a timestamp into a short day/month pair", () => {
    expect(formatDayMonth("2026-08-15 12:00:00")).toEqual({
      day: "15",
      month: "Aug",
    });
  });
});

describe("computeAverageRating", () => {
  test("returns 0 for an empty list", () => {
    expect(computeAverageRating([])).toBe(0);
  });

  test("rounds the average to one decimal place", () => {
    const items = [
      item({ rating: 5 }),
      item({ rating: 4 }),
      item({ rating: 4 }),
    ];
    expect(computeAverageRating(items)).toBe(4.3);
  });
});

describe("computeCurrentStreak", () => {
  test("returns 0 for an empty list", () => {
    expect(computeCurrentStreak([])).toBe(0);
  });

  test("returns 1 when there is a single day logged", () => {
    expect(
      computeCurrentStreak([item({ timestamp: "2026-08-15 09:00:00" })])
    ).toBe(1);
  });

  test("counts consecutive calendar days as a streak", () => {
    const items = [
      item({ rating_id: "r3", timestamp: "2026-08-15 09:00:00" }),
      item({ rating_id: "r2", timestamp: "2026-08-14 09:00:00" }),
      item({ rating_id: "r1", timestamp: "2026-08-13 09:00:00" }),
    ];
    expect(computeCurrentStreak(items)).toBe(3);
  });

  test("multiple ratings on the same day only count once", () => {
    const items = [
      item({ rating_id: "r2", timestamp: "2026-08-15 20:00:00" }),
      item({ rating_id: "r1", timestamp: "2026-08-15 09:00:00" }),
    ];
    expect(computeCurrentStreak(items)).toBe(1);
  });

  test("stops counting at the first gap in days", () => {
    const items = [
      item({ rating_id: "r3", timestamp: "2026-08-15 09:00:00" }),
      item({ rating_id: "r2", timestamp: "2026-08-14 09:00:00" }),
      item({ rating_id: "r1", timestamp: "2026-08-10 09:00:00" }),
    ];
    expect(computeCurrentStreak(items)).toBe(2);
  });
});
