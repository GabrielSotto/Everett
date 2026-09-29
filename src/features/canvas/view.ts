import type { Context, Tool } from '../../app/context';
import {
  materialRoute,
  type Material,
  type Point,
  type Rect,
  type Reference,
  type Anchor,
  type Shape,
} from '../../domain/model';
import { drawRect, anchorPoint, linkPath } from '../../domain/geometry';
import { html, target, value, type View } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { materialMarkup, zoneMarkup, connectionMarkup, shapeMarkup } from './materials';
import { CanvasChat } from '../chat/controller';
import { SpatialCamera } from '../../spatial/camera';
import { toWorld, bound } from '../../spatial/math';
import { bindDismiss } from '../../ui/popover';
import { trace, type Intent } from '../../app/diagnostics/trace';
import { colors } from './note-colors';
const shapeTools: Shape[] = ['rectangle', 'ellipse', 'triangle', 'star'];
type Corner = 'nw' | 'ne' | 'se' | 'sw';
type Drag =
  | { kind: 'pan' }
  | {
      kind: 'node' | 'zone';
      id: string;
      start: Point;
      origin: Point;
      point: Point;
      distance: number;
      intent: Intent;
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
  | { kind: 'draw'; tool: Tool; start: Point; point: Point; intent: Intent }
  | { kind: 'dock'; start: Point; origin: Point; intent: Intent }
  | { kind: 'connect'; node: string; anchor: Anchor; intent: Intent };

export class CanvasView implements View {
  private abort = new AbortController();
  private cam: SpatialCamera;
  private chat: CanvasChat;
  private drag: Drag | null = null;
  private dock: Point | null = null;
  private revision: string | null = null;
  private referenceMenu = false;
  private quickActions: string | null = null;
  private shapesOpen = false;
  private sequence = 0;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    root.innerHTML =
      '<section class="canvas-stage" id="canvas-stage"><div class="canvas-plane" id="canvas-plane"></div><div id="selection-actions"></div></section><div id="canvas-dock-host"></div><div class="chat-host" id="canvas-chat-host"></div>';
    this.cam = new SpatialCamera(ctx.store.get().camera, (camera) => {
      const plane = root.querySelector<HTMLElement>('#canvas-plane');
      if (plane) {
        plane.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.z})`;
        plane.style.setProperty('--canvas-zoom', String(camera.z));
      }
    });
    ctx.camera = this.cam;
    bindDismiss(
      this.abort.signal,
      () => this.referenceMenu || this.shapesOpen || this.quickActions !== null,
      () => {
        this.referenceMenu = false;
        this.shapesOpen = false;
        this.quickActions = null;
        this.renderDock();
        this.paintSelection();
      },
      '.reference-menu,.shape-menu,.quick-actions,[data-action=references],[data-action=shapes],[data-action=node-assign]',
    );
    this.chat = new CanvasChat(root.querySelector<HTMLElement>('#canvas-chat-host')!, ctx);
    root.addEventListener('pointerdown', (e) => this.down(e), { signal: this.abort.signal });
    root.addEventListener('pointermove', (e) => this.move(e), { signal: this.abort.signal });
    root.addEventListener('pointerup', (e) => this.up(e), { signal: this.abort.signal });
    root.addEventListener('pointercancel', () => this.cancel(), { signal: this.abort.signal });
    root.addEventListener('click', (e) => this.click(e), { signal: this.abort.signal });
    root.addEventListener(
      'dblclick',
      (e) => {
        const element =
          e.target instanceof Element ? e.target.closest<HTMLElement>('[data-node]') : null;
        if (element) this.open(element.dataset.node ?? '');
      },
      { signal: this.abort.signal },
    );
    root.addEventListener('submit', (e) => this.submit(e), { signal: this.abort.signal });
    root.addEventListener(
      'change',
      (e) => {
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
  private rect(): DOMRect {
    return this.root.querySelector('#canvas-stage')!.getBoundingClientRect();
  }
  private point(e: PointerEvent): Point {
    return toWorld({ x: e.clientX, y: e.clientY }, this.cam.current, this.rect());
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
  private select(kind: 'node' | 'zone' | 'link' | null, id: string | null): void {
    this.ctx.ui.canvas.selection = kind === 'node' ? id : null;
    this.ctx.ui.canvas.zoneSelection = kind === 'zone' ? id : null;
    this.ctx.ui.canvas.linkSelection = kind === 'link' ? id : null;
  }
  private down(e: PointerEvent): void {
    if (!(e.target instanceof Element) || e.button !== 0) return;
    const target = e.target,
      ui = this.ctx.ui;
    if (target.closest('.canvas-chat,.zone-inspector,.quick-actions,.zone-materials details'))
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
    this.root.setPointerCapture(e.pointerId);
    if (
      shapeTools.includes(ui.canvas.tool as Shape) ||
      ui.canvas.tool === 'zone' ||
      ui.canvas.tool === 'note'
    ) {
      this.drag = {
        kind: 'draw',
        tool: ui.canvas.tool,
        start: point,
        point,
        intent: trace.intent('dibujar', 'DRAW-01'),
      };
    } else if (ui.canvas.tool === 'hand' || (!nodeId && !zoneId)) {
      this.select(null, null);
      this.paintSelection();
      this.drag = { kind: 'pan' };
      this.cam.start({ x: e.clientX, y: e.clientY });
      this.root.classList.add('panning');
      this.root.style.cursor = 'grabbing';
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
      this.select(kind, id);
      this.drag = {
        kind,
        id,
        start: point,
        origin: { x: original.x, y: original.y },
        point: { x: original.x, y: original.y },
        distance: 0,
        intent: trace.intent('mover ' + kind, 'DRAG-02'),
      };
      this.paintSelection();
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
      return;
    }
    const point = this.point(e);
    if (d.kind === 'connect') {
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
      const element = this.root.querySelector<HTMLElement>(`[data-${d.entity}="${d.id}"]`);
      if (element) this.applyRect(element, d.rect);
      return;
    }
    if (d.kind === 'node' || d.kind === 'zone') {
      d.point = { x: d.origin.x + point.x - d.start.x, y: d.origin.y + point.y - d.start.y };
      d.distance = Math.hypot(point.x - d.start.x, point.y - d.start.y);
      const element = this.root.querySelector<HTMLElement>(`[data-${d.kind}="${d.id}"]`);
      if (element) {
        element.style.left = d.point.x + 'px';
        element.style.top = d.point.y + 'px';
      }
      if (d.kind === 'node') {
        this.paintLinks({ id: d.id, point: d.point });
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
    let preview = this.root.querySelector<HTMLElement>('.draw-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'draw-preview ' + d.tool;
      this.root.querySelector('#canvas-plane')?.append(preview);
    }
    this.applyRect(preview, drawRect(d.start, d.point));
    if (shapeTools.includes(d.tool as Shape))
      preview.innerHTML = shapeMarkup({
        id: '',
        ...drawRect(d.start, d.point),
        owner: null,
        data: { kind: 'shape', shape: d.tool as Shape, color: '#d6dbea' },
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
  private up(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.root.classList.remove('panning');
    this.root.style.removeProperty('cursor');
    if (this.root.hasPointerCapture(e.pointerId)) this.root.releasePointerCapture(e.pointerId);
    const w = this.ctx.world();
    if (d.kind === 'pan') {
      this.cam.stop();
      this.ctx.act({ type: 'camera', camera: this.cam.current }, 'panear', 'DRAG-02');
      return;
    }
    if (d.kind === 'dock') {
      trace.add('drag.finished', { component: 'canvas-tools', position: this.dock }, d.intent);
      return;
    }
    if (d.kind === 'connect') {
      this.root.querySelector('.pending-link')?.remove();
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
      if (d.kind === 'node' && d.distance > 1 && chat) {
        this.chat.reference(d.id);
        this.render();
        return;
      }
      if (d.distance > 1) {
        if (d.kind === 'node') {
          this.ctx.act(
            { type: 'node.move', world: w.id, id: d.id, point: d.point },
            'mover material',
            'DRAG-02',
            'pointer',
            d.intent.interaction,
          );
          const point = this.point(e),
            zone = w.zones.find(
              (z) =>
                z.agent &&
                point.x > z.x &&
                point.x < z.x + z.width &&
                point.y > z.y &&
                point.y < z.y + z.height,
            );
          if (zone?.agent) this.assign(d.id, zone.agent, '', d.origin);
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
      } else this.paintSelection();
      return;
    }
    if (d.kind !== 'draw') return;
    const rect = drawRect(d.start, d.point),
      id = this.nextId();
    if (d.tool === 'zone') {
      this.ctx.act(
        { type: 'zone.create', world: w.id, zone: { id, ...rect, name: 'Zona', agent: null } },
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
            : { kind: 'shape', shape: d.tool as Shape, color: '#d6dbea' },
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
    this.ctx.ui.canvas.tool = 'select';
    this.render();
  }
  private cancel(): void {
    this.drag = null;
    this.ctx.ui.canvas.linkStart = null;
    this.cam.stop();
    this.root.classList.remove('panning');
    this.root.style.removeProperty('cursor');
    this.render();
  }
  private connect(from: string, fromAnchor: Anchor, to: string, toAnchor: Anchor): void {
    this.ctx.act(
      { type: 'link.create', world: this.ctx.world().id, from, to, fromAnchor, toAnchor },
      'conectar anclajes',
      'LINK-01',
    );
    this.ctx.ui.canvas.linkStart = null;
    this.render();
  }
  private assign(node: string, agent: string, instruction = '', returnTo?: Point): void {
    const world = this.ctx.world().id;
    if (
      this.ctx.act(
        { type: 'assign', world, node, agent, instruction, ...(returnTo ? { returnTo } : {}) },
        'asignar material',
        'OWNER-01',
      )
    ) {
      const job = this.ctx.world().assignments.at(-1);
      if (job) this.ctx.service.process(world, job.id);
    }
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
        this.ctx.act(
          { type: 'assignment.revise', world: this.ctx.world().id, id, text },
          'pedir cambios',
          'OWNER-01',
        );
        this.ctx.service.process(this.ctx.world().id, id);
      }
    } else if (form.id === 'new-comment-form' && this.ctx.ui.canvas.selection) {
      e.preventDefault();
      this.ctx.act(
        {
          type: 'comment',
          world: this.ctx.world().id,
          node: this.ctx.ui.canvas.selection,
          text: value(this.root, '#new-comment'),
        },
        'comentar material',
        'COMMENT-01',
      );
    }
  }
  private click(e: MouseEvent): void {
    const t = target(e);
    if (!t || t.closest('.canvas-chat')) return;
    const { ctx } = this,
      w = ctx.world(),
      id = t.dataset.id ?? '';
    switch (t.dataset.action) {
      case 'canvas-tool': {
        const tool = t.dataset.tool;
        const all: Tool[] = ['select', 'hand', 'note', ...shapeTools, 'zone', 'connect'];
        if (all.includes(tool as Tool)) {
          ctx.ui.canvas.tool = tool as Tool;
          ctx.ui.canvas.linkStart = null;
          this.shapesOpen = false;
          this.render();
        }
        break;
      }
      case 'shapes':
        this.shapesOpen = !this.shapesOpen;
        this.referenceMenu = false;
        this.renderDock();
        break;
      case 'chat-open':
        ctx.ui.chat.chatMode = 'quick';
        ctx.ui.chat.chatPosition = { x: innerWidth - 335, y: innerHeight - 395 };
        this.chat.render();
        break;
      case 'node-open':
        this.open(id);
        break;
      case 'node-assign':
        this.quickActions = this.quickActions === id ? null : id;
        this.paintSelection();
        break;
      case 'quick-assign': {
        const agent = value(this.root, '#quick-agent');
        const instruction = t.dataset.instruction ?? '';
        if (agent && this.quickActions) {
          const node = this.quickActions;
          this.quickActions = null;
          this.assign(node, agent, instruction);
        }
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
      case 'node-delete':
        ctx.act({ type: 'node.delete', world: w.id, id }, 'eliminar material', 'CANVAS-01');
        this.select(null, null);
        this.render();
        break;
      case 'zone-delete':
        ctx.service.cancelZone(w.id, id);
        ctx.act({ type: 'zone.delete', world: w.id, id }, 'eliminar zona', 'ZONE-01');
        this.select(null, null);
        this.render();
        break;
      case 'node-comment':
        this.root
          .querySelector('#selection-actions')
          ?.insertAdjacentHTML(
            'beforeend',
            '<form id="new-comment-form" class="comment-compose"><input id="new-comment" placeholder="Comentario…" aria-label="Nuevo comentario"><button type="submit" class="icon-button" aria-label="Guardar comentario">' +
              icon('up', 14) +
              '</button></form>',
          );
        this.root.querySelector<HTMLInputElement>('#new-comment')?.focus();
        break;
      case 'select-link':
        this.select('link', id);
        this.paintSelection();
        break;
      case 'link-delete':
        ctx.act({ type: 'link.delete', world: w.id, id }, 'eliminar conexión', 'LINK-01');
        this.select(null, null);
        this.render();
        break;
      case 'assignment-accept':
      case 'assignment-reject':
      case 'assignment-cancel':
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
        this.root.querySelector<HTMLTextAreaElement>('[data-revision] textarea')?.focus();
        break;
      case 'revision-cancel':
        this.revision = null;
        this.render();
        break;
      case 'references':
        this.referenceMenu = !this.referenceMenu;
        this.shapesOpen = false;
        this.renderDock();
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
  private paintLinks(preview?: { id: string; point: Point }): void {
    const svg = this.root.querySelector('.canvas-links');
    if (!svg) return;
    const w = this.ctx.world();
    svg.innerHTML = w.links
      .map((link) =>
        connectionMarkup(link, w, link.id === this.ctx.ui.canvas.linkSelection, preview),
      )
      .join('');
  }
  private paintSelection(): void {
    const w = this.ctx.world(),
      ui = this.ctx.ui;
    // El reemplazo del material ocurre al seleccionarlo; la geometría del gesto se confirma al soltar.
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((element) => {
      const node = w.nodes.find((n) => n.id === element.dataset.node);
      if (node)
        element.outerHTML = materialMarkup(
          w,
          node,
          node.id === ui.canvas.selection,
          ui.canvas.tool === 'connect',
        );
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
    if (node)
      holder.innerHTML = `<div class="material-actions">${node.data.kind !== 'shape' ? btn('node-open', 'expand', 'Entrar al material', `data-id="${node.id}"`) : ''}${btn('node-assign', 'agents', 'Acciones del agente', `data-id="${node.id}"`)}${btn('node-comment', 'comment', 'Comentar', `data-id="${node.id}"`)}${btn('node-delete', 'trash', 'Eliminar material', `data-id="${node.id}"`)}</div>`;
    else if (zone) {
      const agent = w.agents.find((a) => a.id === zone.agent),
        materials = w.nodes.filter((n) => n.owner === zone.agent && !!zone.agent);
      holder.innerHTML = `<aside class="zone-inspector" aria-label="Inspector de zona"><div class="inspector-head"><span>${icon('zone', 15)}${html(agent?.name ?? 'Zona')}</span>${btn('zone-delete', 'trash', 'Eliminar zona', `data-id="${zone.id}"`)}</div><select id="zone-agent" aria-label="Agente de la zona"><option value="">Elegir agente…</option>${w.agents
        .filter((a) => !a.templateId || a.id === zone.agent)
        .map(
          (a) =>
            `<option value="${a.id}" ${zone.agent === a.id ? 'selected' : ''}>${html(a.name)}</option>`,
        )
        .join('')}</select>${
        agent
          ? `<p class="zone-role">${html(agent.role)}</p><h4>Memoria fijada</h4>${agent.memory
              .slice(0, 3)
              .map((m) => `<p class="zone-memory">${icon('pin', 11)}${html(m)}</p>`)
              .join(
                '',
              )}<h4>Materiales · ${materials.length}</h4>${materials.map((n) => `<div class="zone-resource">${icon('note', 13)}${html(n.data.kind === 'note' ? n.data.title || 'Sin título' : 'Material')}</div>`).join('')}<div class="zone-actions">${btn('zone-talk', 'agents', 'Ver agente', `data-id="${zone.id}"`)}${btn('zone-unbind', 'close', 'Quitar agente y devolver materiales', `data-id="${zone.id}"`)}</div>`
          : ''
      }</aside>`;
    } else if (ui.canvas.linkSelection)
      holder.innerHTML = `<div class="material-actions">${btn('link-delete', 'trash', 'Eliminar conexión', `data-id="${ui.canvas.linkSelection}"`)}</div>`;
    else holder.innerHTML = '';
    if (node && this.quickActions === node.id) {
      const agents = w.agents.filter((a) => w.zones.some((z) => z.agent === a.id));
      holder.insertAdjacentHTML(
        'beforeend',
        `<div class="quick-actions"><select id="quick-agent" aria-label="Agente para la acción">${agents.map((a) => `<option value="${a.id}">${html(a.name)}</option>`).join('')}</select>${agents.length ? ['Resumir', 'Analizar', 'Reorganizar'].map((instruction) => `<button type="button" data-action="quick-assign" data-instruction="${instruction}">${icon('agents', 13)}${instruction}</button>`).join('') : `<button type="button" data-action="canvas-tool" data-tool="zone">Crear una zona</button>`}</div>`,
      );
    }
  }
  private clampDock(): void {
    if (!this.dock) return;
    const rect = this.root.querySelector('.canvas-tools')?.getBoundingClientRect() ?? {
      width: Math.min(306, innerWidth - 24),
      height: 48,
    };
    this.dock = bound(this.dock, rect, {
      x: 0,
      y: 59,
      width: innerWidth,
      height: innerHeight - 59,
    });
  }
  private renderDock(): void {
    this.clampDock();
    const { ctx } = this,
      w = ctx.world(),
      holder = this.root.querySelector('#canvas-dock-host');
    if (!holder) return;
    const tools = (
      [
        ['select', 'select', 'Seleccionar · V'],
        ['hand', 'hand', 'Panear · H'],
        ['note', 'note', 'Crear nota · N'],
      ] as const
    )
      .map(([tool, ico, label]) =>
        btn('canvas-tool', ico, label, `data-tool="${tool}"`, ctx.ui.canvas.tool === tool),
      )
      .join('');
    holder.innerHTML = `<div class="canvas-tools" role="toolbar" aria-label="Herramientas de Canvas" style="${this.dock ? `left:${this.dock.x}px;top:${this.dock.y}px;bottom:auto;transform:none` : ''}"><span class="dock-grip" data-action="dock-grip">${icon('grip', 14)}</span>${tools}<div class="shape-picker">${btn('shapes', 'shapes', 'Formas', `aria-expanded="${this.shapesOpen}"`, shapeTools.includes(ctx.ui.canvas.tool as Shape))}${this.shapesOpen ? `<div class="shape-menu">${shapeTools.map((shape) => btn('canvas-tool', shape, { rectangle: 'Rectángulo', ellipse: 'Elipse', triangle: 'Triángulo', star: 'Estrella' }[shape], `data-tool="${shape}"`, ctx.ui.canvas.tool === shape)).join('')}</div>` : ''}</div>${btn('canvas-tool', 'link', 'Conectar · C', 'data-tool="connect"', ctx.ui.canvas.tool === 'connect')}${btn('canvas-tool', 'zone', 'Dibujar zona', 'data-tool="zone"', ctx.ui.canvas.tool === 'zone')}${btn('references', 'plus', 'Agregar referencia')}</div><button type="button" class="chat-launch" data-action="chat-open" aria-label="Quick Chat" data-tip="Quick Chat">${icon('session', 20)}</button>${this.referenceMenu ? `<div class="reference-menu">${w.docs.map((d) => `<button data-action="reference-add" data-kind="document" data-id="${d.id}">${icon('docs', 14)}${html(d.title)}</button>`).join('')}${w.files.map((f) => `<button data-action="reference-add" data-kind="file" data-id="${f.id}">${icon('code', 14)}${html(f.name)}</button>`).join('')}${w.tasks.map((t) => `<button data-action="reference-add" data-kind="task" data-id="${t.id}">${icon('board', 14)}${html(t.title)}</button>`).join('')}</div>` : ''}`;
    this.clampDock();
  }
  render(): void {
    const w = this.ctx.world(),
      plane = this.root.querySelector('#canvas-plane');
    if (!plane) return;
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
          n.id === this.ctx.ui.canvas.selection,
          this.ctx.ui.canvas.tool === 'connect',
        ),
      )
      .join('')}${w.assignments
      .filter((a) => a.phase === 'ready')
      .map(
        (a) =>
          `<article class="proposal" data-proposal="${a.id}" style="left:${a.position.x}px;top:${a.position.y}px"><p>${html(a.text)}</p>${this.revision === a.id ? `<form data-revision="${a.id}"><textarea aria-label="Cambios solicitados" placeholder="¿Qué ajustamos?"></textarea><div>${btn('revision-cancel', 'close', 'Cancelar pedido de cambios')}<button type="submit" class="icon-button" aria-label="Enviar cambios">${icon('up', 15)}</button></div></form>` : `<div class="proposal-actions">${btn('assignment-accept', 'check', 'Aceptar propuesta', `data-id="${a.id}"`)}${btn('assignment-revise', 'session', 'Pedir cambios', `data-id="${a.id}"`)}${btn('assignment-reject', 'close', 'Rechazar propuesta', `data-id="${a.id}"`)}</div>`}</article>`,
      )
      .join('')}`;
    plane.querySelectorAll<HTMLDetailsElement>('.zone-materials details').forEach((element) => {
      element.open = expanded.has(groupKey(element));
    });
    plane.querySelectorAll<HTMLElement>('.zone-materials').forEach((element) => {
      element.scrollTop =
        positions.get(element.closest<HTMLElement>('[data-zone]')?.dataset.zone ?? '') ?? 0;
    });
    this.cam.set(this.cam.current, true);
    this.paintSelection();
    this.renderDock();
    this.chat.render();
  }
  dispose(): void {
    this.abort.abort();
    this.chat.dispose();
    this.cam.dispose();
    if (this.ctx.camera === this.cam) this.ctx.camera = null;
  }
}
