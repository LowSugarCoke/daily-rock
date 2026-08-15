import { test, expect } from "@playwright/test";

test.describe("Daily Rock Home Page", () => {
  test("successfully loads and renders the daily selection from the real backend integration", async ({
    page,
  }) => {
    // Navigate directly to the home page (No mocking! Real E2E integration with seeded backend SQLite)
    await page.goto("/");

    // Verify page title and header
    await expect(page).toHaveTitle("Daily Rock");
    await expect(page.locator("h1")).toHaveText("Daily Rock");

    // Verify the daily selection song details are rendered (e.g. Johnny B. Goode from seed data)
    const songCard = page.locator("[class*='songCard']");
    await expect(songCard).toBeVisible();

    await expect(songCard.locator("h2")).toHaveText("Johnny B. Goode");
    await expect(songCard.locator("[class*='songArtist']")).toHaveText(
      "Chuck Berry"
    );
    await expect(songCard.locator("[class*='eraTag']")).toHaveText("1950s");
    await expect(songCard.locator("span[class*='genreTag']")).toHaveText(
      "Rock 'n' Roll"
    );

    // Verify rating form is visible
    await expect(page.locator("text=Rate this Song")).toBeVisible();
    await expect(
      page.locator("button[aria-label='Rate 5 stars']")
    ).toBeVisible();
    await expect(
      page.locator("textarea[placeholder*='Add private notes']")
    ).toBeVisible();
  });

  test("renders loading state while API fetch is in flight", async ({
    page,
  }) => {
    let resolveRoute: () => void = () => {};
    const delayPromise = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });

    // Intercept API call with an artificial delay
    await page.route("**/api/daily_selection", async (route) => {
      await delayPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "1",
          title: "Johnny B. Goode",
          artist: "Chuck Berry",
          era: "1950s",
          genre_tags: ["Rock 'n' Roll"],
          youtube_id: "T38v3-SSGcM",
        }),
      });
    });

    // Navigate to homepage without waiting for full load completion
    await page.goto("/", { waitUntil: "commit" });

    // Assert that the loading spinner/indicator is visible on screen
    const loadingBox = page.locator("[class*='statusBox']", {
      hasText: "Loading today",
    });
    await expect(loadingBox).toBeVisible();

    // Resolve the delayed API call
    resolveRoute();

    // Verify loading state disappears and song card completes loading
    await expect(loadingBox).not.toBeVisible();
    await expect(page.locator("[class*='songCard']")).toBeVisible();
  });

  test("renders 'No daily selection available' when API returns 404", async ({
    page,
  }) => {
    // Intercept API call and mock a 404 Not Found response
    await page.route("**/api/daily_selection", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify("No song found"),
      });
    });

    await page.goto("/");

    // Verify warning UI state is correctly displayed
    const warningBox = page.locator("[class*='statusBox'][class*='warning']");
    await expect(warningBox).toBeVisible();
    await expect(warningBox.locator("h3")).toHaveText(
      "No daily selection available"
    );
    await expect(warningBox.locator("p")).toHaveText(
      "There are no songs loaded in the database yet."
    );
  });

  test("renders 'Failed to load today's selection' when API returns 500", async ({
    page,
  }) => {
    // Intercept API call and mock a 500 Internal Server Error response
    await page.route("**/api/daily_selection", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify("Internal Server Error"),
      });
    });

    await page.goto("/");

    // Verify error UI state is correctly displayed
    const errorBox = page.locator("[class*='statusBox'][class*='error']");
    await expect(errorBox).toBeVisible();
    await expect(errorBox.locator("h3")).toHaveText(
      "Failed to load today's selection"
    );
    await expect(errorBox.locator("p")).toHaveText("HTTP error! status: 500");
  });
});
