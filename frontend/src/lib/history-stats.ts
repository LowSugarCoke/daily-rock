import type { HistoryItem } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function dateKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export function formatDayMonth(timestamp: string): {
  day: string;
  month: string;
} {
  const [, monthStr, dayStr] = dateKey(timestamp).split("-");
  const monthIndex = Number(monthStr) - 1;
  return {
    day: dayStr,
    month: MONTH_ABBREVIATIONS[monthIndex] ?? monthStr,
  };
}

export function computeAverageRating(items: HistoryItem[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((total, item) => total + item.rating, 0);
  return Math.round((sum / items.length) * 10) / 10;
}

// Timestamps come from D1's CURRENT_TIMESTAMP, which is UTC, so "today" is
// taken in UTC as well.
export function computeCurrentStreak(
  items: HistoryItem[],
  now: Date = new Date()
): number {
  if (items.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(items.map((item) => dateKey(item.timestamp)))
  ).sort((a, b) => (a < b ? 1 : -1));

  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const latest = new Date(`${uniqueDays[0]}T00:00:00Z`);
  if (Math.round((today.getTime() - latest.getTime()) / MS_PER_DAY) > 1) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const current = new Date(`${uniqueDays[i - 1]}T00:00:00Z`).getTime();
    const previous = new Date(`${uniqueDays[i]}T00:00:00Z`).getTime();
    const dayGap = Math.round((current - previous) / MS_PER_DAY);
    if (dayGap === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
