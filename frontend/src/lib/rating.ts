export const RATING_WORDS = ["Skip", "Meh", "Good", "Great", "Classic"];

export function ratingWord(rating: number): string {
  return RATING_WORDS[rating - 1] ?? String(rating);
}
