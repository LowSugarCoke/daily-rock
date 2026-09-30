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

  test("summarises the stats in one line", async () => {
    render(<HistoryPage />);

    // (5 + 4 + 3) / 3 = 4, and the fixture has three days in a row.
    expect(
      await screen.findByText("3 songs · avg 4 / 5 · 3-day streak")
    ).toBeInTheDocument();
  });

  test("keeps era and genre behind the Filter toggle", async () => {
    render(<HistoryPage />);

    const toggle = await screen.findByRole("button", { name: /filter/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", { name: "1950s" })
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "1950s" })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /filter/i }));
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

    fireEvent.click(screen.getByRole("button", { name: /filter/i }));
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
