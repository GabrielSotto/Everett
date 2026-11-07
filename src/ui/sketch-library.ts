import type { Context } from '../app/context';
import { entries } from '../../design/wireframe-library/samples.js';
import type { LibraryChoice } from '../features/canvas/library/render';
import { compileLibrary } from '../features/canvas/library/compile';
import {
  instantiateLibrary,
  libraryBounds,
  type LibraryComposition,
} from '../domain/sketch-library';
import { toWorld } from '../spatial/math';
import { frameCanvas } from './canvas-frame';
import { icon } from './icons';
import { libraryBrowser, defaultLibraryChoice } from './sketch-library-browser';
import { libraryOptions } from './sketch-library-options';
import { bindLibraryDrag, type LibraryDrop } from './sketch-library-drag';

let dismissLibrary: (() => void) | undefined;
export function sketchLibraryOpen(): boolean {
  return !!dismissLibrary;
}
export function closeSketchLibrary(): void {
  dismissLibrary?.();
}

export function openSketchLibrary(ctx: Context, parentSignal: AbortSignal): void {
  dismissLibrary?.();
  const controller = new AbortController(),
    { signal } = controller;
  const panel = document.createElement('section');
  panel.className = 'sketch-library';
  panel.role = 'dialog';
  panel.setAttribute('aria-label', 'Biblioteca de bosquejos');
  panel.id = 'canvas-wireframes-menu';
  panel.innerHTML = `<header><strong>Bosquejos</strong><div class="library-search"><input id="library-search-input" type="search" aria-label="Buscar piezas y composiciones" placeholder="Buscar en la biblioteca…" disabled aria-hidden="true"><button type="button" class="icon-button" data-action="library-search" aria-label="Buscar en la biblioteca" aria-expanded="false" aria-controls="library-search-input" title="Buscar en la biblioteca">${icon('search', 16)}</button></div><button type="button" class="icon-button" data-close aria-label="Cerrar biblioteca">${icon('close', 16)}</button></header><div class="library-browser"></div><p class="library-status" role="status"></p>`;
  document.body.append(panel);
  const trigger = () => document.querySelector<HTMLElement>('[data-action=canvas-wireframes]');
  trigger()?.setAttribute('aria-expanded', 'true');
  const status = panel.querySelector<HTMLElement>('.library-status')!;
  let inserting = false;
  let closeOptions: (() => void) | undefined;
  const worldId = ctx.world().id;
  const close = () => {
    const focused = panel.contains(document.activeElement);
    closeOptions?.();
    controller.abort();
    panel.remove();
    dismissLibrary = undefined;
    trigger()?.setAttribute('aria-expanded', 'false');
    if (focused) trigger()?.focus({ preventScroll: true });
  };
  dismissLibrary = close;
  parentSignal.addEventListener('abort', close, { once: true, signal });
  const position = () => {
    const anchor = trigger()?.getBoundingClientRect();
    if (!anchor) {
      close();
      return;
    }
    panel.style.left =
      Math.max(8, Math.min(anchor.left, innerWidth - panel.offsetWidth - 8)) + 'px';
    panel.style.top = anchor.bottom + 8 + 'px';
    panel.style.maxHeight = Math.max(140, Math.min(360, innerHeight - anchor.bottom - 24)) + 'px';
  };
  const add = (result: LibraryComposition, drop?: LibraryDrop) => {
    const route = ctx.store.get().route;
    if (
      signal.aborted ||
      route.kind !== 'surface' ||
      route.surface !== 'canvas' ||
      ctx.world().id !== worldId
    )
      return;
    const viewport = document.querySelector('#viewport')?.getBoundingClientRect();
    if (!viewport) return;
    const left = Math.max(
      viewport.left,
      document.querySelector('.canvas-chat.docked:not(.compact)')?.getBoundingClientRect().right ??
        0,
    );
    const center = toWorld(
      drop?.point ?? { x: (left + viewport.right) / 2, y: viewport.y + viewport.height / 2 },
      ctx.currentCamera(),
      viewport,
    );
    if (drop) {
      const bounds = libraryBounds(result);
      center.x += (0.5 - drop.grab.x) * bounds.width;
      center.y += (0.5 - drop.grab.y) * bounds.height;
    }
    const id = 'material-' + crypto.randomUUID();
    const created = instantiateLibrary(result, id, center);
    if (
      !ctx.act(
        { type: 'wireframe.library', world: worldId, id, center, composition: result },
        'agregar composición de biblioteca',
        'C08-LIBRARY-01',
      )
    )
      return;
    Object.assign(ctx.ui.canvas, {
      tool: 'select',
      selection: id,
      selections: created.nodes.map((n) => n.id),
      zoneSelection: null,
      linkSelection: null,
    });
    close();
    ctx.render();
    if (!drop) frameCanvas(ctx, true, { maximumZoom: 1 });
    ctx.persist();
    document.querySelector<HTMLElement>(`[data-node="${id}"]`)?.focus({ preventScroll: true });
  };
  const quickAdd = async (choice: LibraryChoice, drop?: LibraryDrop) => {
    if (inserting || signal.aborted) return;
    inserting = true;
    status.textContent = 'Preparando pieza…';
    try {
      add(await compileLibrary(choice), drop);
    } catch (error) {
      if (!signal.aborted) {
        status.textContent =
          error instanceof Error ? error.message : 'No se pudo agregar la pieza.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = 'Reintentar';
        retry.addEventListener('click', () => void quickAdd(choice, drop), { signal });
        status.append(retry);
      }
    } finally {
      inserting = false;
    }
  };
  const browserRoot = panel.querySelector<HTMLElement>('.library-browser')!;
  const search = panel.querySelector<HTMLInputElement>('input[type=search]')!;
  const searchToggle = panel.querySelector<HTMLButtonElement>('[data-action=library-search]')!;
  let searching = false;
  const setSearching = (open: boolean) => {
    searching = open;
    panel.classList.toggle('searching', open);
    searchToggle.setAttribute('aria-expanded', String(open));
    search.disabled = !open;
    search.setAttribute('aria-hidden', String(!open));
    if (open) search.focus({ preventScroll: true });
    else {
      // Una búsqueda colapsada nunca debe dejar un filtro invisible.
      search.value = '';
      search.dispatchEvent(new Event('input'));
      searchToggle.focus({ preventScroll: true });
    }
  };
  searchToggle.addEventListener('click', () => setSearching(!searching), { signal });
  search.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter') event.preventDefault();
    },
    { signal },
  );
  const browser = libraryBrowser(
    browserRoot,
    search,
    signal,
    (choice, anchor) => {
      closeOptions?.();
      closeOptions = libraryOptions(choice, anchor, signal, browser.update);
    },
    (choice) => void quickAdd(choice),
  );
  browserRoot.addEventListener('library-browse', () => closeOptions?.(), { signal });
  panel.querySelector('[data-close]')!.addEventListener('click', close, { signal });
  panel.addEventListener('wheel', (event) => event.stopPropagation(), { signal, passive: true });
  panel.addEventListener('keydown', (event) => event.stopPropagation(), { signal });
  window.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== 'Escape' ||
        document.querySelector('.library-choice-options,.library-drag-preview')
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (searching) setSearching(false);
      else close();
    },
    { signal, capture: true },
  );
  document.addEventListener(
    'click',
    (event) => {
      if (
        event
          .composedPath()
          .some(
            (node) =>
              node instanceof Element &&
              node.closest(
                '.sketch-library,.library-choice-options,[data-action=canvas-wireframes]',
              ),
          )
      )
        return;
      close();
    },
    { signal },
  );
  window.addEventListener('resize', position, { signal });
  bindLibraryDrag(
    panel,
    ctx,
    signal,
    (element) => {
      const id = element.closest<HTMLElement>('[data-library-add]')?.dataset.libraryAdd;
      const entry = entries.find((item) => item.id === id);
      return entry ? defaultLibraryChoice(entry) : null;
    },
    (choice, point) => void quickAdd(choice, point),
  );
  position();
  panel.querySelector<HTMLButtonElement>('[aria-selected=true]')?.focus({ preventScroll: true });
}
