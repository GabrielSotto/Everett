import type { Context } from '../../app/context';
import type { Point, Rect } from '../../domain/model';
import { alignmentScene } from '../../domain/alignment-targets';
import { componentFor, componentSelection } from '../../domain/manual-groups';
import { dimensionText, measureBounds } from '../../domain/measurements';

function paintDistance(layer: SVGSVGElement, a: Rect, b: Rect, zoom: number) {
  const measurement = measureBounds(a, b);
  const labels = measurement.dimensions.map((d) => d.label + ' ' + dimensionText(d));
  layer.setAttribute('aria-label', [measurement.kind, ...labels].join(', '));
  const label = (x: number, y: number, text: string, horizontal: boolean) =>
    `<g transform="translate(${x} ${y}) scale(${1 / zoom})"><text x="${horizontal ? 0 : 7}" y="${horizontal ? -7 : 4}" text-anchor="${horizontal ? 'middle' : 'start'}">${text}</text></g>`;
  const outline = `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}"/>`;
  layer.innerHTML =
    outline +
    measurement.dimensions
      .map((d) => {
        const h = d.axis === 'x',
          mid = (d.from + d.to) / 2,
          x = h ? mid : d.at,
          y = h ? d.at : mid,
          cap = 3 / zoom;
        const path = h
          ? `M${d.from} ${y}H${d.to} M${d.from} ${y - cap}v${2 * cap} M${d.to} ${y - cap}v${2 * cap}`
          : `M${x} ${d.from}V${d.to} M${x - cap} ${d.from}h${2 * cap} M${x - cap} ${d.to}h${2 * cap}`;
        const caption = (measurement.kind === 'Solapamiento' ? 'Solape · ' : '') + dimensionText(d);
        return `<path d="${path}"/>` + label(x, y, caption, h);
      })
      .join('') +
    (measurement.kind === 'Coinciden'
      ? label(b.x + b.width / 2, b.y, 'Coinciden · 0 px', true)
      : '');
}

/** Consultar con el puntero no captura Alt, la rueda ni el gesto de mover. */
export function bindMeasurements(
  stage: HTMLElement,
  ctx: Context,
  available: () => boolean,
  zoom: () => number,
  signal: AbortSignal,
) {
  let pointer: Point | undefined,
    alt = false,
    previous: HTMLElement | undefined;
  let overlay: SVGSVGElement | undefined;
  const clear = () => {
    overlay?.remove();
    overlay = undefined;
    previous = undefined;
  };
  const update = (target: Element | null) => {
    if (
      !alt ||
      !available() ||
      !target ||
      !stage.contains(target) ||
      !ctx.ui.canvas.selections.length
    ) {
      clear();
      return;
    }
    const hit = target.closest<HTMLElement>(
      '[data-group],[data-node],[data-component],[data-controls-for]',
    );
    if (!hit) {
      clear();
      return;
    }
    if (previous === hit && (!overlay || overlay.isConnected)) return;
    clear();
    previous = hit;
    const world = ctx.world(),
      ui = ctx.ui.canvas,
      selected = new Set(ui.selections);
    const group = hit.dataset.group ?? hit.dataset.component,
      node = hit.dataset.node ?? hit.dataset.controlsFor;
    const scope =
      node && componentFor(world, node)?.id === ui.componentEditing?.group
        ? ui.componentEditing
        : undefined;
    const ids = group
      ? world.canvasGroups?.find((g) => g.id === group)?.nodes
      : node
        ? componentSelection(world, [node], scope)
        : undefined;
    if (!ids?.length || ids.every((id) => selected.has(id))) return;
    const a = alignmentScene(world, selected, ui.componentEditing).moving;
    const b = alignmentScene(world, new Set(ids), scope).moving;
    if (!a || !b) return;
    overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.classList.add('canvas-measurement');
    overlay.setAttribute('role', 'img');
    paintDistance(overlay, a, b, zoom());
    stage.querySelector('#canvas-plane')!.append(overlay);
  };
  const refresh = () => {
    if (alt && pointer) {
      previous = undefined;
      update(document.elementFromPoint(pointer.x, pointer.y));
    }
  };
  stage.addEventListener(
    'pointermove',
    (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      alt = e.altKey && !e.ctrlKey && !e.metaKey && !e.buttons;
      if (alt || overlay) update(e.target instanceof Element ? e.target : null);
    },
    { signal },
  );
  stage.addEventListener(
    'pointerleave',
    () => {
      pointer = undefined;
      clear();
    },
    { signal },
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Alt' && !e.repeat && !e.ctrlKey && !e.metaKey) {
        if (
          e.target instanceof Element &&
          e.target.closest('input,textarea,select,[contenteditable=true],[role=dialog],[role=menu]')
        )
          return;
        alt = true;
        refresh();
      } else if (e.key === 'Escape' || e.ctrlKey || e.metaKey) {
        alt = false;
        clear();
      }
    },
    { signal },
  );
  window.addEventListener(
    'keyup',
    (e) => {
      if (e.key === 'Alt') {
        alt = false;
        clear();
      }
    },
    { signal, capture: true },
  );
  window.addEventListener(
    'blur',
    () => {
      alt = false;
      pointer = undefined;
      clear();
    },
    { signal },
  );
  window.addEventListener(
    'pointerdown',
    () => {
      alt = false;
      clear();
    },
    { signal, capture: true },
  );
  signal.addEventListener('abort', clear, { once: true });
  return refresh;
}
