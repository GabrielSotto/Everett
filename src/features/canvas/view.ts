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
import {
  placeResized,
  rotateVector,
  visualBounds,
  type OrientedRect,
  normalizedAngle,
} from '../../domain/rotation';
import { beginRotation, showRotation, controlLayer, syncControlBox } from './rotation-control';
import { drawRect, anchorPoint, linkPath } from '../../domain/geometry';
import { html, target, preserveFocus, type View } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import {
  materialMarkup,
  zoneMarkup,
  connectionMarkup,
  shapeMarkup,
  resizeHandles,
  connectionPorts,
} from './materials';
import { CanvasChat } from '../chat/controller';
import { SpatialCamera } from '../../spatial/camera';
import { wireframeMarkup } from './wireframe-markup';
import { toWorld, bound } from '../../spatial/math';
import { canvasCameraTuning } from '../../spatial/tuning';
import { bindDismiss } from '../../ui/popover';
import { trace, type Intent } from '../../app/diagnostics/trace';
import { colors } from './note-colors';
import { restoreNoteFonts } from './note-font-loading';
import { bindPointerCancellation } from '../../ui/pointer-cancellation';
import './direct-text.css';
import { DirectTextEditor } from './direct-text-editor';
import {
  arrowTool,
  createArrow,
  editArrow,
  isArrow,
  type ArrowHandle,
} from '../../domain/free-arrow';
import { arrowArt, arrowHandles, arrowHandlePoint } from './free-arrow';
import { linkWeights } from '../../domain/link-stroke';
import { resizeText, textBounds } from './direct-text-layout';
import { CanvasInteractions } from './interactions';
import { proposalMarkup } from './proposals';
import { sameConnection } from '../../domain/link-identity';
import { materialsInRect } from '../../domain/material-selection';
import { motion, reducedMotion } from '../../ui/motion';
import { strokePicker } from './stroke-picker';
import { rgb } from './color';
import {
  groupBounds,
  groupDropTarget,
  groupHeadingSide,
  componentFor,
  componentSelection,
  isComponent,
} from '../../domain/manual-groups';
import { labelPosition, labeledPath, overlaps } from '../../domain/cable-labels';
import { alignRect, selectionBounds, type SnapMemory } from '../../domain/alignment';
import { alignmentTargets } from '../../domain/alignment-targets';
import { layoutFrames } from '../../domain/layout-guides';
import { paintLayoutGuides } from './layout-guides';
import { resizedComponent } from '../../domain/component-resize';
import { componentElements, elementMaterials } from '../../domain/component-tree';
const shapeTools: Shape[] = ['rectangle', 'ellipse', 'triangle', 'star'];
const shapePalette = [...shapeTools, 'straight-arrow', 'curved-arrow'] as const;
const shapeNames = {
  rectangle: 'Rectángulo',
  ellipse: 'Elipse',
  triangle: 'Triángulo',
  star: 'Estrella',
  'straight-arrow': 'Flecha recta',
  'curved-arrow': 'Flecha curva',
};
type Corner = 'nw' | 'ne' | 'se' | 'sw' | 'w' | 'e';
type Drag =
  | { kind: 'rotate'; gesture: ReturnType<typeof beginRotation> }
  | { kind: 'arrow'; id: string; handle: ArrowHandle; start: Point; origin: Point; point: Point }
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
      snap?: SnapMemory;
    }
  | {
      kind: 'resize';
      entity: 'node' | 'zone' | 'group';
      id: string;
      start: Point;
      origin: OrientedRect;
      rect: Rect;
      corner: Corner;
      textStyle?: ReturnType<typeof resizeText>['textStyle'];
      intent: Intent;
    }
  | {
      kind: 'draw';
      tool: Tool;
      start: Point;
      point: Point;
      points: Point[];
      intent: Intent;
      textTarget?: string;
    }
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
  private groupMarkup = '';
  private proposalMotions = new Map<string, Animation>();
  private revision: string | null = null;
  private reviewCamera: Camera | null = null;
  private framedProposal: string | null = null;
  private expansionCamera: Camera | null = null;
  private referenceMenu = false;
  private shapesOpen = false;
  private dockMore = false;
  private locatedContext: {
    camera: Camera;
    selection: string | null;
    selections: string[];
    zone: string | null;
    link: string | null;
  } | null = null;
  private locateMotion: Animation | null = null;
  private sequence = 0;
  private directText: DirectTextEditor;
  private interactions: CanvasInteractions;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    this.directText = new DirectTextEditor(
      root,
      ctx,
      (id) => {
        this.select('node', id);
        this.paintSelection();
        ctx.persist();
      },
      (el, node) => {
        this.applyRect(el, node);
        if (
          ctx.ui.canvas.selections.length === 1 &&
          ctx.ui.canvas.selection === node.id &&
          root.querySelector('.rotation-frame')
        )
          showRotation(root.querySelector<HTMLElement>('#canvas-plane')!, [node]);
      },
    );
    root.innerHTML =
      '<section class="canvas-stage" id="canvas-stage"><div class="canvas-plane" id="canvas-plane"></div><div id="canvas-zone-labels" aria-hidden="true"></div><div id="selection-actions"></div></section><input id="canvas-file-import" type="file" accept="image/*,video/*,application/pdf" multiple hidden><div id="canvas-dock-host"></div><div class="chat-host" id="canvas-chat-host"></div>';
    this.cam = new SpatialCamera(
      ctx.store.get().camera,
      (camera) => {
        this.directText.position(camera);
        const plane = root.querySelector<HTMLElement>('#canvas-plane');
        if (plane) {
          plane.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.z})`;
          plane.style.setProperty('--canvas-zoom', String(camera.z));
          plane.dataset.overview = String(camera.z < 0.25);
          this.paintZoneLabels(camera);
          if (this.cableZoom !== camera.z) {
            this.cableZoom = camera.z;
            this.paintCableLabels();
            this.paintGroups();
          }
          this.paintMaterialIdentifications();
        }
        this.ctx.cameraChanged?.();
      },
      false,
      canvasCameraTuning,
    );
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
    // La recuperación del chat mide el dock real desde su primer layout. Un
    // tamaño provisional puede expulsarlo encima del chat antes de pintarlo.
    this.renderDock(false);
    this.chat = new CanvasChat(root.querySelector<HTMLElement>('#canvas-chat-host')!, ctx, () =>
      this.renderDock(),
    );
    this.interactions = new CanvasInteractions(
      root,
      ctx,
      this.abort.signal,
      (id) => this.editText(id),
      () => this.camPoint(),
      () => this.paintMaterialIdentifications(),
      () => {
        if (!this.drag && !this.ctx.ui.canvas.linkStart) return false;
        this.cancel();
        return true;
      },
    );
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
    root.addEventListener('pointerover', (e) => this.positionCommentPreview(e.target), {
      signal: this.abort.signal,
    });
    root.addEventListener('focusin', (e) => this.positionCommentPreview(e.target), {
      signal: this.abort.signal,
    });
    window.addEventListener(
      'resize',
      () =>
        this.positionCommentPreview(
          root.querySelector('.comment-marker:hover,.comment-marker:focus-visible'),
        ),
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
        if (e.defaultPrevented) return;
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
        this.renderDock(false);
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
  duplicate(): void {
    this.interactions.duplicate();
  }
  locateMaterial(id: string): void {
    const world = this.ctx.world(),
      node = world.nodes.find((item) => item.id === id);
    if (!node) return;
    const zone = node.owner ? world.zones.find((item) => item.agent === node.owner) : null;
    if (node.owner && !zone) {
      const agent = world.agents.find((item) => item.id === node.owner);
      this.ctx.notice(
        `El material sigue asignado a un agente sin zona. Creá una zona y elegí a ${agent?.name ?? 'ese agente'} en Agente asignado para revisar el trabajo y recuperar el material.`,
        true,
      );
      return;
    }
    const ui = this.ctx.ui.canvas;
    this.locatedContext ??= {
      camera: this.cam.current,
      selection: ui.selection,
      selections: [...ui.selections],
      zone: ui.zoneSelection,
      link: ui.linkSelection,
    };
    this.interactions.close();
    this.referenceMenu = this.shapesOpen = this.dockMore = false;
    this.revision = this.reviewCamera = this.expansionCamera = this.framedProposal = null;
    ui.tool = 'select';
    ui.linkStart = null;
    this.select(zone ? 'zone' : 'node', zone?.id ?? node.id);
    const bounds = zone ?? node,
      rect = this.rect();
    const chat = this.root
      .querySelector('.canvas-chat.docked:not(.compact)')
      ?.getBoundingClientRect();
    const left = chat && chat.height > 100 ? chat.right - rect.left : 0;
    const width = Math.max(100, rect.width - left);
    const z = Math.max(
      canvasCameraTuning.minimumZoom,
      Math.min(1, (width - 48) / bounds.width, (rect.height - 140) / bounds.height),
    );
    this.moveToLocated({
      x: left / 2 - (bounds.x + bounds.width / 2) * z,
      y: -(bounds.y + bounds.height / 2) * z,
      z,
    });
    this.render();
    this.root
      .querySelector<HTMLElement>(
        `[data-${zone ? 'zone' : 'node'}="${CSS.escape(zone?.id ?? node.id)}"]`,
      )
      ?.focus({ preventScroll: true });
    this.ctx.notice('Material localizado. Esc vuelve a la vista anterior.');
    this.ctx.persist();
  }
  private moveToLocated(camera: Camera): void {
    this.locateMotion?.cancel();
    const before = this.cam.current;
    this.cam.set(camera, true);
    this.ctx.act({ type: 'camera', camera }, 'localizar material de Canvas', 'C08-STATE-01');
    const plane = this.root.querySelector<HTMLElement>('#canvas-plane');
    if (plane && !reducedMotion())
      this.locateMotion = plane.animate(
        [
          { transform: `translate(${before.x}px,${before.y}px) scale(${before.z})` },
          { transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.z})` },
        ],
        { duration: motion.contentMs, easing: motion.panelEase },
      );
  }
  closeTransient(): boolean {
    if (this.directText.finish(true)) return true;
    if (this.interactions.close()) return true;
    if (this.ctx.ui.canvas.tool === 'text') {
      this.ctx.ui.canvas.tool = 'select';
      if (this.drag) this.cancel();
      else this.render();
      return true;
    }
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
    if (this.locatedContext) {
      const saved = this.locatedContext;
      this.locatedContext = null;
      const world = this.ctx.world();
      const valid = (id: string | null): boolean =>
        world.nodes.some((node) => node.id === id && !node.owner);
      Object.assign(this.ctx.ui.canvas, {
        selection: valid(saved.selection) ? saved.selection : null,
        selections: saved.selections.filter(valid),
        zoneSelection: world.zones.some((zone) => zone.id === saved.zone) ? saved.zone : null,
        linkSelection: world.links.some((link) => link.id === saved.link) ? saved.link : null,
      });
      this.moveToLocated(saved.camera);
      this.render();
      this.ctx.persist();
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
    if (
      event.key === 'Enter' &&
      element === this.root &&
      this.ctx.ui.canvas.selections.length === 1 &&
      this.editText(this.ctx.ui.canvas.selections[0]!)
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (
      element.matches('.rotation-handle') &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)
    ) {
      event.preventDefault();
      event.stopPropagation();
      const delta =
        (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1) *
        (event.shiftKey || event.key === 'Enter' || event.key === ' ' ? 15 : 1);
      this.directText.finish();
      this.ctx.act(
        {
          type: 'nodes.rotate',
          world: this.ctx.world().id,
          nodes: [...this.ctx.ui.canvas.selections],
          degrees: delta,
        },
        'girar selección',
        'C08-ROT-01',
        'keyboard',
      );
      this.root
        .querySelector<HTMLElement>(`[data-rotation-corner="${element.dataset.rotationCorner}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    const ah = element.dataset.arrowHandle as ArrowHandle | undefined;
    if (ah && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const n = this.ctx.world().nodes.find((n) => n.id === element.dataset.id && !n.owner);
      const p = n && arrowHandlePoint(n, ah);
      if (!n || !p) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 10 : 2;
      this.ctx.act(
        {
          type: 'arrow.reshape',
          world: this.ctx.world().id,
          id: n.id,
          handle: ah,
          point: {
            x: p.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
            y: p.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
          },
        },
        'ajustar flecha',
        'C08-MAT-05',
        'keyboard',
      );
      this.root
        .querySelector<HTMLElement>(`[data-id="${CSS.escape(n.id)}"][data-arrow-handle="${ah}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
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
      element.dataset.resize === 'group' &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      const world = this.ctx.world();
      const group = world.canvasGroups?.find((g) => g.id === element.dataset.id);
      if (!group || group.nodes.some((id) => world.nodes.find((n) => n.id === id)?.owner)) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = groupBounds(world, group);
      const corner = element.dataset.corner as Corner;
      const step = event.shiftKey ? 10 : 2;
      const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      const sign = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const side = horizontal ? bounds.width : bounds.height;
      const reverse = horizontal ? corner.includes('w') : corner.includes('n');
      const minimum = Math.max(
        ...world.nodes
          .filter((n) => group.nodes.includes(n.id))
          .flatMap((n) => [4 / n.width, 4 / n.height]),
      );
      const scale = Math.max(minimum, (side + step * sign * (reverse ? -1 : 1)) / side);
      this.ctx.act(
        {
          type: 'group.resize',
          world: world.id,
          id: group.id,
          rect: {
            x: bounds.x + (corner.includes('w') ? bounds.width * (1 - scale) : 0),
            y: bounds.y + (corner.includes('n') ? bounds.height * (1 - scale) : 0),
            width: bounds.width * scale,
            height: bounds.height * scale,
          },
        },
        'redimensionar componente con teclado',
        'C08-MAT-05',
        'keyboard',
      );
      this.root
        .querySelector<HTMLElement>(
          `[data-resize="group"][data-id="${CSS.escape(group.id)}"][data-corner="${corner}"]`,
        )
        ?.focus({ preventScroll: true });
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
    if (node.data.kind === 'text' && corner.length === 1 && dx === 0) return;
    const resizedText =
      node.data.kind === 'text' ? resizeText(node.data, node, corner, dx, dy) : null;
    const rect = resizedText?.rect ?? {
      x: corner.includes('w') ? node.x + node.width - width : node.x,
      y: corner.includes('n') ? node.y + node.height - height : node.y,
      width,
      height,
    };
    this.ctx.act(
      {
        type: 'node.resize',
        world: this.ctx.world().id,
        id: node.id,
        rect: placeResized(node, rect),
        ...(resizedText ? { textStyle: resizedText.textStyle } : {}),
      },
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
  private editText(id: string): boolean {
    const node = this.ctx.world().nodes.find((n) => n.id === id);
    if (!node || node.owner || node.data.kind !== 'text' || componentFor(this.ctx.world(), id))
      return false;
    this.directText.start(node.id, node, node.width, node);
    return true;
  }
  private open(id: string): void {
    if (this.editText(id)) return;
    if (componentFor(this.ctx.world(), id)) return;
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
    const members =
      kind === 'node' && id ? componentSelection(this.ctx.world(), [id], ui.componentEditing) : [];
    ui.selections =
      kind === 'node' && id
        ? additive
          ? ui.selections.includes(id)
            ? ui.selections.filter((existing) => !members.includes(existing))
            : [...new Set([...ui.selections, ...members])]
          : members
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
    const editing = ui.componentEditing;
    if (editing && kind === 'node' && id) {
      const tree = this.ctx.world().canvasGroups?.find((g) => g.id === editing.group)?.structure;
      const scope = tree && componentElements(tree.root).find((e) => e.id === editing.element);
      const child = scope?.children.find((e) => elementMaterials(e).includes(id));
      if (child) editing.selected = child.id;
    }
    if (data?.kind === 'drawing' || data?.kind === 'shape') {
      ui.color = data.color;
      ui.thickness = data.thickness ?? 1;
      if (data.kind === 'shape') {
        ui.stroke = data.stroke ?? data.color;
        ui.fill = data.fill ?? true;
      }
    }
  }
  private positionCommentPreview(target: EventTarget | null): void {
    const marker =
      target instanceof Element ? target.closest<HTMLElement>('.comment-marker') : null;
    const preview = marker?.querySelector<HTMLElement>('.comment-preview');
    if (!marker || !preview || !preview.getClientRects().length) return;
    preview.style.translate = 'none';
    const bounds = preview.getBoundingClientRect();
    const scale = marker.getBoundingClientRect().width / marker.offsetWidth;
    if (!scale) return;
    const anchor = marker.getBoundingClientRect();
    let left = anchor.right + 9,
      top = anchor.top - 8;
    if (left + bounds.width > innerWidth - 12) {
      if (anchor.left - bounds.width - 9 >= 12) left = anchor.left - bounds.width - 9;
      else {
        left = anchor.left + anchor.width / 2 - bounds.width / 2;
        top = anchor.bottom + 9;
        if (top + bounds.height > innerHeight - 12) top = anchor.top - bounds.height - 9;
      }
    }
    left = Math.max(12, Math.min(innerWidth - 12 - bounds.width, left));
    top = Math.max(70, Math.min(innerHeight - 12 - bounds.height, top));
    preview.style.translate = `${(left - bounds.left) / scale}px ${(top - bounds.top) / scale}px`;
  }
  private down(e: PointerEvent): void {
    this.locateMotion?.cancel();
    if (!(e.target instanceof Element) || e.button !== 0) return;
    const target = e.target,
      ui = this.ctx.ui;
    if (
      target.closest(
        '[data-action=group-rename],[data-action=group-ungroup],[data-action=component-edit],[data-action=link-preview-retry],[data-action=link-open]',
      )
    )
      return;
    const rotationCorner = target.closest<HTMLElement>('.rotation-handle')?.dataset.rotationCorner;
    if (rotationCorner && ui.canvas.tool === 'select') {
      // La edición reemplaza la tinta por un textarea. Entregar el gesto al
      // material ya guardado antes de capturar sus nodos DOM y su geometría.
      this.directText.finish();
      const world = this.ctx.world(),
        ids = new Set(ui.canvas.selections),
        nodes = world.nodes.filter((n) => ids.has(n.id) && !n.owner);
      const button = this.root.querySelector<HTMLElement>(
        `[data-rotation-corner="${rotationCorner}"]`,
      );
      if (!nodes.length || !button) return;
      e.preventDefault();
      this.root.style.setProperty('--active-rotation-cursor', getComputedStyle(button).cursor);
      this.root.dataset.rotating = rotationCorner;
      this.drag = {
        kind: 'rotate',
        gesture: beginRotation(this.root, world, nodes, this.point(e), button, this.cam.current.z),
      };
      this.root.setPointerCapture(e.pointerId);
      return;
    }
    const header = target.closest<HTMLElement>('[data-group]');
    const headerRect = header?.getBoundingClientRect();
    // El puente de hover es transparente: solo el encabezado visible arrastra
    // el conjunto; iniciar en su separación conserva la selección rectangular.
    const onHeader =
      headerRect &&
      e.clientX >= headerRect.left &&
      e.clientX <= headerRect.right &&
      e.clientY >= headerRect.top &&
      e.clientY <= headerRect.bottom;
    if (header?.dataset.group && onHeader && ui.canvas.tool === 'select') {
      const group = this.ctx.world().canvasGroups?.find((g) => g.id === header.dataset.group);
      if (!group) return;
      e.preventDefault();
      const members = this.ctx.world().nodes.filter((n) => group.nodes.includes(n.id));
      if (members.some((n) => n.owner)) {
        this.ctx.notice('Devolvé los materiales del agente antes de mover este conjunto.');
        return;
      }
      this.select('node', members[0]!.id);
      ui.canvas.selections = members.map((n) => n.id);
      const start = this.point(e);
      this.drag = {
        kind: 'node',
        id: members[0]!.id,
        start,
        origin: members[0]!,
        point: members[0]!,
        distance: 0,
        intent: trace.intent('mover conjunto', 'C08-ORG-01'),
        origins: members.map((n) => ({ id: n.id, point: { x: n.x, y: n.y } })),
        additive: true,
      };
      this.root.setPointerCapture(e.pointerId);
      this.paintSelection();
      return;
    }
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
    const ah = target.closest<HTMLElement>('[data-arrow-handle]');
    if (ah) {
      const n = this.ctx.world().nodes.find((n) => n.id === ah.dataset.id && !n.owner);
      const handle = ah.dataset.arrowHandle as ArrowHandle;
      const origin = n && arrowHandlePoint(n, handle);
      if (n && origin) {
        e.preventDefault();
        this.drag = {
          kind: 'arrow',
          id: n.id,
          handle,
          start: this.point(e),
          origin,
          point: origin,
        };
        this.root.setPointerCapture(e.pointerId);
      }
      return;
    }
    const handle = target.closest<HTMLElement>('[data-resize]');
    if (
      handle &&
      ['node', 'zone', 'group'].includes(handle.dataset.resize ?? '') &&
      handle.dataset.id
    ) {
      this.directText.finish();
      const entity = handle.dataset.resize as 'node' | 'zone' | 'group',
        id = handle.dataset.id;
      const original =
        entity === 'group'
          ? this.ctx
              .world()
              .canvasGroups?.filter((g) => g.id === id)
              .map((g) => groupBounds(this.ctx.world(), g))[0]
          : entity === 'node'
            ? this.ctx.world().nodes.find((n) => n.id === id)
            : this.ctx.world().zones.find((z) => z.id === id);
      if (!original) return;
      e.preventDefault();
      const rect = {
        x: original.x,
        y: original.y,
        width: original.width,
        height: original.height,
        rotation:
          entity === 'node'
            ? (original as Material).rotation
            : entity === 'group'
              ? this.ctx.world().canvasGroups?.find((g) => g.id === id)?.structure?.rotation
              : undefined,
      };
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
      shapePalette.includes(ui.canvas.tool as Shape) ||
      ui.canvas.tool === 'zone' ||
      ui.canvas.tool === 'drawing' ||
      ui.canvas.tool === 'note' ||
      ui.canvas.tool === 'text'
    ) {
      this.drag = {
        kind: 'draw',
        tool: ui.canvas.tool,
        ...(ui.canvas.tool === 'text' &&
        nodeId &&
        !componentFor(this.ctx.world(), nodeId) &&
        this.ctx.world().nodes.some((n) => n.id === nodeId && !n.owner && n.data.kind === 'text')
          ? { textTarget: nodeId }
          : {}),
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
      this.positionStyle();
      this.positionShapeMenu();
      return;
    }
    const point = this.point(e);
    if (d.kind === 'rotate') {
      d.gesture.update(point, e);
      return;
    }
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
      const selected = componentSelection(
        this.ctx.world(),
        materialsInRect(this.ctx.world().nodes, rect),
        this.ctx.ui.canvas.componentEditing,
      );
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
          from.rotation,
          to.rotation,
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
      preview.setAttribute(
        'd',
        linkPath(anchorPoint(source, d.anchor), point, d.anchor, 'west', source.rotation),
      );
      return;
    }
    if (d.kind === 'arrow') {
      const n = this.ctx.world().nodes.find((n) => n.id === d.id);
      const el = this.root.querySelector<HTMLElement>(`[data-node="${CSS.escape(d.id)}"]`);
      if (n && isArrow(n) && el) {
        d.point = { x: d.origin.x + point.x - d.start.x, y: d.origin.y + point.y - d.start.y };
        const preview = editArrow(n, d.handle, d.point);
        this.applyRect(el, preview);
        el.querySelector('.arrow-art')!.outerHTML = arrowArt(preview);
        const controls =
          this.root.querySelector<HTMLElement>(`[data-controls-for="${CSS.escape(n.id)}"]`) ?? el;
        controls.querySelectorAll('.arrow-handle').forEach((h) => h.remove());
        controls.insertAdjacentHTML('beforeend', arrowHandles(preview));
        this.paintLinks([{ id: n.id, point: preview }]);
      }
      return;
    }
    if (d.kind === 'resize') {
      const { x: dx, y: dy } = rotateVector(
        { x: point.x - d.start.x, y: point.y - d.start.y },
        -(d.origin.rotation ?? 0),
      );
      const fixed = {
        x: d.corner.includes('w') ? d.origin.x + d.origin.width : d.origin.x,
        y: d.corner.includes('n') ? d.origin.y + d.origin.height : d.origin.y,
      };
      const moving = {
        x: d.corner.includes('w') ? d.origin.x + dx : d.origin.x + d.origin.width + dx,
        y: d.corner.includes('n') ? d.origin.y + dy : d.origin.y + d.origin.height + dy,
      };
      d.rect = drawRect(fixed, moving);
      if (d.entity === 'group') {
        const world = this.ctx.world();
        const group = world.canvasGroups!.find((g) => g.id === d.id)!;
        const members = world.nodes.filter((n) => group.nodes.includes(n.id));
        const sx = d.rect.width / d.origin.width,
          sy = d.rect.height / d.origin.height;
        const minimum = Math.max(...members.flatMap((n) => [4 / n.width, 4 / n.height]));
        const scale = Math.max(minimum, Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy);
        if (!group.structure)
          d.rect = {
            x: d.corner.includes('w') ? fixed.x - d.origin.width * scale : fixed.x,
            y: d.corner.includes('n') ? fixed.y - d.origin.height * scale : fixed.y,
            width: d.origin.width * scale,
            height: d.origin.height * scale,
          };
        d.rect = placeResized(d.origin, d.rect);
        const nodes = resizedComponent(world, group, d.rect);
        for (const node of nodes) {
          const el = this.root.querySelector<HTMLElement>(`[data-node="${CSS.escape(node.id)}"]`);
          if (!el) continue;
          this.applyRect(el, node);
          const art = el.querySelector('[data-library-piece]');
          if (art) art.outerHTML = wireframeMarkup(node, this.ctx.world());
        }
        const frame = this.root.querySelector<HTMLElement>(
          `[data-component="${CSS.escape(group.id)}"]`,
        );
        if (frame) this.applyRect(frame, d.rect);
        this.paintLinks(nodes.map((n) => ({ id: n.id, point: n })));
        return;
      }
      const material = this.ctx.world().nodes.find((n) => n.id === d.id);
      if (material?.data.kind === 'text') {
        const result = resizeText(material.data, d.origin, d.corner, dx, dy);
        d.rect = result.rect;
        d.textStyle = result.textStyle;
        const run = this.root.querySelector<HTMLElement>(
          `[data-node="${CSS.escape(d.id)}"] .canvas-text-run`,
        );
        if (run) run.style.fontSize = result.textStyle.size + 'px';
      }
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
      d.rect = placeResized(d.origin, d.rect);
      const element = this.root.querySelector<HTMLElement>(`[data-${d.entity}="${d.id}"]`);
      if (element) {
        this.applyRect(element, d.rect);
        if (material?.data.kind === 'wireframe') {
          const preview = element.querySelector('.wireframe-content,[data-library-piece]');
          if (preview)
            preview.outerHTML = wireframeMarkup({ ...material, ...d.rect }, this.ctx.world());
        }
      }
      this.paintLinks([{ id: d.id, point: d.rect }]);
      return;
    }
    if (d.kind === 'node' || d.kind === 'zone') {
      d.point = { x: d.origin.x + point.x - d.start.x, y: d.origin.y + point.y - d.start.y };
      d.distance = Math.hypot(point.x - d.start.x, point.y - d.start.y) * this.cam.current.z;
      const positions = d.origins?.map((item) => ({
        id: item.id,
        point: { x: item.point.x + point.x - d.start.x, y: item.point.y + point.y - d.start.y },
      })) ?? [{ id: d.id, point: { ...d.point } }];
      this.root.querySelector('.alignment-guides')?.remove();
      const shell = this.ctx.ui.shell;
      if (
        d.distance > 3 &&
        (shell.canvasAlignmentGuides || shell.canvasLayoutSnap) &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const items =
          d.kind === 'node'
            ? this.ctx.world().nodes.filter((n) => !n.owner)
            : this.ctx.world().zones;
        const selected = new Set(positions.map((item) => item.id));
        const moving = positions.flatMap((item) => {
          const original = items.find((node) => node.id === item.id);
          return original ? [{ ...original, ...item.point }] : [];
        });
        if (moving.length) {
          const viewport = this.root.getBoundingClientRect();
          const a = toWorld({ x: viewport.left, y: viewport.top }, this.cam.current, viewport);
          const b = toWorld({ x: viewport.right, y: viewport.bottom }, this.cam.current, viewport);
          const snap = alignRect(
            selectionBounds(moving),
            (shell.canvasAlignmentGuides
              ? d.kind === 'node'
                ? alignmentTargets(this.ctx.world(), selected, this.ctx.ui.canvas.componentEditing)
                : items
              : []
            ).filter(
              (item) =>
                (!item.id || !selected.has(item.id)) &&
                item.x + item.width >= a.x &&
                item.x <= b.x &&
                item.y + item.height >= a.y &&
                item.y <= b.y,
            ),
            this.cam.current.z,
            {
              ...(d.snap ? { previous: d.snap } : {}),
              frames:
                d.kind === 'node' && shell.canvasLayoutSnap
                  ? layoutFrames(this.ctx.world()).filter(
                      (f) => !f.members.some((id) => selected.has(id)),
                    )
                  : [],
            },
          );
          d.snap = snap.memory;
          for (const item of positions) {
            item.point.x += snap.correction.x;
            item.point.y += snap.correction.y;
          }
          d.point = { x: d.point.x + snap.correction.x, y: d.point.y + snap.correction.y };
          if (snap.guides.length) {
            const layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            layer.classList.add('alignment-guides');
            layer.setAttribute('aria-hidden', 'true');
            layer.innerHTML = snap.guides
              .map(
                (guide) =>
                  `<g${guide.transform ? ` transform="rotate(${guide.transform.degrees} ${guide.transform.pivot.x} ${guide.transform.pivot.y})"` : ''}><line data-snap-target="${html(guide.target ?? '')}" data-snap-source="${guide.source}" x1="${guide.axis === 'x' ? guide.position : guide.from}" y1="${guide.axis === 'y' ? guide.position : guide.from}" x2="${guide.axis === 'x' ? guide.position : guide.to}" y2="${guide.axis === 'y' ? guide.position : guide.to}"/>${guide.markers
                    .map((p) => {
                      const x = guide.axis === 'x' ? guide.position : p,
                        y = guide.axis === 'y' ? guide.position : p,
                        d = 3 / this.cam.current.z;
                      return `<path d="M${x - d} ${y - d}l${2 * d} ${2 * d}m0 ${-2 * d}l${-2 * d} ${2 * d}"/>`;
                    })
                    .join('')}</g>`,
              )
              .join('');
            this.root.querySelector('#canvas-plane')?.append(layer);
          }
        }
      } else delete d.snap;
      for (const item of positions) {
        const element = this.root.querySelector<HTMLElement>(
          `[data-${d.kind}="${CSS.escape(item.id)}"]`,
        );
        if (element) {
          element.style.left = item.point.x + 'px';
          element.style.top = item.point.y + 'px';
          const controls = this.root.querySelector<HTMLElement>(
            `[data-controls-for="${CSS.escape(item.id)}"]`,
          );
          if (controls) syncControlBox(controls, element);
          if (d.kind === 'node') {
            const node = this.ctx.world().nodes.find((n) => n.id === item.id);
            if (node?.data.kind === 'wireframe' && node.data.content.piece?.autoInk) {
              const preview = element.querySelector('.library-piece');
              if (preview)
                preview.outerHTML = wireframeMarkup({ ...node, ...item.point }, this.ctx.world());
            }
          }
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
    const rect = drawRect(d.start, d.point);
    this.applyRect(preview, d.tool === 'text' ? { ...rect, y: d.start.y, height: 30 } : rect);
    if (d.tool === 'drawing') {
      const rect = this.strokeRect(d.points);
      this.applyRect(preview, rect);
      preview.innerHTML = `<svg viewBox="0 0 ${rect.width} ${rect.height}" preserveAspectRatio="none"><polyline points="${d.points.map((p) => `${p.x - rect.x},${p.y - rect.y}`).join(' ')}" fill="none" stroke="${this.ctx.ui.canvas.color}" stroke-width="${this.ctx.ui.canvas.thickness}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    if (arrowTool(d.tool)) {
      const n = createArrow(
        '',
        d.start,
        d.point,
        d.tool === 'curved-arrow',
        this.ctx.ui.canvas.color,
        this.ctx.ui.canvas.thickness,
      );
      this.applyRect(preview, n);
      preview.innerHTML = arrowArt(n);
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
    const id = element.dataset.node,
      controls =
        id && this.root.querySelector<HTMLElement>(`[data-controls-for="${CSS.escape(id)}"]`);
    if (controls) syncControlBox(controls, element);
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
    this.root.querySelector('.alignment-guides')?.remove();
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.root.classList.remove('panning');
    this.root.style.removeProperty('cursor');
    if (this.root.hasPointerCapture(e.pointerId)) this.root.releasePointerCapture(e.pointerId);
    const w = this.ctx.world();
    if (d.kind === 'rotate') {
      this.clearRotationCursor();
      if (!d.gesture.moved) {
        // El área de giro sobresale de la selección y puede estar sobre la
        // tinta de otra pieza. Un clic simple todavía permite seleccionarla.
        const underneath = document
          .elementsFromPoint(e.clientX, e.clientY)
          .map((el) => el.closest<HTMLElement>('[data-node]'))
          .find((el) => el && this.root.contains(el))?.dataset.node;
        if (underneath) {
          this.select('node', underneath, e.shiftKey);
          this.ctx.persist();
        }
      }
      if (
        normalizedAngle(d.gesture.degrees) > 1e-7 &&
        this.ctx.act(
          { type: 'nodes.rotate', world: w.id, nodes: d.gesture.ids, degrees: d.gesture.degrees },
          'girar selección',
          'C08-ROT-01',
          'pointer',
        )
      )
        return;
      this.render();
      return;
    }
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
    if (d.kind === 'arrow') {
      if (d.point.x !== d.origin.x || d.point.y !== d.origin.y)
        this.ctx.act(
          { type: 'arrow.reshape', world: w.id, id: d.id, handle: d.handle, point: d.point },
          'ajustar flecha',
          'C08-MAT-05',
          'pointer',
        );
      return;
    }
    if (d.kind === 'resize') {
      this.ctx.act(
        {
          type:
            d.entity === 'node'
              ? 'node.resize'
              : d.entity === 'group'
                ? 'group.resize'
                : 'zone.edit',
          world: w.id,
          id: d.id,
          rect: d.rect,
          ...(d.textStyle ? { textStyle: d.textStyle } : {}),
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
            const join = this.ctx.ui.canvas.componentEditing ? null : groupDropTarget(w, positions);
            const detached = positions
              .filter((item) => {
                const group = w.canvasGroups?.find((g) => g.nodes.includes(item.id));
                if (group?.component) return false;
                if (!group || group.nodes.every((id) => positions.some((p) => p.id === id)))
                  return false;
                if (join) return true;
                const bounds = groupBounds(w, group),
                  node = w.nodes.find((n) => n.id === item.id)!;
                const x = item.point.x + node.width / 2,
                  y = item.point.y + node.height / 2;
                return (
                  x < bounds.x ||
                  x > bounds.x + bounds.width ||
                  y < bounds.y ||
                  y > bounds.y + bounds.height
                );
              })
              .map((item) => item.id);
            this.ctx.act(
              positions.length > 1 || detached.length > 0 || join
                ? {
                    type: 'nodes.move',
                    world: w.id,
                    nodes: positions,
                    detach: detached,
                    ...(join ? { join } : {}),
                  }
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
    if (d.tool === 'text') {
      const end = this.point(e),
        dragged = Math.abs(end.x - d.start.x) * this.cam.current.z >= 4;
      const start = dragged ? { x: Math.min(d.start.x, end.x), y: d.start.y } : d.start;
      this.ctx.ui.canvas.tool = 'select';
      if (
        d.textTarget &&
        Math.hypot(end.x - d.start.x, end.y - d.start.y) * this.cam.current.z < 4
      ) {
        this.select('node', d.textTarget);
        this.render();
        this.editText(d.textTarget);
        return;
      }
      this.select(null, null);
      this.render();
      this.directText.start(id, start, dragged ? Math.abs(end.x - d.start.x) : undefined);
      return;
    }
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
      const node: Material = arrowTool(d.tool)
        ? createArrow(
            id,
            d.start,
            click ? { x: d.start.x + 110, y: d.start.y } : d.point,
            d.tool === 'curved-arrow',
            this.ctx.ui.canvas.color,
            this.ctx.ui.canvas.thickness,
          )
        : {
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
    if (d.tool === 'note' || d.tool === 'zone' || arrowTool(d.tool))
      this.ctx.ui.canvas.tool = 'select';
    this.render();
  }
  private cancel(): void {
    this.root.querySelector('.alignment-guides')?.remove();
    if (!this.drag && !this.ctx.ui.canvas.linkStart) return;
    if (this.drag?.kind === 'selection') {
      this.ctx.ui.canvas.selections = this.drag.before;
      this.ctx.ui.canvas.selection = this.drag.before.at(-1) ?? null;
    }
    if (this.drag?.kind === 'rotate') this.clearRotationCursor();
    this.drag = null;
    this.ctx.ui.canvas.linkStart = null;
    this.cam.stop();
    this.root.classList.remove('panning');
    this.root.style.removeProperty('cursor');
    this.render();
  }
  private clearRotationCursor(): void {
    this.root.querySelector('.rotation-readout')?.remove();
    delete this.root.dataset.rotating;
    this.root.style.removeProperty('--active-rotation-cursor');
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
      case 'group-select': {
        const group = ctx.world().canvasGroups?.find((g) => g.id === id);
        const members =
          group?.nodes.filter((node) => ctx.world().nodes.some((n) => n.id === node && !n.owner)) ??
          [];
        this.select('node', members[0] ?? null);
        ctx.ui.canvas.selections = members;
        this.paintSelection();
        this.renderDock();
        ctx.persist();
        break;
      }
      case 'canvas-illustrations':
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
        const all: Tool[] = [
          'select',
          'hand',
          'note',
          'text',
          ...shapePalette,
          'zone',
          'connect',
          'drawing',
        ];
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
        if (shapePalette.includes(ctx.ui.canvas.tool as Shape)) {
          ctx.ui.canvas.tool = 'select';
          this.select(null, null);
          this.shapesOpen = false;
        } else this.shapesOpen = !this.shapesOpen;
        this.referenceMenu = false;
        this.render();
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
      case 'link-thickness': {
        const link = w.links.find((l) => l.id === ctx.ui.canvas.linkSelection);
        const thickness = Number(t.dataset.value);
        if (link && (link.thickness ?? 1.4) !== thickness) {
          ctx.act(
            { type: 'link.thickness', world: w.id, id: link.id, thickness },
            'cambiar grosor de conexión',
            'C08-LINK-02',
          );
          this.root
            .querySelector<HTMLElement>(`[data-action=link-thickness][data-value="${thickness}"]`)
            ?.focus({ preventScroll: true });
        }
        break;
      }
      case 'select-link':
        this.select('link', id);
        this.paintSelection(true);
        this.renderDock();
        ctx.persist();
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
    this.paintGroups(preview);
  }
  private paintGroups(preview: readonly { id: string; point: Point }[] = []): void {
    paintLayoutGuides(this.root, this.ctx.world(), this.ctx.ui.shell.canvasLayoutGuides, preview);
    const layer = this.root.querySelector('.canvas-groups');
    if (!layer) return;
    const world = this.ctx.world();
    const destination =
      this.drag?.kind === 'node' && this.drag.distance > 3 ? groupDropTarget(world, preview) : null;
    const nodes = world.nodes.map((n) => ({
      ...n,
      ...(preview.find((p) => p.id === n.id)?.point ?? {}),
    }));
    const markup = (world.canvasGroups ?? [])
      .map((group) => {
        const allMoving = group.nodes.every((id) => preview.some((p) => p.id === id));
        const bounds =
          this.drag?.kind === 'resize' && this.drag.entity === 'group' && this.drag.id === group.id
            ? this.drag.rect
            : groupBounds(world, group, allMoving ? nodes : []);
        const zoom = this.cam.current.z;
        // El marco conserva coordenadas del Mundo. Solo la identificación cambia
        // de densidad; el zoom nunca desplaza ni ensancha el conjunto.
        const density =
          bounds.width * zoom >= 240 ? 'full' : bounds.width * zoom >= 64 ? 'compact' : 'hidden';
        const headingSide = groupHeadingSide({ ...world, nodes }, group);
        const selected = group.nodes.every((id) => this.ctx.ui.canvas.selections.includes(id));
        return `<div ${isComponent(world, group) ? `data-component="${group.id}"` : ''} data-density="${density}" data-heading-side="${headingSide}" class="canvas-manual-group ${selected ? 'selected' : ''} ${destination === group.id ? 'group-drop-ready' : ''}" style="left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px;${group.structure?.rotation ? 'rotate:' + group.structure.rotation + 'deg' : ''}"><div class="group-heading" tabindex="0" data-group="${group.id}"><button type="button" class="group-grip" data-action="group-select" data-id="${group.id}" aria-label="Conjunto: ${html(group.name)}" title="Arrastrar conjunto">${icon('grip', 14)}</button><button type="button" class="group-name" data-action="group-rename" data-id="${group.id}" title="${html(group.name)}" aria-label="Renombrar conjunto ${html(group.name)}">${html(group.name)}</button>${
          isComponent(world, group)
            ? `<button type="button" data-action="component-edit" data-id="${group.id}" aria-label="Editar componente ${html(group.name)}">Editar</button>`
            : group.nodes.every((id) => {
                  const n = world.nodes.find((n) => n.id === id);
                  return n?.data.kind === 'wireframe' && !!n.data.content.piece;
                })
              ? `<button type="button" data-action="component-edit" data-id="${group.id}">Crear componente</button>`
              : ''
        }<small class="group-count">${group.nodes.length} ${group.nodes.length === 1 ? 'material' : 'materiales'}</small><button type="button" class="group-separate" data-action="group-ungroup" data-id="${group.id}" aria-label="Separar conjunto">Separar</button></div>${selected && isComponent(world, group) && this.ctx.ui.canvas.tool === 'select' ? resizeHandles('group', group.id) : ''}${destination === group.id ? '<span class="group-drop-message" role="status">Soltar para agregar</span>' : ''}</div>`;
      })
      .join('');
    if (markup !== this.groupMarkup || !layer.childElementCount) {
      const focused =
        document.activeElement instanceof HTMLElement && layer.contains(document.activeElement)
          ? document.activeElement
          : null;
      const action = focused?.dataset.action,
        id = focused?.dataset.id,
        focusedGroup = focused?.dataset.group;
      layer.innerHTML = markup;
      this.groupMarkup = markup;
      if (action && id)
        layer
          .querySelector<HTMLElement>(
            `[data-action="${CSS.escape(action)}"][data-id="${CSS.escape(id)}"]`,
          )
          ?.focus({ preventScroll: true });
      else if (focusedGroup)
        layer
          .querySelector<HTMLElement>(`[data-group="${CSS.escape(focusedGroup)}"]`)
          ?.focus({ preventScroll: true });
    }
    const frames = Array.from(layer.querySelectorAll<HTMLElement>('.canvas-manual-group'));
    const materials = Array.from(
      this.root.querySelectorAll<HTMLElement>('.material[data-node]'),
      (el) => el.getBoundingClientRect(),
    );
    const placed: DOMRect[] = [];
    const overlaps = (a: DOMRect, b: DOMRect): boolean =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    for (const frame of frames) {
      const heading = frame.querySelector<HTMLElement>('.group-heading')!;
      const rect = heading.getBoundingClientRect();
      const occluded =
        materials.some((other) => overlaps(rect, other)) ||
        frames.some((other) => other !== frame && overlaps(rect, other.getBoundingClientRect())) ||
        placed.some((other) => overlaps(rect, other));
      frame.dataset.headingOccluded = String(occluded);
      if (
        !occluded &&
        frame.dataset.density !== 'hidden' &&
        frame.dataset.headingSide !== 'blocked'
      )
        placed.push(rect);
    }
  }
  private paintCableLabels(): void {
    const svg = this.root.querySelector('.canvas-links');
    if (!svg) return;
    const obstacles: Rect[] = Array.from(
      this.root.querySelectorAll<HTMLElement>('.material[data-node]'),
      (el) =>
        visualBounds({
          rotation: parseFloat(el.style.rotate) || 0,
          x: parseFloat(el.style.left),
          y: parseFloat(el.style.top),
          width: el.offsetWidth,
          height: el.offsetHeight,
        }),
    );
    const zoom = this.cam.current.z;
    const measured = Array.from(svg.querySelectorAll<SVGGElement>('[data-link]'), (group) => {
      const path = group.querySelector<SVGPathElement>('.link-line'),
        text = group.querySelector<SVGTextElement>('.cable-label');
      if (!path || !text) return null;
      const link = this.ctx.world().links.find((l) => l.id === group.dataset.link);
      if (!link) return null;
      const currentNode = (id: string): Material => {
        const node = this.ctx.world().nodes.find((n) => n.id === id)!;
        const el = this.root.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
        return {
          ...node,
          ...(el
            ? {
                x: parseFloat(el.style.left),
                y: parseFloat(el.style.top),
                width: el.offsetWidth,
                height: el.offsetHeight,
              }
            : {}),
        };
      };
      const a = currentNode(link.from),
        b = currentNode(link.to);
      const from = anchorPoint(a, link.fromAnchor),
        to = anchorPoint(b, link.toAnchor);
      path.setAttribute(
        'd',
        linkPath(from, to, link.fromAnchor, link.toAnchor, a.rotation, b.rotation),
      );
      const length = path.getTotalLength(),
        original = path.getPointAtLength(length / 2);
      // Reservar espacio de lectura a escala de panorama sin recolocar el cable
      // al girar la rueda. La medida tipográfica se normaliza a coordenadas del Mundo.
      const size = { width: (text.getComputedTextLength() * zoom + 12) / 0.4, height: 14 / 0.4 };
      const middle = labelPosition(original, size, obstacles);
      const next = labeledPath(
        from,
        to,
        link.fromAnchor,
        link.toAnchor,
        middle,
        original,
        a.rotation,
        b.rotation,
      );
      group.querySelectorAll<SVGPathElement>('path').forEach((el) => el.setAttribute('d', next));
      obstacles.push({ x: middle.x - size.width / 2, y: middle.y - size.height / 2, ...size });
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
        const margin = Math.max(
          16 / zoom,
          (this.ctx.world().links.find((l) => l.id === group.dataset.link)?.thickness ?? 0) / 2 +
            3 / zoom,
        );
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
  private paintMaterialIdentifications(): void {
    const labels = [...this.root.querySelectorAll<HTMLElement>('.material-identification')].filter(
      (label) => label.closest('.selected,.identified,:focus-within'),
    );
    const cables = [...this.root.querySelectorAll<SVGTextElement>('.cable-label')].map((label) =>
      label.getBoundingClientRect(),
    );
    const materials = [...this.root.querySelectorAll<HTMLElement>('.material[data-node]')];
    const placed: Rect[] = [];
    for (const label of labels) {
      label.style.setProperty('--identification-shift-x', '0px');
      label.style.setProperty('--identification-shift-y', '0px');
    }
    for (const label of labels.sort(
      (a, b) =>
        Number(b.closest('.selected,.identified') !== null) -
        Number(a.closest('.selected,.identified') !== null),
    )) {
      const owner = label.closest<HTMLElement>('.material')!;
      const box = label.getBoundingClientRect(),
        card = owner.getBoundingClientRect();
      // Conservar el anclaje aprobado salvo que el nombre tape una etiqueta de cable.
      if (!cables.some((cable) => overlaps(box, cable))) continue;
      const obstacles: Rect[] = [
        ...cables,
        ...materials
          .filter((other) => other !== owner)
          .map((other) => other.getBoundingClientRect()),
        ...placed,
      ];
      const candidates = [
        { x: 0, y: 0 },
        { x: 0, y: -box.height - 8 },
        { x: 0, y: card.bottom - box.top + 8 },
        { x: card.left - box.right - 8, y: card.top - box.top },
        { x: card.right - box.left + 8, y: card.top - box.top },
      ];
      const choice =
        candidates.find((offset) => {
          const candidate = {
            x: box.x + offset.x,
            y: box.y + offset.y,
            width: box.width,
            height: box.height,
          };
          return (
            candidate.x >= 0 &&
            candidate.y >= 74 &&
            candidate.x + candidate.width <= innerWidth &&
            candidate.y + candidate.height <= innerHeight &&
            !obstacles.some((other) => overlaps(candidate, other))
          );
        }) ?? candidates[0]!;
      label.style.setProperty('--identification-shift-x', `${choice.x}px`);
      label.style.setProperty('--identification-shift-y', `${choice.y}px`);
      if (owner.matches('.selected,.identified,:focus-within'))
        placed.push({
          x: box.x + choice.x,
          y: box.y + choice.y,
          width: box.width,
          height: box.height,
        });
    }
  }
  private paintSelection(keepLinks = false): void {
    this.interactions.components.render();
    const w = this.ctx.world(),
      ui = this.ctx.ui,
      connect = ui.canvas.tool === 'connect' || !!ui.canvas.linkSelection;
    this.root.dataset.groupSelection = String(
      w.canvasGroups?.some(
        (group) =>
          group.nodes.length > 1 &&
          group.nodes.length === ui.canvas.selections.length &&
          group.nodes.every((id) => ui.canvas.selections.includes(id)),
      ) ?? false,
    );
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
    const plane = this.root.querySelector<HTMLElement>('#canvas-plane')!;
    const indexes = new Map(w.nodes.map((n) => [n.id, n]));
    const selectedIds = new Set(ui.canvas.selections);
    const componentIndex = new Map<string, NonNullable<typeof w.canvasGroups>[number]>();
    for (const group of w.canvasGroups ?? [])
      if (isComponent(w, group, indexes))
        for (const id of group.nodes) componentIndex.set(id, group);
    const layers = new Map(
      [...plane.querySelectorAll<HTMLElement>('[data-controls-for]')].map((el) => [
        el.dataset.controlsFor!,
        el,
      ]),
    );
    // Mantener el material conserva el destino del doble clic y la captura del puntero.
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((element) => {
      const node = indexes.get(element.dataset.node!);
      if (!node) return;
      const selected = selectedIds.has(node.id);
      element.classList.toggle('selected', selected);
      const component = componentIndex.get(node.id);
      const editing = component?.id === ui.canvas.componentEditing?.group;
      element.classList.toggle('component-part', !!component && !editing);
      element.classList.toggle('primary-selection', node.id === ui.canvas.selection);
      let layer = layers.get(node.id);
      if (
        selected &&
        ui.canvas.tool === 'select' &&
        !connect &&
        (!component || (editing && ui.canvas.selections.length === 1))
      ) {
        if (node.rotation && !layer) layer = controlLayer(plane, element, node);
        if (layer) {
          if (!node.rotation) {
            layer.remove();
            layer = undefined;
          } else {
            element.querySelectorAll('.resize-handle').forEach((h) => layer!.append(h));
            layers.delete(node.id);
          }
        }
        const host = layer ?? element;
        if (!host.querySelector('.resize-handle'))
          host.insertAdjacentHTML(
            'beforeend',
            isArrow(node)
              ? arrowHandles(node)
              : resizeHandles('node', node.id, node.data.kind === 'text'),
          );
      } else element.querySelectorAll('.resize-handle').forEach((handle) => handle.remove());
      const ports = element.querySelectorAll('.connection-port');
      if (connect && !ports.length) element.insertAdjacentHTML('beforeend', connectionPorts(node));
      else if (!connect) ports.forEach((port) => port.remove());
    });
    this.root.querySelectorAll<HTMLElement>('[data-zone]').forEach((element) => {
      const zone = w.zones.find((z) => z.id === element.dataset.zone);
      if (zone) element.classList.toggle('selected', zone.id === ui.canvas.zoneSelection);
    });
    layers.forEach((layer) => layer.remove());
    showRotation(
      this.root.querySelector<HTMLElement>('#canvas-plane')!,
      ui.canvas.tool === 'select' && !connect
        ? w.nodes.filter((n) => selectedIds.has(n.id) && !n.owner)
        : [],
    );
    if (keepLinks) {
      this.root.querySelectorAll<SVGElement>('[data-link]').forEach((el) => {
        const selected = el.dataset.link === ui.canvas.linkSelection;
        el.classList.toggle('selected', selected);
        el.querySelector('.link-hit')?.setAttribute('aria-pressed', String(selected));
      });
      this.paintGroups();
    } else this.paintLinks();
    this.paintMaterialIdentifications();
    const holder = this.root.querySelector('#selection-actions'),
      node = w.nodes.find((n) => n.id === ui.canvas.selection && !n.owner),
      zone = w.zones.find((z) => z.id === ui.canvas.zoneSelection);
    if (!holder) return;
    if (node) holder.innerHTML = '';
    else if (zone) {
      const agent = w.agents.find((a) => a.id === zone.agent),
        materials = w.nodes.filter((n) => n.owner === zone.agent && !!zone.agent);
      holder.innerHTML = `<aside class="zone-inspector" aria-label="Inspector de zona"><div class="inspector-head"><span>${icon('zone', 15)}<label class="zone-name-label" for="zone-name">Zona</label></span><div>${btn('zone-delete', 'trash', 'Eliminar zona', `data-id="${zone.id}"`)}${btn('inspector-close', 'close', 'Cerrar panel de zona')}</div></div><input id="zone-name" aria-label="Nombre de la zona" placeholder="Zona sin nombre" value="${html(zone.name)}"><label for="zone-agent">Agente asignado</label><select id="zone-agent" aria-label="Agente de la zona"><option value="">Elegir agente…</option>${w.agents
        .filter(
          (a) =>
            !a.templateId ||
            a.id === zone.agent ||
            (w.assignments.some((job) => job.agent === a.id) &&
              !w.zones.some((item) => item.agent === a.id)),
        )
        .map(
          (a) =>
            `<option value="${a.id}" ${zone.agent === a.id ? 'selected' : ''}>${html(a.name)}${w.assignments.some((job) => job.agent === a.id) && !w.zones.some((item) => item.agent === a.id) ? ' · Trabajo sin zona' : ''}</option>`,
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
    } else holder.innerHTML = '';
  }
  private floatingChatBounds(): DOMRect | null {
    const panel = this.root.querySelector<HTMLElement>('.canvas-chat.quick');
    // Medir el destino de layout, no la posición intermedia de su animación.
    return panel
      ? new DOMRect(panel.offsetLeft, panel.offsetTop, panel.offsetWidth, panel.offsetHeight)
      : null;
  }
  private paintZoneLabels(camera = this.cam.current): void {
    const holder = this.root.querySelector<HTMLElement>('#canvas-zone-labels');
    if (!holder) return;
    const { width, height } = this.rect(),
      world = this.ctx.world();
    const empty = world.zones.filter(
      (zone) => !zone.agent || !world.nodes.some((node) => node.owner === zone.agent),
    );
    // Texto en coordenadas de pantalla: nunca se rasteriza dentro del plano escalado.
    // En zonas diminutas se conserva el indicador, sin apilar palabras recortadas.
    for (const old of holder.querySelectorAll<HTMLElement>('[data-zone-label]'))
      if (!empty.some((zone) => zone.id === old.dataset.zoneLabel)) old.remove();
    for (const zone of empty) {
      let label = holder.querySelector<HTMLElement>(`[data-zone-label="${CSS.escape(zone.id)}"]`);
      if (!label) {
        label = document.createElement('span');
        label.className = 'drop-label';
        label.dataset.zoneLabel = zone.id;
        holder.append(label);
      }
      const w = zone.width * camera.z,
        h = zone.height * camera.z;
      const mode = w >= 230 && h >= 72 ? 'full' : w >= 140 && h >= 36 ? 'compact' : 'icon';
      if (label.dataset.density !== mode || label.dataset.agent !== (zone.agent ?? '')) {
        label.dataset.density = mode;
        label.dataset.agent = zone.agent ?? '';
        label.innerHTML = !zone.agent
          ? mode === 'icon'
            ? icon('agents', 14)
            : 'Elegí un agente'
          : mode === 'full'
            ? 'Arrastrá un material acá<span>El agente lo usará como contexto</span>'
            : mode === 'compact'
              ? 'Arrastrá material acá'
              : icon('plus', 14);
      }
      label.hidden = w < 24 || h < 24;
      Object.assign(label.style, {
        left: Math.round(width / 2 + camera.x + (zone.x + zone.width / 2) * camera.z) + 'px',
        top: Math.round(height / 2 + camera.y + (zone.y + zone.height / 2) * camera.z) + 'px',
        fontSize: (mode === 'full' ? 16 : 12) + 'px',
      });
    }
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
    const quick =
      this.floatingChatBounds() ??
      (this.ctx.ui.chat.chatMode === 'closed'
        ? this.root.querySelector('.chat-launch')?.getBoundingClientRect()
        : null);
    if (avoidChat && quick && !this.chatHidden()) {
      const clear = (point: Point): boolean =>
        point.x >= 12 &&
        point.y >= 71 &&
        point.x + rect.width <= innerWidth - 12 &&
        point.y + rect.height <= innerHeight - 12 &&
        (point.x >= quick.right + 12 ||
          point.x + rect.width <= quick.left - 12 ||
          point.y >= quick.bottom + 12 ||
          point.y + rect.height <= quick.top - 12);
      // La holgura se aplica al separar una colisión, no como un halo que
      // expulse el dock cuando el usuario lo deja cerca sin superponerlo.
      if (
        this.dock.x < quick.right &&
        this.dock.x + rect.width > quick.left &&
        this.dock.y < quick.bottom &&
        this.dock.y + rect.height > quick.top
      ) {
        const origin = this.dock;
        const candidates = [
          { x: quick.right + 12, y: origin.y },
          { x: quick.left - rect.width - 12, y: origin.y },
          { x: origin.x, y: quick.top - rect.height - 12 },
          { x: origin.x, y: quick.bottom + 12 },
        ]
          .filter(clear)
          .sort((a, b) => {
            const lateral = (p: Point): number => (p.y === origin.y ? 0 : 1);
            return (
              lateral(a) - lateral(b) ||
              Math.hypot(a.x - origin.x, a.y - origin.y) -
                Math.hypot(b.x - origin.x, b.y - origin.y)
            );
          });
        if (candidates[0]) this.dock = candidates[0];
      }
    }
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
  openIllustrations(): void {
    const trigger = this.referenceTrigger()?.getBoundingClientRect();
    this.dockMore = this.referenceMenu = false;
    this.renderDock();
    this.interactions.showIllustrations(
      { x: trigger?.left ?? innerWidth / 2 - 134, y: trigger?.top ?? innerHeight / 2 - 150 },
      '',
    );
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
      `<button type="button" data-action="${action}" title="${html(name)}" ${attributes}>${icon(symbol, 14)}<span>${html(name)}</span>${action === 'canvas-illustrations' && this.ctx.ui.shortcuts.illustrations ? '<kbd aria-hidden="true">' + html(this.ctx.ui.shortcuts.illustrations) + '</kbd>' : ''}</button>`;
    return `<div class="reference-menu" id="canvas-material-picker" role="dialog" aria-label="Incorporar materiales"><h4>Archivos y enlaces</h4>${item('canvas-import', 'image', 'Importar archivos locales')}${item('canvas-examples', 'image', 'Cargar ejemplos multimedia')}${item('canvas-link', 'link', 'Agregar enlace')}${item('canvas-illustrations', 'sticker', 'Ilustraciones', this.ctx.ui.shortcuts.illustrations ? `aria-keyshortcuts="${html(this.ctx.ui.shortcuts.illustrations)}"` : '')}<h4>Documentos de Docs</h4>${world.docs.map((doc) => item('reference-add', 'docs', doc.title, `data-kind="document" data-id="${doc.id}"`)).join('') || '<p>No hay documentos en este Mundo.</p>'}<h4>Archivos de Code</h4>${world.files.map((file) => item('reference-add', 'code', file.name, `data-kind="file" data-id="${file.id}"`)).join('') || '<p>No hay archivos de código.</p>'}<h4>Tareas de Board</h4>${world.tasks.map((task) => item('reference-add', 'board', task.title, `data-kind="task" data-id="${task.id}"`)).join('') || '<p>No hay tareas.</p>'}</div>`;
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
    const minimumWidth = Math.min(dock.classList.contains('vertical-tools') ? 180 : 220, width);
    // Los ocho píxeles al dock más el inset del disparador no deben superar veinte.
    const before =
      rightSpace < minimumWidth && leftSpace >= minimumWidth && origin.left - bounds.left <= 12;
    const sideways = rightSpace >= minimumWidth || before;
    const aboveSpace = bounds.top - 78,
      belowSpace = innerHeight - bounds.bottom - 20;
    const above = aboveSpace >= belowSpace;
    menu.style.maxHeight =
      Math.max(36, Math.min(320, sideways ? innerHeight - 82 : above ? aboveSpace : belowSpace)) +
      'px';
    let left: number, top: number;
    if (sideways) {
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
  private positionStyle(): void {
    const style = this.root.querySelector<HTMLElement>('.canvas-style');
    const dock = this.root.querySelector<HTMLElement>('.canvas-tools');
    if (!style || !dock) return;
    const selected = this.ctx
      .world()
      .nodes.find((node) => node.id === this.ctx.ui.canvas.selection);
    const chosen = dock.querySelector<HTMLElement>(
      this.ctx.ui.canvas.linkSelection
        ? '[data-tool=connect]'
        : shapePalette.includes(this.ctx.ui.canvas.tool as Shape) ||
            (selected && isArrow(selected)) ||
            selected?.data.kind === 'shape'
          ? '[data-action=shapes]'
          : '[data-tool=drawing]',
    );
    const trigger = chosen?.offsetWidth
      ? chosen
      : dock.querySelector<HTMLElement>('[data-action=dock-more]')!;
    this.positionToolPanel(style, trigger, dock);
    this.interactions?.positionColorPicker();
  }
  private positionShapeMenu(): void {
    const panel = this.root.querySelector<HTMLElement>('.shape-menu');
    const dock = this.root.querySelector<HTMLElement>('.canvas-tools');
    const trigger = dock?.querySelector<HTMLElement>('[data-action=shapes]');
    if (panel && dock && trigger) this.positionToolPanel(panel, trigger, dock);
  }
  private positionToolPanel(panel: HTMLElement, trigger: HTMLElement, dock: HTMLElement): void {
    const origin = trigger.getBoundingClientRect(),
      bounds = dock.getBoundingClientRect();
    const chat =
      !this.chatHidden() && this.ctx.ui.chat.chatMode === 'docked' && !this.ctx.ui.chat.chatCompact
        ? this.root.querySelector('.canvas-chat.docked')?.getBoundingClientRect()
        : null;
    const minimumLeft =
      chat && innerWidth - chat.right >= panel.offsetWidth + 24 ? chat.right + 12 : 12;
    const left = Math.max(
      minimumLeft,
      Math.min(
        innerWidth - panel.offsetWidth - 12,
        origin.x + origin.width / 2 - panel.offsetWidth / 2,
      ),
    );
    const topEdge = dock.classList.contains('vertical-tools') ? bounds.top : origin.top;
    const bottomEdge = dock.classList.contains('vertical-tools') ? bounds.bottom : origin.bottom;
    const above = topEdge - panel.offsetHeight - 12 >= 70;
    Object.assign(panel.style, {
      left: left + 'px',
      top:
        Math.max(
          70,
          Math.min(
            innerHeight - panel.offsetHeight - 12,
            above ? topEdge - panel.offsetHeight - 12 : bottomEdge + 12,
          ),
        ) + 'px',
      bottom: 'auto',
      transform: 'none',
    });
    panel.classList.toggle('below', !above);
    panel.style.setProperty(
      '--style-pointer',
      Math.max(16, Math.min(panel.offsetWidth - 16, origin.x + origin.width / 2 - left)) + 'px',
    );
  }
  private renderDock(animate = true): void {
    const restoreFocus = preserveFocus(this.root);
    if (!animate)
      for (const panel of this.root.querySelectorAll(
        '.canvas-tools,.canvas-style,.shape-menu,.reference-menu',
      ))
        for (const animation of panel.getAnimations()) animation.cancel();
    const previousPanels = new Map(
      ['.canvas-tools', '.canvas-style', '.reference-menu', '.shape-menu'].map(
        (selector) =>
          [selector, this.root.querySelector(selector)?.getBoundingClientRect()] as const,
      ),
    );
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
        ['text', 'text', 'Texto'],
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
    holder.innerHTML = `<div class="canvas-tools" role="toolbar" aria-label="Herramientas de Canvas" style="${this.dock ? `left:${this.dock.x}px;top:${this.dock.y}px;bottom:auto;transform:none` : ''}"><span class="dock-grip" data-action="dock-grip">${icon('grip', 14)}</span>${tools}${btn('canvas-tool', 'draw', 'Dibujar', 'data-tool="drawing"', ctx.ui.canvas.tool === 'drawing')}<div class="shape-picker dock-extra">${btn('shapes', 'shapes', 'Formas', `aria-expanded="${this.shapesOpen}"`, this.shapesOpen || shapePalette.includes(ctx.ui.canvas.tool as Shape))}</div>${btn('canvas-tool', 'link', 'Conectar' + (ctx.ui.shortcuts.connect ? ' · ' + ctx.ui.shortcuts.connect : ''), 'data-tool="connect" data-dock-secondary', ctx.ui.canvas.tool === 'connect')}${btn('canvas-comment', 'bubble', 'Comentar' + (ctx.ui.shortcuts.comment ? ' · ' + ctx.ui.shortcuts.comment : ''), 'data-dock-secondary', ctx.ui.canvas.tool === 'comment')}${btn('canvas-tool', 'zone', 'Dibujar zona', 'data-tool="zone" data-dock-secondary', ctx.ui.canvas.tool === 'zone')}${btn('references', 'plus', 'Incorporar materiales', `data-dock-secondary aria-haspopup="dialog" aria-expanded="${this.referenceMenu}" aria-controls="canvas-material-picker"`)}${btn('dock-more', 'more', 'Más herramientas', `aria-haspopup="menu" aria-expanded="${this.dockMore}"`)}</div>${this.shapesOpen ? `<div class="shape-menu" role="group" aria-label="Elegir forma">${shapePalette.map((shape) => btn('canvas-tool', shape, shapeNames[shape], `data-tool="${shape}"`, ctx.ui.canvas.tool === shape)).join('')}</div>` : ''}<button type="button" class="chat-launch" data-action="chat-open" aria-label="Quick Chat" data-tip="Quick Chat">${icon('conversation', 20)}</button>${this.referenceMarkup()}`;
    const selected = w.nodes.find((n) => n.id === ctx.ui.canvas.selection);
    if (
      !this.shapesOpen &&
      (ctx.ui.canvas.tool === 'drawing' ||
        shapePalette.includes(ctx.ui.canvas.tool as Shape) ||
        selected?.data.kind === 'shape' ||
        selected?.data.kind === 'drawing')
    ) {
      const shape =
        selected?.data.kind === 'shape' || shapeTools.includes(ctx.ui.canvas.tool as Shape);
      holder.insertAdjacentHTML(
        'beforeend',
        `<div class="canvas-style" aria-label="Estilo de dibujo y formas"><label>Color<input type="color" id="draw-color" data-action="color-open" value="${rgb(ctx.ui.canvas.color)}"></label>${strokePicker(ctx.ui.canvas.thickness)}${shape ? `<label>Borde<input type="color" id="shape-border" data-action="color-open" value="${rgb(ctx.ui.canvas.stroke)}"></label><label><input type="checkbox" id="shape-fill" ${ctx.ui.canvas.fill ? 'checked' : ''}>Relleno</label>` : ''}</div>`,
      );
    }
    const cable = w.links.find((link) => link.id === ctx.ui.canvas.linkSelection);
    if (cable && !this.shapesOpen && !holder.querySelector('.canvas-style')) {
      holder.insertAdjacentHTML(
        'beforeend',
        `<div class="canvas-style" role="group" aria-label="Estilo de conexión">Grosor ${strokePicker(cable.thickness ?? 1.4, 'link-thickness', linkWeights)}</div>`,
      );
    }
    const dock = holder.querySelector<HTMLElement>('.canvas-tools')!;
    const hiddenChat = this.chatHidden();
    const docked = ctx.ui.chat.chatMode === 'docked' && !ctx.ui.chat.chatCompact && !hiddenChat;
    const chatWidth = docked ? Math.min(310, innerWidth - 76) : 0;
    const vertical = ctx.ui.shell.canvasDockOrientation === 'vertical';
    dock.classList.toggle('vertical-tools', vertical);
    const available = innerWidth - chatWidth;
    const slots = Array.from(dock.children).filter(
      (item): item is HTMLElement => item instanceof HTMLElement,
    );
    // Medir los controles reales y retirar solo el último que no entra. Se reserva
    // el desborde desde el primer elemento retirado, sin cambiar orientación.
    const budget = vertical ? innerHeight - 59 - 80 - 24 : Math.max(0, available - 24);
    const extent = (): number => (vertical ? dock.scrollHeight + 2 : dock.scrollWidth + 2);
    let compact = extent() > budget;
    dock.classList.toggle('compact-tools', compact);
    if (compact) {
      for (const slot of slots.slice(1, -1).reverse()) {
        if (extent() <= budget) break;
        slot.hidden = true;
      }
    }
    dock.classList.toggle(
      'minimal-tools',
      compact && slots.slice(1, -1).every((slot) => slot.hidden),
    );
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
        `<div class="dock-more-menu" role="menu" aria-label="Más herramientas de Canvas">${(['select', 'hand', 'note', 'text', 'drawing'] as const).map((tool) => item('canvas-tool', { select: 'select', hand: 'hand', note: 'note', text: 'text', drawing: 'draw' }[tool], { select: 'Seleccionar', hand: 'Panear', note: 'Crear nota', text: 'Texto', drawing: 'Dibujar' }[tool], `data-tool="${tool}"`)).join('')}${shapePalette.map((shape) => item('canvas-tool', shape, shapeNames[shape], `data-tool="${shape}"`)).join('')}${item('canvas-tool', 'link', 'Conectar' + (ctx.ui.shortcuts.connect ? ' · ' + ctx.ui.shortcuts.connect : ''), 'data-tool="connect"')}${item('canvas-comment', 'bubble', 'Comentar' + (ctx.ui.shortcuts.comment ? ' · ' + ctx.ui.shortcuts.comment : ''))}${item('canvas-tool', 'zone', 'Dibujar zona', 'data-tool="zone"')}${item('references', 'plus', 'Incorporar materiales')}</div>`,
      );
      const menu = holder.querySelector<HTMLElement>('.dock-more-menu')!,
        bounds = dock.getBoundingClientRect();
      const shown = new Set(
        slots
          .filter((slot) => !slot.hidden)
          .flatMap((slot) =>
            [slot, ...slot.querySelectorAll<HTMLElement>('[data-action]')].map(
              (item) => item.dataset.action + ':' + (item.dataset.tool ?? ''),
            ),
          ),
      );
      for (const button of menu.querySelectorAll<HTMLElement>('[data-action]'))
        if (
          shown.has(button.dataset.action + ':' + (button.dataset.tool ?? '')) ||
          (shapePalette.includes(button.dataset.tool as Shape) && shown.has('shapes:'))
        )
          button.remove();
      menu.style.left = `${Math.max(12, Math.min(innerWidth - menu.offsetWidth - 12, vertical ? bounds.left - menu.offsetWidth - 8 : bounds.left + bounds.width / 2 - menu.offsetWidth / 2))}px`;
      menu.style.top = `${Math.max(70, Math.min(innerHeight - menu.offsetHeight - 12, vertical ? bounds.top : bounds.top - menu.offsetHeight - 8))}px`;
      const trigger = dock
        .querySelector<HTMLElement>('[data-action=dock-more]')!
        .getBoundingClientRect();
      menu.style.transformOrigin = `${Math.max(0, Math.min(menu.offsetWidth, trigger.x + trigger.width / 2 - parseFloat(menu.style.left)))}px ${Math.max(0, Math.min(menu.offsetHeight, trigger.y + trigger.height / 2 - parseFloat(menu.style.top)))}px`;
    } else this.dockMore = false;
    this.positionStyle();
    this.positionShapeMenu();
    this.positionReferenceMenu();
    if (animate && !reducedMotion()) {
      for (const [selector, previous] of previousPanels) {
        const panel = holder.querySelector<HTMLElement>(selector);
        if (!panel || !previous) continue;
        const current = panel.getBoundingClientRect();
        if (Math.hypot(previous.x - current.x, previous.y - current.y) > 1)
          panel.animate(
            // Cruzar el chat flotante con controles animados puede interceptar su primer gesto.
            !hiddenChat && this.floatingChatBounds()
              ? [{ opacity: 0.2 }, { opacity: 1 }]
              : [
                  { translate: `${previous.x - current.x}px ${previous.y - current.y}px` },
                  { translate: '0px 0px' },
                ],
            {
              duration: !hiddenChat && this.floatingChatBounds() ? 150 : motion.panelOpenMs,
              easing: motion.panelEase,
            },
          );
      }
    }
    restoreFocus();
  }

  render(): void {
    // Las mediciones tardías de fuentes pueden solicitar otro render. El fin
    // del giro pinta el estado vigente y hasta entonces conserva la captura.
    if (this.drag?.kind === 'rotate') return;
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
    plane.innerHTML = `<div class="canvas-groups"></div><svg class="canvas-links" width="1" height="1"></svg>${w.zones.map((z) => zoneMarkup(w, z, z.id === this.ctx.ui.canvas.zoneSelection)).join('')}${w.nodes
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
    (plane as HTMLElement).dataset.overview = String(camera.z < 0.25);
    this.root.querySelector<HTMLElement>('.canvas-stage')!.dataset.background =
      this.ctx.ui.shell.canvasBackground;
    this.paintZoneLabels(camera);
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
    this.directText.position(this.cam.current);
    restoreNoteFonts(this.root, (paper) => {
      if (!paper.matches('.material.text') || this.root.dataset.editingText === paper.dataset.node)
        return;
      const w = this.ctx.world(),
        n = w.nodes.find((n) => n.id === paper.dataset.node && !n.owner);
      if (n?.data.kind !== 'text') return;
      const bounds = textBounds(n.data, n.width);
      if (n.width !== bounds.width || n.height !== bounds.height)
        this.ctx.act(
          { type: 'text.measure', world: w.id, id: n.id, ...bounds },
          'ajustar texto a la fuente cargada',
          'C08-TEXT-01',
          'service',
        );
    });
    restoreFocus();
  }
  dispose(): void {
    if (this.drag?.kind === 'rotate') this.clearRotationCursor();
    this.directText.finish(false, false);
    this.locateMotion?.cancel();
    this.proposalMotions.forEach((animation) => animation.cancel());
    this.abort.abort();
    this.chat.dispose();
    this.interactions.dispose();
    this.cam.dispose();
    if (this.ctx.camera === this.cam) this.ctx.camera = null;
  }
}
