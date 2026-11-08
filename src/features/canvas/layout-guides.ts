import type { WorldSnapshot, Point } from '../../domain/model';
import { layoutFrames, layoutBands } from '../../domain/layout-guides';
import { html } from '../../ui/dom';

export function paintLayoutGuides(
  root: HTMLElement,
  world: WorldSnapshot,
  visible: boolean,
  preview: readonly { id: string; point: Point }[] = [],
): void {
  let layer = root.querySelector<SVGSVGElement>('.canvas-layout-guides');
  if (!visible) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.classList.add('canvas-layout-guides');
    layer.setAttribute('aria-hidden', 'true');
    root.querySelector('#canvas-plane')?.append(layer);
  }
  const positions = new Map(preview.map((item) => [item.id, item.point]));
  const frames = layoutFrames(
    preview.length
      ? {
          ...world,
          nodes: world.nodes.map((n) => ({ ...n, ...positions.get(n.id) })),
        }
      : world,
  );
  const markup = frames
    .map(
      (frame) =>
        `<g data-layout-frame="${html(frame.target.id)}">${layoutBands(frame, frame.guides)
          .map(
            (band) =>
              `<rect data-axis="${band.axis}" x="${band.x}" y="${band.y}" width="${band.width}" height="${band.height}"/>`,
          )
          .join('')}</g>`,
    )
    .join('');
  if (layer.innerHTML !== markup) layer.innerHTML = markup;
}
