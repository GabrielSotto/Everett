import rough from 'roughjs';
import type { Material } from '../../domain/model';
import { wireframeNames } from '../../domain/wireframes';
import { html } from '../../ui/dom';

const generator = rough.generator();
const borders = new Map<string, string>();
/** Tamaños del Mundo, no getBoundingClientRect: el zoom no se aplica dos veces. */
function border(width: number, height: number, id: string, image: boolean): string {
  const key = [width, height, id, image].join(':');
  const previous = borders.get(key);
  if (previous) return previous;
  const seed =
    [...id].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) | 0, 7) >>> 0;
  const opts = {
    seed: (seed % 2147483646) + 1,
    roughness: 0.45,
    bowing: 0.3,
    disableMultiStroke: true,
    preserveVertices: true,
  };
  const inset = Math.min(3, width / 4, height / 4);
  const shapes = [
    generator.rectangle(
      inset,
      inset,
      Math.max(1, width - inset * 2),
      Math.max(1, height - inset * 2),
      opts,
    ),
  ];
  if (image) {
    shapes.push(generator.line(inset, inset, width - inset, height - inset, opts));
    shapes.push(generator.line(inset, height - inset, width - inset, inset, opts));
  }
  const paths = shapes
    .flatMap((shape) => generator.toPaths(shape))
    .map((path) => `<path d="${path.d}"/>`)
    .join('');
  const value = `<svg class="wireframe-border" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
  if (borders.size >= 200) borders.delete(borders.keys().next().value!);
  borders.set(key, value);
  return value;
}

export function wireframeMarkup(material: Material): string {
  if (material.data.kind !== 'wireframe') return '';
  const content = material.data.content,
    type = content.type;
  let body = '';
  if (type === 'table') {
    const cells = content.cells.slice(0, 8);
    body = `<table aria-label="Tabla del bosquejo"><tbody>${cells
      .map(
        (row, r) =>
          `<tr>${row
            .slice(0, 6)
            .map((cell) => `<${r ? 'td' : 'th'}>${html(cell)}</${r ? 'td' : 'th'}>`)
            .join('')}</tr>`,
      )
      .join(
        '',
      )}</tbody></table>${content.cells.length > 8 || (content.cells[0]?.length ?? 0) > 6 ? `<small class="wireframe-overflow">${content.cells.length} filas · ${content.cells[0]!.length} columnas</small>` : ''}`;
  } else {
    const lines = content.text.split('\n');
    if (type === 'screen') body = '';
    else if (type === 'list' || type === 'menu')
      body = `<ul>${lines
        .slice(0, 12)
        .map(
          (line, index) =>
            `<li ${type === 'menu' && index === 0 ? 'class="wireframe-current"' : ''}>${type === 'list' ? '<span aria-hidden="true">○</span>' : ''}<span>${html(line) || '&nbsp;'}</span></li>`,
        )
        .join(
          '',
        )}</ul>${lines.length > 12 ? `<small class="wireframe-overflow">${lines.length} opciones</small>` : ''}`;
    else if (type === 'card')
      body = `<strong>${html(lines[0])}</strong><p>${html(lines.slice(1).join('\n'))}</p>`;
    else body = `<span>${html(content.text) || '&nbsp;'}</span>`;
  }
  return `<div class="wireframe-content" data-wireframe="${type}" title="${wireframeNames[type]} · Doble clic o Enter para editar">${type === 'text' ? '' : border(material.width, material.height, material.id, type === 'image')}<div class="wireframe-body">${body}</div></div>`;
}
