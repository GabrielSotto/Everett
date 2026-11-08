import {
  entries,
  availableStates,
  type LibraryEntry,
} from '../../design/wireframe-library/samples.js';
import type { LibraryChoice } from '../features/canvas/library/render';
import { compileLibrary } from '../features/canvas/library/compile';
import { paintLibraryPreview } from './sketch-library-preview';
import { html } from './dom';
import { icon } from './icons';
import type { LibraryComposition } from '../domain/sketch-library';
import { libraryFilters } from './sketch-library-filters';

const choices = new Map<string, LibraryChoice>();
let labels = false;
export function defaultLibraryChoice(entry: LibraryEntry): LibraryChoice {
  return {
    entry,
    variant: entry.variants[0]!.id,
    state: 'default',
    options: {},
    width: entry.layout.width,
    ...choices.get(entry.id),
    labels,
  };
}
export function hasLibraryOptions(entry: LibraryEntry): boolean {
  return (
    entry.variants.length > 1 ||
    entry.settings.length > 0 ||
    availableStates(entry, entry.variants[0]!.id, {}).length > 1
  );
}

/** Explorar muestra la pieza; sus ajustes se abren por separado de la inserción. */
export function libraryBrowser(
  root: HTMLElement,
  search: HTMLInputElement,
  signal: AbortSignal,
  configure: (choice: LibraryChoice, anchor: HTMLElement) => void,
  insert: (choice: LibraryChoice) => void,
): { update: (choice: LibraryChoice) => void } {
  root.innerHTML = `<div class="library-browse"><div class="library-navigation"><div class="library-tabs" role="tablist" aria-label="Tipo de bosquejo">${[
    ['base', 'Piezas'],
    ['components', 'Componentes'],
    ['screens', 'Interfaces'],
  ]
    .map(
      ([id, name]) =>
        `<button type="button" role="tab" aria-selected="${id === 'base'}" tabindex="${id === 'base' ? 0 : -1}" data-library-tab="${id}">${name}</button>`,
    )
    .join(
      '',
    )}</div></div><p class="library-results" hidden></p><div class="library-items" aria-label="Componentes"></div></div>`;
  const filter = document.createElement('button');
  filter.type = 'button';
  filter.className = 'library-filter';
  filter.setAttribute('aria-label', 'Filtrar componentes');
  filter.setAttribute('aria-haspopup', 'menu');
  filter.setAttribute('aria-expanded', 'false');
  filter.innerHTML = icon('filter', 16);
  // El filtro comparte la fila de navegación; no resta otra fila a las miniaturas.
  root.querySelector('.library-navigation')!.append(filter);
  const filterMenu = document.createElement('div');
  filterMenu.className = 'library-filter-menu';
  filterMenu.setAttribute('role', 'menu');
  filterMenu.setAttribute('aria-label', 'Familia de componentes');
  filterMenu.hidden = true;
  root.append(filterMenu);
  const selectedFilters: Record<string, string> = {};
  const closeFilter = () => {
    filterMenu.hidden = true;
    filter.setAttribute('aria-expanded', 'false');
  };
  const textMode = document.createElement('button');
  textMode.type = 'button';
  textMode.className = 'library-text-mode';
  textMode.setAttribute('role', 'switch');
  textMode.setAttribute('aria-checked', String(labels));
  textMode.dataset.action = 'library-labels';
  textMode.title = 'Desactivado: barras de texto. Activado: rótulos de ejemplo.';
  textMode.innerHTML =
    '<span>Mostrar rótulos</span><span class="library-switch-track" aria-hidden="true"><span></span></span>';
  root.append(textMode);
  const items = root.querySelector<HTMLElement>('.library-items')!;
  const renders = new WeakMap<HTMLElement, number>();
  const compositions = new WeakMap<HTMLElement, LibraryComposition>();
  const tiles = new Map<string, HTMLElement>();
  const paint = (host: HTMLElement, composition: LibraryComposition, basic: boolean) => {
    paintLibraryPreview(
      host,
      {
        ...composition,
        parts: composition.parts.map((part) =>
          part.content.piece?.label
            ? { ...part, content: { ...part.content, placeholder: !labels } }
            : part,
        ),
      },
      64,
      basic,
    );
  };
  let tab = 'base',
    epoch = 0;
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  const previews = new IntersectionObserver(
    (observations) => {
      for (const observation of observations) {
        if (!observation.isIntersecting) continue;
        previews.unobserve(observation.target);
        const host = observation.target as HTMLElement;
        const entry = entries.find((item) => item.id === host.dataset.thumbnail)!;
        const current = epoch;
        const render = (renders.get(host) ?? 0) + 1;
        renders.set(host, render);
        void compileLibrary(defaultLibraryChoice(entry))
          .then((composition) => {
            if (
              signal.aborted ||
              current !== epoch ||
              renders.get(host) !== render ||
              !host.isConnected
            )
              return;
            // Esperar una medida real si el contenedor todavía no entró en layout.
            if (!host.clientWidth) {
              previews.observe(host);
              return;
            }
            compositions.set(host, composition);
            paint(host, composition, entry.family === 'base');
          })
          .catch(() => {
            if (signal.aborted || current !== epoch || renders.get(host) !== render) return;
            host.replaceChildren();
            host.textContent = 'Vista previa no disponible';
          });
      }
    },
    { root: items, rootMargin: '100px' },
  );
  signal.addEventListener('abort', () => previews.disconnect(), { once: true });
  const list = () => {
    root.dispatchEvent(new CustomEvent('library-browse', { bubbles: true }));
    const query = normalize(search.value.trim());
    const filters = libraryFilters(tab);
    const family = selectedFilters[tab] ?? 'all';
    const active = filters.find((item) => item.id === family)!;
    filter.setAttribute(
      'aria-label',
      tab === 'base'
        ? 'Filtrar piezas'
        : tab === 'screens'
          ? 'Filtrar interfaces'
          : 'Filtrar componentes',
    );
    filter.title = `Filtrar: ${active.label}`;
    filter.classList.toggle('is-filtered', family !== 'all');
    filterMenu.setAttribute(
      'aria-label',
      tab === 'components' ? 'Familia de componentes' : 'Filtros de biblioteca',
    );
    filterMenu.innerHTML = filters
      .map(
        ({ id, label }) =>
          `<button type="button" role="menuitemradio" aria-checked="${id === family}" data-library-family="${id}">${label}</button>`,
      )
      .join('');
    const matches = entries.filter((item) =>
      query
        ? normalize(item.name + ' ' + item.tags + ' ' + item.anatomy).includes(query)
        : tab === 'components'
          ? !['base', 'screens'].includes(item.family) && active.includes(item)
          : item.family === tab && active.includes(item),
    );
    closeFilter();
    root.querySelector<HTMLElement>('.library-navigation')!.hidden = !!query;
    const results = root.querySelector<HTMLElement>('.library-results')!;
    results.hidden = !query;
    results.textContent = `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'} en la biblioteca`;
    const current = [...items.querySelectorAll<HTMLElement>('[data-library-add]')];
    if (
      matches.length &&
      matches.length === current.length &&
      matches.every((item, i) => item.id === current[i]!.dataset.libraryAdd)
    )
      return;
    epoch++;
    previews.disconnect();
    if (matches.length)
      items.replaceChildren(
        ...matches.map((item) => {
          let tile = tiles.get(item.id);
          if (!tile) {
            tile = document.createElement('div');
            tile.className = 'library-tile';
            tile.innerHTML = `<button type="button" class="library-tile-add" data-action="library-add" data-library-add="${item.id}" aria-label="Agregar ${html(item.name)}"><span class="library-thumbnail" data-thumbnail="${item.id}" aria-hidden="true"></span><span class="library-tile-name">${html(item.name)}</span></button>${hasLibraryOptions(item) ? `<button type="button" class="library-configure" data-action="library-configure" data-library-entry="${item.id}" aria-label="Opciones de ${html(item.name)}" title="Variantes y estados" aria-haspopup="dialog">${icon('more', 16)}</button>` : ''}`;
            tiles.set(item.id, tile);
          }
          return tile;
        }),
      );
    else
      items.innerHTML = '<p class="library-empty">No hay coincidencias. Probá con otro nombre.</p>';
    items.scrollTop = 0;
    items.querySelectorAll<HTMLElement>('[data-thumbnail]').forEach((host) => {
      const composition = compositions.get(host);
      if (composition) paint(host, composition, host.classList.contains('library-basic-preview'));
      else previews.observe(host);
    });
  };
  const update = (choice: LibraryChoice) => {
    choices.set(choice.entry.id, choice);
    const host = items.querySelector<HTMLElement>(`[data-thumbnail="${choice.entry.id}"]`);
    if (host) {
      compositions.delete(host);
      host.removeAttribute('data-ready');
      previews.observe(host);
    }
  };
  search.addEventListener('input', list, { signal });
  filter.addEventListener(
    'click',
    () => {
      const opening = filterMenu.hidden;
      filterMenu.hidden = !opening;
      filter.setAttribute('aria-expanded', String(opening));
      if (opening) filterMenu.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    },
    { signal },
  );
  filterMenu.addEventListener(
    'click',
    (event) => {
      const choice = (event.target as Element).closest<HTMLElement>('[data-library-family]');
      if (!choice) return;
      selectedFilters[tab] = choice.dataset.libraryFamily!;
      filterMenu
        .querySelectorAll('[data-library-family]')
        .forEach((el) => el.setAttribute('aria-checked', String(el === choice)));
      list();
      filter.focus();
    },
    { signal },
  );
  root.addEventListener(
    'pointerdown',
    (event) => {
      if (!(event.target as Element).closest('.library-filter, .library-filter-menu'))
        closeFilter();
    },
    { signal },
  );
  filterMenu.addEventListener(
    'keydown',
    (event) => {
      const buttons = [...filterMenu.querySelectorAll<HTMLButtonElement>('button')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        closeFilter();
        filter.focus();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        buttons[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        ]?.focus();
      } else if (event.key === 'Tab') closeFilter();
    },
    { signal },
  );
  textMode.addEventListener(
    'click',
    () => {
      labels = !labels;
      textMode.setAttribute('aria-checked', String(labels));
      // El layout no cambia entre barras y rótulos: conservar lista, foco y scroll.
      // Las previews pendientes usan el valor vigente al terminar de prepararse.
      items.querySelectorAll<HTMLElement>('[data-thumbnail]').forEach((host) => {
        const composition = compositions.get(host);
        if (composition) paint(host, composition, host.classList.contains('library-basic-preview'));
      });
    },
    { signal },
  );
  root.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.dataset.libraryTab) {
        tab = button.dataset.libraryTab;
        root.querySelectorAll<HTMLButtonElement>('[data-library-tab]').forEach((item) => {
          item.setAttribute('aria-selected', String(item === button));
          item.tabIndex = item === button ? 0 : -1;
        });
        search.value = '';
        list();
      } else {
        const entry = entries.find(
          (item) => item.id === (button.dataset.libraryEntry ?? button.dataset.libraryAdd),
        );
        if (!entry) return;
        if (button.dataset.libraryEntry) {
          configure(defaultLibraryChoice(entry), button);
        } else insert(defaultLibraryChoice(entry));
      }
    },
    { signal },
  );
  root.addEventListener(
    'keydown',
    (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role=tab]')];
      if (
        tabs.includes(event.target as HTMLButtonElement) &&
        ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
      ) {
        event.preventDefault();
        const index = tabs.indexOf(event.target as HTMLButtonElement);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next]!.click();
        tabs[next]!.focus();
      }
      if (
        event.target.matches('[data-library-add]') &&
        ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
      ) {
        event.preventDefault();
        const buttons = [...items.querySelectorAll<HTMLButtonElement>('[data-library-add]')];
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        const columns = getComputedStyle(items).gridTemplateColumns.split(' ').length;
        const delta =
          { ArrowDown: columns, ArrowUp: -columns, ArrowLeft: -1, ArrowRight: 1 }[event.key] ?? 0;
        buttons[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : Math.max(0, Math.min(buttons.length - 1, index + delta))
        ]?.focus();
      }
    },
    { signal },
  );
  list();
  return { update };
}
