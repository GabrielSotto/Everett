import type { Point } from '../../domain/model';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import {
  illustrationPreview,
  loadIllustrations,
  loadedIllustration,
  type Illustration,
} from './illustrations';
import { pickerSearch, searchKey } from '../../ui/picker-search';
import { bindPaletteMove, categoryMenu } from './illustration-controls';

const dragType = 'application/x-everett-illustration';
export function bindIllustrationDrop(
  stage: HTMLElement,
  signal: AbortSignal,
  insert: (item: Illustration, client: Point) => void,
): void {
  stage.addEventListener(
    'dragover',
    (e) => {
      if (!e.dataTransfer?.types.includes(dragType)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    { signal },
  );
  stage.addEventListener(
    'drop',
    (e) => {
      const item = loadedIllustration(e.dataTransfer?.getData(dragType) ?? '');
      if (!item) return;
      e.preventDefault();
      insert(item, { x: e.clientX, y: e.clientY });
    },
    { signal },
  );
}

export function illustrationPicker(
  replacement: boolean,
  choose: (source: Illustration | File) => void,
  fit: () => void,
  move: (point: Point) => void,
): HTMLElement {
  const panel = document.createElement('section');
  const title = replacement ? 'Reemplazar imagen' : 'Ilustraciones';
  panel.className = 'canvas-context-form illustration-picker';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', title);
  panel.innerHTML = `<header><button type="button" class="illustration-grip" aria-label="Mover paleta" aria-description="Arrastrá o usá las flechas del teclado." title="Mover paleta · arrastrá o usá las flechas">${icon('grip', 14)}<strong>${title}</strong></button><button type="button" class="icon-button" data-action="context-close" aria-label="Cerrar" title="Cerrar">${icon('close', 22)}</button></header>
    <div class="illustration-grid" aria-label="Dibujos disponibles"></div>
    ${replacement ? '<button type="button" data-choose-file>Elegir un archivo…</button><input type="file" accept="image/*" hidden>' : ''}
    <p role="status"></p>`;
  const grid = panel.querySelector<HTMLElement>('.illustration-grid')!;
  const status = panel.querySelector<HTMLElement>('[role=status]')!;
  const first = () => grid.querySelector<HTMLElement>('button:not([hidden])');
  const header = panel.querySelector('header')!;
  bindPaletteMove(panel, header.querySelector('.illustration-grip')!, move);
  let category = '';
  let query = '';
  const filter = (s: string) => {
    query = searchKey(s);
    const words = query.split(/\s+/);
    let matches = 0;
    for (const tile of grid.querySelectorAll<HTMLElement>('button')) {
      tile.hidden =
        (!!category && tile.dataset.category !== category) ||
        !words.every((word) => tile.dataset.terms!.includes(word));
      if (!tile.hidden) matches++;
      tile.tabIndex = -1;
    }
    const available = first();
    if (available) available.tabIndex = 0;
    grid.scrollTop = 0;
    if (grid.childElementCount)
      status.textContent = !matches
        ? 'Sin coincidencias.'
        : category
          ? category + ' · ' + matches
          : '';
    fit();
  };
  const search = pickerSearch(header, 'Buscar ilustración', filter, first);
  const setCategories = categoryMenu(panel, (value) => {
    category = value;
    filter(query);
  });
  panel.tabIndex = -1;
  async function populate() {
    status.textContent = 'Cargando ilustraciones…';
    try {
      const items = await loadIllustrations();
      if (!panel.isConnected) return;
      setCategories(
        [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'es')),
      );
      grid.innerHTML = items
        .map(
          (item) =>
            `<button type="button" data-illustration="${item.id}" data-category="${html(item.category)}" data-terms="${html(searchKey([item.id.replaceAll('-', ' '), item.name, item.category, item.keywords].join(' ')))}" draggable="${!replacement}" title="${html(item.name)}"><img loading="lazy" draggable="false" src="${html(illustrationPreview(item))}" alt=""><span>${html(item.name)}</span></button>`,
        )
        .join('');
      filter(query);
      if (document.activeElement === panel) first()?.focus({ preventScroll: true });
    } catch {
      status.textContent = 'No se pudo cargar la biblioteca. ';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Reintentar';
      retry.onclick = () => void populate();
      status.append(retry);
      fit();
    }
  }
  void populate();
  grid.addEventListener('focusin', (event) => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const current = grid.querySelector<HTMLElement>('[tabindex="0"]');
    if (current) current.tabIndex = -1;
    event.target.tabIndex = 0;
  });
  panel.addEventListener('click', (e) => {
    const button = e.target instanceof Element && e.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-choose-file'))
      panel.querySelector<HTMLInputElement>('input[type=file]')?.click();
    const item = loadedIllustration(button.dataset.illustration ?? '');
    if (item) choose(item);
  });
  panel.querySelector('input[type=file]')?.addEventListener('change', (e) => {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.[0]) choose(input.files[0]);
    input.value = '';
  });
  panel.addEventListener('dragstart', (e) => {
    const id =
      e.target instanceof HTMLElement &&
      e.target.closest<HTMLElement>('[data-illustration]')?.dataset.illustration;
    if (replacement || !id || !e.dataTransfer) return;
    e.dataTransfer.setData(dragType, id);
    e.dataTransfer.effectAllowed = 'copy';
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && search.collapse()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.key !== 'Escape') e.stopPropagation();
    const choices = Array.from(
      panel.querySelectorAll<HTMLButtonElement>('[data-illustration]:not([hidden])'),
    );
    const index = choices.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 3,
      ArrowUp: -3,
      Home: -index,
      End: choices.length - index - 1,
    };
    const step = offsets[e.key];
    if (step === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    choices[Math.max(0, Math.min(choices.length - 1, index + step))]?.focus();
  });
  return panel;
}
