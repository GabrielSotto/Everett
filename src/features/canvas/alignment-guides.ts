import type { AlignmentGuide } from '../../domain/alignment';
import { html } from '../../ui/dom';
import { dimensionText } from '../../domain/measurements';
import { measurementLabel } from './measurement-label';
const lastDrawing = new WeakMap<SVGSVGElement, string>();

/** Las marcas mantienen un tamaño constante en pantalla durante el gesto. */
export function paintAlignmentGuides(
  root: HTMLElement,
  guides: AlignmentGuide[],
  zoom: number,
): void {
  let layer = root.querySelector<SVGSVGElement>('.alignment-guides');
  if (!guides.length) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.classList.add('alignment-guides');
    layer.setAttribute('aria-hidden', 'true');
    root.querySelector('#canvas-plane')!.append(layer);
  }
  const radius = 3 / zoom;
  const markup = guides
    .map((g) => {
      const vertical = g.axis === 'x';
      const measured = g.source === 'gap' || g.source === 'distance';
      const line = vertical
        ? [g.position, g.from, g.position, g.to]
        : [g.from, g.position, g.to, g.position];
      const markers = g.markers
        .map((p) => {
          const x = vertical ? g.position : p,
            y = vertical ? p : g.position;
          if (measured)
            return vertical
              ? `<path d="M${x - radius} ${y}h${radius * 2}"/>`
              : `<path d="M${x} ${y - radius}v${radius * 2}"/>`;
          return `<path d="M${x - radius} ${y - radius}l${2 * radius} ${2 * radius}m0 ${-2 * radius}l${-2 * radius} ${2 * radius}"/>`;
        })
        .join('');
      const transform = g.transform
        ? ` transform="rotate(${g.transform.degrees} ${g.transform.pivot.x} ${g.transform.pivot.y})"`
        : '';
      const mid = (g.from + g.to) / 2;
      const label = measured
        ? measurementLabel(
            vertical ? g.position : mid,
            vertical ? mid : g.position,
            dimensionText(g),
            !vertical,
            zoom,
            g.transform?.degrees,
          )
        : '';
      return `<g${transform}><line data-snap-target="${html(g.target ?? '')}" data-snap-source="${g.source}" x1="${line[0]}" y1="${line[1]}" x2="${line[2]}" y2="${line[3]}"/>${markers}${label}</g>`;
    })
    .join('');
  if (lastDrawing.get(layer) !== markup) {
    layer.innerHTML = markup;
    lastDrawing.set(layer, markup);
  }
}
