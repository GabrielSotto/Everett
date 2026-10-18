export function rgb(color: string): string {
  return /^#[\da-f]{6}([\da-f]{2})?$/i.test(color) ? color.slice(0, 7) : '#766ae5';
}
export function alpha(color: string): number {
  return color.length === 9 ? Math.round((parseInt(color.slice(7), 16) / 255) * 100) : 100;
}
export function rgba(color: string, opacity: number): string {
  const value = Math.round((Math.max(0, Math.min(100, opacity)) * 255) / 100);
  return rgb(color) + (value === 255 ? '' : value.toString(16).padStart(2, '0'));
}
export interface Hsv {
  h: number;
  s: number;
  v: number;
}
export function toHsv(color: string): Hsv {
  const hex = rgb(color),
    [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255) as [
      number,
      number,
      number,
    ];
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h =
    d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}
export function fromHsv({ h, s, v }: Hsv): string {
  const hue = (((h % 360) + 360) % 360) / 60,
    value = Math.max(0, Math.min(100, v)) / 100;
  const c = (value * Math.max(0, Math.min(100, s))) / 100,
    x = c * (1 - Math.abs((hue % 2) - 1)),
    m = value - c;
  const channels =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x];
  return (
    '#' +
    channels
      .map((n) =>
        Math.round((n + m) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
