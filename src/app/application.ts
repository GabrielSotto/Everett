import { exportDiagnostics } from '../platform/export-diagnostics';
import { WheelIntent } from '../spatial/wheel-intent';
import { navigationTuning } from '../spatial/tuning';
import {
  activeWorld,
  need,
  routeKey,
  materialRoute,
  referenceRoute,
  surfaces,
  type Route,
  type Camera,
  type WorldSnapshot,
  type Rect,
  type State,
} from '../domain/model';
import type { Command } from '../domain/command-types';
import { seed } from '../domain/seed';
import { sameSurface, isObject } from '../domain/navigation';
import { TransitionLayer } from '../ui/transitions';
import { DomainError } from '../domain/invariants';
import { Store, type Change } from './store';
import { AgentService } from './agent-service';
import { uiState, type Context } from './context';
import { trace, type Intent } from './diagnostics/trace';
import type { SpatialCamera, GravityDiagnostic } from '../spatial/camera';
import { editable, type View } from '../ui/dom';
import { Shell } from '../ui/shell';
import { bindTooltips } from '../ui/tooltips';
import { SpatialView } from '../features/spatial/view';
import { CanvasView } from '../features/canvas/view';
import { MediaView } from '../features/canvas/media-view';
import { NoteView } from '../features/canvas/note-view';
import { SessionView } from '../features/session/view';
import { CodeView } from '../features/code/view';
import { DocsView } from '../features/docs/view';
import { BoardView } from '../features/board/view';
import { AgentsView } from '../features/agents/view';
import type { Ui } from './ui-state';
import type { LocalStorage } from '../platform/local-storage';
import { shortcutCombination } from '../domain/shortcuts';
export class EverettApp implements Context {
  private readonly lifetime = new AbortController();
  private readonly unsubscribe: () => void;
  readonly store: Store;
  readonly service: AgentService;
  readonly ui = uiState();
  camera: SpatialCamera | null = null;
  private view: View | null = null;
  private shell: Shell;
  private viewport: HTMLElement;
  private scene: HTMLElement | null = null;
  private origin: Rect | null = null;
  private readonly transitions = new TransitionLayer();
  private navigationLock = 0;
  private wheelIntent = new WheelIntent();
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private root: HTMLElement,
    readonly storage: LocalStorage | null = null,
    restored?: { state: State; ui: Ui },
  ) {
    const suppliedSeed = new URLSearchParams(location.search).get('seed');
    const variation =
      suppliedSeed === null
        ? (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0)
        : Number(suppliedSeed) || 0;
    if (restored) Object.assign(this.ui, restored.ui);
    this.store = new Store(restored?.state ?? seed(location.hash === '#empty', variation));
    this.service = new AgentService(this.store);
    root.innerHTML =
      '<header id="shell"></header><main id="viewport"><div id="viewport-hud" data-fixed-presentation aria-label="Navegación espacial"></div></main><div id="notification" role="status" aria-live="polite"></div><div id="tooltip" role="tooltip"></div>';
    this.viewport = root.querySelector<HTMLElement>('#viewport')!;
    this.shell = new Shell(root.querySelector<HTMLElement>('#shell')!, this);
    const parts = location.hash.replace(/^#\/?/, '').split('/'),
      world = this.store.get().worlds.find((w) => w.id === parts[0]);
    if (world && !restored) {
      this.store.dispatch(
        {
          type: 'navigate',
          route: { kind: 'world', world: world.id },
          camera: this.store.get().camera,
        },
        trace.intent('abrir mundo', 'NAV-01', 'service'),
      );
      const surface = surfaces.find((s) => s === parts[1]);
      if (surface)
        this.store.dispatch(
          {
            type: 'navigate',
            route: { kind: 'surface', world: world.id, surface, entity: parts[2] ?? null },
            camera: this.store.get().camera,
          },
          trace.intent('abrir superficie', 'NAV-01', 'service'),
        );
    }
    this.unsubscribe = this.store.subscribe((change) => {
      this.changed(change);
      this.persist();
    });
    this.mount(false);
    this.shell.render();
    this.viewport.addEventListener('wheel', (e) => this.wheel(e), {
      passive: false,
      capture: true,
      signal: this.lifetime.signal,
    });
    window.addEventListener('keydown', (e) => this.key(e), { signal: this.lifetime.signal });
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.target instanceof Element && !e.target.closest('#shell')) {
          if (
            document.activeElement instanceof HTMLInputElement &&
            document.activeElement.id === 'global-search'
          )
            document.activeElement.blur();
          if (
            this.ui.shell.filters ||
            this.ui.shell.status ||
            this.ui.shell.profile ||
            this.ui.shell.surfaceMenu
          ) {
            this.ui.shell.filters = false;
            this.ui.shell.status = false;
            this.ui.shell.profile = false;
            this.ui.shell.surfaceMenu = false;
            this.shell.render();
          }
        }
      },
      { capture: true, signal: this.lifetime.signal },
    );
    window.addEventListener(
      'error',
      (e) => this.fail(e.error ?? new Error(e.message), 'window.error'),
      { signal: this.lifetime.signal },
    );
    window.addEventListener(
      'unhandledrejection',
      (e) => {
        e.preventDefault();
        this.fail(e.reason, 'unhandledrejection');
      },
      { signal: this.lifetime.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') this.flushSave();
      },
      { signal: this.lifetime.signal },
    );
    window.addEventListener(
      'pagehide',
      (event) => {
        this.flushSave();
        if (!event.persisted) this.dispose();
      },
      { signal: this.lifetime.signal },
    );
    bindTooltips(this.root, this.lifetime.signal);
    root.addEventListener('input', () => this.persist(), { signal: this.lifetime.signal });
    root.addEventListener('pointerup', () => this.persist(), { signal: this.lifetime.signal });
    root.addEventListener('click', () => this.persist(), { signal: this.lifetime.signal });
    window.EverettDebug = Object.freeze({
      snapshot: () => ({
        state: this.store.snapshot(),
        ui: structuredClone(this.ui),
        camera: this.currentCamera(),
        focus: this.camera?.focused ?? null,
        gravity: this.camera?.diagnostics() ?? null,
      }),
      logs: () => trace.snapshot(),
    });
    window.__everettReady = true;
    this.persist();
    this.service.resume();
    trace.add('application.ready', {
      worldCount: this.store.get().worlds.length,
      route: routeKey(this.store.get().route),
    });
  }
  dispose(): void {
    if (this.lifetime.signal.aborted) return;
    this.lifetime.abort();
    this.unsubscribe();
    this.service.dispose();
    this.transitions.cancel();
    this.view?.dispose();
    this.shell.dispose();
    if (this.noticeTimer !== null) clearTimeout(this.noticeTimer);
    delete window.EverettDebug;
    window.__everettReady = false;
    this.root.replaceChildren();
  }
  persist(): void {
    this.flushSave();
  }
  private flushSave(): void {
    if (!this.storage) return;
    const state = this.store.snapshot();
    state.camera = this.currentCamera();
    void this.storage!.save(state, this.ui)
      .then(() => {
        const panel = this.root.querySelector<HTMLElement>('#notification');
        if (panel?.dataset.storageFailure === 'true') this.notice('Guardado local recuperado.');
      })
      .catch((error) => {
        trace.add('storage.failed', { message: String(error) }, undefined, undefined, 'warn');
        const panel = this.root.querySelector<HTMLElement>('#notification');
        if (!panel) return;
        if (this.noticeTimer !== null) clearTimeout(this.noticeTimer);
        panel.className = 'visible error';
        panel.dataset.storageFailure = 'true';
        panel.textContent = 'No se pudo guardar. El trabajo sigue disponible en esta ventana. ';
        const retry = document.createElement('button');
        retry.textContent = 'Reintentar';
        retry.onclick = () => this.persist();
        const backup = document.createElement('button');
        backup.textContent = 'Descargar copia';
        backup.onclick = () => {
          void this.storage!.backup(this.store.snapshot(), this.ui)
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Everett-respaldo.json';
              a.click();
              URL.revokeObjectURL(url);
            })
            .catch((error) => this.notice('No se pudo descargar la copia. ' + String(error), true));
        };
        panel.append(retry, backup);
      });
  }
  world(): WorldSnapshot {
    return need(activeWorld(this.store.get()), 'No hay un mundo abierto');
  }
  currentCamera(): Camera {
    return this.camera?.current ?? { ...this.store.get().camera };
  }
  act(
    command: Command,
    verb: string,
    requirement: string,
    source: Intent['source'] = 'pointer',
    interaction?: string,
  ): boolean {
    try {
      this.store.dispatch(command, trace.intent(verb, requirement, source, interaction));
      return true;
    } catch (error) {
      if (error instanceof DomainError) this.notice(error.message, true);
      else this.fail(error, 'command:' + command.type);
      return false;
    }
  }
  go(route: Route, origin?: DOMRect, intent?: Intent): void {
    if (routeKey(route) === routeKey(this.store.get().route)) return;
    this.origin = origin
      ? { x: origin.x, y: origin.y, width: origin.width, height: origin.height }
      : null;
    this.act(
      { type: 'navigate', route, camera: this.currentCamera() },
      'entrar',
      intent?.requirement ?? 'NAV-01',
      intent?.source ?? 'pointer',
      intent?.interaction,
    );
  }
  back(intent?: Intent): void {
    this.origin = null;
    this.act(
      { type: 'back' },
      'salir',
      intent?.requirement ?? 'NAV-01',
      intent?.source ?? 'wheel',
      intent?.interaction,
    );
  }
  locateMaterial(world: string, id: string): void {
    const source = this.store.get().worlds.find((item) => item.id === world);
    if (!source?.nodes.some((node) => node.id === id)) {
      this.notice('El material ya no está disponible en Canvas.', true);
      return;
    }
    this.go({ kind: 'surface', world, surface: 'canvas', entity: null });
    if (this.view instanceof CanvasView) this.view.locateMaterial(id);
  }
  render(): void {
    this.view?.render();
  }
  renderShell(): void {
    this.shell.render();
  }
  cameraChanged(): void {
    this.shell.refreshCamera();
  }
  notice(message: string, error = false): void {
    const el = this.root.querySelector<HTMLElement>('#notification');
    if (!el) return;
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    delete el.dataset.storageFailure;
    el.textContent = message;
    el.className = 'visible' + (error ? ' error' : '');
    this.noticeTimer = setTimeout(() => el.classList.remove('visible'), 5000);
  }
  fail(error: unknown, source: string): void {
    trace.error(error, source);
    this.notice(error instanceof Error ? error.message : String(error), true);
  }
  private changed(change: Change): void {
    if (change.refresh === 'navigation') {
      const oldRoute = change.beforeRoute;
      if (oldRoute.kind !== 'universe') {
        const { chatDrafts: _drafts, ...presentation } = this.ui.chat;
        this.ui.chatContexts[oldRoute.world] = structuredClone(presentation);
        if (oldRoute.kind === 'surface' && oldRoute.surface === 'canvas')
          this.ui.canvasContexts[oldRoute.world] = {
            camera: this.currentCamera(),
            selection: this.ui.canvas.selection,
            selections: [...this.ui.canvas.selections],
            zone: this.ui.canvas.zoneSelection,
            link: this.ui.canvas.linkSelection,
          };
      }
      this.ui.shell.status = false;
      this.ui.shell.profile = false;
      this.ui.shell.surfaceMenu = false;
      this.ui.auxiliary.slot = null;
      this.ui.auxiliary.tools = false;
      this.ui.code.codeComposer = false;
      this.ui.code.codeResponse = false;
      this.ui.code.currentFile = null;
      this.ui.canvas.selection = null;
      this.ui.canvas.selections = [];
      this.ui.canvas.tool = 'select';
      this.ui.canvas.linkStart = null;
      this.ui.canvas.zoneSelection = null;
      this.ui.canvas.linkSelection = null;
      const route = this.store.get().route;
      if (
        route.kind !== 'universe' &&
        (oldRoute.kind === 'universe' || oldRoute.world !== route.world)
      ) {
        Object.assign(
          this.ui.chat,
          this.ui.chatContexts[route.world] ?? {
            chatMode: 'closed',
            chatTab: 'chat',
            chatCompact: false,
            chatPosition: { x: 22, y: 160 },
          },
        );
      }
      if (route.kind === 'surface' && route.surface === 'canvas') {
        const saved = this.ui.canvasContexts[route.world],
          world = this.world();
        if (saved) {
          this.ui.canvas.selection = world.nodes.some((n) => n.id === saved.selection && !n.owner)
            ? saved.selection
            : null;
          this.ui.canvas.selections = saved.selections.filter((id) =>
            world.nodes.some((n) => n.id === id && !n.owner),
          );
          this.ui.canvas.zoneSelection = world.zones.some((z) => z.id === saved.zone)
            ? saved.zone
            : null;
          this.ui.canvas.linkSelection = world.links.some((l) => l.id === saved.link)
            ? saved.link
            : null;
          if (change.command.type === 'navigate')
            this.act(
              { type: 'camera', camera: saved.camera },
              'recuperar cámara de Canvas',
              'C08-STATE-01',
              'service',
            );
        }
      }
      const sibling =
        sameSurface(change.beforeRoute, route) &&
        change.beforeRoute.kind === 'surface' &&
        route.kind === 'surface' &&
        isObject(change.beforeRoute) &&
        isObject(route);
      this.navigationLock = Date.now() + navigationTuning.cooldownMs;
      this.wheelIntent.lock(navigationTuning.cooldownMs);
      if (sibling) {
        const selector =
          route.kind === 'surface' && route.surface === 'docs' ? '.document-scroll' : '.agent-body';
        const oldContent = this.scene?.querySelector<HTMLElement>(selector) ?? null;
        this.transitions.capture(oldContent, this.viewport, 'content');
        this.view?.render();
        this.viewport.dataset.route = routeKey(route);
        const content = this.scene?.querySelector<HTMLElement>(selector);
        if (content)
          this.transitions.play(
            content,
            this.viewport,
            change.beforeRoute,
            route,
            null,
            false,
            change.intent,
          );
        trace.add(
          'navigation.sibling',
          { from: routeKey(change.beforeRoute), to: routeKey(route) },
          change.intent,
        );
      } else
        this.mount(
          true,
          change.command.type === 'back' || change.command.type === 'universe',
          change.beforeRoute,
          change.intent,
        );
      this.shell.render();
    } else if (change.refresh === 'content') {
      const state = this.store.get(),
        active = activeWorld(state);
      if (!('world' in change.command) || active?.id === change.command.world) this.view?.render();
      if (
        this.ui.shell.status ||
        this.ui.shell.filters ||
        this.ui.shell.searchOpen ||
        change.command.type === 'world.shipping' ||
        change.command.type === 'profile.edit' ||
        (state.route.kind === 'surface' && state.route.surface === 'canvas')
      )
        this.shell.render();
    } else if (change.command.type !== 'camera') {
      // Las ediciones conservan el DOM del editor; los resultados sí derivan del contenido nuevo.
      this.shell.refreshSearch();
    }
  }
  private mount(
    animate: boolean,
    back = false,
    from: Route = this.store.get().route,
    intent: Intent = trace.intent('abrir', 'MOTION-01'),
  ): void {
    const old = this.scene;
    if (animate) this.transitions.capture(old, this.viewport);
    else this.transitions.cancel();
    this.view?.dispose();
    old?.remove();
    const scene = document.createElement('section');
    scene.className = 'scene';
    scene.id = 'scene';
    scene.tabIndex = -1;
    this.viewport.append(scene);
    this.scene = scene;
    const r = this.store.get().route;
    this.viewport.dataset.route = routeKey(r);
    document.body.dataset.mode = r.kind === 'universe' || r.kind === 'world' ? 'space' : 'work';
    if (r.kind === 'universe' || r.kind === 'world') this.view = new SpatialView(scene, this);
    else if (r.kind === 'note') this.view = new NoteView(scene, this);
    else if (r.kind === 'material') this.view = new MediaView(scene, this);
    else
      switch (r.surface) {
        case 'session':
          this.view = new SessionView(scene, this);
          break;
        case 'code':
          this.view = new CodeView(scene, this);
          break;
        case 'canvas':
          this.view = new CanvasView(scene, this);
          break;
        case 'docs':
          this.view = new DocsView(scene, this);
          break;
        case 'board':
          this.view = new BoardView(scene, this);
          break;
        case 'agents':
          this.view = new AgentsView(scene, this);
          break;
      }
    if (animate) this.transitions.play(scene, this.viewport, from, r, this.origin, back, intent);
    const tooltip = this.root.querySelector<HTMLElement>('#tooltip');
    if (tooltip) tooltip.classList.remove('visible');
  }
  private wheel(e: WheelEvent): void {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('#minimap')) return;
    const route = this.store.get().route,
      spatial = route.kind === 'universe' || route.kind === 'world';
    if (!spatial && !e.altKey) {
      if (
        route.kind === 'surface' &&
        route.surface === 'canvas' &&
        !target?.closest(
          '.canvas-chat,.zone-inspector,.zone-materials,.canvas-context-layer,.proposal,.dock-more-menu,.reference-menu,textarea,input,select,[contenteditable=true]',
        )
      ) {
        e.preventDefault();
        const rect = this.viewport.getBoundingClientRect();
        this.camera?.zoom(e.deltaY, {
          x: e.clientX - rect.x - rect.width / 2,
          y: e.clientY - rect.y - rect.height / 2,
        });
        this.persist();
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (Date.now() < this.navigationLock) return;
    if (this.view instanceof SpatialView) {
      this.view.wheel(delta);
      return;
    }
    const direction = this.wheelIntent.consume(delta);
    if (!direction) return;
    if (direction === 'leave') {
      this.back();
      return;
    }
    if (route.kind !== 'surface') return;
    const node = target?.closest<HTMLElement>('[data-node]');
    if (route.surface === 'canvas' && node?.dataset.node) {
      const destination = materialRoute(this.store.get(), route.world, node.dataset.node);
      if (destination) this.go(destination, node.getBoundingClientRect());
      return;
    }
    const ref = target?.closest<HTMLElement>('[data-ref-kind][data-ref-id]'),
      kind = ref?.dataset.refKind;
    if (
      ref?.dataset.refId &&
      (kind === 'document' || kind === 'file' || kind === 'task' || kind === 'agent')
    )
      this.go(
        referenceRoute(route.world, { kind, id: ref.dataset.refId }),
        ref.getBoundingClientRect(),
      );
  }
  private key(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.shell.toggleSearch();
      return;
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      exportDiagnostics(trace, { route: this.store.get().route, camera: this.currentCamera() });
      return;
    }
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.ui.shell.searchOpen) {
        this.ui.shell.searchOpen = false;
        this.ui.shell.search = '';
        this.shell.render();
        this.render();
        this.root
          .querySelector<HTMLElement>('[data-action=search]')
          ?.focus({ preventScroll: true });
      } else if (this.view?.closeTransient?.()) {
        this.persist();
        return;
      } else if (this.ui.code.codeComposer) {
        this.ui.code.codeComposer = false;
        this.render();
      } else if (this.view instanceof CanvasView && this.ui.chat.chatMode !== 'closed') {
        this.ui.chat.chatMode = 'closed';
        this.render();
      } else this.back();
      this.persist();
      return;
    }
    const activeRoute = this.store.get().route;
    if (
      (e.ctrlKey || e.metaKey) &&
      ['z', 'y'].includes(e.key.toLowerCase()) &&
      !editable(e.target) &&
      activeRoute.kind === 'surface' &&
      activeRoute.surface === 'canvas'
    ) {
      e.preventDefault();
      const redo = e.shiftKey || e.key.toLowerCase() === 'y';
      this.act(
        { type: redo ? 'canvas.redo' : 'canvas.undo', world: activeRoute.world },
        redo ? 'rehacer' : 'deshacer',
        'UNDO-01',
        'keyboard',
      );
      this.ui.canvas.selection = null;
      this.ui.canvas.selections = [];
      this.ui.canvas.zoneSelection = null;
      this.ui.canvas.linkSelection = null;
      this.render();
      return;
    }
    if (editable(e.target)) return;
    if (e.key === 'Enter' && this.view instanceof SpatialView) {
      e.preventDefault();
      this.view.enter();
      return;
    }
    const route = this.store.get().route;
    if (route.kind === 'surface' && route.surface === 'canvas') {
      const combination = shortcutCombination(e);
      const action = Object.keys(this.ui.shortcuts).find(
        (key) => this.ui.shortcuts[key] && this.ui.shortcuts[key] === combination,
      );
      if (action && !e.repeat) {
        e.preventDefault();
        if (this.view instanceof CanvasView && action === 'comment') {
          this.view.comment();
          this.persist();
          return;
        }
        if (this.view instanceof CanvasView && action === 'rename') {
          this.view.rename();
          this.persist();
          return;
        }
        if (action === 'hand' || action === 'select' || action === 'note' || action === 'connect')
          this.ui.canvas.tool = action;
        this.ui.canvas.linkStart = null;
        this.render();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.ui.canvas.linkSelection) {
        e.preventDefault();
        this.act(
          { type: 'link.delete', world: route.world, id: this.ui.canvas.linkSelection },
          'eliminar conexión',
          'LINK-01',
          'keyboard',
        );
        this.ui.canvas.linkSelection = null;
        this.render();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.ui.canvas.zoneSelection) {
        e.preventDefault();
        this.service.cancelZone(route.world, this.ui.canvas.zoneSelection);
        this.act(
          { type: 'zone.delete', world: route.world, id: this.ui.canvas.zoneSelection },
          'eliminar zona',
          'ZONE-01',
          'keyboard',
        );
        this.ui.canvas.zoneSelection = null;
        this.render();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.ui.canvas.selection) {
        e.preventDefault();
        this.act(
          this.ui.canvas.selections.length > 1
            ? { type: 'nodes.delete', world: route.world, nodes: this.ui.canvas.selections }
            : { type: 'node.delete', world: route.world, id: this.ui.canvas.selection },
          'quitar material',
          'CANVAS-01',
          'keyboard',
        );
        this.ui.canvas.selection = null;
        this.ui.canvas.selections = [];
        this.render();
      }
    }
  }
}
declare global {
  interface Window {
    __everettReady?: boolean;
    EverettDebug?: Readonly<{
      snapshot: () => {
        state: ReturnType<Store['snapshot']>;
        ui: ReturnType<typeof uiState>;
        camera: Camera;
        focus: string | null;
        gravity: GravityDiagnostic | null;
      };
      logs: () => ReturnType<typeof trace.snapshot>;
    }>;
  }
}
