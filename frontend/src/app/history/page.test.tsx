import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import HistoryPage from "./page";
import type { HistoryItem } from "@/lib/types";

const mockHistory: HistoryItem[] = [
  {
    rating_id: "r3",
    song_id: "3",
    title: "Whole Lotta Love",
    artist: "Led Zeppelin",
    era: "1970s",
    genre_tags: ["Hard Rock", "Classic Rock"],
    youtube_id: "HQmmM_vIi4I",
    rating: 5,
    note: "That riff never gets old",
    timestamp: "2026-08-15 09:00:00",
  },
  {
    rating_id: "r2",
    song_id: "2",
    title: "Paranoid",
    artist: "Black Sabbath",
    era: "1970s",
    genre_tags: ["Heavy Metal"],
    youtube_id: "xyz",
    rating: 4,
    note: null,
    timestamp: "2026-08-14 09:00:00",
  },
  {
    rating_id: "r1",
    song_id: "1",
    title: "Johnny B. Goode",
    artist: "Chuck Berry",
    era: "1950s",
    genre_tags: ["Rock 'n' Roll"],
    youtube_id: "T38v3-SSGcM",
    rating: 3,
    note: null,
    timestamp: "2026-08-13 09:00:00",
  },
];

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHistory,
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("fetches and renders every history row", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });
    expect(screen.getByText("Paranoid")).toBeInTheDocument();
    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();
  });

  test("renders computed stat tiles", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Songs Logged")).toBeInTheDocument();
    });

    const songsTile = screen.getByText("Songs Logged").parentElement!;
    expect(within(songsTile).getByText("3")).toBeInTheDocument();

    const avgTile = screen.getByText("Average Rating").parentElement!;
    expect(within(avgTile).getByText("4")).toBeInTheDocument(); // (5+4+3)/3 = 4

    const streakTile = screen.getByText("Current Streak").parentElement!;
    expect(within(streakTile).getByText("3")).toBeInTheDocument();
  });

  test("filters the list by search text", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/search title or artist/i), {
      target: { value: "paranoid" },
    });

    expect(screen.getByText("Paranoid")).toBeInTheDocument();
    expect(screen.queryByText("Whole Lotta Love")).not.toBeInTheDocument();
    expect(screen.queryByText("Johnny B. Goode")).not.toBeInTheDocument();
  });

  test("filters the list by era", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/era/i), {
      target: { value: "1950s" },
    });

    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();
    expect(screen.queryByText("Whole Lotta Love")).not.toBeInTheDocument();
    expect(screen.queryByText("Paranoid")).not.toBeInTheDocument();
  });

  test("shows an empty state when filters match nothing", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/search title or artist/i), {
      target: { value: "no such song" },
    });

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });
});
