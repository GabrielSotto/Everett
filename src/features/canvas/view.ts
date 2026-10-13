import type { Context, Tool } from '../../app/context';
import {
  materialRoute,
  type Material,
  type Point,
  type Rect,
  type Reference,
  type Anchor,
  type Shape,
  type Camera,
  nodeTitle,
} from '../../domain/model';
import { drawRect, anchorPoint, linkPath } from '../../domain/geometry';
import { html, target, preserveFocus, type View } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import {
  materialMarkup,
  zoneMarkup,
  connectionMarkup,
  shapeMarkup,
  resizeHandles,
} from './materials';
import { CanvasChat } from '../chat/controller';
import { SpatialCamera } from '../../spatial/camera';
import { toWorld, bound } from '../../spatial/math';
import { bindDismiss } from '../../ui/popover';
import { trace, type Intent } from '../../app/diagnostics/trace';
import { colors } from './note-colors';
import { bindPointerCancellation } from '../../ui/pointer-cancellation';
import { CanvasInteractions } from './interactions';
import { proposalMarkup } from './proposals';
import { sameConnection } from '../../domain/link-identity';
import { materialsInRect } from '../../domain/material-selection';
import { motion, reducedMotion } from '../../ui/motion';
import { strokePicker } from './stroke-picker';
const shapeTools: Shape[] = ['rectangle', 'ellipse', 'triangle', 'star'];
type Corner = 'nw' | 'ne' | 'se' | 'sw';
type Drag =
  | { kind: 'pan' }
  | { kind: 'selection'; start: Point; point: Point; before: string[]; additive: boolean }
  | { kind: 'reconnect'; id: string; end: 'from' | 'to'; start: Point; distance: number }
  | {
      kind: 'node' | 'zone';
      id: string;
      start: Point;
      origin: Point;
      point: Point;
      distance: number;
      intent: Intent;
      origins?: { id: string; point: Point }[];
      additive?: boolean;
    }
  | {
      kind: 'resize';
      entity: 'node' | 'zone';
      id: string;
      start: Point;
      origin: Rect;
      rect: Rect;
      corner: Corner;
      intent: Intent;
    }
  | { kind: 'draw'; tool: Tool; start: Point; point: Point; points: Point[]; intent: Intent }
  | { kind: 'dock'; start: Point; origin: Point; intent: Intent }
  | {
      kind: 'connect';
      node: string;
      anchor: Anchor;
      start: Point;
      distance: number;
      intent: Intent;
    };

export class CanvasView implements View {
  private abort = new AbortController();
  private cam: SpatialCamera;
  private chat: CanvasChat;
  private drag: Drag | null = null;
  private dock: Point | null = null;
  private dockManual = false;
  private cableZoom = NaN;
  private proposalMotions = new Map<string, Animation>();
  private revision: string | null = null;
  private reviewCamera: Camera | null = null;
  private framedProposal: string | null = null;
  private expansionCamera: Camera | null = null;
  private referenceMenu = false;
  private shapesOpen = false;
  private dockMore = false;
  private sequence = 0;
  private interactions: CanvasInteractions;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    root.innerHTML =
      '<section class="canvas-stage" id="canvas-stage"><div class="canvas-plane" id="canvas-plane"></div><div id="selection-actions"></div></section><input id="canvas-file-import" type="file" accept="image/*,video/*,application/pdf" multiple hidden><div id="canvas-dock-host"></div><div class="chat-host" id="canvas-chat-host"></div>';
    this.cam = new SpatialCamera(ctx.store.get().camera, (camera) => {
      const plane = root.querySelector<HTMLElement>('#canvas-plane');
      if (plane) {
        plane.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.z})`;
        plane.style.setProperty('--canvas-zoom', String(camera.z));
        if (this.cableZoom !== camera.z) {
          this.cableZoom = camera.z;
          this.paintCableLabels();
        }
        this.positionLinkActions();
      }
    });
    ctx.camera = this.cam;
    bindDismiss(
      this.abort.signal,
      () => this.referenceMenu || this.shapesOpen || this.dockMore,
      (source) => {
        const more = this.dockMore;
        const references = this.referenceMenu;
        this.referenceMenu = false;
        this.shapesOpen = false;
        this.dockMore = false;
        this.renderDock();
        this.paintSelection();
        if (more && source === 'keyboard')
          this.root
            .querySelector<HTMLElement>('[data-action=dock-more]')
            ?.focus({ preventScroll: true });
        if (references && source === 'keyboard')
          this.referenceTrigger()?.focus({ preventScroll: true });
      },
      '.reference-menu,.shape-menu,.dock-more-menu,[data-action=references],[data-action=shapes],[data-action=dock-more],[data-action=dock-grip]',
    );
    this.chat = new CanvasChat(root.querySelector<HTMLElement>('#canvas-chat-host')!, ctx, () =>
      this.renderDock(),
    );
    this.interactions = new CanvasInteractions(root, ctx, this.abort.signal, () => this.camPoint());
    root.addEventListener(
      'contextmenu',
      () => {
        if (!this.referenceMenu && !this.shapesOpen && !this.dockMore) return;
        this.referenceMenu = false;
        this.shapesOpen = false;
        this.dockMore = false;
        this.renderDock();
      },
      { signal: this.abort.signal },
    );
    root.addEventListener('pointerdown', (e) => this.down(e), { signal: this.abort.signal });
    root.addEventListener('pointermove', (e) => this.move(e), { signal: this.abort.signal });
    root.addEventListener('pointerup', (e) => this.up(e), { signal: this.abort.signal });
    root.addEventListener('keydown', (e) => this.materialKey(e), { signal: this.abort.signal });
    bindPointerCancellation(root, this.abort.signal, () => this.cancel());
    root.addEventListener('click', (e) => this.click(e), { signal: this.abort.signal });
    root.addEventListener(
      'dblclick',
      (e) => {
        if (
          e.target instanceof Element &&
          e.target.closest('button,input,textarea,select,.material-identification')
        )
          return;
        const element =
          e.target instanceof Element ? e.target.closest<HTMLElement>('[data-node]') : null;
        if (element) this.open(element.dataset.node ?? '');
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'input',
      (e) => {
        const field = e.target;
        if (field instanceof HTMLTextAreaElement) {
          const id = field.closest<HTMLFormElement>('[data-revision]')?.dataset.revision;
          if (id) ctx.ui.revisionDrafts[id] = field.value;
          if (field.id === 'zone-instruction' && ctx.ui.canvas.zoneSelection)
            ctx.act(
              {
                type: 'zone.instruction',
                world: ctx.world().id,
                id: ctx.ui.canvas.zoneSelection,
                text: field.value,
              },
              'instrucción de zona',
              'ZONE-01',
            );
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener('submit', (e) => this.submit(e), { signal: this.abort.signal });
    root.addEventListener(
      'change',
      (e) => {
        if (
          e.target instanceof HTMLInputElement &&
          e.target.id === 'zone-name' &&
          ctx.ui.canvas.zoneSelection
        )
          ctx.act(
            {
              type: 'zone.rename',
              world: ctx.world().id,
              id: ctx.ui.canvas.zoneSelection,
              name: e.target.value,
            },
            'renombrar zona',
            'ZONE-01',
          );
        if (
          e.target instanceof HTMLSelectElement &&
          e.target.id === 'zone-agent' &&
          ctx.ui.canvas.zoneSelection
        ) {
          const chosen = e.target.value;
          ctx.service.cancelZone(ctx.world().id, ctx.ui.canvas.zoneSelection);
          ctx.act(
            {
              type: 'zone.agent',
              world: ctx.world().id,
              id: ctx.ui.canvas.zoneSelection,
              agent: chosen || null,
            },
            'asignar agente a zona',
            'ZONE-01',
          );
          this.root.focus({ preventScroll: true });
        }
      },
      { signal: this.abort.signal },
    );
    window.addEventListener(
      'resize',
      () => {
        if (!this.dockManual) this.dock = null;
        this.root.dataset.chatObscured = String(this.chatHidden());
        const proposal = this.revision ?? (this.reviewCamera ? this.framedProposal : null);
        if (proposal) this.frameProposal(proposal);
        this.clampDock();
        this.renderDock();
      },
      { signal: this.abort.signal },
    );
    this.render();
  }
  private nextId(): string {
    return 'canvas-' + Date.now().toString(36) + '-' + ++this.sequence;
  }
  private camPoint(): Point {
    return toWorld({ x: innerWidth / 2, y: innerHeight / 2 }, this.cam.current, this.rect());
  }
  comment(): void {
    this.interactions.comment();
  }
  rename(): void {
    this.interactions.rename();
  }
  closeTransient(): boolean {
    if (this.interactions.close()) return true;
    if (this.drag || this.ctx.ui.canvas.linkStart) {
      this.cancel();
      return true;
    }
    if (this.referenceMenu || this.shapesOpen || this.revision || this.dockMore) {
      this.referenceMenu = false;
      this.shapesOpen = false;
      this.dockMore = false;
      this.revision = null;
      this.restoreExpansion();
      this.render();
      return true;
    }
    if (this.ctx.ui.canvas.zoneSelection) {
      const id = this.ctx.ui.canvas.zoneSelection;
      this.select(null, null);
      this.paintSelection();
      this.root
        .querySelector<HTMLElement>(`[data-zone="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
      return true;
    }
    if (this.reviewCamera) {
      this.closeReview();
      return true;
    }
    return false;
  }
  private rect(): DOMRect {
    return this.root.querySelector('#canvas-stage')!.getBoundingClientRect();
  }
  private point(e: PointerEvent): Point {
    return toWorld({ x: e.clientX, y: e.clientY }, this.cam.current, this.rect());
  }
  private materialKey(event: KeyboardEvent): void {
    if (!(event.target instanceof HTMLElement)) return;
    const element = event.target;
    const menu = element.closest('.dock-more-menu,.reference-menu');
    if (menu && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('button'));
      const index = items.indexOf(element as HTMLButtonElement);
      items[
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      ]?.focus();
      return;
    }
    if (element.dataset.zone && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      this.select('zone', element.dataset.zone);
      this.paintSelection();
      return;
    }
    if (
      this.ctx.ui.canvas.tool === 'connect' &&
      element.dataset.anchorNode &&
      element.dataset.anchor &&
      ['Enter', ' '].includes(event.key)
    ) {
      event.preventDefault();
      event.stopPropagation();
      const from = this.ctx.ui.canvas.linkStart,
        anchor = element.dataset.anchor as Anchor;
      if (from && from.node !== element.dataset.anchorNode)
        this.connect(from.node, from.anchor, element.dataset.anchorNode, anchor);
      else {
        this.ctx.ui.canvas.linkStart = { node: element.dataset.anchorNode, anchor };
        element.setAttribute('aria-pressed', 'true');
      }
      return;
    }
    if (
      element.dataset.resize !== 'node' ||
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    )
      return;
    const node = this.ctx.world().nodes.find((n) => n.id === element.dataset.id && !n.owner);
    if (!node) return;
    event.preventDefault();
    event.stopPropagation();
    const corner = element.dataset.corner as Corner,
      step = event.shiftKey ? 10 : 2;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    let width = Math.max(4, node.width + (corner.includes('w') ? -dx : dx));
    let height = Math.max(4, node.height + (corner.includes('n') ? -dy : dy));
    if (node.data.kind === 'image' || node.data.kind === 'video') {
      const ratio = node.data.ratio;
      if (dx) height = width / ratio;
      else width = height * ratio;
      const scale = Math.max(1, 4 / width, 4 / height);
      width *= scale;
      height *= scale;
    }
    const rect = {
      x: corner.includes('w') ? node.x + node.width - width : node.x,
      y: corner.includes('n') ? node.y + node.height - height : node.y,
      width,
      height,
    };
    this.ctx.act(
      { type: 'node.resize', world: this.ctx.world().id, id: node.id, rect },
      'redimensionar con teclado',
      'C08-MAT-05',
      'keyboard',
    );
    this.root
      .querySelector<HTMLElement>(
        `[data-resize="node"][data-id="${CSS.escape(node.id)}"][data-corner="${corner}"]`,
      )
      ?.focus({ preventScroll: true });
  }
  private open(id: string): void {
    const destination = materialRoute(this.ctx.store.get(), this.ctx.world().id, id);
    if (destination)
      this.ctx.go(
        destination,
        this.root
          .querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`)
          ?.getBoundingClientRect(),
      );
  }
  private frameProposal(id: string, keepZoom = false): void {
    const job = this.ctx.world().assignments.find((a) => a.id === id);
    if (!job) return;
    this.framedProposal = id;
    const z = keepZoom ? this.cam.destination.z : 1,
      width = Math.min((job.output?.length ?? 1) > 1 ? 560 : 320, innerWidth - 24) * Math.min(1, z);
    const rect = this.rect(),
      chat = !this.chatHidden('proposal')
        ? this.root.querySelector('.canvas-chat.docked')?.getBoundingClientRect()
        : null,
      left = chat ? chat.right + 12 : rect.left,
      center = (left + rect.right) / 2,
      camera = {
        x: center - (rect.left + rect.width / 2) - job.position.x * z - width / 2,
        y: 24 - rect.height / 2 - job.position.y * z,
        z,
      };
    this.ctx.ui.canvas.zoneSelection = null;
    this.cam.set(camera, reducedMotion());
    this.ctx.act({ type: 'camera', camera }, 'consultar propuesta', 'C08-PROP-01');
    this.render();
  }
  private restoreExpansion(): void {
    const camera = this.expansionCamera;
    this.expansionCamera = null;
    if (camera) {
      const job = this.ctx.world().assignments.find((job) => job.id === this.framedProposal),
        panel = this.root.querySelector<HTMLElement>(
          `[data-proposal="${CSS.escape(this.framedProposal ?? '')}"]`,
        ),
        stage = this.rect();
      if (job && panel) {
        const x = stage.left + stage.width / 2 + camera.x + job.position.x * camera.z,
          y = stage.top + stage.height / 2 + camera.y + job.position.y * camera.z,
          scale = Math.min(1, camera.z);
        if (
          x < stage.left ||
          x + panel.offsetWidth * scale > stage.right ||
          y < stage.top ||
          y + Math.min(panel.scrollHeight, innerHeight - 170) * scale > stage.bottom - 80
        )
          return;
      }
      this.cam.set(camera, reducedMotion());
      this.ctx.act({ type: 'camera', camera }, 'recuperar encuadre de Canvas', 'C08-PROP-01');
    }
  }
  private closeReview(): void {
    this.revision = null;
    const camera = this.reviewCamera;
    this.reviewCamera = null;
    if (camera) {
      this.expansionCamera = null;
      this.cam.set(camera, reducedMotion());
      this.ctx.act({ type: 'camera', camera }, 'volver de la revisión de propuesta', 'C08-PROP-01');
    } else this.restoreExpansion();
    this.render();
  }
  private select(kind: 'node' | 'zone' | 'link' | null, id: string | null, additive = false): void {
    const ui = this.ctx.ui.canvas;
    ui.selections =
      kind === 'node' && id
        ? additive
          ? ui.selections.includes(id)
            ? ui.selections.filter((existing) => existing !== id)
            : [...ui.selections, id]
          : [id]
        : [];
    this.ctx.ui.canvas.selection =
      kind === 'node'
        ? ui.selections.includes(id ?? '')
          ? id
          : (ui.selections.at(-1) ?? null)
        : null;
    this.ctx.ui.canvas.zoneSelection = kind === 'zone' ? id : null;
    this.ctx.ui.canvas.linkSelection = kind === 'link' ? id : null;
    const data = this.ctx.world().nodes.find((n) => n.id === id)?.data;
    if (data?.kind === 'drawing' || data?.kind === 'shape') {
      ui.color = data.color;
      ui.thickness = data.thickness ?? 1;
      if (data.kind === 'shape') {
        ui.stroke = data.stroke ?? data.color;
        ui.fill = data.fill ?? true;
      }
    }
  }
  private down(e: PointerEvent): void {
    if (!(e.target instanceof Element) || e.button !== 0) return;
    const target = e.target,
      ui = this.ctx.ui;
    if (
      target.closest(
        '.canvas-chat,.zone-inspector,.quick-actions,.zone-materials details,.canvas-context-layer,.dock-more-menu',
      )
    )
      return;
    if (target.closest('[data-action=dock-grip]')) {
      e.preventDefault();
      const box = this.root.querySelector('.canvas-tools')!.getBoundingClientRect();
      this.drag = {
        kind: 'dock',
        start: { x: e.clientX, y: e.clientY },
        origin: box,
        intent: trace.intent('mover dock', 'DRAG-01'),
      };
      this.root.setPointerCapture(e.pointerId);
      return;
    }
    const endpoint = target.closest<SVGElement>('[data-end]');
    if (
      endpoint?.dataset.id &&
      (endpoint.dataset.end === 'from' || endpoint.dataset.end === 'to')
    ) {
      e.preventDefault();
      this.drag = {
        kind: 'reconnect',
        id: endpoint.dataset.id,
        end: endpoint.dataset.end,
        start: { x: e.clientX, y: e.clientY },
        distance: 0,
      };
      endpoint.closest('.connection')?.classList.add('reconnecting');
      this.root.setPointerCapture(e.pointerId);
      return;
    }
    const video = target.closest('video[controls]');
    // Conservar la franja de controles nativos; el resto del fotograma es arrastrable.
    if (video) {
      const box = video.getBoundingClientRect();
      if (e.clientY >= box.bottom - Math.min(42 * this.cam.current.z, box.height / 2)) return;
    }
    const port = target.closest<HTMLElement>('[data-anchor]');
    if (ui.canvas.tool === 'connect' && port?.dataset.anchorNode && port.dataset.anchor) {
      e.preventDefault();
      const node = port.dataset.anchorNode,
        anchor = port.dataset.anchor as Anchor;
      if (ui.canvas.linkStart && ui.canvas.linkStart.node !== node) {
        this.connect(ui.canvas.linkStart.node, ui.canvas.linkStart.anchor, node, anchor);
        return;
      }
      ui.canvas.linkStart = { node, anchor };
      this.drag = {
        kind: 'connect',
        node,
        anchor,
        start: { x: e.clientX, y: e.clientY },
        distance: 0,
        intent: trace.intent('conectar anclajes', 'LINK-01'),
      };
      this.root.setPointerCapture(e.pointerId);
      return;
    }
    const handle = target.closest<HTMLElement>('[data-resize]');
    if (
      handle &&
      (handle.dataset.resize === 'node' || handle.dataset.resize === 'zone') &&
      handle.dataset.id
    ) {
      const entity = handle.dataset.resize,
        id = handle.dataset.id;
      const original =
        entity === 'node'
          ? this.ctx.world().nodes.find((n) => n.id === id)
          : this.ctx.world().zones.find((z) => z.id === id);
      if (!original) return;
      e.preventDefault();
      const rect = { x: original.x, y: original.y, width: original.width, height: original.height };
      this.drag = {
        kind: 'resize',
        entity,
        id,
        origin: rect,
        rect,
        start: this.point(e),
        corner: handle.dataset.corner as Corner,
        intent: trace.intent('redimensionar', 'DRAW-01'),
      };
      this.root.setPointerCapture(e.pointerId);
      return;
    }
    if (
      target.closest(
        'button,input,textarea,select,.canvas-tools,.material-actions,.proposal,.reference-menu,.shape-menu,[data-link]',
      ) ||
      !target.closest('#canvas-stage')
    )
      return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    this.root.focus({ preventScroll: true });
    if (ui.canvas.tool === 'connect') return;
    const point = this.point(e),
      nodeId = target.closest<HTMLElement>('[data-node]')?.dataset.node,
      zoneId = target.closest<HTMLElement>('[data-zone]')?.dataset.zone;
    if (ui.canvas.tool === 'comment') {
      if (nodeId) this.interactions.openComment(nodeId);
      return;
    }
    (target.closest<HTMLElement>('[data-node]') ?? this.root).setPointerCapture(e.pointerId);
    if (
      shapeTools.includes(ui.canvas.tool as Shape) ||
      ui.canvas.tool === 'zone' ||
      ui.canvas.tool === 'drawing' ||
      ui.canvas.tool === 'note'
    ) {
      this.drag = {
        kind: 'draw',
        tool: ui.canvas.tool,
        start: point,
        point,
        points: [point],
        intent: trace.intent('dibujar', 'DRAW-01'),
      };
    } else if (ui.canvas.tool === 'hand') {
      this.select(null, null);
      this.paintSelection();
      this.drag = { kind: 'pan' };
      this.cam.start({ x: e.clientX, y: e.clientY });
      this.root.classList.add('panning');
      this.root.style.cursor = 'grabbing';
    } else if (!nodeId && !zoneId) {
      this.drag = {
        kind: 'selection',
        start: point,
        point,
        before: [...ui.canvas.selections],
        additive: e.shiftKey,
      };
      if (!e.shiftKey) this.select(null, null);
      this.paintSelection();
    } else {
      if (!nodeId && zoneId) {
        this.select('zone', zoneId);
        this.paintSelection();
        return;
      }
      const kind = nodeId ? 'node' : 'zone',
        id = nodeId ?? zoneId!;
      const original =
        kind === 'node'
          ? this.ctx.world().nodes.find((n) => n.id === id && !n.owner)
          : this.ctx.world().zones.find((z) => z.id === id);
      if (!original) return;
      if (kind === 'node' && ui.canvas.selections.includes(id) && !e.shiftKey)
        ui.canvas.selection = id;
      else this.select(kind, id, e.shiftKey);
      if (kind === 'node' && !ui.canvas.selections.includes(id)) {
        this.paintSelection();
        this.ctx.persist();
        return;
      }
      this.drag = {
        kind,
        id,
        start: point,
        origin: { x: original.x, y: original.y },
        point: { x: original.x, y: original.y },
        distance: 0,
        intent: trace.intent('mover ' + kind, 'DRAG-02'),
        ...(kind === 'node'
          ? {
              origins: this.ctx
                .world()
                .nodes.filter((n) => !n.owner && ui.canvas.selections.includes(n.id))
                .map((n) => ({ id: n.id, point: { x: n.x, y: n.y } })),
              additive: e.shiftKey,
            }
          : {}),
      };
      this.paintSelection();
      this.renderDock();
    }
  }
  private move(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    e.preventDefault();
    if (d.kind === 'pan') {
      this.cam.pan({ x: e.clientX, y: e.clientY });
      return;
    }
    if (d.kind === 'dock') {
      this.dockManual = true;
      const element = this.root.querySelector<HTMLElement>('.canvas-tools')!;
      this.dock = bound(
        { x: d.origin.x + e.clientX - d.start.x, y: d.origin.y + e.clientY - d.start.y },
        element.getBoundingClientRect(),
        { x: 0, y: 59, width: innerWidth, height: innerHeight - 59 },
      );
      Object.assign(element.style, {
        left: this.dock.x + 'px',
        top: this.dock.y + 'px',
        bottom: 'auto',
        transform: 'none',
      });
      this.positionReferenceMenu();
      return;
    }
    const point = this.point(e);
    if (d.kind === 'selection') {
      d.point = point;
      const rect = drawRect(d.start, point, 0);
      let box = this.root.querySelector<HTMLElement>('.selection-box');
      if (!box) {
        box = document.createElement('div');
        box.className = 'selection-box';
        box.setAttribute('aria-hidden', 'true');
        this.root.querySelector('#canvas-plane')?.append(box);
      }
      this.applyRect(box, rect);
      const selected = materialsInRect(this.ctx.world().nodes, rect);
      const ui = this.ctx.ui.canvas;
      ui.selections = [...new Set([...(d.additive ? d.before : []), ...selected])];
      ui.selection = ui.selections.at(-1) ?? null;
      ui.zoneSelection = ui.linkSelection = null;
      this.paintSelection();
      return;
    }
    if (d.kind === 'reconnect') {
      d.distance = Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y);
      const link = this.ctx.world().links.find((link) => link.id === d.id);
      const from = this.ctx.world().nodes.find((node) => node.id === link?.from);
      const to = this.ctx.world().nodes.find((node) => node.id === link?.to);
      const group = this.root.querySelector(`[data-link="${CSS.escape(d.id)}"]`);
      if (link && from && to && group) {
        const path = linkPath(
          d.end === 'from' ? point : anchorPoint(from, link.fromAnchor),
          d.end === 'to' ? point : anchorPoint(to, link.toAnchor),
          link.fromAnchor,
          link.toAnchor,
        );
        group
          .querySelectorAll('path')
          .forEach((pathElement) => pathElement.setAttribute('d', path));
        const handle = group.querySelector(`[data-end=${d.end}]`);
        handle?.setAttribute('transform', `translate(${point.x},${point.y})`);
        this.paintCableLabels();
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-anchor]');
        this.root
          .querySelectorAll('.connection-port')
          .forEach((port) => port.classList.toggle('reconnect-target', port === target));
      }
      return;
    }
    if (d.kind === 'connect') {
      d.distance = Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y);
      const source = this.ctx.world().nodes.find((n) => n.id === d.node);
      if (!source) return;
      let preview = this.root.querySelector<SVGPathElement>('.pending-link');
      if (!preview) {
        preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        preview.classList.add('pending-link');
        this.root.querySelector('.canvas-links')?.append(preview);
      }
      preview.setAttribute('d', linkPath(anchorPoint(source, d.anchor), point, d.anchor, 'west'));
      return;
    }
    if (d.kind === 'resize') {
      const dx = point.x - d.start.x,
        dy = point.y - d.start.y;
      const fixed = {
        x: d.corner.includes('w') ? d.origin.x + d.origin.width : d.origin.x,
        y: d.corner.includes('n') ? d.origin.y + d.origin.height : d.origin.y,
      };
      const moving = {
        x: d.corner.includes('w') ? d.origin.x + dx : d.origin.x + d.origin.width + dx,
        y: d.corner.includes('n') ? d.origin.y + dy : d.origin.y + d.origin.height + dy,
      };
      d.rect = drawRect(fixed, moving);
      const material = this.ctx.world().nodes.find((n) => n.id === d.id);
      if (material?.data.kind === 'image' || material?.data.kind === 'video') {
        const sx = d.rect.width / d.origin.width,
          sy = d.rect.height / d.origin.height;
        const scale = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
        const width = d.origin.width * scale,
          height = d.origin.height * scale;
        d.rect = {
          x: d.corner.includes('w') ? fixed.x - width : fixed.x,
          y: d.corner.includes('n') ? fixed.y - height : fixed.y,
          width,
          height,
        };
      }
      const element = this.root.querySelector<HTMLElement>(`[data-${d.entity}="${d.id}"]`);
      if (element) this.applyRect(element, d.rect);
      this.paintLinks([{ id: d.id, point: d.rect }]);
      return;
    }
    if (d.kind === 'node' || d.kind === 'zone') {
      d.point = { x: d.origin.x + point.x - d.start.x, y: d.origin.y + point.y - d.start.y };
      d.distance = Math.hypot(point.x - d.start.x, point.y - d.start.y) * this.cam.current.z;
      const positions = d.origins?.map((item) => ({
        id: item.id,
        point: { x: item.point.x + point.x - d.start.x, y: item.point.y + point.y - d.start.y },
      })) ?? [{ id: d.id, point: d.point }];
      for (const item of positions) {
        const element = this.root.querySelector<HTMLElement>(
          `[data-${d.kind}="${CSS.escape(item.id)}"]`,
        );
        if (element) {
          element.style.left = item.point.x + 'px';
          element.style.top = item.point.y + 'px';
        }
      }
      if (d.kind === 'node') {
        this.paintLinks(positions);
        const chat = this.root.querySelector('.canvas-chat.docked');
        chat?.classList.toggle(
          'reference-drop-ready',
          !!document.elementFromPoint(e.clientX, e.clientY)?.closest('.canvas-chat.docked'),
        );
        this.root.querySelectorAll<HTMLElement>('[data-zone]').forEach((el) => {
          const zone = this.ctx.world().zones.find((z) => z.id === el.dataset.zone);
          el.classList.toggle(
            'drop-ready',
            !!zone?.agent &&
              point.x > zone.x &&
              point.x < zone.x + zone.width &&
              point.y > zone.y &&
              point.y < zone.y + zone.height,
          );
        });
      }
      return;
    }
    if (d.kind !== 'draw') return;
    d.point = point;
    d.points.push(point);
    let preview = this.root.querySelector<HTMLElement>('.draw-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'draw-preview ' + d.tool;
      this.root.querySelector('#canvas-plane')?.append(preview);
    }
    this.applyRect(preview, drawRect(d.start, d.point));
    if (d.tool === 'drawing') {
      const rect = this.strokeRect(d.points);
      this.applyRect(preview, rect);
      preview.innerHTML = `<svg viewBox="0 0 ${rect.width} ${rect.height}" preserveAspectRatio="none"><polyline points="${d.points.map((p) => `${p.x - rect.x},${p.y - rect.y}`).join(' ')}" fill="none" stroke="${this.ctx.ui.canvas.color}" stroke-width="${this.ctx.ui.canvas.thickness}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    if (shapeTools.includes(d.tool as Shape))
      preview.innerHTML = shapeMarkup({
        id: '',
        ...drawRect(d.start, d.point),
        owner: null,
        data: {
          kind: 'shape',
          shape: d.tool as Shape,
          title: 'Sin nombre',
          color: this.ctx.ui.canvas.color,
          stroke: this.ctx.ui.canvas.stroke,
          thickness: this.ctx.ui.canvas.thickness,
          fill: this.ctx.ui.canvas.fill,
        },
      });
  }
  private applyRect(element: HTMLElement, rect: Rect): void {
    Object.assign(element.style, {
      left: rect.x + 'px',
      top: rect.y + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
    });
  }
  private strokeRect(points: Point[]): Rect {
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(4, Math.max(...xs) - Math.min(...xs)),
      height: Math.max(4, Math.max(...ys) - Math.min(...ys)),
    };
  }
  private up(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.root.classList.remove('panning');
    this.root.style.removeProperty('cursor');
    if (this.root.hasPointerCapture(e.pointerId)) this.root.releasePointerCapture(e.pointerId);
    const w = this.ctx.world();
    if (d.kind === 'selection') {
      this.root.querySelector('.selection-box')?.remove();
      if (Math.hypot(d.point.x - d.start.x, d.point.y - d.start.y) * this.cam.current.z < 3) {
        this.ctx.ui.canvas.selections = d.additive ? d.before : [];
        this.ctx.ui.canvas.selection = this.ctx.ui.canvas.selections.at(-1) ?? null;
        this.paintSelection();
      }
      this.renderDock();
      this.ctx.persist();
      return;
    }
    if (d.kind === 'pan') {
      this.cam.stop();
      this.ctx.act({ type: 'camera', camera: this.cam.current }, 'panear', 'DRAG-02');
      return;
    }
    if (d.kind === 'dock') {
      this.renderDock();
      trace.add('drag.finished', { component: 'canvas-tools', position: this.dock }, d.intent);
      return;
    }
    if (d.kind === 'reconnect') {
      const port = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-anchor]');
      if (d.distance > 3 && port?.dataset.anchorNode && port.dataset.anchor)
        this.ctx.act(
          {
            type: 'link.reconnect',
            world: w.id,
            id: d.id,
            end: d.end,
            node: port.dataset.anchorNode,
            anchor: port.dataset.anchor as Anchor,
          },
          'reconectar extremo',
          'C08-LINK-01',
        );
      if (d.distance > 3) this.render();
      else {
        this.root.querySelector('.reconnecting')?.classList.remove('reconnecting');
        this.interactions.reconnect(d.id, d.end);
      }
      return;
    }
    if (d.kind === 'connect') {
      this.root.querySelector('.pending-link')?.remove();
      if (d.distance > 3) this.ctx.ui.canvas.linkStart = null;
      const port = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-anchor]');
      if (port?.dataset.anchorNode && port.dataset.anchor && port.dataset.anchorNode !== d.node)
        this.connect(d.node, d.anchor, port.dataset.anchorNode, port.dataset.anchor as Anchor);
      return;
    }
    if (d.kind === 'resize') {
      this.ctx.act(
        {
          type: d.entity === 'node' ? 'node.resize' : 'zone.edit',
          world: w.id,
          id: d.id,
          rect: d.rect,
        },
        'redimensionar',
        'DRAW-01',
        'pointer',
        d.intent.interaction,
      );
      trace.add(
        'geometry.finished',
        { operation: 'resize', requested: d.rect, entity: d.entity, id: d.id },
        d.intent,
      );
      return;
    }
    if (d.kind === 'node' || d.kind === 'zone') {
      const chat = document.elementFromPoint(e.clientX, e.clientY)?.closest('.canvas-chat.docked');
      this.root.querySelector('.canvas-chat')?.classList.remove('reference-drop-ready');
      if (d.kind === 'node' && d.distance > 3 && chat) {
        for (const item of d.origins ?? [{ id: d.id, point: d.origin }])
          this.chat.reference(item.id);
        this.render();
        return;
      }
      if (d.distance > 3) {
        if (d.kind === 'node') {
          const point = this.point(e),
            zone = w.zones.find(
              (z) =>
                z.agent &&
                point.x > z.x &&
                point.x < z.x + z.width &&
                point.y > z.y &&
                point.y < z.y + z.height,
            );
          const origins = d.origins ?? [{ id: d.id, point: d.origin }];
          if (zone?.agent) {
            const assigned = this.ctx.act(
              {
                type: 'nodes.assign',
                world: w.id,
                agent: zone.agent,
                instruction: zone.instruction ?? '',
                nodes: origins.map((item) => ({ id: item.id, returnTo: item.point })),
              },
              'transferir materiales a zona',
              'OWNER-01',
              'pointer',
              d.intent.interaction,
            );
            if (assigned) {
              const jobs = this.ctx
                .world()
                .assignments.filter((job) => origins.some((item) => item.id === job.node));
              for (const job of jobs) this.ctx.service.process(w.id, job.id);
              this.select(null, null);
              this.render();
            } else this.render();
          } else {
            const positions = origins.map((item) => ({
              id: item.id,
              point: {
                x: item.point.x + d.point.x - d.origin.x,
                y: item.point.y + d.point.y - d.origin.y,
              },
            }));
            this.ctx.act(
              positions.length > 1
                ? { type: 'nodes.move', world: w.id, nodes: positions }
                : { type: 'node.move', world: w.id, id: d.id, point: d.point },
              'mover materiales',
              'DRAG-02',
              'pointer',
              d.intent.interaction,
            );
          }
        } else {
          const zone = w.zones.find((z) => z.id === d.id)!;
          this.ctx.act(
            {
              type: 'zone.edit',
              world: w.id,
              id: d.id,
              rect: { ...d.point, width: zone.width, height: zone.height },
            },
            'mover zona',
            'ZONE-01',
            'pointer',
            d.intent.interaction,
          );
        }
        trace.add('drag.finished', { component: d.kind, id: d.id, to: d.point }, d.intent);
      } else {
        if (d.kind === 'node' && !d.additive) this.select('node', d.id);
        this.paintSelection();
        this.ctx.persist();
      }
      return;
    }
    if (d.kind !== 'draw') return;
    const rect = d.tool === 'drawing' ? this.strokeRect(d.points) : drawRect(d.start, d.point),
      id = this.nextId();
    if (d.tool === 'zone') {
      this.ctx.act(
        {
          type: 'zone.create',
          world: w.id,
          zone: { id, ...rect, name: 'Zona sin nombre', agent: null },
        },
        'dibujar zona',
        'DRAW-01',
        'pointer',
        d.intent.interaction,
      );
      this.select('zone', id);
    } else {
      const click = Math.hypot(d.point.x - d.start.x, d.point.y - d.start.y) < 3;
      const geometry = d.tool === 'note' && click ? { ...rect, width: 240, height: 175 } : rect;
      const node: Material = {
        id,
        ...geometry,
        owner: null,
        data:
          d.tool === 'note'
            ? { kind: 'note', title: '', text: '', color: colors[0]! }
            : d.tool === 'drawing'
              ? {
                  kind: 'drawing',
                  title: 'Sin nombre',
                  points: d.points.map((p) => ({ x: p.x - rect.x, y: p.y - rect.y })),
                  color: this.ctx.ui.canvas.color,
                  thickness: this.ctx.ui.canvas.thickness,
                }
              : {
                  kind: 'shape',
                  shape: d.tool as Shape,
                  title: 'Sin nombre',
                  color: this.ctx.ui.canvas.color,
                  stroke: this.ctx.ui.canvas.stroke,
                  thickness: this.ctx.ui.canvas.thickness,
                  fill: this.ctx.ui.canvas.fill,
                },
      };
      this.ctx.act(
        { type: 'node.create', world: w.id, node },
        d.tool === 'note' ? 'crear nota' : 'dibujar forma',
        'DRAW-01',
        'pointer',
        d.intent.interaction,
      );
      this.select('node', id);
    }
    trace.add(
      'geometry.finished',
      { operation: 'draw', tool: d.tool, start: d.start, end: d.point, requested: rect, id },
      d.intent,
    );
    if (d.tool === 'note' || d.tool === 'zone') this.ctx.ui.canvas.tool = 'select';
    this.render();
  }
  private cancel(): void {
    if (!this.drag && !this.ctx.ui.canvas.linkStart) return;
    if (this.drag?.kind === 'selection') {
      this.ctx.ui.canvas.selections = this.drag.before;
      this.ctx.ui.canvas.selection = this.drag.before.at(-1) ?? null;
    }
    this.drag = null;
    this.ctx.ui.canvas.linkStart = null;
    this.cam.stop();
    this.root.classList.remove('panning');
    this.root.style.removeProperty('cursor');
    this.render();
  }
  private connect(from: string, fromAnchor: Anchor, to: string, toAnchor: Anchor): void {
    if (
      this.ctx
        .world()
        .links.some((link) => sameConnection(link, { from, fromAnchor, to, toAnchor }))
    ) {
      this.ctx.notice('Ya existe una conexión entre esos anclajes.');
      this.ctx.ui.canvas.linkStart = null;
      this.render();
      return;
    }
    this.ctx.act(
      { type: 'link.create', world: this.ctx.world().id, from, to, fromAnchor, toAnchor },
      'conectar anclajes',
      'LINK-01',
    );
    this.ctx.ui.canvas.linkStart = null;
    this.render();
  }
  private submit(e: SubmitEvent): void {
    if (!(e.target instanceof HTMLFormElement)) return;
    const form = e.target;
    if (form.dataset.revision) {
      e.preventDefault();
      const text = form.querySelector('textarea')?.value ?? '';
      if (text.trim()) {
        const id = form.dataset.revision;
        this.revision = null;
        delete this.ctx.ui.revisionDrafts[id];
        this.restoreExpansion();
        this.ctx.act(
          { type: 'assignment.revise', world: this.ctx.world().id, id, text },
          'pedir cambios',
          'OWNER-01',
        );
        this.ctx.service.process(this.ctx.world().id, id);
      }
    }
  }
  private click(e: MouseEvent): void {
    const t = target(e);
    if (!t || t.closest('.canvas-chat')) return;
    if (t.closest('.dock-more-menu')) {
      this.dockMore = false;
      this.renderDock();
    }
    const { ctx } = this,
      w = ctx.world(),
      id = t.dataset.id ?? '';
    switch (t.dataset.action) {
      case 'canvas-examples':
        this.referenceMenu = false;
        this.renderDock();
        break;
      case 'dock-more':
        this.dockMore = !this.referenceMenu && !this.dockMore;
        this.referenceMenu = false;
        this.shapesOpen = false;
        this.renderDock();
        this.root
          .querySelector<HTMLElement>(
            this.dockMore
              ? '.dock-more-menu [role=menuitem]'
              : '.canvas-tools [data-action=dock-more]',
          )
          ?.focus({ preventScroll: true });
        break;
      case 'canvas-tool': {
        const tool = t.dataset.tool;
        const all: Tool[] = ['select', 'hand', 'note', ...shapeTools, 'zone', 'connect', 'drawing'];
        if (all.includes(tool as Tool)) {
          if (tool !== 'select' && tool !== 'hand') this.select(null, null);
          ctx.ui.canvas.tool = ctx.ui.canvas.tool === tool ? 'select' : (tool as Tool);
          ctx.ui.canvas.linkStart = null;
          this.shapesOpen = false;
          this.render();
        }
        break;
      }
      case 'zone-return': {
        const job = w.assignments.find((a) => a.node === id);
        if (job) {
          ctx.service.cancel(w.id, job.id);
          ctx.act(
            { type: 'assignment.finish', world: w.id, id: job.id, decision: 'cancel' },
            'devolver material',
            'OWNER-01',
          );
        }
        break;
      }
      case 'proposal-reveal': {
        this.reviewCamera ??= this.cam.current;
        this.frameProposal(id);
        this.root
          .querySelector<HTMLElement>(`[data-proposal="${CSS.escape(id)}"] button`)
          ?.focus({ preventScroll: true });
        break;
      }
      case 'proposal-close':
        this.closeReview();
        break;
      case 'shapes':
        if (shapeTools.includes(ctx.ui.canvas.tool as Shape)) {
          ctx.ui.canvas.tool = 'select';
          this.select(null, null);
          this.shapesOpen = false;
        } else this.shapesOpen = !this.shapesOpen;
        this.referenceMenu = false;
        this.renderDock();
        break;
      case 'chat-open':
        if (ctx.ui.canvas.zoneSelection) this.select(null, null);
        this.revision = null;
        this.reviewCamera = null;
        this.restoreExpansion();
        this.paintSelection();
        ctx.ui.chat.chatMode = 'quick';
        ctx.ui.chat.chatPosition = { x: innerWidth - 335, y: innerHeight - 395 };
        this.chat.render();
        break;
      case 'inspector-close': {
        const selected = ctx.ui.canvas.zoneSelection;
        this.select(null, null);
        this.paintSelection();
        if (selected)
          this.root
            .querySelector<HTMLElement>(`[data-zone="${CSS.escape(selected)}"]`)
            ?.focus({ preventScroll: true });
        break;
      }
      case 'zone-unbind':
        ctx.service.cancelZone(w.id, id);
        ctx.act(
          { type: 'zone.agent', world: w.id, id, agent: null },
          'quitar agente de zona',
          'ZONE-OWNER-01',
        );
        break;
      case 'zone-talk': {
        const zone = w.zones.find((z) => z.id === id);
        if (zone?.agent)
          ctx.go({ kind: 'surface', world: w.id, surface: 'agents', entity: zone.agent });
        break;
      }
      case 'zone-delete':
        ctx.service.cancelZone(w.id, id);
        ctx.act({ type: 'zone.delete', world: w.id, id }, 'eliminar zona', 'ZONE-01');
        this.select(null, null);
        this.render();
        break;
      case 'select-link':
        this.select('link', id);
        this.render();
        break;
      case 'link-delete':
        this.interactions.close();
        ctx.act({ type: 'link.delete', world: w.id, id }, 'eliminar conexión', 'LINK-01');
        this.select(null, null);
        this.render();
        break;
      case 'assignment-retry':
        if (
          ctx.act(
            { type: 'assignment.retry', world: w.id, id },
            'reintentar trabajo',
            'C08-STATE-02',
          )
        )
          ctx.service.process(w.id, id);
        break;
      case 'assignment-accept':
      case 'assignment-reject':
      case 'assignment-cancel':
        if (this.reviewCamera) {
          const camera = this.reviewCamera;
          this.reviewCamera = null;
          this.expansionCamera = null;
          this.cam.set(camera, reducedMotion());
          ctx.act({ type: 'camera', camera }, 'recuperar encuadre de Canvas', 'C08-PROP-01');
        } else this.restoreExpansion();
        ctx.service.cancel(w.id, id);
        ctx.act(
          {
            type: 'assignment.finish',
            world: w.id,
            id,
            decision:
              t.dataset.action === 'assignment-accept'
                ? 'accept'
                : t.dataset.action === 'assignment-reject'
                  ? 'reject'
                  : 'cancel',
          },
          'resolver propuesta',
          'OWNER-01',
        );
        break;
      case 'assignment-revise':
        this.revision = id;
        this.render();
        {
          const panel = this.root.querySelector<HTMLElement>(`[data-proposal="${CSS.escape(id)}"]`),
            box = panel?.getBoundingClientRect(),
            stage = this.rect();
          const finalHeight = panel
            ? Math.min(panel.scrollHeight + 2, innerHeight - 170) * Math.min(1, this.cam.current.z)
            : 0;
          if (
            box &&
            (box.top + finalHeight > stage.bottom - 80 ||
              box.top < stage.top ||
              box.left < stage.left ||
              box.right > stage.right)
          ) {
            this.expansionCamera ??= this.cam.current;
            this.reviewCamera ??= this.cam.current;
            this.frameProposal(id, true);
          }
        }
        this.root
          .querySelector<HTMLTextAreaElement>('[data-revision] textarea')
          ?.focus({ preventScroll: true });
        break;
      case 'revision-chip': {
        const input = this.root.querySelector<HTMLTextAreaElement>('[data-revision] textarea');
        if (input) {
          input.value = t.dataset.text ?? '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus({ preventScroll: true });
        }
        break;
      }
      case 'revision-cancel':
        this.revision = null;
        this.restoreExpansion();
        this.render();
        break;
      case 'canvas-link':
        this.referenceMenu = false;
        this.renderDock();
        break;
      case 'references':
        this.referenceMenu = !this.referenceMenu;
        this.shapesOpen = false;
        this.renderDock();
        if (this.referenceMenu)
          this.root
            .querySelector<HTMLElement>('.reference-menu button')
            ?.focus({ preventScroll: true });
        else this.referenceTrigger()?.focus({ preventScroll: true });
        break;
      case 'reference-add': {
        const kind = t.dataset.kind;
        if (kind === 'document' || kind === 'file' || kind === 'task') {
          const point = toWorld(
            { x: innerWidth / 2, y: innerHeight / 2 },
            this.cam.current,
            this.rect(),
          );
          const ref: Reference = { kind, id };
          ctx.act(
            {
              type: 'node.create',
              world: w.id,
              node: {
                id: this.nextId(),
                x: point.x - 130,
                y: point.y - 80,
                width: 260,
                height: 160,
                owner: null,
                data: { kind: 'reference', ref },
              },
            },
            'añadir referencia',
            'ZOOM-02',
          );
          this.referenceMenu = false;
          this.renderDock();
        }
        break;
      }
    }
  }
  private paintLinks(preview: readonly { id: string; point: Point }[] = []): void {
    const svg = this.root.querySelector('.canvas-links');
    if (!svg) return;
    const w = this.ctx.world();
    svg.innerHTML = w.links
      .map((link) =>
        connectionMarkup(link, w, link.id === this.ctx.ui.canvas.linkSelection, preview),
      )
      .join('');
    this.paintCableLabels();
    this.positionLinkActions();
  }
  private positionLinkActions(): void {
    const button = this.root.querySelector<HTMLElement>('.link-actions');
    const path = this.root.querySelector<SVGPathElement>(
      `[data-link="${CSS.escape(this.ctx.ui.canvas.linkSelection ?? '')}"] .link-line`,
    );
    if (!button || !path) return;
    const middle = path.getPointAtLength(path.getTotalLength() / 2),
      matrix = path.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(middle.x, middle.y).matrixTransform(matrix);
    const chat = this.root.querySelector<HTMLElement>('.canvas-chat.docked');
    const left =
      chat && !this.chatHidden() && point.y < chat.getBoundingClientRect().bottom
        ? chat.getBoundingClientRect().right + 8
        : 12;
    button.style.left = Math.max(left, Math.min(innerWidth - 48, point.x - 16)) + 'px';
    button.style.top = Math.max(70, Math.min(innerHeight - 48, point.y + 18)) + 'px';
  }
  private paintCableLabels(): void {
    const svg = this.root.querySelector('.canvas-links');
    if (!svg) return;
    const measured = Array.from(svg.querySelectorAll<SVGGElement>('[data-link]'), (group) => {
      const path = group.querySelector<SVGPathElement>('.link-line'),
        text = group.querySelector<SVGTextElement>('.cable-label');
      if (!path || !text) return null;
      const length = path.getTotalLength(),
        middle = path.getPointAtLength(length / 2);
      return {
        group,
        text,
        middle,
        bounds: path.getBBox(),
        textWidth: text.getComputedTextLength(),
      };
    });
    for (const item of measured) {
      if (!item) continue;
      const { group, text, middle, bounds, textWidth } = item;
      text.setAttribute('x', String(middle.x));
      text.setAttribute('y', String(middle.y));
      // Una etiqueta horizontal sigue siendo legible incluso en cables verticales.
      const zoom = this.cam.current.z;
      const cut = group.querySelector<SVGRectElement>('.label-cut'),
        width = textWidth + 12 / zoom;
      if (cut) {
        cut.setAttribute('x', String(middle.x - width / 2));
        cut.setAttribute('y', String(middle.y - 10 / zoom));
        cut.setAttribute('width', String(width));
        cut.setAttribute('height', String(20 / zoom));
      }
      const mask = group.querySelector('mask'),
        base = group.querySelector('.mask-base');
      if (mask && base) {
        // La región predeterminada depende del viewport SVG (1 × 1), no del cable.
        const margin = 16 / zoom;
        const region = {
          x: bounds.x - margin,
          y: bounds.y - margin,
          width: Math.max(1, bounds.width) + margin * 2,
          height: Math.max(1, bounds.height) + margin * 2,
        };
        for (const [name, value] of Object.entries(region)) {
          mask.setAttribute(name, String(value));
          base.setAttribute(name, String(value));
        }
      }
    }
  }
  private paintSelection(): void {
    const w = this.ctx.world(),
      ui = this.ctx.ui;
    this.root.dataset.canvasPanel = ui.canvas.zoneSelection
      ? 'inspector'
      : this.revision || this.reviewCamera
        ? 'proposal'
        : '';
    const obscured = String(this.chatHidden());
    if (this.root.dataset.chatObscured !== obscured) {
      this.root.dataset.chatObscured = obscured;
      this.renderDock();
    }
    // Mantener el material conserva el destino del doble clic y la captura del puntero.
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((element) => {
      const node = w.nodes.find((n) => n.id === element.dataset.node);
      if (!node) return;
      const selected = ui.canvas.selections.includes(node.id);
      element.classList.toggle('selected', selected);
      const handles = element.querySelectorAll('.resize-handle');
      if (selected && ui.canvas.tool === 'select') {
        if (!handles.length)
          element.insertAdjacentHTML('beforeend', resizeHandles('node', node.id));
      } else handles.forEach((handle) => handle.remove());
    });
    this.root.querySelectorAll<HTMLElement>('[data-zone]').forEach((element) => {
      const zone = w.zones.find((z) => z.id === element.dataset.zone);
      if (zone) element.classList.toggle('selected', zone.id === ui.canvas.zoneSelection);
    });
    this.paintLinks();
    const holder = this.root.querySelector('#selection-actions'),
      node = w.nodes.find((n) => n.id === ui.canvas.selection && !n.owner),
      zone = w.zones.find((z) => z.id === ui.canvas.zoneSelection);
    if (!holder) return;
    if (node) holder.innerHTML = '';
    else if (zone) {
      const agent = w.agents.find((a) => a.id === zone.agent),
        materials = w.nodes.filter((n) => n.owner === zone.agent && !!zone.agent);
      holder.innerHTML = `<aside class="zone-inspector" aria-label="Inspector de zona"><div class="inspector-head"><span>${icon('zone', 15)}<label class="zone-name-label" for="zone-name">Zona</label></span><div>${btn('zone-delete', 'trash', 'Eliminar zona', `data-id="${zone.id}"`)}${btn('inspector-close', 'close', 'Cerrar panel de zona')}</div></div><input id="zone-name" aria-label="Nombre de la zona" placeholder="Zona sin nombre" value="${html(zone.name)}"><label for="zone-agent">Agente asignado</label><select id="zone-agent" aria-label="Agente de la zona"><option value="">Elegir agente…</option>${w.agents
        .filter((a) => !a.templateId || a.id === zone.agent)
        .map(
          (a) =>
            `<option value="${a.id}" ${zone.agent === a.id ? 'selected' : ''}>${html(a.name)}</option>`,
        )
        .join('')}</select>${
        agent
          ? `<p class="zone-role">${html(agent.role)}</p><label for="zone-instruction">Instrucción</label><textarea id="zone-instruction" rows="3">${html(zone.instruction ?? '')}</textarea><h4>Actividad</h4>${w.assignments
              .filter((a) => a.agent === agent.id)
              .map(
                (a) =>
                  `<p class="zone-activity"><strong>${html(
                    w.nodes.find((n) => n.id === a.node)
                      ? nodeTitle(
                          w,
                          w.nodes.find((n) => n.id === a.node)!,
                        )
                      : 'Material no disponible',
                  )}</strong><span class="zone-job-state">${a.phase === 'working' ? 'Procesando' : a.phase === 'interrupted' ? 'Interrumpido' : 'Propuesta lista para revisar'} · ${html(a.instruction || 'Organizar el material')}</span> ${a.phase !== 'working' ? `<button type="button" data-action="proposal-reveal" data-id="${a.id}">Revisar propuesta</button>` : ''}</p>`,
              )
              .join('')}<h4>Memoria fijada</h4>${agent.memory
              .slice(0, 3)
              .map((m) => `<p class="zone-memory">${icon('pin', 11)}${html(m)}</p>`)
              .join(
                '',
              )}<h4>Materiales · ${materials.length}</h4>${materials.map((n) => `<div class="zone-resource"><span title="${html(nodeTitle(w, n))}">${html(nodeTitle(w, n))}</span><button type="button" data-action="zone-return" data-id="${n.id}" aria-label="Devolver ${html(nodeTitle(w, n))} al Canvas">Devolver</button></div>`).join('')}<div class="zone-actions"><button type="button" data-action="zone-talk" data-id="${zone.id}">${icon('agents', 14)}Ver agente</button><button type="button" data-action="zone-unbind" data-id="${zone.id}" aria-label="Quitar agente y devolver materiales">${icon('unplug', 14)}Retirar agente</button><small>Retirar al agente devuelve sus materiales al Canvas.</small></div>`
          : ''
      }</aside>`;
    } else if (ui.canvas.linkSelection) {
      holder.innerHTML = `<div class="link-actions">${btn('link-delete', 'trash', 'Eliminar conexión', `data-id="${ui.canvas.linkSelection}"`)}</div>`;
      this.positionLinkActions();
    } else holder.innerHTML = '';
  }
  private clampDock(avoidChat = false): void {
    if (!this.dock) return;
    const rect = this.root.querySelector('.canvas-tools')?.getBoundingClientRect() ?? {
      width: Math.min(306, innerWidth - 24),
      height: 48,
    };
    const chat = this.root.querySelector<HTMLElement>('.canvas-chat.docked');
    const chatBottom = chat ? 59 + chat.offsetHeight : 0;
    const left =
      avoidChat && chat && !this.chatHidden() && this.dock.y < chatBottom + 12
        ? chat.offsetWidth
        : 0;
    this.dock = bound(
      this.dock,
      rect,
      { x: left, y: 59, width: innerWidth - left, height: innerHeight - 59 },
      Math.max(
        0,
        Math.min(12, (innerWidth - left - rect.width) / 2, (innerHeight - 59 - rect.height) / 2),
      ),
    );
    const id = this.revision ?? (this.reviewCamera ? this.framedProposal : null);
    const proposal = id
      ? this.root.querySelector<HTMLElement>(`[data-proposal="${CSS.escape(id)}"]`)
      : null;
    const job = this.ctx.world().assignments.find((assignment) => assignment.id === id);
    if (avoidChat && proposal && job) {
      const camera = this.cam.destination,
        stage = this.rect(),
        scale = Math.min(1, camera.z),
        x = stage.left + stage.width / 2 + camera.x + job.position.x * camera.z,
        y = stage.top + stage.height / 2 + camera.y + job.position.y * camera.z,
        width = proposal.offsetWidth * scale,
        height = proposal.offsetHeight * scale;
      if (
        this.dock.x < x + width + 12 &&
        this.dock.x + rect.width > x - 12 &&
        this.dock.y < y + height + 12 &&
        this.dock.y + rect.height > y - 12
      )
        this.dock.y = innerHeight - rect.height - 12;
    }
  }
  private chatHidden(panel = this.root.dataset.canvasPanel ?? ''): boolean {
    const mode = this.ctx.ui.chat.chatMode;
    if (!panel || mode === 'closed') return false;
    if (mode === 'quick') return true;
    const job = this.ctx
      .world()
      .assignments.find((a) => a.id === (this.revision ?? this.framedProposal));
    const width = panel === 'inspector' ? 270 : (job?.output?.length ?? 1) > 1 ? 560 : 320;
    return innerWidth - Math.min(310, innerWidth - 76) < width + 48;
  }
  private referenceTrigger(): HTMLElement | null {
    const direct = this.root.querySelector<HTMLElement>('.canvas-tools [data-action=references]');
    return direct?.offsetWidth
      ? direct
      : this.root.querySelector<HTMLElement>('.canvas-tools [data-action=dock-more]');
  }
  private referenceMarkup(): string {
    if (!this.referenceMenu) return '';
    const world = this.ctx.world();
    const item = (action: string, symbol: string, name: string, attributes = ''): string =>
      `<button type="button" data-action="${action}" title="${html(name)}" ${attributes}>${icon(symbol, 14)}<span>${html(name)}</span></button>`;
    return `<div class="reference-menu" id="canvas-material-picker" role="dialog" aria-label="Incorporar materiales">${item('canvas-import', 'image', 'Importar archivos locales')}${item('canvas-examples', 'image', 'Cargar ejemplos multimedia')}${item('canvas-link', 'link', 'Agregar enlace')}${world.docs.map((doc) => item('reference-add', 'docs', doc.title, `data-kind="document" data-id="${doc.id}"`)).join('')}${world.files.map((file) => item('reference-add', 'code', file.name, `data-kind="file" data-id="${file.id}"`)).join('')}${world.tasks.map((task) => item('reference-add', 'board', task.title, `data-kind="task" data-id="${task.id}"`)).join('')}</div>`;
  }
  private positionReferenceMenu(): void {
    const menu = this.root.querySelector<HTMLElement>('.reference-menu');
    const trigger = this.referenceTrigger();
    const dock = this.root.querySelector<HTMLElement>('.canvas-tools');
    if (!menu || !trigger || !dock) return;
    const bounds = dock.getBoundingClientRect(),
      origin = trigger.getBoundingClientRect();
    const width = Math.min(256, innerWidth - 24);
    menu.style.width = width + 'px';
    const leftSpace = bounds.left - 20,
      rightSpace = innerWidth - bounds.right - 20;
    const sideways =
      dock.classList.contains('vertical-tools') &&
      Math.max(leftSpace, rightSpace) >= Math.min(220, width);
    const aboveSpace = bounds.top - 78,
      belowSpace = innerHeight - bounds.bottom - 20;
    const above = aboveSpace >= belowSpace;
    menu.style.maxHeight =
      Math.max(36, Math.min(320, sideways ? innerHeight - 82 : above ? aboveSpace : belowSpace)) +
      'px';
    let left: number, top: number;
    if (sideways) {
      const before = leftSpace >= Math.min(220, width);
      menu.style.width = Math.min(width, before ? leftSpace : rightSpace) + 'px';
      left = before ? bounds.left - menu.offsetWidth - 8 : bounds.right + 8;
      top = origin.bottom - menu.offsetHeight;
    } else {
      left = origin.right - menu.offsetWidth;
      top = above ? bounds.top - menu.offsetHeight - 8 : bounds.bottom + 8;
    }
    Object.assign(menu.style, {
      left: Math.max(12, Math.min(innerWidth - menu.offsetWidth - 12, left)) + 'px',
      top: Math.max(70, Math.min(innerHeight - menu.offsetHeight - 12, top)) + 'px',
    });
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', 'canvas-material-picker');
    trigger.setAttribute('aria-haspopup', 'dialog');
  }
  private renderDock(): void {
    const previous = this.dock
      ? this.root.querySelector('.canvas-tools')?.getBoundingClientRect()
      : null;
    this.clampDock();
    const { ctx } = this,
      w = ctx.world(),
      holder = this.root.querySelector('#canvas-dock-host');
    if (!holder) return;
    const tools = (
      [
        ['select', 'select', 'Seleccionar'],
        ['hand', 'hand', 'Panear'],
        ['note', 'note', 'Crear nota'],
      ] as const
    )
      .map(([tool, ico, label]) =>
        btn(
          'canvas-tool',
          ico,
          label + (ctx.ui.shortcuts[tool] ? ' · ' + ctx.ui.shortcuts[tool] : ''),
          `data-tool="${tool}"`,
          ctx.ui.canvas.tool === tool && !this.shapesOpen,
        ),
      )
      .join('');
    holder.innerHTML = `<div class="canvas-tools" role="toolbar" aria-label="Herramientas de Canvas" style="${this.dock ? `left:${this.dock.x}px;top:${this.dock.y}px;bottom:auto;transform:none` : ''}"><span class="dock-grip" data-action="dock-grip">${icon('grip', 14)}</span>${tools}${btn('canvas-tool', 'draw', 'Dibujar', 'data-tool="drawing"', ctx.ui.canvas.tool === 'drawing')}<div class="shape-picker dock-extra">${btn('shapes', 'shapes', 'Formas', `aria-expanded="${this.shapesOpen}"`, this.shapesOpen || shapeTools.includes(ctx.ui.canvas.tool as Shape))}${this.shapesOpen ? `<div class="shape-menu">${shapeTools.map((shape) => btn('canvas-tool', shape, { rectangle: 'Rectángulo', ellipse: 'Elipse', triangle: 'Triángulo', star: 'Estrella' }[shape], `data-tool="${shape}"`, ctx.ui.canvas.tool === shape)).join('')}</div>` : ''}</div>${btn('canvas-tool', 'link', 'Conectar' + (ctx.ui.shortcuts.connect ? ' · ' + ctx.ui.shortcuts.connect : ''), 'data-tool="connect" data-dock-secondary', ctx.ui.canvas.tool === 'connect')}${btn('canvas-comment', 'bubble', 'Comentar' + (ctx.ui.shortcuts.comment ? ' · ' + ctx.ui.shortcuts.comment : ''), 'data-dock-secondary', ctx.ui.canvas.tool === 'comment')}${btn('canvas-tool', 'zone', 'Dibujar zona', 'data-tool="zone" data-dock-secondary', ctx.ui.canvas.tool === 'zone')}${btn('references', 'plus', 'Incorporar materiales', `data-dock-secondary aria-haspopup="dialog" aria-expanded="${this.referenceMenu}" aria-controls="canvas-material-picker"`)}${btn('dock-more', 'more', 'Más herramientas', `aria-haspopup="menu" aria-expanded="${this.dockMore}"`)}</div><button type="button" class="chat-launch" data-action="chat-open" aria-label="Quick Chat" data-tip="Quick Chat">${icon('conversation', 20)}</button>${this.referenceMarkup()}`;
    const selected = w.nodes.find((n) => n.id === ctx.ui.canvas.selection);
    if (
      ctx.ui.canvas.tool === 'drawing' ||
      shapeTools.includes(ctx.ui.canvas.tool as Shape) ||
      selected?.data.kind === 'shape' ||
      selected?.data.kind === 'drawing'
    ) {
      const shape =
        selected?.data.kind === 'shape' || shapeTools.includes(ctx.ui.canvas.tool as Shape);
      holder.insertAdjacentHTML(
        'beforeend',
        `<div class="canvas-style" aria-label="Estilo de dibujo y formas"><label>Color<input type="color" id="draw-color" value="${ctx.ui.canvas.color}"></label>${strokePicker(ctx.ui.canvas.thickness)}${shape ? `<label>Borde<input type="color" id="shape-border" value="${ctx.ui.canvas.stroke}"></label><label><input type="checkbox" id="shape-fill" ${ctx.ui.canvas.fill ? 'checked' : ''}>Relleno</label>` : ''}</div>`,
      );
    }
    const dock = holder.querySelector<HTMLElement>('.canvas-tools')!;
    const hiddenChat = this.chatHidden();
    const docked = ctx.ui.chat.chatMode === 'docked' && !ctx.ui.chat.chatCompact && !hiddenChat;
    const chatWidth = docked ? Math.min(310, innerWidth - 76) : 0;
    const available = innerWidth - chatWidth;
    const compact = available < dock.scrollWidth + 24;
    dock.classList.toggle('compact-tools', compact);
    const vertical = available < dock.scrollWidth + 24;
    dock.classList.toggle('vertical-tools', vertical);
    if (!this.dock) {
      dock.style.left = vertical ? 'auto' : `${innerWidth / 2}px`;
      dock.style.right = vertical ? '12px' : 'auto';
      dock.style.top = vertical ? `${59 + (innerHeight - 59) / 2}px` : 'auto';
      dock.style.bottom = vertical ? 'auto' : '23px';
      dock.style.transform = vertical ? 'translateY(-50%)' : 'translateX(-50%)';
      const initial = dock.getBoundingClientRect();
      this.dock = { x: initial.x, y: initial.y };
      dock.style.left = `${this.dock.x}px`;
      dock.style.top = `${this.dock.y}px`;
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
      dock.style.transform = 'none';
    }
    this.clampDock(true);
    if (this.dock) {
      dock.style.left = `${this.dock.x}px`;
      dock.style.top = `${this.dock.y}px`;
    }
    if (this.dockMore && compact) {
      const item = (action: string, symbol: string, label: string, attributes = ''): string =>
        `<button type="button" role="menuitem" data-action="${action}" ${attributes}>${icon(symbol, 16)}<span>${html(label)}</span></button>`;
      holder.insertAdjacentHTML(
        'beforeend',
        `<div class="dock-more-menu" role="menu" aria-label="Más herramientas de Canvas">${shapeTools.map((shape) => item('canvas-tool', shape, { rectangle: 'Rectángulo', ellipse: 'Elipse', triangle: 'Triángulo', star: 'Estrella' }[shape], `data-tool="${shape}"`)).join('')}${item('canvas-tool', 'link', 'Conectar' + (ctx.ui.shortcuts.connect ? ' · ' + ctx.ui.shortcuts.connect : ''), 'data-tool="connect"')}${item('canvas-comment', 'bubble', 'Comentar' + (ctx.ui.shortcuts.comment ? ' · ' + ctx.ui.shortcuts.comment : ''))}${item('canvas-tool', 'zone', 'Dibujar zona', 'data-tool="zone"')}${item('references', 'plus', 'Incorporar materiales')}</div>`,
      );
      const menu = holder.querySelector<HTMLElement>('.dock-more-menu')!,
        bounds = dock.getBoundingClientRect();
      menu.style.left = `${Math.max(12, Math.min(innerWidth - menu.offsetWidth - 12, vertical ? bounds.left - menu.offsetWidth - 8 : bounds.left + bounds.width / 2 - menu.offsetWidth / 2))}px`;
      menu.style.top = `${Math.max(70, Math.min(innerHeight - menu.offsetHeight - 12, vertical ? bounds.top : bounds.top - menu.offsetHeight - 8))}px`;
    } else this.dockMore = false;
    const style = holder.querySelector<HTMLElement>('.canvas-style');
    if (style) {
      const chosenTrigger = dock.querySelector<HTMLElement>(
        shapeTools.includes(ctx.ui.canvas.tool as Shape) || selected?.data.kind === 'shape'
          ? '[data-action=shapes]'
          : '[data-tool=drawing]',
      );
      const trigger = chosenTrigger?.offsetWidth
        ? chosenTrigger
        : dock.querySelector<HTMLElement>('[data-action=dock-more]')!;
      const origin = trigger.getBoundingClientRect();
      const left = Math.max(
        12,
        Math.min(
          innerWidth - style.offsetWidth - 12,
          origin.x + origin.width / 2 - style.offsetWidth / 2,
        ),
      );
      const above = origin.top - style.offsetHeight - 12 >= 70;
      Object.assign(style.style, {
        left: left + 'px',
        top:
          Math.max(
            70,
            Math.min(
              innerHeight - style.offsetHeight - 12,
              above ? origin.top - style.offsetHeight - 12 : origin.bottom + 12,
            ),
          ) + 'px',
        bottom: 'auto',
        transform: 'none',
      });
      style.classList.toggle('below', !above);
      style.style.setProperty(
        '--style-pointer',
        Math.max(16, Math.min(style.offsetWidth - 16, origin.x + origin.width / 2 - left)) + 'px',
      );
    }
    this.positionReferenceMenu();
    if (this.dock && previous && !reducedMotion()) {
      const current = dock.getBoundingClientRect();
      if (Math.hypot(previous.x - current.x, previous.y - current.y) > 1)
        for (const panel of [dock, holder.querySelector<HTMLElement>('.reference-menu')].filter(
          (element): element is HTMLElement => !!element,
        ))
          panel.animate(
            [
              { translate: `${previous.x - current.x}px ${previous.y - current.y}px` },
              { translate: '0px 0px' },
            ],
            { duration: motion.panelOpenMs, easing: motion.panelEase },
          );
    }
  }
  render(): void {
    const restoreFocus = preserveFocus(this.root);
    const w = this.ctx.world(),
      plane = this.root.querySelector('#canvas-plane');
    const heights = new Map(
      Array.from(this.root.querySelectorAll<HTMLElement>('[data-proposal]'), (el) => [
        el.dataset.proposal!,
        {
          decision: el.querySelector<HTMLElement>('.proposal-decision')?.offsetHeight ?? 0,
          preview: el.querySelector<HTMLElement>('.proposal-preview')?.offsetHeight ?? 0,
        },
      ]),
    );
    this.proposalMotions.forEach((animation) => animation.cancel());
    this.proposalMotions.clear();
    if (!plane) return;
    const players = new Map(
      Array.from(
        plane.querySelectorAll<HTMLVideoElement>('[data-node] video'),
        (video) => [video.closest<HTMLElement>('[data-node]')!.dataset.node!, video] as const,
      ),
    );
    this.root.dataset.tool = this.ctx.ui.canvas.tool;
    // El progreso de un agente puede repintar la vista mientras se consulta un grupo.
    // Conservar su estado por zona y tipo mantiene la consulta abierta.
    const groupKey = (element: HTMLDetailsElement): string =>
      `${element.closest<HTMLElement>('[data-zone]')?.dataset.zone ?? ''}:${element.dataset.materialType ?? 'summary'}`;
    const expanded = new Set(
      Array.from(
        plane.querySelectorAll<HTMLDetailsElement>('.zone-materials details[open]'),
        groupKey,
      ),
    );
    const positions = new Map(
      Array.from(
        plane.querySelectorAll<HTMLElement>('.zone-materials'),
        (element) =>
          [
            element.closest<HTMLElement>('[data-zone]')?.dataset.zone ?? '',
            element.scrollTop,
          ] as const,
      ),
    );
    plane.innerHTML = `<svg class="canvas-links" width="1" height="1"></svg>${w.zones.map((z) => zoneMarkup(w, z, z.id === this.ctx.ui.canvas.zoneSelection)).join('')}${w.nodes
      .filter((n) => !n.owner)
      .map((n) =>
        materialMarkup(
          w,
          n,
          this.ctx.ui.canvas.selections.includes(n.id),
          this.ctx.ui.canvas.tool === 'connect' || !!this.ctx.ui.canvas.linkSelection,
          this.ctx.ui.canvas.tool === 'select',
        ),
      )
      .join('')}${w.assignments
      .filter((a) => a.phase !== 'working')
      .map((a) =>
        proposalMarkup(
          this.ctx,
          a,
          this.revision === a.id,
          this.revision === a.id || (!!this.reviewCamera && this.framedProposal === a.id),
        ),
      )
      .join('')}`;
    plane.querySelectorAll<HTMLVideoElement>('[data-node] video').forEach((video) => {
      const id = video.closest<HTMLElement>('[data-node]')!.dataset.node!,
        previous = players.get(id);
      if (previous && previous.dataset.asset === video.dataset.asset) {
        video.replaceWith(previous);
        players.delete(id);
      }
    });
    players.forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    plane.querySelectorAll<HTMLDetailsElement>('.zone-materials details').forEach((element) => {
      element.open = expanded.has(groupKey(element));
    });
    plane.querySelectorAll<HTMLElement>('.zone-materials').forEach((element) => {
      element.scrollTop =
        positions.get(element.closest<HTMLElement>('[data-zone]')?.dataset.zone ?? '') ?? 0;
    });
    const camera = this.cam.current;
    (plane as HTMLElement).style.transform =
      `translate(${camera.x}px,${camera.y}px) scale(${camera.z})`;
    (plane as HTMLElement).style.setProperty('--canvas-zoom', String(camera.z));
    this.paintSelection();
    this.renderDock();
    this.chat.render();
    this.interactions.hydrate();
    if (!reducedMotion())
      plane.querySelectorAll<HTMLElement>('[data-proposal]').forEach((el) => {
        const previous = heights.get(el.dataset.proposal!),
          panel = el.querySelector<HTMLElement>('.proposal-decision'),
          height = panel?.offsetHeight ?? 0;
        if (panel && previous !== undefined && Math.abs(previous.decision - height) > 1) {
          const opening = height > previous.decision;
          const preview = el.querySelector<HTMLElement>('.proposal-preview');
          const previewHeight = preview?.offsetHeight ?? 0;
          const options = {
            duration: opening ? motion.panelOpenMs : motion.panelCloseMs,
            easing: motion.panelEase,
          };
          if (preview && Math.abs(previous.preview - previewHeight) > 1)
            this.proposalMotions.set(
              el.dataset.proposal! + ':preview',
              preview.animate(
                [
                  { height: previous.preview + 'px', flex: '0 0 auto' },
                  { height: previewHeight + 'px', flex: '0 0 auto' },
                ],
                options,
              ),
            );
          this.proposalMotions.set(
            el.dataset.proposal!,
            panel.animate(
              [{ height: previous.decision + 'px' }, { height: height + 'px' }],
              options,
            ),
          );
        }
      });
    restoreFocus();
  }
  dispose(): void {
    this.proposalMotions.forEach((animation) => animation.cancel());
    this.abort.abort();
    this.chat.dispose();
    this.interactions.dispose();
    this.cam.dispose();
    if (this.ctx.camera === this.cam) this.ctx.camera = null;
  }
}
