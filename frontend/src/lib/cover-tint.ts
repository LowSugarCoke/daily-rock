// Grey, near-black and near-white covers would only turn the page a dull grey,
// so those return null and the page keeps its neutral background.
export function coverTint(hex: string): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;

  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const saturation =
    max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));

  if (saturation < 0.2 || lightness < 0.1 || lightness > 0.93) return null;
  return hex;
}
