import type { Material, Point, WorldSnapshot } from '../../domain/model';
import {
  angleOf,
  centerOf,
  rotatedPose,
  normalizedAngle,
  type OrientedRect,
} from '../../domain/rotation';
import { selectionBounds } from '../../domain/alignment';
import { anchorPoint, linkPath } from '../../domain/geometry';

function frame(nodes: readonly Material[]): OrientedRect {
  return nodes.length === 1 ? nodes[0]! : selectionBounds([...nodes]);
}
const arrowPath = 'M4 19A15 15 0 0 0 19 4m-4 4 4-4 3 5M8 15l-4 4 4 3';
// El cursor del sistema no hereda la rotación de su elemento. Compartir los
// 24 rumbos entre selecciones evita generar una imagen por evento de puntero.
const cursors = Array.from({ length: 24 }, (_, i) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-3 -3 30 30"><g transform="rotate(${i * 15} 12 12)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${arrowPath}" stroke="#192434" stroke-width="4"/><path d="${arrowPath}" stroke="white" stroke-width="1.8"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 13 13, crosshair`;
});
function position(layer: HTMLElement, box: OrientedRect) {
  const angle = box.rotation ?? 0;
  Object.assign(layer.style, {
    left: box.x + 'px',
    top: box.y + 'px',
    width: box.width + 'px',
    height: box.height + 'px',
    rotate: angle + 'deg',
  });
  layer.style.setProperty('--label-turn', -angle + 'deg');
  const step = Math.round(normalizedAngle(angle) / 15) % 24;
  layer.style.setProperty('--cursor-se', cursors[step]!);
  layer.style.setProperty('--cursor-sw', cursors[(step + 6) % 24]!);
}
export function showRotation(plane: HTMLElement, nodes: readonly Material[]) {
  let layer = plane.querySelector<HTMLElement>('.rotation-frame');
  if (!nodes.length) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'rotation-frame';
    for (const corner of ['se', 'sw']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rotation-handle';
      button.dataset.rotationCorner = corner;
      button.setAttribute(
        'aria-label',
        corner === 'se' ? 'Girar selección' : 'Girar desde la esquina inferior izquierda',
      );
      if (corner === 'sw') button.tabIndex = -1;
      button.title = 'Arrastrá para girar · Shift: pasos de 15° · Flechas: 1°';
      button.innerHTML = `<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${arrowPath}"/></svg>`;
      layer.append(button);
    }
    plane.append(layer);
  }
  const shape = nodes.length === 1 && nodes[0]?.data.kind === 'shape' ? nodes[0].data : null;
  layer.style.setProperty(
    '--rotation-outset',
    shape?.stroke ? (shape.thickness ?? 1) / 2 + 'px' : '0px',
  );
  position(layer, frame(nodes));
}
// Resolver los destinos una sola vez. Al mover, actualizar únicamente la selección y sus cables.
export function beginRotation(
  root: HTMLElement,
  w: WorldSnapshot,
  nodes: Material[],
  start: Point,
  button: HTMLElement,
  zoom: number,
) {
  const box = frame(nodes),
    pivot = centerOf(box),
    base = box.rotation ?? 0;
  const parts = nodes.map((node) => ({
    node,
    element: root.querySelector<HTMLElement>(`[data-node="${CSS.escape(node.id)}"]`)!,
    controls: root.querySelector<HTMLElement>(`[data-controls-for="${CSS.escape(node.id)}"]`),
  }));
  const byId = new Map(w.nodes.map((n) => [n.id, n]));
  const selected = new Set(nodes.map((n) => n.id));
  const cables = w.links
    .filter((l) => selected.has(l.from) || selected.has(l.to))
    .flatMap((link) => {
      const group = root.querySelector<SVGGElement>(`[data-link="${CSS.escape(link.id)}"]`);
      return group
        ? [
            {
              link,
              paths: group.querySelectorAll('path'),
              ends: group.querySelectorAll('[data-end]'),
              label: group.querySelector('text'),
              cut: group.querySelector('.label-cut'),
            },
          ]
        : [];
    });
  const layer = button.parentElement!;
  const groups = [...(w.canvasGroups ?? [])]
    .filter((g) => g.nodes.every((id) => selected.has(id)))
    .flatMap((g) => {
      const el = root.querySelector<HTMLElement>(
        `[data-group="${CSS.escape(g.id)}"]`,
      )?.parentElement;
      return el
        ? [
            {
              el,
              rect: {
                x: parseFloat(el.style.left),
                y: parseFloat(el.style.top),
                width: parseFloat(el.style.width),
                height: parseFloat(el.style.height),
                rotation: g.structure?.rotation,
              },
            },
          ]
        : [];
    });
  let latest = 0,
    accumulated = 0,
    previous = start;
  let moved = false;
  const deadRadius = 8 / zoom;
  return {
    ids: [...selected],
    get degrees() {
      return latest;
    },
    get moved() {
      return moved;
    },
    update(point: Point, snap: boolean) {
      if (!moved && Math.hypot(point.x - start.x, point.y - start.y) * zoom < 2) return;
      moved = true;
      const from = previous;
      previous = point;
      const dx = point.x - from.x,
        dy = point.y - from.y;
      const lengthSquared = dx * dx + dy * dy;
      // En el centro no hay dirección. Si se lo atraviesa, retomar desde el
      // otro lado sin interpretar el cruce como media vuelta.
      const t = lengthSquared
        ? Math.max(
            0,
            Math.min(1, ((pivot.x - from.x) * dx + (pivot.y - from.y) * dy) / lengthSquared),
          )
        : 0;
      if (Math.hypot(from.x + t * dx - pivot.x, from.y + t * dy - pivot.y) < deadRadius) return;
      accumulated += normalizedAngle(angleOf(point, pivot) - angleOf(from, pivot) + 180) - 180;
      latest = snap ? Math.round((base + accumulated) / 15) * 15 - base : accumulated;
      for (const { node, element, controls } of parts) {
        const pose = rotatedPose(node, pivot, latest);
        Object.assign(element.style, {
          left: pose.x + 'px',
          top: pose.y + 'px',
          rotate: pose.rotation + 'deg',
        });
        element.style.setProperty('--label-counter-angle', -pose.rotation + 'deg');
        if (controls) syncControlBox(controls, element);
        byId.set(node.id, { ...node, ...pose });
      }
      for (const { el, rect } of groups) {
        const pose = rotatedPose(rect, pivot, latest);
        Object.assign(el.style, {
          left: pose.x + 'px',
          top: pose.y + 'px',
          rotate: pose.rotation + 'deg',
        });
      }
      for (const { link, paths, ends, label, cut } of cables) {
        const a = byId.get(link.from)!,
          b = byId.get(link.to)!;
        const from = anchorPoint(a, link.fromAnchor),
          to = anchorPoint(b, link.toAnchor);
        const d = linkPath(from, to, link.fromAnchor, link.toAnchor, a.rotation, b.rotation);
        paths.forEach((p) => p.setAttribute('d', d));
        ends.forEach((el) => {
          const p = el.getAttribute('data-end') === 'from' ? from : to;
          el.setAttribute('transform', `translate(${p.x},${p.y})`);
        });
        if (label && paths[0]) {
          const p = paths[0].getPointAtLength(paths[0].getTotalLength() / 2);
          label.setAttribute('x', String(p.x));
          label.setAttribute('y', String(p.y));
          if (cut) {
            cut.setAttribute('x', String(p.x - Number(cut.getAttribute('width')) / 2));
            cut.setAttribute('y', String(p.y - Number(cut.getAttribute('height')) / 2));
          }
        }
      }
      position(layer, { ...box, rotation: base + latest });
      root.style.setProperty(
        '--active-rotation-cursor',
        layer.style.getPropertyValue(
          button.dataset.rotationCorner === 'sw' ? '--cursor-sw' : '--cursor-se',
        ),
      );
      button.dataset.angle = normalizedAngle(Math.round(base + latest)) + '°';
    },
  };
}

// Una transformación CSS crea un contexto de apilado. Los controles de selección
// deben poder quedar delante de otra tarjeta sin levantar también su contenido.
export function syncControlBox(layer: HTMLElement, el: HTMLElement) {
  for (const key of ['left', 'top', 'width', 'height', 'rotate'] as const)
    layer.style[key] = el.style[key];
}
export function controlLayer(plane: HTMLElement, el: HTMLElement, node: Material) {
  const layer = document.createElement('div');
  layer.className = 'orientation-controls ' + node.data.kind;
  layer.dataset.controlsFor = node.id;
  layer.style.setProperty(
    '--selection-outset',
    getComputedStyle(el).getPropertyValue('--selection-outset'),
  );
  syncControlBox(layer, el);
  plane.append(layer);
  return layer;
}
