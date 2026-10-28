import type { Context } from '../app/context';
import {
  wireframeKinds,
  wireframeMaterial,
  wireframeNames,
  type WireframeKind,
} from '../domain/wireframes';
import { toWorld } from '../spatial/math';
import { frameCanvas } from './canvas-frame';
import { wireframeMarkup } from '../features/canvas/wireframe-markup';
import type { Point } from '../domain/model';

export function wireframePalette(): string {
  const drawings: Record<WireframeKind, string> = {
    screen: '<rect x="4" y="4" width="44" height="28"/>',
    text: '<path d="M8 9h36M8 16h30M8 23h35M8 30h20"/>',
    button: '<rect x="8" y="10" width="36" height="18" rx="2"/><path d="M18 19h16"/>',
    input: '<rect x="4" y="11" width="44" height="17"/><path d="M10 16v7M14 20h15"/>',
    card: '<rect x="8" y="4" width="36" height="29"/><path d="M13 12h20M13 20h26M13 25h18"/>',
    list: '<path d="M14 10h30M14 19h30M14 28h22"/><circle cx="7" cy="10" r="2"/><circle cx="7" cy="19" r="2"/><circle cx="7" cy="28" r="2"/>',
    image: '<rect x="5" y="5" width="42" height="27"/><path d="m5 5 42 27M5 32 47 5"/>',
    table: '<rect x="5" y="5" width="42" height="27"/><path d="M5 14h42M5 23h42M19 5v27M33 5v27"/>',
    menu: '<rect x="10" y="3" width="32" height="31"/><path d="M15 10h20M15 18h20M15 26h14"/>',
  };
  return `<div class="wireframe-palette">${wireframeKinds.map((kind) => `<button type="button" role="menuitem" data-action="wireframe-add" data-kind="${kind}" aria-label="Agregar ${wireframeNames[kind].toLocaleLowerCase()}"><svg viewBox="0 0 52 38" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">${drawings[kind]}</svg><span>${wireframeNames[kind]}</span></button>`).join('')}</div>`;
}

export function addWireframe(ctx: Context, type: string | undefined, drop?: Point): void {
  if (!wireframeKinds.includes(type as WireframeKind)) return;
  const viewport = document.querySelector('#viewport')?.getBoundingClientRect();
  if (!viewport) return;
  const camera = ctx.currentCamera();
  const left =
    document.querySelector('.canvas-chat.docked:not(.compact)')?.getBoundingClientRect().right ??
    viewport.left;
  const center = toWorld(
    drop ?? { x: (left + viewport.right) / 2, y: viewport.y + viewport.height / 2 },
    camera,
    viewport,
  );
  const node = wireframeMaterial(type as WireframeKind, 'material-' + crypto.randomUUID(), center);
  if (
    !ctx.act(
      { type: 'node.create', world: ctx.world().id, node },
      'agregar pieza de bosquejo',
      'C08-WIRE-01',
    )
  )
    return;
  Object.assign(ctx.ui.canvas, {
    tool: 'select',
    selection: node.id,
    selections: [node.id],
    zoneSelection: null,
    linkSelection: null,
  });
  ctx.render();
  const projectedWidth = node.width * camera.z,
    projectedHeight = node.height * camera.z;
  if (
    !drop &&
    (projectedWidth < 45 ||
      projectedHeight < 22 ||
      projectedWidth > viewport.width - 64 ||
      projectedHeight > viewport.height - 150)
  )
    frameCanvas(ctx, true);
  ctx.persist();
  document.querySelector<HTMLElement>(`[data-node="${node.id}"]`)?.focus({ preventScroll: true });
}

/** Un clic agrega; superar el umbral transforma el mismo gesto en arrastre. */
export function bindWireframeDrag(
  root: HTMLElement,
  ctx: Context,
  signal: AbortSignal,
  close: () => void,
): void {
  let pending: { kind: WireframeKind; x: number; y: number; pointer: number } | null = null;
  let ghost: HTMLElement | null = null;
  let suppressClick = false;
  const clear = () => {
    ghost?.remove();
    ghost = null;
    pending = null;
  };
  root.addEventListener(
    'pointerdown',
    (event) => {
      suppressClick = false;
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-action="wireframe-add"]')
          : null;
      if (!button || event.button !== 0) return;
      pending = {
        kind: button.dataset.kind as WireframeKind,
        x: event.clientX,
        y: event.clientY,
        pointer: event.pointerId,
      };
      button.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  window.addEventListener(
    'pointermove',
    (event) => {
      if (!pending || event.pointerId !== pending.pointer) return;
      if (!ghost && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 5) return;
      if (!ghost) {
        const material = wireframeMaterial(pending.kind, 'wireframe-preview', { x: 0, y: 0 });
        ghost = document.createElement('div');
        ghost.className = 'wireframe-drag-preview';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.width = material.width + 'px';
        ghost.style.height = material.height + 'px';
        ghost.innerHTML = wireframeMarkup(material);
        document.body.append(ghost);
      }
      event.preventDefault();
      const z = ctx.currentCamera().z;
      ghost.style.left = event.clientX + 'px';
      ghost.style.top = event.clientY + 'px';
      ghost.style.transform = `translate(-50%, -50%) scale(${z})`;
    },
    { signal, passive: false },
  );
  window.addEventListener(
    'pointerup',
    (event) => {
      if (!pending || event.pointerId !== pending.pointer) return;
      const dragged = !!ghost,
        kind = pending.kind;
      clear();
      if (!dragged) return;
      suppressClick = true;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      close();
      if (
        hit?.closest('.canvas-stage') &&
        !hit.closest('.canvas-chat,.canvas-context-layer,.canvas-dock-host')
      ) {
        addWireframe(ctx, kind, { x: event.clientX, y: event.clientY });
      }
    },
    { signal },
  );
  root.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      if (event.detail) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { signal, capture: true },
  );
  const cancel = () => {
    if (ghost) suppressClick = true;
    clear();
  };
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') cancel();
    },
    { signal, capture: true },
  );
  window.addEventListener('pointercancel', cancel, { signal });
  root.addEventListener(
    'lostpointercapture',
    () => {
      if (pending) cancel();
    },
    { signal },
  );
  window.addEventListener('blur', cancel, { signal });
  signal.addEventListener('abort', clear, { once: true });
}
