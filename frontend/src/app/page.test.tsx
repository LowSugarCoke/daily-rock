import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import Home from "./page";

const mockSong = {
  id: "1",
  title: "Johnny B. Goode",
  artist: "Chuck Berry",
  era: "1950s",
  genre_tags: ["Rock 'n' Roll"],
  youtube_id: "T38v3-SSGcM",
};

const mockNextSong = {
  id: "2",
  title: "Whole Lotta Love",
  artist: "Led Zeppelin",
  era: "1960s",
  genre_tags: ["Hard Rock", "Classic Rock"],
  youtube_id: "HQmmM_vIi4I",
};

describe("Home Component", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders initial loading state and today's eyebrow", () => {
    // Mock fetch to return a pending promise to stay in loading state
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    render(<Home />);

    expect(screen.getByText("Today's Selection")).toBeInTheDocument();
    expect(
      screen.getByText("Loading today's selection...")
    ).toBeInTheDocument();
  });

  test("renders success state with the current song details", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSong,
    } as Response);

    render(<Home />);

    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    // Assert song details are rendered beautifully
    expect(screen.getByText("Today's Selection")).toBeInTheDocument();
    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();
    expect(screen.getByText("Chuck Berry")).toBeInTheDocument();
    expect(screen.getByText("1950s")).toBeInTheDocument();
    expect(screen.getByText("Rock 'n' Roll")).toBeInTheDocument();
  });

  test("renders empty/no-song state when backend returns 404", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => "No song found",
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByText("No daily selection available")
    ).toBeInTheDocument();
    expect(
      screen.getByText("There are no songs loaded in the database yet.")
    ).toBeInTheDocument();
  });

  test("renders error state when backend fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByText(/Failed to load today's selection/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP error! status: 500/i)).toBeInTheDocument();
  });

  test("renders rating form when a song is successfully loaded", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSong,
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText("Rate this Song")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Add private notes about this song (optional)..."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Submit Rating/i })
    ).toBeInTheDocument();

    // Check for 5 star buttons
    for (let i = 1; i <= 5; i++) {
      expect(
        screen.getByLabelText(`Rate ${i} star${i > 1 ? "s" : ""}`)
      ).toBeInTheDocument();
    }
  });

  test("validation displays error when submitting without a rating", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSong,
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Rating/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText("Please select a rating of 1 to 5 stars.")
    ).toBeInTheDocument();
  });

  test("displays backend error message on failed submission", async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = typeof url === "string" ? url : (url as Request).url || "";
      if (urlStr.includes("/api/ratings") && init?.method === "POST") {
        return {
          ok: false,
          status: 400,
          json: async () => "Note must be 1024 characters or less",
        } as Response;
      }
      if (urlStr.includes("/api/daily_selection")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockSong,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    // Select 4 stars and submit
    const star4 = screen.getByLabelText("Rate 4 stars");
    fireEvent.click(star4);

    const submitBtn = screen.getByRole("button", { name: /Submit Rating/i });
    fireEvent.click(submitBtn);

    // Verify error is displayed on screen
    await waitFor(() => {
      expect(
        screen.getByText("Note must be 1024 characters or less")
      ).toBeInTheDocument();
    });
  });

  test("disables form elements and shows submitting status on submission", async () => {
    let resolvePost: (
      value: Response | PromiseLike<Response>
    ) => void = () => {};
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = typeof url === "string" ? url : (url as Request).url || "";
      if (urlStr.includes("/api/ratings") && init?.method === "POST") {
        return postPromise;
      }
      if (urlStr.includes("/api/daily_selection")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockSong,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    // Select 4 stars and submit
    const star4 = screen.getByLabelText("Rate 4 stars");
    fireEvent.click(star4);

    const submitBtn = screen.getByRole("button", { name: /Submit Rating/i });
    fireEvent.click(submitBtn);

    // Assert submitting state - elements should be disabled and button text should change
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Submitting...");
    expect(
      screen.getByPlaceholderText(
        "Add private notes about this song (optional)..."
      )
    ).toBeDisabled();

    for (let i = 1; i <= 5; i++) {
      expect(
        screen.getByLabelText(`Rate ${i} star${i > 1 ? "s" : ""}`)
      ).toBeDisabled();
    }

    // Resolve POST request to finish submission
    resolvePost({
      ok: true,
      status: 201,
      json: async () => "Rating saved",
    } as Response);

    // Wait until it is no longer submitting
    await waitFor(() => {
      const submitBtnAfter = screen.getByRole("button", {
        name: /Submit Rating/i,
      });
      expect(submitBtnAfter).not.toHaveTextContent("Submitting...");
    });
  });

  test("successfully submits rating and note, and re-fetches to load the next song", async () => {
    let callCount = 0;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = typeof url === "string" ? url : (url as Request).url || "";
      if (urlStr.includes("/api/ratings") && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        expect(body.daily_selection_id).toBe("1");
        expect(body.rating).toBe(5);
        expect(body.note).toBe("Incredible guitar solo!");
        return {
          ok: true,
          status: 201,
          json: async () => "Rating saved",
        } as Response;
      }
      if (urlStr.includes("/api/daily_selection")) {
        callCount++;
        const returnedSong = callCount === 1 ? mockSong : mockNextSong;
        return {
          ok: true,
          status: 200,
          json: async () => returnedSong,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(<Home />);

    // 1. Initial song loading
    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();

    // 2. Click 5 stars
    const star5 = screen.getByLabelText("Rate 5 stars");
    fireEvent.click(star5);

    // 3. Type note
    const noteTextarea = screen.getByPlaceholderText(
      "Add private notes about this song (optional)..."
    );
    fireEvent.change(noteTextarea, {
      target: { value: "Incredible guitar solo!" },
    });

    // 4. Submit
    const submitBtn = screen.getByRole("button", { name: /Submit Rating/i });
    fireEvent.click(submitBtn);

    // 5. Verification of success message and transition to next song
    await waitFor(() => {
      expect(
        screen.getByText("Success! Loading next selection...")
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Whole Lotta Love")).toBeInTheDocument();
    });
    expect(screen.getByText("Led Zeppelin")).toBeInTheDocument();
    expect(screen.getByText("1960s")).toBeInTheDocument();
    expect(screen.getByText("Hard Rock")).toBeInTheDocument();
    expect(screen.getByText("Classic Rock")).toBeInTheDocument();
    expect(screen.queryByText("Johnny B. Goode")).not.toBeInTheDocument();

    // The rating form and note field should be cleared on the newly mounted element
    const noteTextareaAfter = screen.getByPlaceholderText(
      "Add private notes about this song (optional)..."
    );
    expect(noteTextareaAfter).toHaveValue("");
  });

  test("successfully submits rating and note, and handles 404 (no more songs) gracefully", async () => {
    let callCount = 0;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = typeof url === "string" ? url : (url as Request).url || "";
      if (urlStr.includes("/api/ratings") && init?.method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => "Rating saved",
        } as Response;
      }
      if (urlStr.includes("/api/daily_selection")) {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => mockSong,
          } as Response;
        } else {
          return {
            ok: false,
            status: 404,
            json: async () => "No song found",
          } as Response;
        }
      }
      return { ok: false, status: 404 } as Response;
    });

    render(<Home />);

    // 1. Initial song loading
    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();

    // 2. Click 5 stars and submit
    const star5 = screen.getByLabelText("Rate 5 stars");
    fireEvent.click(star5);

    const submitBtn = screen.getByRole("button", { name: /Submit Rating/i });
    fireEvent.click(submitBtn);

    // 3. Verification of "no song" view after success
    await waitFor(() => {
      expect(
        screen.getByText("No daily selection available")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("There are no songs loaded in the database yet.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Johnny B. Goode")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Success! Loading next selection...")
    ).not.toBeInTheDocument();
  });
});
