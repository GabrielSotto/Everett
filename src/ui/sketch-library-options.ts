import {
  availableStates,
  changeState,
  settingOptions,
} from '../../design/wireframe-library/samples.js';
import type { LibraryChoice } from '../features/canvas/library/render';
import { html } from './dom';
import { icon } from './icons';
import { pickerSearch, searchKey } from './picker-search';
import { librarySymbol } from '../features/canvas/library/symbols';

/** Ajustes de la próxima inserción, sin otro visor ni formulario de tamaño. */
export function libraryOptions(
  initial: LibraryChoice,
  anchor: HTMLElement,
  parentSignal: AbortSignal,
  changed: (choice: LibraryChoice) => void,
): () => void {
  const controller = new AbortController(),
    { signal } = controller;
  let choice = { ...initial, options: { ...initial.options } };
  let search: ReturnType<typeof pickerSearch> | undefined;
  const panel = document.createElement('div');
  panel.className = 'library-choice-options';
  panel.role = 'dialog';
  panel.setAttribute('aria-label', 'Opciones de ' + choice.entry.name);
  document.body.append(panel);
  anchor.setAttribute('aria-expanded', 'true');
  const close = () => {
    controller.abort();
    const focused = panel.contains(document.activeElement);
    panel.remove();
    anchor.setAttribute('aria-expanded', 'false');
    if (focused && anchor.isConnected) anchor.focus({ preventScroll: true });
  };
  parentSignal.addEventListener('abort', close, { signal, once: true });
  const scroller = anchor.closest('.library-items');
  const initialScroll = scroller?.scrollTop;
  scroller?.addEventListener(
    'scroll',
    () => {
      // El clic puede llegar después del desplazamiento que reveló la opción.
      // Ignorar ese evento pendiente; cerrar sólo si el anclaje se movió luego.
      if (scroller.scrollTop !== initialScroll) close();
    },
    { signal, passive: true },
  );
  const paint = () => {
    const entry = choice.entry;
    const allowed = availableStates(entry, choice.variant, choice.options);
    const states = (Array.isArray(choice.state) ? choice.state : [choice.state]).filter(
      (s) => s !== 'default' && allowed.includes(s),
    );
    choice.state = states.length ? states : 'default';
    panel.innerHTML = `<header><strong>${html(entry.name)}</strong><button type="button" data-close aria-label="Cerrar opciones">${icon('close', 14)}</button></header>${entry.variants.length > 1 ? `<label>Variante<select data-variant>${entry.variants.map((v) => `<option value="${v.id}" ${v.id === choice.variant ? 'selected' : ''}>${html(v.label)}</option>`).join('')}</select></label>` : ''}${entry.settings
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
      )}${allowed.length > 1 ? `<div class="library-states" role="group" aria-label="Estados">${allowed.map((s) => `<button type="button" data-library-state="${s}" aria-pressed="${s === 'default' ? !states.length : states.includes(s)}">${html(entry.stateDetails[s]!.label)}</button>`).join('')}</div>` : ''}`;
    if (entry.id === 'symbol') {
      panel.classList.add('library-symbol-options');
      const selector = panel.querySelector('[data-variant]')?.parentElement;
      if (selector) {
        const browser = document.createElement('div');
        browser.className = 'library-symbol-browser';
        browser.innerHTML = `<div class="library-symbol-grid" role="group" aria-label="Símbolos de Phosphor">${entry.variants.map((v) => `<button type="button" data-symbol="${v.id}" aria-label="${html(v.label)}" title="${html(v.label)}" aria-pressed="${v.id === choice.variant}"><img src="${librarySymbol(v.id)}" alt=""></button>`).join('')}</div><p class="library-symbol-empty" hidden>Sin coincidencias</p>`;
        selector.replaceWith(browser);
        const first = () => browser.querySelector<HTMLElement>('[data-symbol]:not([hidden])');
        search = pickerSearch(
          panel.querySelector('header')!,
          'Buscar símbolo',
          (value) => {
            const query = searchKey(value);
            for (const button of browser.querySelectorAll<HTMLButtonElement>('[data-symbol]'))
              button.hidden = !searchKey(button.dataset.symbol + ' ' + button.title).includes(
                query,
              );
            browser.querySelector<HTMLElement>('.library-symbol-empty')!.hidden = !!first();
            browser.querySelector('.library-symbol-grid')!.scrollTop = 0;
          },
          first,
        );
      }
    }
    const box = anchor.getBoundingClientRect();
    const library = anchor.closest('.sketch-library')!.getBoundingClientRect();
    const right = library.right + 6;
    const left = library.left - panel.offsetWidth - 6;
    panel.style.left =
      Math.max(
        8,
        right + panel.offsetWidth <= window.innerWidth - 8
          ? right
          : left >= 8
            ? left
            : window.innerWidth - panel.offsetWidth - 8,
      ) + 'px';
    panel.style.top =
      Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, box.top)) + 'px';
  };
  panel.addEventListener(
    'change',
    (event) => {
      // Salir de la búsqueda también emite change; no reconstruir el selector
      // mientras Tab o un clic están trasladando el foco a un símbolo.
      if (!(event.target instanceof HTMLSelectElement)) return;
      const field = event.target;
      const selector = field.hasAttribute('data-variant')
        ? '[data-variant]'
        : `[data-setting="${field.dataset.setting}"]`;
      if (field.hasAttribute('data-variant')) {
        choice.variant = field.value;
        choice.options = {};
      } else if (field.dataset.setting) choice.options[field.dataset.setting] = field.value;
      paint();
      changed(choice);
      panel.querySelector<HTMLElement>(selector)?.focus();
    },
    { signal },
  );
  panel.addEventListener(
    'click',
    (event) => {
      const target = (event.target as Element).closest<HTMLElement>('button');
      if (target?.hasAttribute('data-close')) close();
      if (target?.dataset.symbol) {
        choice.variant = target.dataset.symbol;
        panel
          .querySelectorAll<HTMLElement>('[data-symbol]')
          .forEach((button) => button.setAttribute('aria-pressed', String(button === target)));
        changed(choice);
      }
      const state = target?.dataset.libraryState;
      if (!state) return;
      choice.state = changeState(choice.entry, choice.state, state);
      paint();
      changed(choice);
      panel.querySelector<HTMLElement>(`[data-library-state="${state}"]`)?.focus();
    },
    { signal },
  );
  panel.addEventListener('wheel', (event) => event.stopPropagation(), { signal, passive: true });
  panel.addEventListener('keydown', (event) => event.stopPropagation(), { signal });
  document.addEventListener(
    'click',
    (event) => {
      if (!event.composedPath().includes(panel) && !event.composedPath().includes(anchor)) close();
    },
    { signal },
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!search?.collapse()) close();
    },
    { signal, capture: true },
  );
  window.addEventListener('resize', close, { signal });
  paint();
  (search?.toggle ?? panel.querySelector<HTMLElement>('select, [data-library-state]'))?.focus();
  return close;
}
