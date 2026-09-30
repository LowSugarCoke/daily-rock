import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HistoryEntryPage from "./page";
import { mockHistory } from "@/test/history-fixture";

let mockRatingId = "r3";
vi.mock("next/navigation", () => ({
  useParams: () => ({ ratingId: mockRatingId }),
}));

describe("HistoryEntryPage", () => {
  beforeEach(() => {
    mockRatingId = "r3";
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

  test("shows the song, when you heard it, and its credits", async () => {
    render(<HistoryEntryPage />);

    expect(await screen.findByText("Whole Lotta Love")).toBeInTheDocument();
    expect(screen.getByText("Led Zeppelin")).toBeInTheDocument();
    expect(screen.getByText("Led Zeppelin II, 1969")).toBeInTheDocument();
    expect(screen.getByText("Aug 15 · Day 3")).toBeInTheDocument();
    expect(screen.getByAltText("Led Zeppelin II cover")).toBeInTheDocument();
  });

  test("lets you listen to the song again", async () => {
    render(<HistoryEntryPage />);

    const player = await screen.findByTitle("Whole Lotta Love - Led Zeppelin");
    expect(player).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/HQmmM_vIi4I"
    );
  });

  test("shows your rating and note", async () => {
    render(<HistoryEntryPage />);

    expect(
      await screen.findByLabelText("Your rating: Classic")
    ).toBeInTheDocument();
    expect(screen.getByText("That riff never gets old")).toBeInTheDocument();
  });

  test("links back to the history list", async () => {
    render(<HistoryEntryPage />);

    await screen.findByText("Whole Lotta Love");
    expect(screen.getByRole("link", { name: /history/i })).toHaveAttribute(
      "href",
      "/history"
    );
  });

  test("says so when the entry is not in your history", async () => {
    mockRatingId = "missing";
    render(<HistoryEntryPage />);

    expect(
      await screen.findByText("This song isn't in your history.")
    ).toBeInTheDocument();
  });
});
