import type { Polygon } from '../../domain/frame-clipping';

export function highlightLayer(
  root: HTMLElement,
  polygon?: Polygon,
  origin: 'menu' | 'inspector' = 'menu',
) {
  root.querySelector(`.layer-highlight[data-origin="${origin}"]`)?.remove();
  if (!polygon?.length) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('layer-highlight');
  svg.dataset.origin = origin;
  svg.setAttribute('aria-hidden', 'true');
  const shape = document.createElementNS(svg.namespaceURI!, 'polygon');
  shape.setAttribute('points', polygon.map((p) => p.x + ',' + p.y).join(' '));
  svg.append(shape);
  root.querySelector('#canvas-plane')?.append(svg);
}
