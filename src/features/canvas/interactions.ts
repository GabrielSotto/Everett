import type { Context } from '../../app/context';
import {
  nodeTitle,
  materialRoute,
  type Material,
  type Point,
  type Anchor,
} from '../../domain/model';
import { html, target, editable } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { sampleFiles } from './sample-media';
import { pdfPreview } from '../../platform/pdf-preview';
import { videoPreview } from '../../platform/video-preview';
import { referenceSource } from '../../domain/reference-anchors';
import { alpha, rgb, rgba } from './color';
import { bindColorPicker } from './color-picker';
import { canOrderMaterials } from '../../domain/material-order';
import { enteredLink } from '../../domain/link-previews';
import { linkCardMarkup } from './link-card';
import { confirmRemoval } from '../../ui/confirm-removal';
import { assignedPreview, materialMarkup } from './materials';
import { inspectMedia } from '../../platform/media-file';
import { previewMarkup } from './proposals';

function clipboardOrigin(plain: string, uriList = '', markup = ''): string | undefined {
  const address = uriList.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'));
  const direct = enteredLink(address || plain);
  if (direct) return direct;
  // El fragmento queda inerte: solo se lee el origen que acompaña a la imagen copiada.
  const template = document.createElement('template');
  template.innerHTML = markup;
  return (
    enteredLink(template.content.querySelector('img[src]')?.getAttribute('src') ?? '') ?? undefined
  );
}

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
  private colorField: 'color' | 'stroke' | null = null;
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
    const unsubscribe = ctx.store.subscribe((change) => {
      if (change.command.type === 'node.link-preview' && change.command.world === ctx.world().id) {
        this.paintLinkCards(change.command.id);
        this.hydrate();
      }
      if (change.command.type === 'node.resolve-link' && change.command.world === ctx.world().id) {
        const world = ctx.world();
        const resolvedId = change.command.id;
        const ids = new Set([
          resolvedId,
          ...world.assignments
            .filter((job) => job.node === resolvedId)
            .flatMap((job) => job.output?.map((o) => o.material.id) ?? []),
        ]);
        const nodes = [
          ...world.nodes,
          ...world.assignments.flatMap((job) => job.output?.map((o) => o.material) ?? []),
        ];
        for (const node of nodes) {
          if (!ids.has(node.id) || node.data.kind === 'link') continue;
          const free = root.querySelector<HTMLElement>(`.material[data-node="${node.id}"]`);
          if (free)
            free.outerHTML = materialMarkup(
              world,
              structuredClone(node),
              ctx.ui.canvas.selections.includes(node.id),
              ctx.ui.canvas.tool === 'connect',
            );
          const assigned = root.querySelector<HTMLElement>(`[data-assigned-id="${node.id}"]`);
          if (assigned) assigned.outerHTML = assignedPreview(world, structuredClone(node));
          const proposal = root.querySelector<HTMLElement>(`[data-proposed-node="${node.id}"]`);
          const draft = world.assignments
            .flatMap((job) => job.output ?? [])
            .find((draft) => draft.material.id === node.id);
          if (proposal && draft) proposal.outerHTML = previewMarkup(ctx, draft);
        }
        this.hydrate();
        ctx.camera?.set(ctx.currentCamera(), true);
      }
    });
    signal.addEventListener('abort', unsubscribe, { once: true });
    window.addEventListener(
      'paste',
      (event) => {
        if (
          this.disposed ||
          editable(event.target) ||
          (document.activeElement && editable(document.activeElement))
        )
          return;
        if (
          document.activeElement instanceof Element &&
          document.activeElement.closest('#shell,.canvas-chat,.canvas-context-layer')
        )
          return;
        const value = event.clipboardData?.getData('text/plain').trim() ?? '';
        const files = [...(event.clipboardData?.files ?? [])];
        if (files.length) {
          event.preventDefault();
          void this.importFiles(
            files,
            false,
            undefined,
            clipboardOrigin(
              value,
              event.clipboardData?.getData('text/uri-list'),
              event.clipboardData?.getData('text/html'),
            ),
          );
          return;
        }
        const url = enteredLink(value);
        if (!url || /\s/.test(value)) return;
        event.preventDefault();
        this.addLink(url);
      },
      { signal },
    );
    root.addEventListener(
      'dblclick',
      (event) => {
        const link =
          event.target instanceof Element
            ? event.target.closest<SVGElement>('[data-action=select-link]')
            : null;
        if (!link?.dataset.id) return;
        event.preventDefault();
        this.label(link.dataset.id);
      },
      { signal },
    );
    window.addEventListener('resize', () => this.fitOverlay(), { signal });
    root.addEventListener(
      'contextmenu',
      (event) => {
        const link =
          event.target instanceof Element ? event.target.closest<SVGElement>('[data-link]') : null;
        if (link?.dataset.link) {
          event.preventDefault();
          // Las conexiones se editan directamente, sin menú contextual.
          return;
        }
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
        const group =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-group]')
            : null;
        if (group?.dataset.group) {
          event.preventDefault();
          this.groupMenu(group.dataset.group, { x: event.clientX, y: event.clientY });
          return;
        }
        const material =
          event.target instanceof Element ? event.target.closest<HTMLElement>('[data-node]') : null;
        if (!material?.dataset.node) {
          if (
            event.target instanceof Element &&
            event.target.closest('.canvas-stage') &&
            !event.target.closest('.dock,.canvas-chat,.canvas-context-layer,.proposal')
          ) {
            event.preventDefault();
            this.overlay.innerHTML = `<div class="canvas-context-menu" role="menu" aria-label="Acciones del Canvas" style="${this.position({ x: event.clientX, y: event.clientY })}"><button type="button" role="menuitem" data-action="canvas-paste">Pegar <kbd>Ctrl+V</kbd></button><button type="button" role="menuitem" data-action="canvas-link">Agregar enlace</button></div>`;
            this.fitOverlay();
          }
          return;
        }
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
          event.target.matches('.link-hit') &&
          ['Delete', 'Backspace'].includes(event.key)
        ) {
          const id = event.target.dataset.id;
          if (id) {
            event.preventDefault();
            event.stopPropagation();
            ctx.ui.canvas.linkSelection = null;
            ctx.act(
              { type: 'link.delete', world: ctx.world().id, id },
              'eliminar conexión',
              'C08-LINK-01',
            );
          }
          return;
        }
        const group =
          event.target instanceof HTMLElement
            ? event.target.closest<HTMLElement>('[data-group]')
            : null;
        if (
          group?.dataset.group &&
          (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
        ) {
          event.preventDefault();
          event.stopPropagation();
          const rect = group.getBoundingClientRect();
          this.groupMenu(group.dataset.group, { x: rect.x, y: rect.bottom + 4 });
          return;
        }
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
          const id = event.target.dataset.id ?? '';
          this.ctx.ui.canvas.selection = this.ctx.ui.canvas.zoneSelection = null;
          this.ctx.ui.canvas.selections = [];
          this.ctx.ui.canvas.linkSelection = id;
          this.ctx.render();
          this.ctx.persist();
          if (event.key === 'Enter') this.label(id);
          else this.focusLink(id);
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
        if (
          event.target instanceof HTMLInputElement &&
          ['draw-color', 'shape-border'].includes(event.target.id)
        ) {
          event.preventDefault();
          this.colorPicker(event.target.id === 'draw-color' ? 'color' : 'stroke');
          return;
        }
        const button = target(event),
          id = button?.dataset.id ?? '';
        switch (button?.dataset.action) {
          case 'context-group':
            this.overlay.replaceChildren();
            ctx.act(
              {
                type: 'group.create',
                world: ctx.world().id,
                nodes: [...ctx.ui.canvas.selections],
                name: 'Conjunto sin nombre',
              },
              'crear conjunto',
              'C08-ORG-01',
            );
            break;
          case 'group-ungroup':
            this.overlay.replaceChildren();
            ctx.act(
              { type: 'group.ungroup', world: ctx.world().id, id },
              'separar conjunto',
              'C08-ORG-01',
            );
            break;
          case 'group-rename':
            this.groupRename(id);
            break;
          case 'group-remove': {
            const group = ctx.world().canvasGroups?.find((g) => g.nodes.includes(id));
            if (group) {
              this.overlay.replaceChildren();
              ctx.act(
                { type: 'group.remove', world: ctx.world().id, id: group.id, nodes: [id] },
                'sacar material del conjunto',
                'C08-ORG-01',
              );
            }
            break;
          }
          case 'reference-fragment':
            this.fragment(id);
            break;
          case 'reference-whole':
            this.overlay.replaceChildren();
            ctx.act(
              { type: 'reference.fragment', world: ctx.world().id, id, range: null },
              'usar referencia completa',
              'C08-REF-01',
            );
            break;
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
          case 'link-preview-retry':
            ctx.previews.refresh(ctx.world().id, id);
            break;
          case 'link-open': {
            const destination = materialRoute(ctx.store.get(), ctx.world().id, id);
            if (destination) ctx.go(destination, button.getBoundingClientRect());
            break;
          }
          case 'canvas-paste':
            void this.pasteClipboard();
            break;
          case 'context-order': {
            const order = button.dataset.order;
            if (
              order !== 'front' &&
              order !== 'back' &&
              order !== 'forward' &&
              order !== 'backward'
            )
              break;
            this.overlay.replaceChildren();
            ctx.act(
              {
                type: 'nodes.order',
                world: ctx.world().id,
                nodes: [...ctx.ui.canvas.selections],
                order,
              },
              'ordenar materiales',
              'C08-LAYER-01',
            );
            break;
          }
          case 'context-duplicate':
            this.overlay.replaceChildren();
            ctx.act(
              { type: 'node.duplicate', world: ctx.world().id, id },
              'duplicar material',
              'C08-MAT-08',
            );
            break;
          case 'context-remove':
            confirmRemoval(
              this.root,
              'Se retirará este material.',
              () => {
                this.overlay.replaceChildren();
                ctx.act(
                  { type: 'node.delete', world: ctx.world().id, id },
                  'quitar material',
                  'C08-MAT-08',
                );
                ctx.notice('Material retirado. Podés deshacer con Ctrl+Z.');
              },
              this.previewAbort.signal,
            );
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
          void this.importFiles(files, files.length > 1);
        }
        if (event.target.closest('.canvas-style')) {
          const ui = ctx.ui.canvas;
          if (event.target.id === 'draw-color')
            ui.color = rgba(event.target.value, alpha(ui.color));
          if (event.target.id === 'shape-border')
            ui.stroke = rgba(event.target.value, alpha(ui.stroke));
          ui.fill = root.querySelector<HTMLInputElement>('#shape-fill')?.checked ?? ui.fill;
          this.applyStyle();
          ctx.persist();
        }
      },
      { signal },
    );
    this.overlay.addEventListener(
      'beforeinput',
      (event) => {
        // Chromium no ofrece caret por flechas en textarea readonly. Conservar
        // selección nativa y bloquear la edición en la frontera de entrada.
        if (event.target instanceof HTMLTextAreaElement && event.target.id === 'fragment-source')
          event.preventDefault();
      },
      { signal },
    );
    this.overlay.addEventListener('select', () => this.fragmentSelection(), {
      signal,
      capture: true,
    });
    this.overlay.addEventListener('pointerup', () => this.fragmentSelection(), { signal });
    this.overlay.addEventListener('keyup', () => this.fragmentSelection(), { signal });
    this.overlay.addEventListener(
      'submit',
      (event) => {
        if (!(event.target instanceof HTMLFormElement)) return;
        event.preventDefault();
        const form = event.target;
        event.stopPropagation();
        if (form.dataset.fragment) {
          const input = form.querySelector<HTMLTextAreaElement>('textarea')!;
          if (input.selectionEnd <= input.selectionStart) {
            ctx.notice('Seleccioná el texto al que querés hacer referencia.');
            return;
          }
          if (
            ctx.act(
              {
                type: 'reference.fragment',
                world: ctx.world().id,
                id: form.dataset.fragment,
                range: { start: input.selectionStart, end: input.selectionEnd },
              },
              'precisar referencia',
              'C08-REF-01',
            )
          )
            this.close();
        } else if (form.dataset.groupRename) {
          const name = form.querySelector<HTMLInputElement>('input')!.value;
          if (
            name.trim() &&
            ctx.act(
              { type: 'group.rename', world: ctx.world().id, id: form.dataset.groupRename, name },
              'renombrar conjunto',
              'C08-ORG-01',
            )
          )
            this.close();
        } else if (form.dataset.rename) {
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
          this.focusLink(form.dataset.label);
        } else if (form.id === 'canvas-new-link') {
          try {
            const url = enteredLink(form.querySelector<HTMLInputElement>('input')?.value ?? '');
            if (!url) throw new Error('Ingresá una dirección http o https.');
            this.addLink(url);
            this.overlay.replaceChildren();
          } catch {
            const error = form.querySelector<HTMLElement>('[role=status]');
            if (error)
              error.textContent = 'Ingresá una URL válida, por ejemplo https://example.com';
            form.querySelector('input')?.setAttribute('aria-invalid', 'true');
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
        // Los controles del panel poseen el teclado: no activan herramientas ni borran materiales.
        event.stopPropagation();
        // El editor conserva Undo/Redo y las teclas de texto del navegador.
        if (editable(event.target)) return;
        const buttons = [
          ...this.overlay.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)'),
        ];
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
  positionColorPicker(): void {
    const panel = this.overlay.querySelector<HTMLElement>('.canvas-color-picker');
    if (!panel || !this.colorField) return;
    const anchor = this.root
      .querySelector(this.colorField === 'color' ? '#draw-color' : '#shape-border')
      ?.getBoundingClientRect();
    if (!anchor) {
      this.close();
      return;
    }
    panel.style.left =
      Math.max(12, Math.min(innerWidth - panel.offsetWidth - 12, anchor.left)) + 'px';
    panel.style.top =
      (anchor.top - panel.offsetHeight - 8 >= 70
        ? anchor.top - panel.offsetHeight - 8
        : anchor.bottom + 8) + 'px';
    this.fitOverlay();
  }
  private colorPicker(field: 'color' | 'stroke'): void {
    this.colorField = field;
    this.overlay.innerHTML =
      '<div class="canvas-context-form canvas-color-picker" role="dialog" aria-label="' +
      (field === 'stroke'
        ? 'Color de borde'
        : this.ctx.ui.canvas.tool === 'drawing'
          ? 'Color del trazo'
          : 'Color de relleno') +
      '"></div>';
    const panel = this.overlay.firstElementChild as HTMLElement;
    bindColorPicker(panel, this.ctx.ui.canvas[field], (value) => {
      this.ctx.ui.canvas[field] = value;
      const swatch = this.root.querySelector<HTMLInputElement>(
        field === 'color' ? '#draw-color' : '#shape-border',
      );
      if (swatch) swatch.value = rgb(value);
      this.applyStyle();
      this.ctx.persist();
    });
    this.positionColorPicker();
  }
  private groupRename(id: string): void {
    const group = this.ctx.world().canvasGroups?.find((g) => g.id === id);
    if (!group) return;
    this.overlay.innerHTML = `<form class="canvas-context-form compact-edit group-rename-form" data-group-rename="${id}" style="${this.position(this.center())}"><label for="group-name">Nombre del conjunto</label><input id="group-name" aria-label="Nombre del conjunto" value="${html(group.name)}"></form>`;
    const rect = this.root
      .querySelector(`[data-group="${CSS.escape(id)}"]`)
      ?.getBoundingClientRect();
    if (rect) {
      const panel = this.overlay.firstElementChild as HTMLElement;
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
    }
    this.fitOverlay();
    this.overlay.querySelector<HTMLInputElement>('input')?.select();
  }
  private groupMenu(id: string, point: Point): void {
    this.overlay.innerHTML = `<div class="canvas-context-menu" role="menu" aria-label="Acciones del conjunto" style="${this.position(point)}"><button role="menuitem" data-action="group-rename" data-id="${id}">Renombrar conjunto</button><button role="menuitem" data-action="group-ungroup" data-id="${id}">Separar conjunto</button></div>`;
    this.fitOverlay();
    this.overlay.querySelector<HTMLElement>('button')?.focus();
  }
  private fragment(id: string): void {
    const node = this.ctx.world().nodes.find((n) => n.id === id);
    if (node?.data.kind !== 'reference') return;
    const source = referenceSource(this.ctx.world(), node.data.ref);
    if (source === null) return;
    const anchor = this.ctx
      .world()
      .referenceAnchors?.find(
        (a) => a.id === (node.data.kind === 'reference' ? node.data.ref.fragment : ''),
      );
    this.overlay.innerHTML = `<form class="canvas-context-form fragment-picker" data-fragment="${id}" style="${this.position({ x: innerWidth / 2 - 240, y: 120 })}"><h3>Mostrar un fragmento en Canvas</h3><label for="fragment-source">${html(nodeTitle(this.ctx.world(), node))}</label><p id="fragment-help">Seleccioná el párrafo o las líneas que querés ver en la tarjeta. El documento original conserva todo su contenido.</p><textarea id="fragment-source" aria-readonly="true" aria-label="Contenido de origen" aria-describedby="fragment-help">${html(source)}</textarea><strong class="fragment-preview-label">Texto que mostrará la tarjeta</strong><blockquote class="fragment-preview" aria-label="Fragmento elegido"></blockquote><span class="fragment-count" role="status">Seleccioná texto para continuar.</span><small>Después de confirmar, Canvas mostrará solo el fragmento elegido. Entrar en la tarjeta abre el original y selecciona esas mismas líneas.</small><div><button type="button" data-action="context-close">Cancelar</button><button type="submit" disabled>Usar selección</button></div></form>`;
    this.fitOverlay();
    const input = this.overlay.querySelector('textarea')!;
    input.value = source;
    input.focus();
    if (anchor?.status === 'attached') input.setSelectionRange(anchor.start, anchor.end);
    this.fragmentSelection();
  }
  private fragmentSelection(): void {
    const form = this.overlay.querySelector<HTMLFormElement>('[data-fragment]');
    const input = form?.querySelector('textarea');
    if (!form || !input) return;
    const count = input.selectionEnd - input.selectionStart;
    form.querySelector('.fragment-preview')!.textContent = input.value.slice(
      input.selectionStart,
      input.selectionEnd,
    );
    form.querySelector('.fragment-count')!.textContent = count
      ? count + ' caracteres elegidos'
      : 'Seleccioná texto para continuar.';
    form.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled = count <= 0;
  }
  private focusLink(id: string): void {
    this.root
      .querySelector<SVGElement>(`.link-hit[data-id="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true });
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
    if (!this.ctx.ui.canvas.selections.includes(id)) this.ctx.ui.canvas.selections = [id];
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
    if (!this.ctx.ui.canvas.selections.includes(id)) this.ctx.ui.canvas.selections = [id];
    this.ctx.ui.canvas.zoneSelection = null;
    this.ctx.ui.canvas.linkSelection = null;
    this.ctx.render();
    const layers = (['front', 'forward', 'backward', 'back'] as const)
      .map(
        (order) =>
          `<button type="button" role="menuitem" data-action="context-order" data-order="${order}" ${canOrderMaterials(this.ctx.world().nodes, this.ctx.ui.canvas.selections, order) ? '' : 'disabled'}>${{ front: 'Traer al frente', forward: 'Avanzar una capa', backward: 'Retroceder una capa', back: 'Enviar al fondo' }[order]}</button>`,
      )
      .join('');
    this.overlay.innerHTML = `<div class="canvas-context-menu" role="menu" aria-label="Acciones del material" style="${this.position(point)}"><button type="button" role="menuitem" data-action="material-rename" data-id="${id}">Renombrar <kbd>${html(this.ctx.ui.shortcuts.rename)}</kbd></button>${node.data.kind !== 'reference' || node.data.ref.kind === 'document' ? `<button type="button" role="menuitem" data-action="context-duplicate" data-id="${id}">Duplicar</button>` : ''}${this.ctx.ui.canvas.selections.length > 1 && !this.ctx.world().canvasGroups?.some((g) => g.nodes.some((n) => this.ctx.ui.canvas.selections.includes(n))) ? `<button type="button" role="menuitem" data-action="context-group">Crear conjunto</button>` : ''}${this.ctx.world().canvasGroups?.some((g) => g.nodes.includes(id)) ? `<button role="menuitem" data-action="group-remove" data-id="${id}">Sacar del conjunto</button>` : ''}${node.data.kind === 'reference' && ['document', 'file'].includes(node.data.ref.kind) ? `<button type="button" role="menuitem" data-action="reference-fragment" data-id="${id}">Mostrar un fragmento…</button>${node.data.ref.fragment ? `<button type="button" role="menuitem" data-action="reference-whole" data-id="${id}">Referencia completa</button>` : ''}` : ''}${layers}<button type="button" role="menuitem" data-action="context-zones" aria-haspopup="menu" data-id="${id}">Asignar a una zona <span>›</span></button><button type="button" role="menuitem" data-action="canvas-comment">Comentar <kbd>${html(this.ctx.ui.shortcuts.comment)}</kbd></button><button type="button" role="menuitem" data-action="context-remove" data-id="${id}">${node.data.kind === 'reference' ? 'Quitar del Canvas' : 'Eliminar'}</button></div>`;
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
    this.editForm('label', id, link.label ?? '', { x: point.x - 100, y: point.y - 18 });
    this.fitOverlay();
    this.overlay.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }
  private editForm(kind: 'rename' | 'label', id: string, text: string, point: Point): void {
    const field = kind === 'rename' ? 'material-name' : 'cable-text';
    this.overlay.innerHTML = `<form class="canvas-context-form compact-edit ${kind === 'label' ? 'cable-inline-edit' : ''}" data-${kind}="${id}" style="${this.position(point)}"><label for="${field}">${kind === 'rename' ? 'Nombre del material' : 'Etiqueta de conexión'}</label><input id="${field}" value="${html(text)}" placeholder="${kind === 'rename' ? 'Nombre' : 'Etiqueta'}" aria-description="Enter confirma. Esc cancela."></form>`;
  }
  private linkForm(): void {
    this.overlay.innerHTML = `<form id="canvas-new-link" class="canvas-context-form link-entry-form" novalidate style="${this.position({ x: innerWidth / 2 - 140, y: innerHeight / 2 - 80 })}"><label for="canvas-link-url">Dirección del enlace</label><button type="button" class="icon-button link-entry-close" data-action="context-close" aria-label="Cerrar formulario de enlace">${icon('close', 14)}</button><input id="canvas-link-url" inputmode="url" placeholder="https://"><small role="status"></small><button type="submit">Agregar enlace</button></form>`;
    this.fitOverlay();
    this.overlay.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }
  private addLink(value: string): void {
    const url = new URL(value);
    this.create({ kind: 'link', title: url.hostname + url.pathname, url: url.href }, 320, 240);
  }
  private async pasteClipboard(): Promise<void> {
    try {
      const entries = await navigator.clipboard.read();
      const files: File[] = [];
      let value = '';
      let markup = '';
      for (const entry of entries) {
        const image = entry.types.find((type) => type.startsWith('image/'));
        if (image)
          files.push(new File([await entry.getType(image)], 'Imagen pegada', { type: image }));
        if (entry.types.includes('text/plain'))
          value = await (await entry.getType('text/plain')).text();
        if (entry.types.includes('text/html'))
          markup = await (await entry.getType('text/html')).text();
      }
      if (this.disposed) return;
      this.overlay.replaceChildren();
      if (files.length)
        await this.importFiles(files, false, undefined, clipboardOrigin(value, '', markup));
      else {
        const url = enteredLink(value);
        if (url) this.addLink(url);
        else this.ctx.notice('El portapapeles no contiene una imagen o URL válida.', true);
      }
    } catch {
      if (!this.disposed) this.pasteFallback();
    }
  }
  private pasteFallback(): void {
    this.overlay.innerHTML = `<div class="canvas-context-form clipboard-fallback" role="dialog" aria-label="Pegar en Canvas" style="${this.position({ x: innerWidth / 2 - 150, y: innerHeight / 2 - 90 })}"><button class="icon-button link-entry-close" type="button" data-action="context-close" aria-label="Cerrar pegado">${icon('close', 14)}</button><label for="clipboard-paste">Pegar en Canvas</label><p>El navegador no permitió leer el portapapeles. Pegá acá con Ctrl+V.</p><textarea id="clipboard-paste" aria-label="Pegá una imagen o enlace" rows="2"></textarea></div>`;
    this.fitOverlay();
    const input = this.overlay.querySelector<HTMLTextAreaElement>('textarea')!;
    input.focus({ preventScroll: true });
    input.addEventListener(
      'paste',
      (event) => {
        const files = [...(event.clipboardData?.files ?? [])];
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const url = enteredLink(text);
        if (!files.length && !url) return;
        event.preventDefault();
        event.stopPropagation();
        this.overlay.replaceChildren();
        if (files.length)
          void this.importFiles(
            files,
            false,
            undefined,
            clipboardOrigin(
              text,
              event.clipboardData?.getData('text/uri-list'),
              event.clipboardData?.getData('text/html'),
            ),
          );
        else this.addLink(url!);
      },
      { signal: this.previewAbort.signal },
    );
  }
  private paintLinkCards(id: string): void {
    const world = this.ctx.world();
    const source = world.nodes.find((n) => n.id === id);
    const outputs = world.assignments
      .filter((job) => job.node === id)
      .flatMap((job) => job.output?.map((o) => o.material) ?? []);
    for (const element of this.root.querySelectorAll<HTMLElement>(
      '.material.link[data-node], .material.link[data-proposed-node], .assigned-link[data-assigned-id]',
    )) {
      const key =
        element.dataset.node ?? element.dataset.proposedNode ?? element.dataset.assignedId;
      const node = source?.id === key ? source : outputs.find((n) => n.id === key);
      if (node?.data.kind !== 'link') continue;
      const previous = element.querySelector<HTMLElement>('.link-card');
      if (!previous) continue;
      const focused = previous.contains(document.activeElement);
      previous.outerHTML = linkCardMarkup(
        node.data,
        node.id,
        !element.hasAttribute('data-proposed-node'),
      );
      if (focused) element.focus({ preventScroll: true });
    }
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
      const result = await sampleFiles(this.ctx.ui.canvas.sampleImageIndex ?? 0);
      if (this.disposed) return;
      const added = await this.importFiles(result.files, true, result.duration);
      if (this.disposed) return;
      if (
        this.ctx.world().nodes.some((node) => added.includes(node.id) && node.data.kind === 'image')
      ) {
        this.ctx.ui.canvas.sampleImageIndex = result.nextImageIndex;
        this.ctx.persist();
      }
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
  private async importFiles(
    files: File[],
    frame = false,
    sampleDuration?: number,
    source?: string,
  ): Promise<string[]> {
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
          const inspected = await inspectMedia(file, this.previewAbort.signal);
          ratio = inspected.ratio;
          preview = inspected.preview;
          duration = inspected.duration ?? sampleDuration;
        }
        const asset = 'asset-' + crypto.randomUUID();
        await this.ctx.storage.putAsset(asset, file);
        if (this.disposed) return added;
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
            ...(source ? { source } : {}),
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
      this.ctx.act({ type: 'camera', camera }, 'encuadrar materiales incorporados', 'C08-MAT-01');
    }
    return added;
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
    const link = (this.overlay.querySelector('[data-label]') as HTMLElement | null)?.dataset.label;
    const color = this.colorField;
    this.colorField = null;
    const active = this.overlay.childElementCount > 0 || this.ctx.ui.canvas.tool === 'comment';
    this.ctx.ui.canvas.commentTarget = null;
    if (this.ctx.ui.canvas.tool === 'comment') {
      this.ctx.ui.canvas.tool = 'select';
      this.ctx.render();
    }
    this.overlay.replaceChildren();
    if (link) this.focusLink(link);
    else if (color)
      this.root
        .querySelector<HTMLInputElement>(color === 'color' ? '#draw-color' : '#shape-border')
        ?.focus({ preventScroll: true });
    else if (active)
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
