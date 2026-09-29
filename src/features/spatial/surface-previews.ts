import { icon } from '../../ui/icons';
import { html } from '../../ui/dom';
import type { Surface } from '../../domain/model';

const palette = {
  panel: '#30414f',
  raised: '#384b59',
  line: '#8298a866',
  text: '#e0e7ed',
  muted: '#adbecb',
  accent: '#b9a5df',
  blue: '#94b6d2',
  green: '#9cb99d',
  amber: '#c6ae7f',
};
const text = (x: number, y: number, value: string, size = 8, color = palette.muted, weight = 400) =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${html(value)}</text>`;
const line = (x: number, y: number, width: number, color = palette.line, thickness = 2) =>
  `<path d="M${x} ${y}h${width}" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round"/>`;
const panel = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 7,
  fill = palette.panel,
) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${palette.line}"/>`;
const symbol = (
  name: Parameters<typeof icon>[0],
  x: number,
  y: number,
  size = 14,
  color = palette.accent,
) => `<g transform="translate(${x} ${y})" color="${color}">${icon(name, size)}</g>`;
const dot = (x: number, y: number, color = palette.accent, radius = 2.5) =>
  `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`;

function canvas(): string {
  return `<path d="M91 89h28q9 0 9 9v26h30M82 113v36h32" stroke="${palette.muted}" stroke-opacity=".55" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <rect x="141" y="49" width="62" height="69" rx="10" stroke="${palette.accent}" stroke-opacity=".5" stroke-dasharray="3 3" fill="${palette.accent}08"/>
    ${symbol('agents', 150, 57, 12)}${text(168, 66, 'Eve', 8)}
    ${panel(41, 65, 55, 49, 6)}${line(51, 78, 21, palette.amber, 3)}${line(51, 89, 33)}${line(51, 98, 23)}
    ${panel(157, 124, 48, 38, 6)}${symbol('code', 172, 136, 17, palette.blue)}
    ${panel(66, 142, 64, 42, 6)}${line(78, 155, 34, palette.accent, 3)}${line(78, 166, 24)}
    ${panel(87, 204, 72, 17, 8)}${symbol('select', 98, 208, 9)}${symbol('note', 117, 208, 9, palette.muted)}${symbol('link', 136, 208, 9, palette.muted)}`;
}
function code(): string {
  return `${symbol('code', 52, 53, 13, palette.blue)}${text(72, 64, 'capture.ts', 8)}${line(49, 76, 147, palette.line, 1)}
    <g font-family="Consolas,monospace" font-size="8">
      ${text(42, 100, '1', 7, '#77909f')}${text(57, 100, 'export function', 8, palette.accent)}${text(132, 100, 'capture() {', 8, palette.text)}
      ${text(42, 117, '2', 7, '#77909f')}${text(65, 117, 'const', 8, palette.accent)}${text(94, 117, 'source = context;', 8, palette.text)}
      ${text(42, 134, '3', 7, '#77909f')}${text(65, 134, 'return', 8, palette.accent)}${text(99, 134, '{ source, note };', 8, palette.text)}
      ${text(42, 151, '4', 7, '#77909f')}${text(57, 151, '}', 8, palette.text)}
    </g><path d="M64 155v9" stroke="${palette.accent}" stroke-width="1"/>
    ${symbol('branch', 61, 189, 10, palette.muted)}${text(77, 198, 'main', 7)}${dot(125, 195, palette.green, 2)}${text(132, 198, 'Guardado', 7)}
    ${panel(174, 178, 26, 26, 9, palette.raised)}${symbol('agents', 180, 184, 14)}`;
}
function docs(): string {
  return `${panel(56, 42, 134, 164, 10)}${text(71, 68, 'Visión del proyecto', 10, palette.text, 600)}
    ${line(71, 84, 101)}${line(71, 93, 91)}${line(71, 102, 66)}
    ${text(71, 126, 'Próximos pasos', 8, palette.text, 600)}
    ${symbol('check', 71, 139, 9, palette.green)}${line(87, 143, 74)}
    <rect x="73" y="156" width="6" height="6" rx="1.5" fill="none" stroke="${palette.line}"/>${line(87, 159, 61)}
    ${line(71, 180, 81)}${line(71, 189, 50)}<path d="M126 185v8" stroke="${palette.accent}" stroke-width="1"/>`;
}
function board(): string {
  const columns = [
    { x: 34, label: 'Pendiente', color: palette.muted, cards: ['Explorar', 'Capturar'] },
    { x: 96, label: 'En curso', color: palette.amber, cards: ['Validar'] },
    { x: 158, label: 'Listo', color: palette.green, cards: ['Decidir'] },
  ];
  return (
    columns
      .map(
        ({ x, label, color, cards }) =>
          `${dot(x + 3, 69, color, 2)}${text(x + 10, 72, label, 6.5)}${line(x, 82, 52, palette.line, 1)}${cards.map((name, i) => `${panel(x, 93 + i * 51, 53, 42, 6)}${text(x + 7, 106 + i * 51, name, 7, palette.text)}${line(x + 7, 115 + i * 51, 34)}${dot(x + 8, 126 + i * 51, color, 1.8)}${text(x + 14, 128 + i * 51, i ? 'Media' : 'Alta', 5.5)}${symbol(label === 'Listo' ? 'check' : 'agents', x + 38, 122 + i * 51, 7, color)}`).join('')}`,
      )
      .join('') +
    `${symbol('rocket', 83, 195, 11, palette.accent)}${text(99, 204, 'Shipping', 7)}${panel(141, 195, 23, 11, 5)}${dot(148, 200.5, palette.muted, 3)}`
  );
}
function agents(): string {
  return (
    [
      { x: 54, name: 'Eve', color: palette.accent },
      { x: 123, name: 'Milo', color: palette.blue },
      { x: 192, name: 'Nora', color: palette.amber },
    ]
      .map(
        ({ x, name, color }, i) =>
          `${panel(x - 22, 78, 44, 44, 15, palette.raised)}${symbol('agents', x - 11, 89, 22, color)}${text(x - 10, 139, name, 8, palette.text, 500)}${dot(x - 14, 153, i === 1 ? palette.green : palette.amber, 2)}${line(x - 7, 153, 26)}${panel(x - 23, 166, 46, 21, 5)}${symbol(i === 1 ? 'check' : 'board', x - 15, 172, 9, color)}${line(x - 1, 177, 17)}`,
      )
      .join('') + `${line(72, 65, 102, palette.line, 1)}${text(85, 57, 'Actividad del Mundo', 7)}`
  );
}
function session(): string {
  return `${dot(49, 63, palette.accent, 9)}${text(46, 66, 'E', 8, palette.text, 500)}${text(68, 60, 'Eve', 8, palette.accent, 500)}${line(68, 72, 108)}${line(68, 82, 83)}
    ${dot(49, 110, palette.blue, 9)}${text(46, 113, 'G', 8, palette.text, 500)}${text(68, 107, 'Gabi', 8, palette.text, 500)}${line(68, 119, 121)}${line(68, 129, 66)}
    ${panel(41, 153, 164, 53, 12, palette.raised)}${text(53, 170, 'Escribí lo que tenés en mente…', 7)}${symbol('plus', 52, 187, 10, palette.muted)}${text(72, 196, '@', 10, palette.muted)}${dot(188, 190, palette.accent, 8)}${symbol('up', 183, 185, 10, '#293946')}`;
}

export function surfacePreview(surface: Surface): string {
  const renderers = { canvas, code, docs, board, agents, session };
  return `<svg class="surface-art" viewBox="0 0 246 246" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${renderers[surface]()}</svg>`;
}
