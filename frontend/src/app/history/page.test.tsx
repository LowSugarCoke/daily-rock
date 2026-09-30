import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import HistoryPage from "./page";
import { mockHistory } from "@/test/history-fixture";

describe("HistoryPage", () => {
  beforeEach(() => {
    // Fixture ratings end on Aug 15, so the streak is live on that day.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
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
    vi.useRealTimers();
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

    fireEvent.change(screen.getByRole("searchbox"), {
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

    const eraButton = screen.getByRole("button", { name: "1950s" });
    fireEvent.click(eraButton);

    expect(eraButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();
    expect(screen.queryByText("Whole Lotta Love")).not.toBeInTheDocument();
    expect(screen.queryByText("Paranoid")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All eras" }));
    expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
  });

  test("filters the list by genre, and a second tap clears it", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });

    const genre = screen.getByRole("button", { name: "Heavy Metal" });
    fireEvent.click(genre);

    expect(screen.getByText("Paranoid")).toBeInTheDocument();
    expect(screen.queryByText("Whole Lotta Love")).not.toBeInTheDocument();

    fireEvent.click(genre);
    expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
  });

  test("search also matches album and genre", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "led zeppelin ii" },
    });
    expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    expect(screen.queryByText("Paranoid")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "rock 'n' roll" },
    });
    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();
    expect(screen.queryByText("Whole Lotta Love")).not.toBeInTheDocument();
  });

  test("shows an empty state when filters match nothing", async () => {
    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "no such song" },
    });

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });
  test("shows each row's album, year, cover and rating in words", async () => {
    render(<HistoryPage />);

    const row = (await screen.findByText("Whole Lotta Love")).closest("li")!;
    expect(within(row).getByText("Led Zeppelin II, 1969")).toBeInTheDocument();
    expect(
      within(row).getByAltText("Led Zeppelin II cover")
    ).toBeInTheDocument();
    expect(within(row).getByText("Classic")).toBeInTheDocument();
    expect(
      within(row).getByText("Hard Rock, Classic Rock")
    ).toBeInTheDocument();
  });
  test("links each entry to its own page", async () => {
    render(<HistoryPage />);

    const row = (await screen.findByText("Whole Lotta Love")).closest("li")!;
    expect(within(row).getByRole("link")).toHaveAttribute(
      "href",
      "/history/r3"
    );
  });
});
