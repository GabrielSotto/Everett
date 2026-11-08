import type { NodeData } from '../../domain/model';
import { googleFamily } from '../../domain/note-fonts';

export const colors = [
  '#f3ebcf',
  '#e8e1f3',
  '#dfead9',
  '#dce7f1',
  '#f1dfe2',
  '#f3dcc8',
  '#f2f1ed',
  '#334155',
];
export const colorNames = [
  'Amarillo',
  'Lavanda',
  'Verde',
  'Azul',
  'Rosa',
  'Naranja',
  'Papel',
  'Grafito',
];
export const noteFonts = {
  sans: {
    name: 'Sans serif',
    css: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  serif: { name: 'Serif', css: 'Georgia, Cambria, serif' },
  mono: { name: 'Monoespaciada', css: 'SFMono-Regular, Consolas, Liberation Mono, monospace' },
} as const;
function luminance(color: string): number {
  const linear = [1, 3, 5].map((i) => {
    const v = parseInt(color.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}
function noteColor(color: string): string {
  if (/^#[0-9a-f]{3}$/i.test(color)) return '#' + [...color.slice(1)].map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/i.test(color) ? color : colors[0]!;
}
export function noteInk(color: string): string {
  const background = luminance(noteColor(color));
  const contrast = (ink: string) => {
    const foreground = luminance(ink);
    return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
  };
  const candidates = ['#25313c', '#f5f6fa'].sort((a, b) => contrast(b) - contrast(a));
  // Los tonos medios necesitan negro o blanco: el umbral de esos colores no sirve para tinta gris.
  return contrast(candidates[0]!) >= 4.5
    ? candidates[0]!
    : contrast('#000000') >= contrast('#ffffff')
      ? '#000000'
      : '#ffffff';
}
export function noteStyle(data: Extract<NodeData, { kind: 'note' }>): string {
  const color = noteColor(data.color);
  const family = googleFamily(data.font);
  const font = family
    ? `'${family}', ${noteFonts.sans.css}`
    : noteFonts[(data.font ?? 'sans') as keyof typeof noteFonts].css;
  return `background:${color};--note-fill:${color};--note-ink:${noteInk(color)};--note-font:${font};--note-size:${data.fontSize ?? 16}px`;
}
