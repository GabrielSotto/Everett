import type { Context } from '../app/context';
import {
  entries,
  families,
  availableStates,
  settingOptions,
  changeState,
} from '../../design/wireframe-library/samples.js';
import { renderLibrary, type LibraryChoice } from '../features/canvas/library/render';
import { compileLibrary } from '../features/canvas/library/compile';
import { instantiateLibrary, type LibraryComposition } from '../domain/sketch-library';
import { wireframeMarkup } from '../features/canvas/wireframe-markup';
import { toWorld } from '../spatial/math';
import { frameCanvas } from './canvas-frame';
import { html } from './dom';
import { icon } from './icons';
import type { Point } from '../domain/model';

let dismissLibrary: (() => void) | undefined;
export function closeSketchLibrary(): void {
  dismissLibrary?.();
}
export function openSketchLibrary(ctx: Context, parentSignal: AbortSignal): void {
  dismissLibrary?.();
  const controller = new AbortController(),
    { signal } = controller;
  const trigger = document.querySelector<HTMLElement>('[data-action=canvas-wireframes]');
  const panel = document.createElement('section');
  panel.className = 'sketch-library';
  panel.role = 'dialog';
  panel.setAttribute('aria-label', 'Biblioteca de bosquejos');
  panel.innerHTML = `<header><strong>Biblioteca de bosquejos</strong><button type="button" class="icon-button" data-close aria-label="Cerrar biblioteca">${icon('close', 16)}</button></header><div class="library-filter"><input type="search" aria-label="Buscar piezas y composiciones" placeholder="Buscar piezas y composiciones…"><select aria-label="Familia de componentes">${families.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></div><div class="library-workspace"><div class="library-items" role="listbox" aria-label="Componentes"></div><div class="library-detail"><div class="library-preview-wrap"><div class="library-preview" aria-label="Arrastrar composición al Canvas"></div></div><div class="library-options"></div><p class="library-status" role="status"></p><button type="button" class="library-insert">Agregar al Canvas</button><small>También podés arrastrar la vista previa.</small></div></div>`;
  document.body.append(panel);
  let choice: LibraryChoice = {
    entry: entries[0]!,
    variant: entries[0]!.variants[0]!.id,
    state: 'default',
    options: {},
    width: entries[0]!.layout.width,
    labels: false,
  };
  let revision = 0,
    ready = false,
    composition: LibraryComposition | null = null;
  const search = panel.querySelector<HTMLInputElement>('input[type=search]')!;
  const family = panel.querySelector<HTMLSelectElement>('.library-filter select')!;
  const items = panel.querySelector<HTMLElement>('.library-items')!;
  const options = panel.querySelector<HTMLElement>('.library-options')!;
  const preview = panel.querySelector<HTMLElement>('.library-preview')!;
  const status = panel.querySelector<HTMLElement>('.library-status')!;
  const insert = panel.querySelector<HTMLButtonElement>('.library-insert')!;
  let drag: { x: number; y: number; pointer: number; ghost: HTMLElement | null } | null = null;
  const cancelDrag = () => {
    drag?.ghost?.remove();
    drag = null;
  };
  const close = () => {
    revision++;
    cancelDrag();
    controller.abort();
    observer.disconnect();
    panel.remove();
    dismissLibrary = undefined;
    trigger?.focus({ preventScroll: true });
  };
  dismissLibrary = close;
  parentSignal.addEventListener('abort', close, { once: true, signal });
  const fit = () => {
    const host = preview.querySelector<HTMLElement>('.library-sample-host');
    if (!host) return;
    const scale = Math.min(
      1,
      (preview.clientWidth - 8) / choice.width,
      260 / Math.max(1, host.offsetHeight),
    );
    host.style.transform = `scale(${scale})`;
    preview.style.height = Math.max(60, host.offsetHeight * scale + 8) + 'px';
  };
  let lastWidth = -1;
  const observer = new ResizeObserver(() => {
    if (preview.clientWidth === lastWidth) return;
    lastWidth = preview.clientWidth;
    requestAnimationFrame(() => {
      if (!signal.aborted) fit();
    });
  });
  observer.observe(preview);
  const list = () => {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase();
    const query = normalize(search.value.trim());
    const matches = entries.filter(
      (item) =>
        (family.value === 'all' || item.family === family.value) &&
        normalize(item.name + ' ' + item.tags + ' ' + item.anatomy).includes(query),
    );
    panel.querySelector<HTMLElement>('.library-detail')!.hidden = !matches.length;
    if (matches.length && !matches.some((entry) => entry.id === choice.entry.id)) {
      const entry = matches[0]!;
      choice = {
        ...choice,
        entry,
        variant: entry.variants[0]!.id,
        state: 'default',
        options: {},
        width: entry.layout.width,
      };
      void paint();
    }
    items.innerHTML = matches.length
      ? matches
          .map(
            (item) =>
              `<button type="button" role="option" aria-selected="${item.id === choice.entry.id}" data-library-entry="${item.id}">${html(item.name)}<small>${html(item.kind)}</small></button>`,
          )
          .join('')
      : '<p>No hay coincidencias.</p>';
  };
  const paint = async () => {
    const token = ++revision;
    ready = false;
    composition = null;
    insert.disabled = true;
    status.textContent = 'Preparando vista previa…';
    const entry = choice.entry;
    const allowed = availableStates(entry, choice.variant, choice.options);
    const states = (Array.isArray(choice.state) ? choice.state : [choice.state]).filter(
      (s) => allowed.includes(s) && s !== 'default',
    );
    choice.state = states.length ? states : 'default';
    options.innerHTML = `<strong>${html(entry.name)}</strong><label>Texto<select data-labels><option value="bars" ${!choice.labels ? 'selected' : ''}>Simulado</option><option value="labels" ${choice.labels ? 'selected' : ''}>Rótulos</option></select></label>${entry.variants.length > 1 ? `<label>Variante<select data-variant>${entry.variants.map((v) => `<option value="${v.id}" ${v.id === choice.variant ? 'selected' : ''}>${html(v.label)}</option>`).join('')}</select></label>` : ''}${allowed.length > 1 ? `<div class="library-states" role="group" aria-label="Estados de la composición">${allowed.map((s) => `<button type="button" data-library-state="${s}" aria-pressed="${s === 'default' ? !states.length : states.includes(s)}">${html(entry.stateDetails[s]!.label)}</button>`).join('')}</div>` : ''}${entry.settings
      .map(
        (setting) =>
          `<label>${html(setting.label)}<select data-setting="${setting.id}">${settingOptions(
            entry,
            setting,
            choice.variant,
          )
            .map(
              (o) =>
                `<option value="${o.id}" ${o.id === choice.options[setting.id] ? 'selected' : ''}>${html(o.label)}</option>`,
            )
            .join('')}</select></label>`,
      )
      .join(
        '',
      )}<label>Ancho<input type="number" data-width aria-label="Ancho de la composición" min="${entry.layout.minWidth}" max="${entry.layout.maxWidth}" value="${choice.width}"><span>px</span></label>`;
    preview.replaceChildren();
    const host = document.createElement('div');
    host.className = 'library-sample-host';
    host.style.width = choice.width + 'px';
    preview.append(host);
    try {
      await renderLibrary(host, choice);
      if (token !== revision || signal.aborted) return;
      const result = await compileLibrary(choice);
      if (token !== revision || signal.aborted) return;
      composition = result;
      ready = true;
      insert.disabled = false;
      status.textContent =
        result.parts.length > 1
          ? `${result.parts.length} piezas editables · un conjunto`
          : 'Pieza editable';
      fit();
    } catch (error) {
      if (token !== revision || signal.aborted) return;
      status.textContent =
        error instanceof Error ? error.message : 'No se pudo preparar la composición.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Reintentar';
      retry.addEventListener(
        'click',
        () => {
          void paint();
        },
        { signal },
      );
      status.append(retry);
    }
  };
  const add = (drop?: Point) => {
    if (!ready || !composition) return;
    const viewport = document.querySelector('#viewport')?.getBoundingClientRect();
    if (!viewport) return;
    const left =
      document.querySelector('.canvas-chat.docked:not(.compact)')?.getBoundingClientRect().right ??
      viewport.left;
    const camera = ctx.currentCamera();
    const center = toWorld(
      drop ?? { x: (left + viewport.right) / 2, y: viewport.y + viewport.height / 2 },
      camera,
      viewport,
    );
    const id = 'material-' + crypto.randomUUID();
    const result = instantiateLibrary(composition, id, center);
    if (
      !ctx.act(
        { type: 'wireframe.library', world: ctx.world().id, id, center, composition },
        'agregar composición de biblioteca',
        'C08-LIBRARY-01',
      )
    )
      return;
    Object.assign(ctx.ui.canvas, {
      tool: 'select',
      selection: id,
      selections: result.nodes.map((n) => n.id),
      zoneSelection: null,
      linkSelection: null,
    });
    close();
    ctx.render();
    if (!drop) frameCanvas(ctx, true, { maximumZoom: 1 });
    ctx.persist();
    document.querySelector<HTMLElement>(`[data-node="${id}"]`)?.focus({ preventScroll: true });
  };
  search.addEventListener('input', list, { signal });
  family.addEventListener('change', list, { signal });
  items.addEventListener(
    'click',
    (e) => {
      const id = (e.target as Element).closest<HTMLElement>('[data-library-entry]')?.dataset
        .libraryEntry;
      const entry = entries.find((item) => item.id === id);
      if (!entry) return;
      choice = {
        ...choice,
        entry,
        variant: entry.variants[0]!.id,
        state: 'default',
        options: {},
        width: entry.layout.width,
      };
      list();
      void paint();
      items.querySelector<HTMLElement>('[aria-selected=true]')?.focus();
    },
    { signal },
  );
  options.addEventListener(
    'input',
    (e) => {
      const field = e.target;
      if (!(field instanceof HTMLInputElement) || !field.matches('[data-width]')) return;
      ready = false;
      insert.disabled = true;
      revision++;
      status.textContent =
        field.checkValidity() && field.value.trim()
          ? 'Confirmá el ancho con Enter o saliendo del campo.'
          : `Elegí un ancho entre ${field.min} y ${field.max} px.`;
    },
    { signal },
  );
  options.addEventListener(
    'change',
    (e) => {
      const field = e.target as HTMLInputElement;
      if (field.matches('[data-width]')) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return;
        }
        choice.width = Number(field.value);
      } else if (field.matches('[data-labels]')) choice.labels = field.value === 'labels';
      else if (field.matches('[data-variant]')) {
        choice.variant = field.value;
        choice.options = {};
      } else if (field.matches('[data-state]')) choice.state = field.value;
      else if (field.dataset.setting) choice.options[field.dataset.setting] = field.value;
      const selector = field.hasAttribute('data-labels')
        ? '[data-labels]'
        : field.hasAttribute('data-variant')
          ? '[data-variant]'
          : field.hasAttribute('data-state')
            ? '[data-state]'
            : field.dataset.setting
              ? `[data-setting="${field.dataset.setting}"]`
              : '[data-width]';
      void paint();
      options.querySelector<HTMLElement>(selector)?.focus();
    },
    { signal },
  );
  options.addEventListener(
    'click',
    (e) => {
      const state = (e.target as Element).closest<HTMLElement>('[data-library-state]')?.dataset
        .libraryState;
      if (!state) return;
      choice.state = changeState(choice.entry, choice.state, state);
      void paint();
      options.querySelector<HTMLElement>(`[data-library-state="${state}"]`)?.focus();
    },
    { signal },
  );
  insert.addEventListener('click', () => add(), { signal });
  panel.querySelector('[data-close]')!.addEventListener('click', close, { signal });
  panel.addEventListener('wheel', (e) => e.stopPropagation(), { signal, passive: true });
  panel.addEventListener(
    'keydown',
    (e) => {
      e.stopPropagation();
      if (
        e.key === 'Enter' &&
        e.target instanceof HTMLInputElement &&
        e.target.matches('[data-width]')
      ) {
        e.preventDefault();
        e.target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (drag) cancelDrag();
        else close();
      }
      if (
        e.target instanceof Element &&
        e.target.closest('.library-items') &&
        ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)
      ) {
        e.preventDefault();
        const buttons = [...items.querySelectorAll<HTMLButtonElement>('button')];
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? buttons.length - 1
              : (current + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        ]?.focus();
      }
    },
    { signal },
  );
  preview.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || !ready) return;
      e.preventDefault();
      preview.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, pointer: e.pointerId, ghost: null };
    },
    { signal },
  );
  preview.addEventListener(
    'pointermove',
    (e) => {
      if (!drag || !composition || drag.pointer !== e.pointerId) return;
      if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
      if (!drag.ghost) {
        const ghost = document.createElement('div');
        ghost.className = 'library-drag-preview';
        ghost.style.width = composition.width + 'px';
        ghost.style.height = composition.height + 'px';
        const result = instantiateLibrary(composition, 'preview', {
          x: composition.width / 2,
          y: composition.height / 2,
        });
        ghost.innerHTML = result.nodes
          .map(
            (n) =>
              `<div style="position:absolute;left:${n.x}px;top:${n.y}px;width:${n.width}px;height:${n.height}px">${wireframeMarkup(n)}</div>`,
          )
          .join('');
        document.body.append(ghost);
        drag.ghost = ghost;
      }
      drag.ghost.style.left = e.clientX + 'px';
      drag.ghost.style.top = e.clientY + 'px';
      drag.ghost.style.transform = `translate(-50%,-50%) scale(${ctx.currentCamera().z})`;
    },
    { signal },
  );
  preview.addEventListener(
    'pointerup',
    (e) => {
      const dragged = !!drag?.ghost;
      cancelDrag();
      if (!dragged) return;
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      if (
        hit?.closest('.canvas-stage') &&
        !hit.closest('.canvas-chat,.canvas-context-layer,.canvas-dock-host')
      )
        add({ x: e.clientX, y: e.clientY });
    },
    { signal },
  );
  preview.addEventListener('lostpointercapture', cancelDrag, { signal });
  window.addEventListener('blur', cancelDrag, { signal });
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && drag) {
        e.preventDefault();
        e.stopPropagation();
        cancelDrag();
      }
    },
    { signal, capture: true },
  );
  list();
  void paint();
  search.focus();
}
