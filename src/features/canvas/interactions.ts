import type { Context } from '../../app/context';
import {
  nodeTitle,
  materialRoute,
  type Material,
  type Point,
  type Anchor,
} from '../../domain/model';
import { html, target, editable } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { sampleFiles } from './sample-media';
import { pdfPreview } from '../../platform/pdf-preview';
import { videoPreview } from '../../platform/video-preview';

/** Interacciones contextuales; los gestos y la cámara permanecen en CanvasView. */
export class CanvasInteractions {
  private overlay: HTMLElement;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private urls = new Map<string, Promise<string>>();
  private ownedUrls = new Set<string>();
  private disposed = false;
  private menuMaterial: string | null = null;
  private loadingSamples = false;
  private previews = new Map<string, Promise<string>>();
  private previewAbort = new AbortController();
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    signal: AbortSignal,
    private center: () => Point,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'canvas-context-layer';
    root.append(this.overlay);
    window.addEventListener('resize', () => this.fitOverlay(), { signal });
    root.addEventListener(
      'contextmenu',
      (event) => {
        const zone =
          event.target instanceof Element ? event.target.closest<HTMLElement>('[data-zone]') : null;
        if (zone && !(event.target instanceof Element && event.target.closest('[data-node]'))) {
          event.preventDefault();
          ctx.ui.canvas.zoneSelection = zone.dataset.zone ?? null;
          ctx.ui.canvas.selection = null;
          ctx.ui.canvas.selections = [];
          ctx.render();
          return;
        }
        const material =
          event.target instanceof Element ? event.target.closest<HTMLElement>('[data-node]') : null;
        if (!material?.dataset.node) return;
        event.preventDefault();
        this.menu(material.dataset.node, { x: event.clientX, y: event.clientY });
      },
      { signal },
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (
          event.target instanceof SVGElement &&
          event.target.matches('.link-endpoint') &&
          ['Enter', ' '].includes(event.key)
        ) {
          event.preventDefault();
          event.stopPropagation();
          this.reconnect(event.target.dataset.id ?? '', event.target.dataset.end as 'from' | 'to');
          return;
        }
        if (
          event.target instanceof SVGElement &&
          event.target.matches('.link-hit') &&
          ['Enter', ' '].includes(event.key)
        ) {
          event.preventDefault();
          event.stopPropagation();
          this.ctx.ui.canvas.linkSelection = (event.target as SVGElement).dataset.id ?? null;
          this.ctx.render();
          this.label((event.target as SVGElement).dataset.id ?? '');
          return;
        }
        if (!(event.target instanceof HTMLElement) || !event.target.matches('[data-node]')) return;
        const id = event.target.dataset.node!;
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          event.preventDefault();
          event.stopPropagation();
          this.menu(id, this.materialPoint(id));
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          const destination =
            event.key === 'Enter' ? materialRoute(ctx.store.get(), ctx.world().id, id) : null;
          if (destination) {
            ctx.go(destination, event.target.getBoundingClientRect());
            return;
          }
          ctx.ui.canvas.selection = id;
          ctx.ui.canvas.selections = [id];
          ctx.render();
        }
      },
      { signal },
    );
    root.addEventListener(
      'pointerover',
      (event) => {
        const node =
          event.target instanceof Element ? event.target.closest<HTMLElement>('[data-node]') : null;
        if (!node || (event.relatedTarget instanceof Node && node.contains(event.relatedTarget)))
          return;
        this.cancelHover();
        this.hoverTimer = setTimeout(() => {
          this.hoverTimer = null;
          if (node.isConnected) node.classList.add('identified');
        }, 300);
      },
      { signal },
    );
    root.addEventListener(
      'pointerout',
      (event) => {
        const node =
          event.target instanceof Element ? event.target.closest<HTMLElement>('[data-node]') : null;
        if (!node || (event.relatedTarget instanceof Node && node.contains(event.relatedTarget)))
          return;
        this.cancelHover();
        node.classList.remove('identified');
      },
      { signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        const button = target(event),
          id = button?.dataset.id ?? '';
        switch (button?.dataset.action) {
          case 'draw-thickness':
            ctx.ui.canvas.thickness = Number(button.dataset.value);
            this.applyStyle();
            root
              .querySelectorAll<HTMLElement>('[data-action=draw-thickness]')
              .forEach((el) =>
                el.setAttribute('aria-pressed', String(el.dataset.value === button.dataset.value)),
              );
            ctx.persist();
            break;
          case 'material-rename':
            this.rename(id);
            break;
          case 'context-duplicate':
            this.overlay.replaceChildren();
            ctx.act(
              { type: 'node.duplicate', world: ctx.world().id, id },
              'duplicar material',
              'C08-MAT-08',
            );
            break;
          case 'context-remove':
            this.overlay.replaceChildren();
            ctx.act(
              { type: 'node.delete', world: ctx.world().id, id },
              'quitar material',
              'C08-MAT-08',
            );
            ctx.notice('Material retirado. Podés deshacer con Ctrl+Z.');
            break;
          case 'context-zones':
            this.zoneMenu(id);
            break;
          case 'context-zone': {
            const node = this.menuMaterial,
              zone = ctx.world().zones.find((z) => z.id === id);
            this.overlay.replaceChildren();
            if (
              node &&
              zone?.agent &&
              ctx.act(
                {
                  type: 'assign',
                  world: ctx.world().id,
                  node,
                  agent: zone.agent,
                  instruction: button.dataset.instruction ?? zone.instruction ?? '',
                },
                'asignar material a zona',
                'OWNER-01',
              )
            ) {
              const job = ctx.world().assignments.at(-1);
              if (job) ctx.service.process(ctx.world().id, job.id);
            }
            break;
          }
          case 'canvas-comment':
            this.comment();
            break;
          case 'material-comments':
            ctx.ui.canvas.selection = id;
            ctx.ui.canvas.selections = [id];
            ctx.ui.chat.chatMode = 'docked';
            ctx.ui.chat.chatTab = 'comments';
            ctx.render();
            break;
          case 'canvas-import':
            root.querySelector<HTMLInputElement>('#canvas-file-import')?.click();
            break;
          case 'canvas-examples':
            if (!this.loadingSamples) void this.examples();
            break;
          case 'canvas-link':
            this.linkForm();
            break;
          case 'link-endpoint':
            this.reconnect(id, button.dataset.end as 'from' | 'to');
            break;
          case 'select-link':
            this.label(id);
            break;
          case 'context-close':
            this.close();
            break;
          case 'video-play': {
            const video = button.closest('[data-node]')?.querySelector('video');
            if (video) {
              button.setAttribute('disabled', '');
              video.controls = true;
              void video.play().catch(() => {
                video.controls = false;
                button.removeAttribute('disabled');
                if (!this.disposed && video.isConnected)
                  ctx.notice('No se pudo reproducir este video. Verificá su formato.', true);
              });
            }
            break;
          }
          case 'asset-retry':
            this.urls.delete(id);
            this.root.querySelectorAll('[data-asset]').forEach((el) => {
              if ((el as HTMLElement).dataset.asset === id) {
                (el as HTMLElement).hidden = false;
                el.nextElementSibling?.classList.contains('asset-error') &&
                  el.nextElementSibling.remove();
              }
            });
            this.hydrate();
            break;
          case 'video-preview-retry': {
            const asset = button.dataset.asset;
            if (!asset || !ctx.storage) break;
            this.previews.delete(asset);
            const status = button.closest('.video-preview-status');
            if (status) status.textContent = 'Preparando vista previa…';
            void ctx.storage
              .asset(asset)
              .then((blob) => this.prepareVideoPreview(asset, blob))
              .catch(() =>
                ctx.notice(
                  'No se pudo recuperar el archivo. Reintentá desde su aviso de recuperación.',
                  true,
                ),
              );
            break;
          }
        }
      },
      { signal },
    );
    root.addEventListener(
      'input',
      (event) => {
        const input = event.target;
        if (input instanceof HTMLTextAreaElement && input.id === 'new-comment') {
          ctx.ui.commentDrafts[this.commentKey()] = input.value;
          ctx.persist();
        }
        if (
          input instanceof HTMLTextAreaElement &&
          input.closest<HTMLFormElement>('[data-revision]')?.dataset.revision
        ) {
          ctx.ui.revisionDrafts[
            input.closest<HTMLFormElement>('[data-revision]')!.dataset.revision!
          ] = input.value;
          ctx.persist();
        }
      },
      { signal },
    );
    root.addEventListener(
      'change',
      (event) => {
        if (!(
          event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
        ))
          return;
        if (event.target instanceof HTMLInputElement && event.target.id === 'canvas-file-import') {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';
          void this.importFiles(files);
        }
        if (event.target.closest('.canvas-style')) {
          const ui = ctx.ui.canvas;
          ui.color = root.querySelector<HTMLInputElement>('#draw-color')?.value ?? ui.color;
          ui.stroke = root.querySelector<HTMLInputElement>('#shape-border')?.value ?? ui.stroke;
          ui.fill = root.querySelector<HTMLInputElement>('#shape-fill')?.checked ?? ui.fill;
          this.applyStyle();
          ctx.persist();
        }
      },
      { signal },
    );
    this.overlay.addEventListener(
      'submit',
      (event) => {
        if (!(event.target instanceof HTMLFormElement)) return;
        event.preventDefault();
        const form = event.target;
        event.stopPropagation();
        if (form.dataset.rename) {
          const name = form.querySelector<HTMLInputElement>('input')?.value ?? '';
          if (name.trim()) {
            this.overlay.replaceChildren();
            ctx.act(
              { type: 'node.rename', world: ctx.world().id, id: form.dataset.rename, name },
              'renombrar material',
              'C08-MAT-06',
            );
          }
        } else if (form.dataset.reconnect) {
          const node = form.querySelector<HTMLSelectElement>('[name=node]')!.value;
          const anchor = form.querySelector<HTMLSelectElement>('[name=anchor]')!.value as Anchor;
          if (
            ctx.act(
              {
                type: 'link.reconnect',
                world: ctx.world().id,
                id: form.dataset.reconnect,
                end: form.dataset.end as 'from' | 'to',
                node,
                anchor,
              },
              'reconectar extremo',
              'C08-LINK-01',
            )
          )
            this.close();
        } else if (form.dataset.label) {
          const text = form.querySelector<HTMLInputElement>('input')?.value ?? '';
          this.overlay.replaceChildren();
          ctx.act(
            { type: 'link.label', world: ctx.world().id, id: form.dataset.label, text },
            'editar etiqueta',
            'C08-LINK-02',
          );
        } else if (form.id === 'canvas-new-link') {
          try {
            const url = new URL(form.querySelector<HTMLInputElement>('input')?.value ?? '');
            if (!['https:', 'http:'].includes(url.protocol))
              throw new Error('Ingresá una dirección http o https.');
            this.create(
              { kind: 'link', title: url.hostname + url.pathname, url: url.href },
              280,
              100,
            );
            this.overlay.replaceChildren();
          } catch {
            ctx.notice('Ingresá una dirección completa, por ejemplo https://example.com.', true);
          }
        } else if (form.id === 'new-comment-form') {
          const node = ctx.ui.canvas.commentTarget,
            text = form.querySelector<HTMLTextAreaElement>('textarea')?.value ?? '';
          if (!node || !text.trim()) return;
          const key = this.commentKey();
          ctx.ui.canvas.commentTarget = null;
          this.overlay.replaceChildren();
          if (
            ctx.act(
              { type: 'comment', world: ctx.world().id, node, text },
              'publicar comentario',
              'C08-COM-03',
            )
          )
            delete ctx.ui.commentDrafts[key];
          ctx.persist();
        }
      },
      { signal },
    );
    this.overlay.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          this.close();
          return;
        }
        // El editor conserva Undo/Redo y las teclas de texto del navegador.
        if (editable(event.target)) return;
        const buttons = [...this.overlay.querySelectorAll<HTMLButtonElement>('[role=menuitem]')];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && buttons.length) {
          event.preventDefault();
          event.stopPropagation();
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
      },
      { signal },
    );
    window.addEventListener(
      'pointerdown',
      (event) => {
        if (
          this.overlay.childElementCount &&
          event.target instanceof Node &&
          !this.overlay.contains(event.target) &&
          !(event.target instanceof Element && event.target.closest('.material-identification'))
        )
          this.close();
      },
      { signal, capture: true },
    );
  }
  private cancelHover(): void {
    if (this.hoverTimer !== null) clearTimeout(this.hoverTimer);
    this.hoverTimer = null;
  }
  private applyStyle(): void {
    const { ctx } = this,
      ui = ctx.ui.canvas;
    const material = ctx.world().nodes.find((node) => node.id === ui.selection);
    if (
      ui.tool === 'select' &&
      material &&
      (material.data.kind === 'shape' || material.data.kind === 'drawing')
    )
      ctx.act(
        {
          type: 'node.style',
          world: ctx.world().id,
          id: material.id,
          color: ui.color,
          thickness: ui.thickness,
          fill: ui.fill,
          stroke: ui.stroke,
        },
        'editar estilo',
        'C08-MAT-05',
      );
  }
  private position(point: Point): string {
    return `left:${Math.max(12, point.x)}px;top:${Math.max(70, point.y)}px`;
  }
  private fitOverlay(): void {
    const panel = this.overlay.firstElementChild;
    if (!(panel instanceof HTMLElement)) return;
    // Las dimensiones de layout no incluyen la animación de entrada del menú.
    panel.style.left = `${Math.max(12, Math.min(innerWidth - panel.offsetWidth - 12, parseFloat(panel.style.left)))}px`;
    panel.style.top = `${Math.max(70, Math.min(innerHeight - panel.offsetHeight - 12, parseFloat(panel.style.top)))}px`;
  }
  private materialPoint(id: string): Point {
    const rect = this.root
      .querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`)
      ?.getBoundingClientRect();
    return rect
      ? { x: rect.left, y: rect.bottom + 8 }
      : { x: innerWidth / 2 - 130, y: innerHeight / 2 };
  }
  rename(id = this.ctx.ui.canvas.selection ?? ''): void {
    const node = this.ctx.world().nodes.find((n) => n.id === id && !n.owner);
    if (!node) return;
    this.ctx.ui.canvas.selection = id;
    this.ctx.ui.canvas.selections = [id];
    this.ctx.ui.canvas.zoneSelection = null;
    this.ctx.ui.canvas.linkSelection = null;
    this.ctx.render();
    const label = this.root
      .querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"] .material-identification button`)
      ?.getBoundingClientRect();
    this.editForm(
      'rename',
      id,
      nodeTitle(this.ctx.world(), node),
      label ? { x: label.x, y: label.y } : this.materialPoint(id),
    );
    this.fitOverlay();
    this.overlay.querySelector<HTMLInputElement>('input')?.select();
  }
  private menu(id: string, point: Point): void {
    const node = this.ctx.world().nodes.find((n) => n.id === id && !n.owner);
    if (!node) return;
    this.menuMaterial = id;
    this.ctx.ui.canvas.selection = id;
    this.ctx.ui.canvas.selections = [id];
    this.ctx.ui.canvas.zoneSelection = null;
    this.ctx.ui.canvas.linkSelection = null;
    this.ctx.render();
    this.overlay.innerHTML = `<div class="canvas-context-menu" role="menu" aria-label="Acciones del material" style="${this.position(point)}"><button type="button" role="menuitem" data-action="material-rename" data-id="${id}">Renombrar <kbd>${html(this.ctx.ui.shortcuts.rename)}</kbd></button>${node.data.kind !== 'reference' || node.data.ref.kind === 'document' ? `<button type="button" role="menuitem" data-action="context-duplicate" data-id="${id}">Duplicar</button>` : ''}<button type="button" role="menuitem" data-action="context-zones" aria-haspopup="menu" data-id="${id}">Asignar a una zona <span>›</span></button><button type="button" role="menuitem" data-action="canvas-comment">Comentar <kbd>${html(this.ctx.ui.shortcuts.comment)}</kbd></button><button type="button" role="menuitem" data-action="context-remove" data-id="${id}">${node.data.kind === 'reference' ? 'Quitar del Canvas' : 'Eliminar'}</button></div>`;
    this.fitOverlay();
    this.overlay.querySelector<HTMLElement>('[role=menuitem]')?.focus({ preventScroll: true });
  }
  private zoneMenu(id: string): void {
    this.menuMaterial = id;
    const point = this.materialPoint(id);
    this.overlay.innerHTML = `<div class="canvas-context-menu" role="menu" aria-label="Destinos del Mundo" style="${this.position(point)}">${
      this.ctx
        .world()
        .zones.map(
          (z) =>
            `<div><strong>${html(z.name)}</strong>${z.agent ? ['', 'Resumir', 'Analizar', 'Reorganizar'].map((instruction) => `<button type="button" role="menuitem" data-action="context-zone" data-id="${z.id}" data-instruction="${html(instruction || z.instruction || '')}">${html(instruction || 'Usar instrucción de la zona')}</button>`).join('') : '<span>Elegí un agente en el inspector</span>'}</div>`,
        )
        .join('') || '<p>No hay zonas en este Mundo.</p>'
    }</div>`;
    this.fitOverlay();
    this.overlay.querySelector<HTMLElement>('[role=menuitem]')?.focus({ preventScroll: true });
  }
  comment(): void {
    const ui = this.ctx.ui.canvas;
    if (ui.tool === 'comment') {
      ui.tool = 'select';
      this.ctx.render();
      return;
    }
    if (ui.selections.length > 1 || !ui.selection) {
      ui.tool = 'comment';
      this.ctx.render();
      this.ctx.notice('Elegí un material para comentar.');
      return;
    }
    this.openComment(ui.selection);
  }
  openComment(id: string): void {
    if (!this.ctx.world().nodes.some((n) => n.id === id)) return;
    const ui = this.ctx.ui.canvas;
    ui.tool = 'select';
    ui.selection = id;
    ui.selections = [id];
    ui.zoneSelection = null;
    ui.linkSelection = null;
    this.ctx.render();
    ui.commentTarget = id;
    this.overlay.innerHTML = `<form id="new-comment-form" class="canvas-context-form comment-compose" style="${this.position(this.materialPoint(id))}"><label for="new-comment">Comentario sobre el material</label><textarea id="new-comment" aria-label="Nuevo comentario" rows="3">${html(this.ctx.ui.commentDrafts[this.commentKey()] ?? '')}</textarea><div><button type="button" data-action="context-close">Cancelar</button><button type="submit" aria-label="Publicar comentario">Publicar</button></div></form>`;
    this.fitOverlay();
    this.overlay.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
  }
  private commentKey(): string {
    return JSON.stringify([
      this.ctx.ui.userId,
      this.ctx.world().id,
      this.ctx.ui.canvas.commentTarget,
    ]);
  }
  reconnect(id: string, end: 'from' | 'to'): void {
    const link = this.ctx.world().links.find((link) => link.id === id);
    if (!link) return;
    const endpoint = this.root
      .querySelector<SVGElement>(`[data-link="${CSS.escape(id)}"] [data-end=${end}]`)
      ?.getBoundingClientRect();
    const other = end === 'from' ? link.to : link.from;
    const current = end === 'from' ? link.from : link.to;
    const anchor = end === 'from' ? link.fromAnchor : link.toAnchor;
    this.overlay.innerHTML = `<form class="canvas-context-form reconnect-form" data-reconnect="${id}" data-end="${end}" style="${this.position(endpoint ?? { x: innerWidth / 2, y: innerHeight / 2 })}"><strong>Reconectar ${end === 'from' ? 'origen' : 'destino'}</strong><label>Material<select name="node" aria-label="Material ${end === 'from' ? 'de origen' : 'de destino'}">${this.ctx
      .world()
      .nodes.filter((node) => !node.owner && node.id !== other)
      .map(
        (node) =>
          `<option value="${node.id}" ${node.id === current ? 'selected' : ''}>${html(nodeTitle(this.ctx.world(), node))}</option>`,
      )
      .join(
        '',
      )}</select></label><label>Anclaje<select name="anchor" aria-label="Anclaje ${end === 'from' ? 'de origen' : 'de destino'}">${(['north', 'east', 'south', 'west'] as const).map((value) => `<option value="${value}" ${anchor === value ? 'selected' : ''}>${{ north: 'Arriba', east: 'Derecha', south: 'Abajo', west: 'Izquierda' }[value]}</option>`).join('')}</select></label><div><button type="button" data-action="context-close">Cancelar</button><button type="submit">Guardar</button></div></form>`;
    this.fitOverlay();
    this.overlay.querySelector<HTMLElement>('select')?.focus({ preventScroll: true });
  }
  private label(id: string): void {
    const link = this.ctx.world().links.find((l) => l.id === id);
    if (!link) return;
    const path = this.root.querySelector<SVGPathElement>(
        `[data-link="${CSS.escape(id)}"] .link-line`,
      ),
      rect = path?.getBoundingClientRect();
    const midpoint = path?.getPointAtLength(path.getTotalLength() / 2),
      matrix = path?.getScreenCTM();
    const point =
      midpoint && matrix
        ? new DOMPoint(midpoint.x, midpoint.y).matrixTransform(matrix)
        : rect
          ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
          : this.materialPoint(link.from);
    this.editForm('label', id, link.label ?? '', point);
    this.fitOverlay();
    this.overlay.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }
  private editForm(kind: 'rename' | 'label', id: string, text: string, point: Point): void {
    const field = kind === 'rename' ? 'material-name' : 'cable-text';
    this.overlay.innerHTML = `<form class="canvas-context-form compact-edit" data-${kind}="${id}" style="${this.position(point)}"><label for="${field}">${kind === 'rename' ? 'Nombre del material' : 'Etiqueta de conexión'}</label><input id="${field}" value="${html(text)}">${kind === 'label' ? btn('link-delete', 'trash', 'Eliminar conexión', `data-id="${id}"`) : ''}${btn('context-close', 'close', 'Cancelar')}<button type="submit" class="icon-button" aria-label="Guardar" data-tip="Guardar">${icon('check', 16)}</button></form>`;
  }
  private linkForm(): void {
    this.overlay.innerHTML = `<form id="canvas-new-link" class="canvas-context-form" style="${this.position({ x: innerWidth / 2 - 140, y: innerHeight / 2 - 80 })}"><label for="canvas-link-url">Dirección del enlace</label><input id="canvas-link-url" type="url" required placeholder="https://"><button type="submit">Agregar enlace</button><button type="button" data-action="context-close">Cancelar</button></form>`;
    this.fitOverlay();
    this.overlay.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }
  private create(data: Material['data'], width: number, height: number, position?: Point): string {
    const point = position ?? this.center(),
      id = 'material-' + crypto.randomUUID();
    this.ctx.act(
      {
        type: 'node.create',
        world: this.ctx.world().id,
        node: { id, ...point, width, height, owner: null, data },
      },
      'incorporar material',
      'C08-MAT-01',
    );
    this.ctx.ui.canvas.selection = id;
    this.ctx.ui.canvas.selections = [id];
    this.ctx.render();
    return id;
  }
  private async examples(): Promise<void> {
    this.loadingSamples = true;
    this.ctx.notice('Preparando imagen, video y PDF de ejemplo…');
    try {
      const result = await sampleFiles();
      if (this.disposed) return;
      await this.importFiles(result.files, true, result.duration);
      if (!result.duration)
        this.ctx.notice(
          'Imagen y PDF incorporados. Este navegador no puede generar el video de ejemplo.',
          true,
        );
    } catch (error) {
      this.ctx.notice(
        'No se pudieron generar los ejemplos. ' +
          (error instanceof Error ? error.message : String(error)),
        true,
      );
    } finally {
      this.loadingSamples = false;
    }
  }
  private async importFiles(files: File[], frame = false, sampleDuration?: number): Promise<void> {
    const origin = this.center(),
      added: string[] = [];
    for (const [index, file] of files.entries()) {
      try {
        if (!this.ctx.storage) throw new Error('El almacenamiento no está disponible');
        const kind = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
              ? 'pdf'
              : null;
        if (!kind) {
          this.ctx.notice('Incorporá una imagen, video o PDF.', true);
          continue;
        }
        let ratio = 1,
          preview: string | undefined,
          duration: number | undefined;
        if (kind === 'pdf') {
          try {
            const result = await pdfPreview(file);
            ratio = result.ratio;
            preview = result.preview;
          } catch {
            this.ctx.notice('El PDF se conserva; no se pudo generar su primera página.', true);
          }
        } else {
          const url = URL.createObjectURL(file);
          try {
            if (kind === 'image') {
              const image = new Image();
              image.src = url;
              await image.decode();
              ratio = image.naturalWidth / image.naturalHeight;
            } else {
              const video = document.createElement('video');
              await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = () => reject(new Error('Formato de video no disponible'));
                video.src = url;
              });
              ratio = video.videoWidth / video.videoHeight;
              if (Number.isFinite(video.duration)) duration = video.duration;
              else if (sampleDuration) duration = sampleDuration;
              try {
                preview = await videoPreview(file, this.previewAbort.signal);
              } catch {
                if (!this.disposed)
                  this.ctx.notice(
                    'El video se conserva; no se pudo preparar su vista previa.',
                    true,
                  );
              }
              video.removeAttribute('src');
              video.load();
            }
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        const asset = 'asset-' + crypto.randomUUID();
        await this.ctx.storage.putAsset(asset, file);
        if (this.disposed) return;
        const width = Math.min(360, 300 * ratio),
          height = width / ratio;
        const scale = Math.max(1, 4 / width, 4 / height);
        const id = this.create(
          {
            kind,
            title: file.name,
            asset,
            mime: file.type,
            ratio,
            ...(preview ? { preview } : {}),
            ...(duration !== undefined ? { duration } : {}),
          },
          width * scale,
          height * scale,
          { x: origin.x + (index % 2) * 390, y: origin.y + Math.floor(index / 2) * 440 },
        );
        added.push(id);
      } catch (error) {
        this.ctx.notice(
          'No se pudo incorporar el archivo. ' +
            (error instanceof Error ? error.message : String(error)),
          true,
        );
      }
    }
    if (frame && added.length) {
      const nodes = this.ctx.world().nodes.filter((node) => added.includes(node.id));
      const left = Math.min(...nodes.map((node) => node.x)),
        top = Math.min(...nodes.map((node) => node.y));
      const width = Math.max(...nodes.map((node) => node.x + node.width)) - left,
        height = Math.max(...nodes.map((node) => node.y + node.height)) - top;
      const stage = this.root.querySelector('.canvas-stage')!.getBoundingClientRect();
      const chat = this.root
        .querySelector('.canvas-chat.docked:not(.compact)')
        ?.getBoundingClientRect();
      const areaLeft = chat ? chat.right + 16 : stage.left + 24,
        areaWidth = stage.right - areaLeft - 24;
      const z = Math.min(1, areaWidth / (width + 40), (stage.height - 120) / (height + 40));
      const camera = {
        x: areaLeft + areaWidth / 2 - (stage.left + stage.width / 2) - (left + width / 2) * z,
        y: -30 - (top + height / 2) * z,
        z,
      };
      this.ctx.camera?.set(camera, true);
      this.ctx.act({ type: 'camera', camera }, 'encuadrar ejemplos multimedia', 'C08-MAT-01');
    }
  }
  hydrate(): void {
    this.root
      .querySelectorAll<HTMLImageElement | HTMLVideoElement>('[data-asset]')
      .forEach((element) => {
        const id = element.dataset.asset;
        if (element instanceof HTMLVideoElement && element.readyState >= 1) {
          const play = element.parentElement?.querySelector<HTMLButtonElement>('.video-play');
          if (play) play.disabled = false;
        }
        if (!id || element.getAttribute('src')) return;
        let pending = this.urls.get(id);
        if (!pending) {
          pending = this.ctx.storage!.asset(id).then((blob) => {
            if (this.disposed) return '';
            if (
              element instanceof HTMLVideoElement &&
              !element.closest('[data-node],[data-proposed-node]')?.querySelector('.video-poster')
            )
              this.prepareVideoPreview(id, blob);
            const url = URL.createObjectURL(blob);
            this.ownedUrls.add(url);
            return url;
          });
          this.urls.set(id, pending);
        }
        void pending
          .then((url) => {
            if (!this.disposed && element.isConnected && url) {
              element.src = url;
              if (element instanceof HTMLVideoElement) {
                const button =
                  element.parentElement?.querySelector<HTMLButtonElement>('.video-play');
                if (button) {
                  const ready = (): void => {
                    button.disabled = false;
                  };
                  if (element.readyState >= 1) ready();
                  else element.addEventListener('loadedmetadata', ready, { once: true });
                }
              }
            }
          })
          .catch(() => {
            if (!element.isConnected) return;
            const placeholder = document.createElement('div');
            placeholder.className = 'asset-error';
            placeholder.innerHTML = `<span>No se pudo recuperar el archivo.</span><button type="button" data-action="asset-retry" data-id="${id}">Reintentar</button>`;
            element.hidden = true;
            element.after(placeholder);
          });
      });
  }
  private prepareVideoPreview(asset: string, blob: Blob): void {
    if (this.disposed || this.previews.has(asset)) return;
    const world = this.ctx.world().id;
    const pending = videoPreview(blob, this.previewAbort.signal);
    this.previews.set(asset, pending);
    void pending
      .then((preview) => {
        if (this.disposed) return;
        if (
          !this.ctx.act(
            { type: 'asset.preview', world, asset, preview },
            'recuperar vista previa del video',
            'C08-MAT-02',
            'service',
          )
        )
          return;
        this.root.querySelectorAll<HTMLVideoElement>('video[data-asset]').forEach((video) => {
          if (video.dataset.asset !== asset) return;
          video.poster = preview;
          const parent = video.parentElement;
          if (!parent?.classList.contains('material')) return;
          let poster = parent.querySelector<HTMLImageElement>('.video-poster');
          if (!poster) {
            poster = document.createElement('img');
            poster.className = 'video-poster';
            poster.alt = 'Vista previa de ' + (video.getAttribute('aria-label') ?? 'video');
            poster.draggable = false;
            video.after(poster);
          }
          poster.src = preview;
          parent.querySelector('.video-preview-status')?.remove();
        });
      })
      .catch(() => {
        if (this.disposed) return;
        this.root.querySelectorAll<HTMLElement>('[data-asset]').forEach((el) => {
          if (el.dataset.asset === asset) {
            const status = el.parentElement?.querySelector('.video-preview-status');
            if (status)
              status.innerHTML = `<span>Vista previa no disponible</span><button type="button" data-action="video-preview-retry" data-asset="${html(asset)}">Reintentar vista previa</button>`;
          }
        });
        this.ctx.notice(
          'No se pudo preparar la vista previa del video. Podés reproducirlo o reintentar.',
          true,
        );
      });
  }
  close(): boolean {
    const active = this.overlay.childElementCount > 0 || this.ctx.ui.canvas.tool === 'comment';
    this.ctx.ui.canvas.commentTarget = null;
    if (this.ctx.ui.canvas.tool === 'comment') {
      this.ctx.ui.canvas.tool = 'select';
      this.ctx.render();
    }
    this.overlay.replaceChildren();
    if (active)
      this.root
        .querySelector<HTMLElement>(
          `[data-node="${CSS.escape(this.ctx.ui.canvas.selection ?? '')}"]`,
        )
        ?.focus({ preventScroll: true });
    return active;
  }
  dispose(): void {
    this.disposed = true;
    this.previewAbort.abort();
    this.previews.clear();
    this.cancelHover();
    this.root.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    this.root.querySelectorAll('[data-asset]').forEach((element) => element.removeAttribute('src'));
    for (const url of this.ownedUrls) URL.revokeObjectURL(url);
    this.ownedUrls.clear();
    this.urls.clear();
    this.overlay.remove();
  }
}
