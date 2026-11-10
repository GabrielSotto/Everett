import {
  googleFamily,
  validGoogleFamily,
  validNoteFont,
  type NoteFont,
} from '../../domain/note-fonts';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { noteFonts } from './note-colors';
import {
  fetchGoogleFontCatalogue,
  FontCatalogueError,
  type GoogleFontFamily,
} from '../../platform/google-font-catalogue';

type Choice = { id: NoteFont; name: string; weights: number[]; italic?: boolean };
let catalogue: GoogleFontFamily[] | null = null;
const weightNames: Record<number, string> = {
  100: 'Fina',
  200: 'Extraligera',
  300: 'Ligera',
  400: 'Normal',
  500: 'Media',
  600: 'Seminegrita',
  700: 'Negrita',
  800: 'Extranegrita',
  900: 'Negra',
};

export class NoteFontPicker {
  private panel = document.createElement('div');
  private abort = new AbortController();
  private frame = 0;
  private active = -1;
  private favoriteCell = false;
  private filtered: Choice[] = [];
  private favorites: Set<NoteFont>;
  private current: NoteFont;
  private weight: number;
  private loading = false;
  private query = '';
  private input: HTMLInputElement;
  private weightControl: HTMLSelectElement;

  constructor(
    private anchor: HTMLElement,
    current: NoteFont,
    weight: number,
    private italic: boolean,
    favorites: string[],
    private apply: (font: NoteFont, weight: number, italic: boolean) => void,
    private saveFavorites: (fonts: string[]) => void,
  ) {
    this.current = current;
    this.weight = weight;
    this.favorites = new Set(favorites.filter(validNoteFont));
    this.input = anchor.querySelector<HTMLInputElement>('#note-font')!;
    this.weightControl = anchor.parentElement!.querySelector<HTMLSelectElement>('#note-weight')!;
    this.input.value = this.name(current);
    this.panel.className = 'note-font-picker';
    this.panel.popover = 'manual';
    this.panel.innerHTML =
      '<div class="font-catalog-feedback" hidden><p id="note-font-catalog-status" class="font-catalog-status" role="status" aria-live="polite"></p><button type="button" data-action="font-catalog-retry" data-font-retry-catalog aria-describedby="note-font-catalog-status" hidden>Reintentar catálogo</button></div><div id="note-font-list" class="font-results" role="grid" aria-label="Fuentes" aria-colcount="2"></div>';
    document.body.append(this.panel);
    const options = { signal: this.abort.signal };
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (
          event.target instanceof Node &&
          !this.panel.contains(event.target) &&
          !anchor.contains(event.target)
        )
          this.close(false);
      },
      options,
    );
    this.panel.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Tab' &&
          (event.target as Element).hasAttribute('data-font-retry-catalog')
        ) {
          event.preventDefault();
          if (event.shiftKey) this.input.focus();
          else {
            this.close(false);
            const next = this.weightControl.disabled
              ? this.anchor.parentElement!.querySelector<HTMLInputElement>('#note-size')!
              : this.weightControl;
            next.focus();
          }
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
      },
      options,
    );
    this.input.addEventListener('click', () => this.open(), options);
    this.input.addEventListener(
      'input',
      () => {
        const query = this.input.value;
        this.open(false);
        this.query = query;
        this.favoriteCell = false;
        this.results();
      },
      options,
    );
    anchor
      .querySelector('button')!
      .addEventListener('click', () => (this.isOpen() ? this.close() : this.open()), options);
    this.input.addEventListener('keydown', (event) => this.key(event), options);
    this.input.addEventListener(
      'blur',
      (event) => {
        if (!(
          event.relatedTarget instanceof Node &&
          (this.panel.contains(event.relatedTarget) || anchor.contains(event.relatedTarget))
        ))
          this.close(false);
      },
      options,
    );
    this.panel.addEventListener(
      'pointerdown',
      (event) => {
        if ((event.target as Element).closest('[data-font]')) event.preventDefault();
      },
      options,
    );
    this.panel.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>('button');
        const id = button?.dataset.font;
        if (id && validNoteFont(id)) {
          if (button?.dataset.action === 'font-favorite') this.favorite(id);
          else this.choose(id);
        }
        if (button?.hasAttribute('data-font-retry-catalog')) void this.loadCatalogue();
      },
      options,
    );
    this.panel.addEventListener(
      'toggle',
      () => {
        if (!this.isOpen()) this.reset();
      },
      options,
    );
    this.weightControl.addEventListener(
      'change',
      () => {
        this.weight = Number(this.weightControl.value);
        this.apply(this.current, this.weight, this.italic);
      },
      options,
    );
    this.updateWeights();
    void this.loadCatalogue();
  }
  private name(font: NoteFont): string {
    return googleFamily(font) ?? noteFonts[font as keyof typeof noteFonts].name;
  }
  private choices(): Choice[] {
    const choices: Choice[] = Object.entries(noteFonts).map(([id, value]) => ({
      id: id as NoteFont,
      name: value.name,
      weights: [400, 700],
    }));
    choices.push(
      ...(catalogue ?? []).map((font): Choice => ({
        id: `google:${font.family}`,
        name: font.family,
        weights: font.weights,
        italic: font.italic === true,
      })),
    );
    for (const id of [this.current, ...this.favorites])
      if (!choices.some((choice) => choice.id === id))
        choices.push({
          id,
          name: this.name(id),
          weights: [id === this.current ? this.weight : 400],
          italic: id === this.current && this.italic,
        });
    return choices;
  }
  private isOpen(): boolean {
    return this.panel.matches(':popover-open');
  }
  private results(keep?: NoteFont): void {
    const query = this.query.trim().toLocaleLowerCase();
    this.filtered = this.choices()
      .filter((font) => font.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => Number(this.favorites.has(b.id)) - Number(this.favorites.has(a.id)));
    this.active = keep ? this.filtered.findIndex((font) => font.id === keep) : -1;
    const grid = this.panel.querySelector<HTMLElement>('.font-results')!;
    grid.innerHTML = this.filtered
      .map((font, index) => {
        const favorite = this.favorites.has(font.id);
        return `<div role="row" aria-selected="${font.id === this.current}"><div role="gridcell" id="font-cell-${index}-0"><button type="button" tabindex="-1" data-action="font-select" data-font="${html(font.id)}" title="${html(font.name)}"><span>${html(font.name)}</span>${font.id === this.current ? icon('check', 14) : ''}</button></div><div role="gridcell" id="font-cell-${index}-1"><button type="button" tabindex="-1" data-action="font-favorite" data-font="${html(font.id)}" aria-label="Favorita: ${html(font.name)}" aria-pressed="${favorite}">${icon('star', 16)}</button></div></div>`;
      })
      .join('');
    grid.setAttribute('aria-rowcount', String(this.filtered.length));
    grid.hidden = !this.filtered.length;
    let empty = this.panel.querySelector('.font-empty');
    if (!empty) {
      empty = document.createElement('p');
      empty.className = 'font-empty';
      empty.setAttribute('role', 'status');
      grid.before(empty);
    }
    empty.textContent = catalogue
      ? 'No hay fuentes con ese nombre.'
      : 'Escribí el nombre exacto y pulsá Enter.';
    (empty as HTMLElement).hidden = this.filtered.length > 0;
    this.highlight();
  }
  private highlight(): void {
    this.panel.querySelector('[data-active]')?.removeAttribute('data-active');
    const cell = this.panel.querySelector<HTMLElement>(
      `#font-cell-${this.active}-${this.favoriteCell ? 1 : 0}`,
    );
    if (cell) {
      cell.dataset.active = 'true';
      this.input.setAttribute('aria-activedescendant', cell.id);
      cell.scrollIntoView({ block: 'nearest' });
    } else this.input.removeAttribute('aria-activedescendant');
  }
  private favorite(id: NoteFont): void {
    if (this.favorites.has(id)) this.favorites.delete(id);
    else this.favorites.add(id);
    this.saveFavorites([...this.favorites]);
    this.favoriteCell = true;
    this.results(id);
  }
  private choose(id: NoteFont): void {
    const choice = this.choices().find((font) => font.id === id);
    const weights = choice?.weights ?? [400];
    this.italic = choice?.italic === true;
    this.weight = weights.includes(this.weight)
      ? this.weight
      : weights.reduce((a, b) => (Math.abs(a - 400) <= Math.abs(b - 400) ? a : b));
    this.current = id;
    this.updateWeights();
    this.apply(id, this.weight, this.italic);
    this.close();
  }
  private updateWeights(): void {
    const available = this.choices().find((font) => font.id === this.current)?.weights ?? [
      this.weight,
    ];
    // Un valor guardado no se cambia al llegar metadatos más recientes.
    const weights = [...new Set([...available, this.weight])].sort((a, b) => a - b);
    this.weightControl.innerHTML = weights
      .map(
        (weight) =>
          `<option value="${weight}" ${weight === this.weight ? 'selected' : ''}>${weightNames[weight] ?? weight} · ${weight}</option>`,
      )
      .join('');
    this.weightControl.disabled = weights.length < 2;
    this.weightControl.title =
      weights.length < 2 ? 'Esta familia tiene un solo peso disponible' : 'Peso de la fuente';
  }
  private key(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      const retry = this.panel.querySelector<HTMLButtonElement>('[data-font-retry-catalog]')!;
      if (!event.shiftKey && this.isOpen() && !retry.hidden) {
        event.preventDefault();
        retry.focus();
        return;
      }
      this.close(false);
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      this.open(false);
      const step = event.key.startsWith('Page') ? 8 : 1;
      this.active = Math.max(
        0,
        Math.min(
          this.filtered.length - 1,
          this.active + (event.key.endsWith('Down') ? step : -step),
        ),
      );
      this.highlight();
      return;
    }
    if (!this.isOpen()) return;
    if (event.ctrlKey && ['Home', 'End'].includes(event.key)) {
      event.preventDefault();
      this.active = event.key === 'Home' ? 0 : this.filtered.length - 1;
      this.highlight();
    } else if (this.active >= 0 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      this.favoriteCell = event.key === 'ArrowRight';
      this.highlight();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const choice =
        this.filtered[this.active] ??
        this.filtered.find((font) => font.name.toLowerCase() === this.query.trim().toLowerCase()) ??
        (this.query.trim() && this.filtered.length === 1 ? this.filtered[0] : undefined);
      if (choice) {
        if (this.favoriteCell && this.active >= 0) this.favorite(choice.id);
        else this.choose(choice.id);
      } else if (!catalogue && !this.loading && validGoogleFamily(this.query.trim()))
        this.choose(`google:${this.query.trim()}`);
    }
  }
  private async loadCatalogue(): Promise<void> {
    if (catalogue) {
      this.updateWeights();
      if (this.isOpen()) this.results();
      return;
    }
    if (this.loading) return;
    this.loading = true;
    const status = this.panel.querySelector<HTMLElement>('.font-catalog-status')!;
    const feedback = this.panel.querySelector<HTMLElement>('.font-catalog-feedback')!;
    const retry = this.panel.querySelector<HTMLButtonElement>('[data-font-retry-catalog]')!;
    // El botón permanece enfocado durante el reintento; al terminar vuelve al selector.
    const retryFocused = document.activeElement === retry;
    feedback.hidden = false;
    delete this.panel.dataset.catalogError;
    this.input.setAttribute('aria-describedby', status.id);
    status.textContent = 'Cargando fuentes…';
    retry.setAttribute('aria-disabled', 'true');
    try {
      catalogue = await fetchGoogleFontCatalogue(this.abort.signal);
      feedback.hidden = true;
      retry.hidden = true;
      this.input.removeAttribute('aria-describedby');
      this.updateWeights();
      if (this.isOpen()) this.results();
      if (retryFocused && this.isOpen()) this.input.focus();
    } catch (error) {
      if (this.abort.signal.aborted) return;
      const failure =
        error instanceof FontCatalogueError ? error : new FontCatalogueError('unexpected-response');
      this.panel.dataset.catalogError = failure.code;
      status.textContent = failure.message;
      retry.hidden = false;
    } finally {
      this.loading = false;
      retry.removeAttribute('aria-disabled');
    }
  }
  open(select = true): void {
    if (this.isOpen()) return;
    this.query = '';
    this.favoriteCell = false;
    this.results();
    this.panel.showPopover();
    this.input.setAttribute('aria-expanded', 'true');
    this.position();
    const follow = () => {
      if (!this.isOpen() || this.abort.signal.aborted) return;
      this.position();
      this.frame = requestAnimationFrame(follow);
    };
    this.frame = requestAnimationFrame(follow);
    this.input.focus();
    if (select) this.input.select();
  }
  private position(): void {
    const rect = this.anchor.getBoundingClientRect();
    const below = innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    this.panel.style.maxHeight = `${Math.max(80, Math.min(330, Math.max(below, above)))}px`;
    const top =
      below >= Math.min(330, this.panel.scrollHeight) || below >= above
        ? rect.bottom + 6
        : rect.top - this.panel.offsetHeight - 6;
    this.panel.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - this.panel.offsetWidth - 8))}px`;
    this.panel.style.top = `${Math.max(8, top)}px`;
  }
  private reset(): void {
    cancelAnimationFrame(this.frame);
    this.input.value = this.name(this.current);
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
  }
  private close(focus = true): void {
    if (this.isOpen()) this.panel.hidePopover();
    this.reset();
    if (focus) this.input.focus();
  }
  setValue(font: NoteFont, weight: number, italic: boolean): void {
    this.close(false);
    this.current = font;
    this.weight = weight;
    this.italic = italic;
    this.updateWeights();
    this.reset();
  }
  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.panel.remove();
  }
}
