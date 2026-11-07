import {
  entries,
  families,
  availableStates,
  type LibraryEntry,
} from '../../design/wireframe-library/samples.js';
import type { LibraryChoice } from '../features/canvas/library/render';
import { compileLibrary } from '../features/canvas/library/compile';
import { paintLibraryPreview } from './sketch-library-preview';
import { html } from './dom';
import { icon } from './icons';

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
  root.innerHTML = `<div class="library-browse"><div class="library-tabs" role="tablist" aria-label="Tipo de bosquejo">${[
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
    )}</div><p class="library-results" hidden></p><label class="library-family" hidden><span class="sr-only">Familia de componentes</span><select aria-label="Familia de componentes"><option value="all">Todos los componentes</option>${families
    .filter(([id]) => !['all', 'base', 'screens'].includes(id))
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join('')}</select></label><div class="library-items" aria-label="Componentes"></div></div>`;
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
  const family = root.querySelector<HTMLSelectElement>('select')!;
  const items = root.querySelector<HTMLElement>('.library-items')!;
  const renders = new WeakMap<HTMLElement, number>();
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
            paintLibraryPreview(host, composition, 64, entry.family === 'base');
          })
          .catch(() => {
            if (signal.aborted || current !== epoch) return;
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
    epoch++;
    previews.disconnect();
    const query = normalize(search.value.trim());
    const matches = entries.filter((item) =>
      query
        ? normalize(item.name + ' ' + item.tags + ' ' + item.anatomy).includes(query)
        : tab === 'components'
          ? !['base', 'screens'].includes(item.family) &&
            (family.value === 'all' || item.family === family.value)
          : item.family === tab,
    );
    root.querySelector<HTMLElement>('.library-family')!.hidden = tab !== 'components' || !!query;
    root.querySelector<HTMLElement>('.library-tabs')!.hidden = !!query;
    const results = root.querySelector<HTMLElement>('.library-results')!;
    results.hidden = !query;
    results.textContent = `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'} en la biblioteca`;
    items.innerHTML = matches.length
      ? matches
          .map(
            (item) =>
              `<div class="library-tile"><button type="button" class="library-tile-add" data-action="library-add" data-library-add="${item.id}" aria-label="Agregar ${html(item.name)}"><span class="library-thumbnail" data-thumbnail="${item.id}" aria-hidden="true"></span><span class="library-tile-name">${html(item.name)}</span></button>${hasLibraryOptions(item) ? `<button type="button" class="library-configure" data-action="library-configure" data-library-entry="${item.id}" aria-label="Opciones de ${html(item.name)}" title="Variantes y estados" aria-haspopup="dialog">${icon('more', 16)}</button>` : ''}</div>`,
          )
          .join('')
      : '<p class="library-empty">No hay coincidencias. Probá con otro nombre.</p>';
    items.scrollTop = 0;
    items.querySelectorAll('[data-thumbnail]').forEach((host) => previews.observe(host));
  };
  const update = (choice: LibraryChoice) => {
    choices.set(choice.entry.id, choice);
    const host = items.querySelector<HTMLElement>(`[data-thumbnail="${choice.entry.id}"]`);
    if (host) {
      host.removeAttribute('data-ready');
      previews.observe(host);
    }
  };
  search.addEventListener('input', list, { signal });
  family.addEventListener('change', list, { signal });
  textMode.addEventListener(
    'click',
    () => {
      labels = !labels;
      textMode.setAttribute('aria-checked', String(labels));
      const scroll = items.scrollTop;
      list();
      items.scrollTop = scroll;
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
