import rough from 'roughjs';
import type { Material } from '../../domain/model';
import { wireframeNames, wireframeAppearance } from '../../domain/wireframes';
import { html } from '../../ui/dom';

const generator = rough.generator();
const borders = new Map<string, string>();
/** Tamaños del Mundo, no getBoundingClientRect: el zoom no se aplica dos veces. */
function border(width: number, height: number, id: string, image: boolean, radius: number): string {
  const key = [width, height, id, image, radius].join(':');
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
  const r = Math.max(
    0,
    Math.min(radius - inset, (width - 2 * inset) / 2, (height - 2 * inset) / 2),
  );
  const right = width - inset,
    bottom = height - inset;
  const shapes = [
    r > 0
      ? generator.path(
          `M${inset + r} ${inset}H${right - r}Q${right} ${inset} ${right} ${inset + r}V${bottom - r}Q${right} ${bottom} ${right - r} ${bottom}H${inset + r}Q${inset} ${bottom} ${inset} ${bottom - r}V${inset + r}Q${inset} ${inset} ${inset + r} ${inset}Z`,
          opts,
        )
      : generator.rectangle(
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
  const appearance = wireframeAppearance(content);
  const bars = `<span class="wireframe-placeholder" aria-label="Texto simulado">${Array.from({ length: content.placeholderLines ?? 3 }, () => '<i></i>').join('')}</span>`;
  const text = (value: string) => (content.placeholder ? bars : html(value) || '&nbsp;');
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
      body = `${type === 'menu' ? '<div class="wireframe-menu-trigger"><span>Menú</span><span aria-hidden="true">⌄</span></div>' : ''}<ul aria-label="${type === 'menu' ? 'Opciones del menú' : 'Elementos de la lista'}">${lines
        .slice(0, 12)
        .map(
          (line) =>
            `<li>${type === 'list' ? '<span class="wireframe-list-marker" aria-hidden="true"></span>' : ''}<span>${text(line)}</span></li>`,
        )
        .join(
          '',
        )}</ul>${lines.length > 12 ? `<small class="wireframe-overflow">${lines.length} opciones</small>` : ''}`;
    else if (type === 'card')
      body = `<strong>${text(lines[0] ?? '')}</strong><p>${text(lines.slice(1).join('\n'))}</p>`;
    else if (type === 'video')
      body = `<span class="wireframe-video-play" aria-hidden="true">▶</span><span class="wireframe-media-caption">${text(content.text)}</span><div class="wireframe-video-track" aria-hidden="true"><span>▶</span><i></i><span>◖</span></div>`;
    else if (type === 'carousel')
      body = `<div class="wireframe-carousel-slide"><span>${text(lines[0] ?? 'Imagen')}</span><span class="wireframe-carousel-prev" aria-hidden="true">‹</span><span class="wireframe-carousel-next" aria-hidden="true">›</span></div><div class="wireframe-carousel-dots" aria-label="${lines.length} diapositivas">${lines
        .slice(0, 12)
        .map((_, i) => `<i ${i === 0 ? 'class="current"' : ''}></i>`)
        .join('')}</div>`;
    else body = `<span>${text(content.text)}</span>`;
  }
  return `<div class="wireframe-content" data-wireframe="${type}" style="--wireframe-fill:${appearance.fill};--wireframe-stroke:${appearance.stroke};--wireframe-text:${appearance.text};--wireframe-radius:${appearance.radius}px" title="${wireframeNames[type]} · Doble clic o Enter para editar">${type === 'text' ? '' : border(material.width, material.height, material.id, type === 'image', appearance.radius)}<div class="wireframe-body">${body}</div></div>`;
}
