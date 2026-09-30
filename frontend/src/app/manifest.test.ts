import { describe, expect, test } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  test("makes the app installable to the home screen", () => {
    const m = manifest();

    expect(m.name).toBe("Daily Rock");
    expect(m.short_name).toBe("Daily Rock");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  test("provides 192px and 512px icons, maskable included", () => {
    const icons = manifest().icons ?? [];

    expect(icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"])
    );
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
