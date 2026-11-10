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
import { icon } from '../../ui/icons';

function frame(nodes: readonly Material[]): OrientedRect {
  return nodes.length === 1 ? nodes[0]! : selectionBounds([...nodes]);
}
function position(button: HTMLElement, box: OrientedRect) {
  const c = centerOf(box),
    angle = box.rotation ?? 0;
  Object.assign(button.style, {
    left: c.x + 'px',
    top: c.y + 'px',
    transform: `rotate(${angle}deg) translateX(calc(${box.width / 2}px + 21px / var(--canvas-zoom))) rotate(${-angle}deg) scale(calc(1 / var(--canvas-zoom))) translate(-50%, -50%)`,
  });
}
export function showRotation(plane: HTMLElement, nodes: readonly Material[]) {
  let button = plane.querySelector<HTMLButtonElement>('.rotation-handle');
  if (!nodes.length) {
    button?.remove();
    return;
  }
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'rotation-handle';
    button.setAttribute('aria-label', 'Girar selección');
    button.title = 'Arrastrá para girar · Shift: pasos de 15° · Flechas: 1°';
    button.innerHTML = icon('rotate', 15);
    plane.append(button);
  }
  position(button, frame(nodes));
}
// Resolver los destinos una sola vez. Al mover, actualizar únicamente la selección y sus cables.
export function beginRotation(
  root: HTMLElement,
  w: WorldSnapshot,
  nodes: Material[],
  start: Point,
) {
  const box = frame(nodes),
    pivot = centerOf(box),
    initial = angleOf(start, pivot),
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
  const button = root.querySelector<HTMLButtonElement>('.rotation-handle')!;
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
  let latest = 0;
  return {
    ids: [...selected],
    get degrees() {
      return latest;
    },
    update(point: Point, snap: boolean) {
      if (Math.hypot(point.x - pivot.x, point.y - pivot.y) < 0.00001) return;
      const raw = angleOf(point, pivot) - initial;
      latest = snap ? Math.round((base + raw) / 15) * 15 - base : raw;
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
      position(button, { ...box, rotation: normalizedAngle(base + latest) });
      button.dataset.angle = Math.round(normalizedAngle(base + latest)) + '°';
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
