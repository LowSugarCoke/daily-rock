function parseHex(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// Grey, near-black and near-white covers would only turn the page a dull grey,
// so those return null and the page keeps its neutral background.
export function coverTint(hex: string): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const saturation =
    max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));

  if (saturation < 0.2 || lightness < 0.1 || lightness > 0.93) return null;
  return hex;
}

// WCAG contrast ratio between a colour and white.
export function contrastWithWhite(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (luminance + 0.05);
}

// The cover colour, darkened just enough for white button text to pass WCAG AA.
export function coverAccent(hex: string): string | null {
  if (!coverTint(hex)) return null;
  let rgb = parseHex(hex)!;
  let accent = hex.toLowerCase();
  while (contrastWithWhite(accent) < 4.5) {
    rgb = rgb.map((c) => Math.round(c * 0.92)) as [number, number, number];
    accent = toHex(rgb);
  }
  return accent;
}
