import type { NodeData } from '../../domain/model';
import { googleFamily, noteTypography, type NoteFont } from '../../domain/note-fonts';
import { html } from '../../ui/dom';

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
  const { title, body } = noteTypography(data);
  const font = (value: NoteFont) => {
    const family = googleFamily(value);
    return family
      ? `'${family}', ${noteFonts.sans.css}`
      : noteFonts[value as keyof typeof noteFonts].css;
  };
  return `background:${color};--note-fill:${color};--note-ink:${noteInk(color)};--note-font:${font(body.font)};--note-size:${data.fontSize ?? 16}px;--note-style:${body.italic ? 'italic' : 'normal'};--note-weight:${body.weight};--note-title-font:${font(title.font)};--note-title-style:${title.italic ? 'italic' : 'normal'};--note-title-weight:${title.weight}`;
}

export function noteFontMetadata(
  data: Extract<NodeData, { kind: 'note' }>,
): Record<string, string> {
  const { title, body } = noteTypography(data);
  return {
    'data-note-font': googleFamily(body.font) ?? '',
    'data-note-weight': String(body.weight),
    'data-note-italic': String(body.italic),
    'data-note-title-font': googleFamily(title.font) ?? '',
    'data-note-title-weight': String(title.weight),
    'data-note-title-italic': String(title.italic),
  };
}

export function noteFontAttributes(data: Extract<NodeData, { kind: 'note' }>): string {
  return Object.entries(noteFontMetadata(data))
    .map(([key, value]) => `${key}="${html(value)}"`)
    .join(' ');
}
