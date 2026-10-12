export const colors = ['#f3ebcf', '#e8e1f3', '#dfead9', '#dce7f1', '#f1dfe2'];
export const colorNames = ['Amarillo', 'Lavanda', 'Verde', 'Azul', 'Rosa'];
export function noteInk(color: string): string {
  const rgb = /^#[0-9a-f]{6}$/i.test(color)
    ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    : [1, 1, 1];
  const linear = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722 > 0.179
    ? '#25313c'
    : '#f5f6fa';
}
