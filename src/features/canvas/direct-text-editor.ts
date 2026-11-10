import type { Context } from '../../app/context';
import { newCanvasText, textLimit, type CanvasText } from '../../domain/canvas-text';
import type { Camera, Material, Point } from '../../domain/model';
import { canvasTextInk } from '../../domain/sketch-text-ink';
import { googleFamily } from '../../domain/note-fonts';
import { icon } from '../../ui/icons';
import { NoteFontPicker } from './note-font-picker';
import { restoreNoteFonts } from './note-font-loading';
import { textStyle, textBounds } from './direct-text-layout';

/** One insertion or editing session is one reversible gesture. Native editing
 * keeps its own caret, selection, IME and undo while the session is open. */
export class DirectTextEditor {
  private finishSession: ((focus: boolean, repaint: boolean) => void) | null = null;
  private place: ((camera: Camera) => void) | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    private select: (id: string) => void,
  ) {}
  position(camera: Camera) {
    this.place?.(camera);
  }
  finish(focus = false, repaint = true) {
    if (!this.finishSession) return false;
    this.finishSession(focus, repaint);
    return true;
  }
  start(id: string, point: Point, width?: number, original?: Material) {
    if (original && (original.owner || original.data.kind !== 'text')) return;
    this.finish();
    const world = this.ctx.world();
    const data: CanvasText =
      original?.data.kind === 'text'
        ? structuredClone(original.data)
        : newCanvasText(width == null ? 'auto' : 'wrap');
    const stage = this.root.querySelector<HTMLElement>('.canvas-stage')!;
    const host = document.createElement('div');
    host.className = 'direct-text-host';
    const draft = document.createElement('div');
    draft.className = 'direct-text-draft';
    const field = document.createElement('textarea');
    field.setAttribute('aria-label', 'Texto en Canvas');
    field.maxLength = textLimit;
    field.className = 'canvas-text-run';
    field.value = data.text;
    draft.append(field);
    const bar = document.createElement('div');
    bar.className = 'direct-text-format';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Formato del texto');
    bar.innerHTML = `<div class="note-font-field"><input id="note-font" role="combobox" aria-label="Tipografía" aria-haspopup="grid" aria-controls="note-font-list" aria-expanded="false" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Buscar fuente…"><button type="button" tabindex="-1" aria-label="Mostrar fuentes">${icon('chevron', 14)}</button></div><label class="direct-text-weight"><span aria-hidden="true">${data.weight}</span>${icon('chevron', 10)}<select id="note-weight" aria-label="Peso"></select></label><input type="number" id="note-size" aria-label="Tamaño del texto en píxeles" min="8" max="200" step="any" value="${data.size}"><input type="color" aria-label="Color del texto"><div class="direct-text-align" role="group" aria-label="Alineación del texto">${(
      [
        ['left', 'Alinear a la izquierda'],
        ['center', 'Centrar texto'],
        ['right', 'Alinear a la derecha'],
      ] as const
    )
      .map(
        ([side, label]) =>
          `<button type="button" data-align="${side}" title="${label}" aria-label="${label}">${icon('text-' + side, 16)}</button>`,
      )
      .join('')}</div>`;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'direct-text-auto';
    reset.title = 'Restablecer color automático';
    reset.setAttribute('aria-label', reset.title);
    reset.innerHTML = icon('restore', 14);
    bar.querySelector('[type=color]')!.after(reset);
    const abort = new AbortController(),
      options = { signal: abort.signal };
    host.append(draft, bar);
    stage.append(host);
    this.root.dataset.editingText = id;
    const source = () => stage.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
    const size = bar.querySelector<HTMLInputElement>('#note-size')!;
    const color = bar.querySelector<HTMLInputElement>('[type=color]')!;
    const align = bar.querySelector<HTMLElement>('.direct-text-align')!;
    const alignButtons = Array.from(align.querySelectorAll<HTMLButtonElement>('button'));
    const showAlignment = () =>
      alignButtons.forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.align === data.align)),
      );
    showAlignment();
    let bounds = textBounds(data, width ?? original?.width ?? 4);
    const session = crypto.randomUUID();
    let saved = !!original,
      modified = false;
    const save = (final = false) => {
      if (!data.text.trim() && (!final || !saved)) return;
      const current = this.ctx.store
        .get()
        .worlds.find((w) => w.id === world.id)
        ?.nodes.find((n) => n.id === id);
      if (
        current &&
        current.width === bounds.width &&
        current.height === bounds.height &&
        JSON.stringify(current.data) === JSON.stringify(data)
      )
        return;
      if (
        this.ctx.act(
          {
            type: 'text.edit',
            session,
            world: world.id,
            id,
            ...(!saved ? { insertAt: point } : {}),
            data,
            ...bounds,
          },
          'escribir texto',
          'C08-TEXT-01',
          'keyboard',
        )
      ) {
        saved = !!data.text.trim();
        modified = true;
      }
    };
    const layout = (changed = false) => {
      source()?.classList.add('direct-text-source');
      bar.querySelector('.direct-text-weight span')!.textContent = String(data.weight);
      bounds = textBounds(data, width ?? original?.width ?? 4);
      const ink = canvasTextInk({ id, ...point, ...bounds, owner: null, data }, world);
      field.style.cssText = textStyle(data, ink);
      color.value = data.color ?? ink.color;
      reset.hidden = data.color === null;
      // Only the caret needs a minimum hit area. It is never saved in the material.
      draft.style.width = Math.max(data.text ? 4 : 24, bounds.width) + 'px';
      draft.style.height = bounds.height + 'px';
      this.position(this.ctx.currentCamera());
      if (changed) save();
    };
    this.place = (camera) => {
      source()?.classList.add('direct-text-source');
      const x = stage.clientWidth / 2 + camera.x + point.x * camera.z,
        y = stage.clientHeight / 2 + camera.y + point.y * camera.z;
      draft.style.transform = `translate(${x}px,${y}px) scale(${camera.z}) translate(50%,50%) rotate(${original?.rotation ?? 0}deg) translate(-50%,-50%)`;
      const margin = 6;
      bar.style.left =
        Math.max(margin, Math.min(x, stage.clientWidth - bar.offsetWidth - margin)) + 'px';
      const above = y - bar.offsetHeight - 10;
      bar.style.top =
        Math.max(
          margin,
          Math.min(
            above >= margin ? above : y + bounds.height * camera.z + 10,
            stage.clientHeight - bar.offsetHeight - margin,
          ),
        ) + 'px';
    };
    const fonts = new NoteFontPicker(
      bar.querySelector('.note-font-field')!,
      data.font,
      data.weight,
      data.italic,
      this.ctx.ui.favoriteFonts ?? [],
      (font, weight, italic) => {
        Object.assign(data, { font, weight, italic });
        syncFont();
        layout(true);
      },
      (favorites) => {
        this.ctx.ui.favoriteFonts = favorites;
        this.ctx.persist();
      },
    );
    const syncFont = () => {
      draft.dataset.noteFont = googleFamily(data.font) ?? '';
      draft.dataset.noteWeight = String(data.weight);
      draft.dataset.noteItalic = String(data.italic);
      restoreNoteFonts(host, () => layout(true));
    };
    field.addEventListener(
      'input',
      () => {
        data.text = field.value;
        layout(true);
      },
      options,
    );
    size.addEventListener(
      'input',
      () => {
        if (size.value && size.validity.valid) {
          data.size = size.valueAsNumber;
          layout(true);
        }
      },
      options,
    );
    size.addEventListener(
      'change',
      () => {
        size.value = String(data.size);
      },
      options,
    );
    color.addEventListener(
      'input',
      () => {
        data.color = color.value;
        layout(true);
      },
      options,
    );
    reset.addEventListener(
      'click',
      () => {
        data.color = null;
        layout(true);
        color.focus();
      },
      options,
    );
    align.addEventListener('mousedown', (e) => e.preventDefault(), options);
    align.addEventListener(
      'click',
      (e) => {
        const button = alignButtons.find((b) => e.target instanceof Node && b.contains(e.target));
        if (!button || data.align === button.dataset.align) return;
        data.align = button.dataset.align as CanvasText['align'];
        showAlignment();
        layout(true);
      },
      options,
    );
    this.finishSession = (focus, repaint) => {
      this.finishSession = null;
      this.place = null;
      abort.abort();
      fonts.dispose();
      host.remove();
      source()?.classList.remove('direct-text-source');
      delete this.root.dataset.editingText;
      const text = data.text.trim();
      if (saved && !text) save(true);
      if (modified && repaint) this.ctx.render();
      if (focus && text) {
        this.select(id);
        source()?.focus({ preventScroll: true });
      } else if (focus) this.root.focus({ preventScroll: true });
    };
    host.addEventListener(
      'keydown',
      (e) => {
        if (e.isComposing) return;
        if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
          e.preventDefault();
          e.stopPropagation();
          this.finish(true);
        }
      },
      options,
    );
    const outside = (e: Event) =>
      e.target instanceof Element &&
      !host.contains(e.target) &&
      !e.target.closest('.note-font-picker');
    // Finish after the underlying control receives its gesture. A synchronous
    // rebuild on pointerdown would detach the dock button or its pointer capture.
    let outsideGesture = false;
    window.addEventListener(
      'pointerdown',
      (e) => {
        outsideGesture = outside(e);
      },
      { capture: true, ...options },
    );
    window.addEventListener(
      'click',
      (e) => {
        if (outsideGesture && outside(e)) this.finish();
      },
      options,
    );
    document.addEventListener(
      'focusin',
      (e) => {
        if (outside(e) && !outsideGesture)
          queueMicrotask(() => {
            if (
              host.isConnected &&
              !host.contains(document.activeElement) &&
              !document.activeElement?.closest('.note-font-picker')
            )
              this.finish();
          });
      },
      options,
    );
    window.addEventListener('resize', () => this.position(this.ctx.currentCamera()), options);
    window.addEventListener('pagehide', () => this.finish(), { capture: true, ...options });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.finish();
      },
      { capture: true, ...options },
    );
    syncFont();
    layout();
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  }
}
