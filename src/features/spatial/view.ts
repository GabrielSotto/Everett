import { surfacePreview } from './surface-previews';
import { trace, type Intent } from '../../app/diagnostics/trace';
import { surfaces, surfaceNames, type Point, type Surface } from '../../domain/model';
import type { Context } from '../../app/context';
import { html, type View } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { SpaceBackdrop } from '../../spatial/space-backdrop';
import { PlanetRenderer } from '../../spatial/planet-renderer';
import { planets } from '../../assets/planets';
import { planetAppearance } from '../../spatial/appearance';
import { SpatialCamera } from '../../spatial/camera';
import { Minimap } from '../../spatial/minimap';
import { reducedMotion } from '../../ui/motion';
import { navigationTuning } from '../../spatial/tuning';
import { bindPointerCancellation } from '../../ui/pointer-cancellation';
export const surfacePositions: Record<Surface, Point> = {
  session: { x: -490, y: -265 },
  canvas: { x: 495, y: -265 },
  docs: { x: 535, y: 220 },
  code: { x: -510, y: 225 },
  board: { x: 25, y: 490 },
  agents: { x: 5, y: -610 },
};
export function worldMatches(
  ctx: Context,
  w: {
    name: string;
    objective: string;
    region: string;
    archived: boolean;
  },
): boolean {
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const words = normalize(ctx.ui.shell.search).split(/\s+/).filter(Boolean),
    text = normalize(w.name + ' ' + w.objective);
  return (
    words.every((word) => text.includes(word)) &&
    (ctx.ui.shell.region === 'Todas' || w.region === ctx.ui.shell.region) &&
    (!ctx.ui.shell.archived || w.archived)
  );
}
export class SpatialView implements View {
  private background: SpaceBackdrop | null = null;
  private planetRenderer: PlanetRenderer | null = null;
  private abort = new AbortController();
  private cam: SpatialCamera;
  private minimap: Minimap | null = null;
  private minimapHost: HTMLElement | null = null;
  private lastPhase = '';
  private panIntent: Intent | null = null;
  private dragging = false;
  private moved = 0;
  private down: Point | null = null;
  private zoomDirection = 0;
  private entering = false;
  private filterKey = '';
  private lastFocus: string | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    root.innerHTML =
      '<section class="space" id="space"><div class="space-plane" id="space-plane"></div></section>';
    this.cam = new SpatialCamera(
      ctx.store.get().camera,
      (camera, focused, _strength) => {
        const plane = root.querySelector<HTMLElement>('#space-plane');
        if (plane) {
          plane.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.z})`;
          plane.style.setProperty('--label-scale', String(1 / camera.z));
          plane.style.setProperty('--space-zoom', String(camera.z));
        }
        root.classList.toggle('distant', camera.z < 0.46);
        root.querySelectorAll<HTMLElement>('[data-focus]').forEach((el) => {
          const selected = el.dataset.focus === focused;
          el.classList.toggle('focused', selected);
          el.setAttribute('aria-pressed', String(selected));
          el.style.setProperty(
            '--capture',
            String(this.cam?.captureFor(el.dataset.focus ?? '') ?? 0),
          );
        });
        if (focused !== this.lastFocus) {
          this.lastFocus = focused;
          trace.add(
            'focus.changed',
            { target: focused, camera, phase: this.cam?.phase ?? 'captured' },
            trace.intent('enfocar', 'FOCUS-01'),
          );
          if (ctx.ui.shell.status) ctx.renderShell();
        }
        const diagnostic = this.cam?.diagnostics();
        if (diagnostic && diagnostic.phase !== this.lastPhase) {
          this.lastPhase = diagnostic.phase;
          trace.add(
            'gravity.phase',
            { ...diagnostic },
            (!diagnostic.manualTravel ? this.panIntent : null) ??
              trace.intent('recorrer campo', 'GRAVITY-071'),
          );
        }
        this.background?.update(camera);
        this.planetRenderer?.update(camera, (id) => this.cam.captureFor(id));
        this.minimap?.draw();
        this.checkThreshold();
      },
      ctx.store.get().route.kind === 'universe',
    );
    ctx.camera = this.cam;
    root.addEventListener('pointerdown', (e) => this.start(e), { signal: this.abort.signal });
    root.addEventListener(
      'pointermove',
      (e) => {
        if (!this.dragging || !this.down) return;
        this.moved += Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
        this.down = { x: e.clientX, y: e.clientY };
        this.cam.pan(this.down);
      },
      { signal: this.abort.signal },
    );
    root.addEventListener('pointerup', (e) => this.stop(e), { signal: this.abort.signal });
    bindPointerCancellation(root, this.abort.signal, () => {
      this.dragging = false;
      this.down = null;
      this.cam.stop();
      root.classList.remove('dragging');
    });
    root.addEventListener(
      'dblclick',
      (e) => {
        const hit = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>('[data-focus]');
        if (hit && !hit.classList.contains('dimmed')) this.enter();
      },
      { signal: this.abort.signal },
    );
    const space = root.querySelector<HTMLElement>('#space')!;
    this.background = new SpaceBackdrop(space);
    if (ctx.store.get().route.kind === 'universe') this.planetRenderer = new PlanetRenderer(space);
    this.render();
    this.background.update(this.cam.current);
  }
  private start(e: PointerEvent): void {
    if (!(e.target instanceof Element) || e.target.closest('#minimap') || e.button !== 0) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    this.zoomDirection = 0;
    this.dragging = true;
    this.moved = 0;
    this.panIntent = trace.intent('panear', 'GRAVITY-071');
    trace.add(
      'gravity.gesture.started',
      { camera: this.cam.current, pointer: { x: e.clientX, y: e.clientY } },
      this.panIntent,
    );
    this.down = { x: e.clientX, y: e.clientY };
    this.root.setPointerCapture(e.pointerId);
    this.root.classList.add('dragging');
    this.cam.start(this.down);
  }
  private stop(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.cam.stop();
    this.root.classList.remove('dragging');
    if (this.root.hasPointerCapture(e.pointerId)) this.root.releasePointerCapture(e.pointerId);
    if (this.moved < 5) {
      const element = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-focus]');
      const id = element?.dataset.focus;
      const route = this.ctx.store.get().route;
      if (id === 'new') this.cam.to({ x: 0, y: 0 }, id);
      else if (id && route.kind === 'universe') {
        const world = this.ctx.store
          .get()
          .worlds.find((w) => w.id === id && worldMatches(this.ctx, w));
        if (world) this.cam.to(world, world.id);
      } else if (id && surfaces.includes(id as Surface))
        this.cam.to(surfacePositions[id as Surface], id);
    }
    trace.add(
      'gravity.gesture.released',
      { camera: this.cam.current, ...this.cam.diagnostics() },
      this.panIntent ?? undefined,
    );
    this.ctx.act(
      { type: 'camera', camera: this.cam.current },
      'panear',
      'FOCUS-01',
      'pointer',
      this.panIntent?.interaction,
    );
  }
  wheel(delta: number): void {
    if (this.entering || this.dragging) return;
    this.zoomDirection = Math.sign(delta);
    this.cam.zoomFocused(
      Math.max(-navigationTuning.wheelStepLimit, Math.min(navigationTuning.wheelStepLimit, delta)),
    );
    trace.add(
      'camera.zoom',
      { input: delta, camera: this.cam.current, target: this.cam.focused },
      trace.intent(delta < 0 ? 'acercar' : 'alejar', 'ZOOM-01', 'wheel'),
    );
  }
  private checkThreshold(): void {
    if (!this.cam || this.entering || this.dragging || this.zoomDirection === 0) return;
    const route = this.ctx.store.get().route,
      rect = this.root.getBoundingClientRect();
    if (
      route.kind === 'world' &&
      this.zoomDirection > 0 &&
      this.cam.current.z <= navigationTuning.worldExitZoom
    ) {
      this.entering = true;
      this.ctx.back();
      return;
    }
    const id = this.cam.focused;
    if (!id || this.zoomDirection > 0) return;
    const diameter = route.kind === 'universe' ? (id === 'new' ? 370 : 194) : 246;
    const threshold = Math.min(
      navigationTuning.maximumProjectedSizePx,
      Math.max(
        navigationTuning.minimumProjectedSizePx,
        Math.min(rect.width, rect.height) * navigationTuning.viewportEntryRatio,
      ),
    );
    const item = this.root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(id)}"]`);
    if (!item) return;
    const bounds = item.getBoundingClientRect();
    const distance = Math.hypot(
      bounds.x + bounds.width / 2 - rect.x - rect.width / 2,
      bounds.y + bounds.height / 2 - rect.y - rect.height / 2,
    );
    if (
      diameter * this.cam.current.z >= threshold &&
      distance < Math.min(rect.width, rect.height) * navigationTuning.maximumFocusOffsetRatio
    ) {
      trace.add(
        'zoom.threshold',
        {
          target: id,
          projectedSize: diameter * this.cam.current.z,
          threshold,
          camera: this.cam.current,
        },
        trace.intent('entrar', 'ZOOM-01', 'wheel'),
      );
      this.enter();
    }
  }
  enter(): void {
    if (this.entering) return;
    const id = this.cam.focused,
      route = this.ctx.store.get().route;
    if (!id) return;
    const element = this.root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(id)}"]`);
    if (!element || element.classList.contains('dimmed')) return;
    this.entering = true;
    if (route.kind === 'universe') {
      if (id === 'new') {
        const ok = this.ctx.act(
          { type: 'world.create', name: '' },
          'crear mundo',
          'CREATE-01',
          'wheel',
        );
        if (!ok) this.entering = false;
      } else this.ctx.go({ kind: 'world', world: id }, element.getBoundingClientRect());
    } else if (route.kind === 'world' && surfaces.includes(id as Surface)) {
      this.ctx.go(
        { kind: 'surface', world: route.world, surface: id as Surface, entity: null },
        element.getBoundingClientRect(),
      );
    }
  }
  render(): void {
    const universe = this.ctx.store.get().route.kind === 'universe',
      plane = this.root.querySelector<HTMLElement>('#space-plane');
    if (!plane) return;
    if (universe) {
      const worlds = this.ctx.store.get().worlds,
        matches = worlds.filter((w) => worldMatches(this.ctx, w));
      const filtering = !!(
        this.ctx.ui.shell.search ||
        this.ctx.ui.shell.region !== 'Todas' ||
        this.ctx.ui.shell.archived
      );
      plane.innerHTML =
        `<button class="world-body new-world ${filtering ? 'dimmed' : ''}" data-focus="new" style="left:0;top:0" aria-label="Nuevo mundo"><span class="empty-planet"></span><span class="planet-name">Nuevo mundo</span></button>` +
        worlds
          .map((w) => {
            const appearance = planetAppearance(w.seed, w.id, planets.length);
            return `<button class="world-body ${worldMatches(this.ctx, w) ? '' : 'dimmed'}" style="left:${w.x}px;top:${w.y}px;--planet-rotate:${appearance.rotation}deg;--planet-hue:${appearance.hueShift}deg" data-skin="${appearance.signature}" data-focus="${w.id}" aria-label="${html(w.name)}"><span class="atmosphere"></span><img class="planet" src="${planets[appearance.texture]}" alt="" draggable="false"><span class="planet-name">${html(w.name)}</span></button>`;
          })
          .join('');
      this.cam.setItems(
        [...matches, ...(filtering ? [] : [{ id: 'new', x: 0, y: 0 }])],
        this.cam.focused,
      );
      const key = [
        this.ctx.ui.shell.search,
        this.ctx.ui.shell.region,
        this.ctx.ui.shell.archived,
      ].join('|');
      if (filtering && key !== this.filterKey && matches.length) {
        const xs = matches.map((w) => w.x),
          ys = matches.map((w) => w.y),
          viewport = this.root.getBoundingClientRect();
        const center = {
          x: (Math.min(...xs) + Math.max(...xs)) / 2,
          y: (Math.min(...ys) + Math.max(...ys)) / 2,
        };
        const target = [...matches].sort(
          (a, b) =>
            Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y),
        )[0]!;
        const zoom =
          matches.length === 1
            ? 0.96
            : Math.max(
                0.28,
                Math.min(
                  0.7,
                  (viewport.width - 240) / (Math.max(...xs) - Math.min(...xs) + 450),
                  (viewport.height - 180) / (Math.max(...ys) - Math.min(...ys) + 450),
                ),
              );
        this.cam.to(center, target.id, zoom);
        trace.add(
          'filter.travel',
          {
            filter: key,
            region: this.ctx.ui.shell.region,
            center,
            zoom,
            matches: matches.map((w) => w.id),
          },
          trace.intent('localizar', 'FILTER-01'),
        );
      }
      this.filterKey = key;
      if (!this.minimap) {
        const overlay = document.getElementById('viewport-hud');
        if (!overlay) throw new Error('Missing fixed spatial HUD');
        overlay.querySelectorAll('[data-map-state="leaving"]').forEach((el) => el.remove());
        this.minimapHost = document.createElement('div');
        this.minimapHost.className = 'minimap-host';
        this.minimapHost.dataset.mapState = 'active';
        overlay.append(this.minimapHost);
        this.minimap = new Minimap(this.minimapHost, this.ctx, worlds);
        // El control del viewport aparece en su posición y conserva su escala.
        this.minimapHost.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: reducedMotion() ? 60 : 150,
          easing: 'ease-out',
        });
      }
      this.minimap?.setWorlds(worlds);
      this.planetRenderer?.setBodies(worlds);
      this.planetRenderer?.update(this.cam.current, (id) => this.cam.captureFor(id));
    } else {
      plane.innerHTML = surfaces
        .map(
          (surface) =>
            `<button class="surface-object" data-focus="${surface}" style="left:${surfacePositions[surface].x}px;top:${surfacePositions[surface].y}px" aria-label="${surfaceNames[surface]}"><div class="surface-preview">${surfacePreview(surface)}</div><span class="surface-label">${icon(surface, 16)}<span class="surface-label-text">${surfaceNames[surface]}</span></span></button>`,
        )
        .join('');
      this.cam.setItems(
        surfaces.map((surface) => ({ id: surface, ...surfacePositions[surface] })),
        this.cam.focused,
      );
    }
    // El repintado conserva el destino del vuelo iniciado por búsqueda o filtro.
    plane.style.transform = `translate(${this.cam.current.x}px,${this.cam.current.y}px) scale(${this.cam.current.z})`;
  }
  dispose(): void {
    this.abort.abort();
    this.cam.dispose();
    this.background?.dispose();
    this.planetRenderer?.dispose();
    const host = this.minimapHost;
    this.minimap?.dispose(!!host);
    if (host) {
      host.inert = true;
      host.setAttribute('aria-hidden', 'true');
      host.dataset.mapState = 'leaving';
      host.querySelector('canvas')?.removeAttribute('id');
      // Conserva el bitmap y la clase al salir: cloneNode omite los píxeles del canvas.
      const animation = host.animate(
        [{ opacity: getComputedStyle(host).opacity }, { opacity: 0 }],
        { duration: reducedMotion() ? 55 : 125, fill: 'forwards', easing: 'ease-out' },
      );
      void animation.finished.catch(() => {}).finally(() => host.remove());
    }
    this.minimapHost = null;
    this.minimap = null;
    if (this.ctx.camera === this.cam) this.ctx.camera = null;
  }
}
