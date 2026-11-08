import { googleFamily, validGoogleFamily, type NoteFont } from '../../domain/note-fonts';
import { GoogleFontError, loadGoogleFont } from '../../platform/google-fonts';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';

type Family = { family: string; category: string };
let catalogue: Family[] | null = null;
const suggestions = [
  'Lora',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Merriweather',
  'Lexend',
  'Caveat',
  'Roboto Mono',
];
const catalogErrors: Record<string, string> = {
  'not-configured':
    'El catálogo necesita una clave de Google Fonts. Podés probar una fuente por su nombre exacto.',
  credentials:
    'Google rechazó la clave del catálogo. Revisá que tenga habilitada Google Fonts Developer API.',
  quota: 'Se alcanzó el límite de consultas del catálogo. Reintentá más tarde.',
  timeout: 'El catálogo tardó demasiado. Reintentá.',
};

export class NoteFontPicker {
  private panel = document.createElement('section');
  private abort = new AbortController();
  private revision = 0;
  private ready: string | null = null;
  private frame = 0;
  constructor(
    private anchor: HTMLSelectElement,
    private apply: (font: NoteFont) => void,
  ) {
    this.panel.className = 'note-font-picker';
    this.panel.popover = 'auto';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Google Fonts');
    this.panel.innerHTML = `<header><strong>Google Fonts</strong><button type="button" data-font-close aria-label="Cerrar fuentes">${icon('close', 16)}</button></header>
      <form><label for="google-font-name">Nombre de la fuente</label><div class="font-query"><input id="google-font-name" type="search" autocomplete="off" placeholder="Buscar una familia…" maxlength="100"><button type="submit" aria-label="Ver muestra de esta fuente">${icon('search', 16)}</button></div></form>
      <p class="font-catalog-status" role="status"></p><button type="button" data-font-retry-catalog hidden>Reintentar catálogo</button>
      <div class="font-results" aria-label="Familias de fuentes"></div>
      <div class="font-sample"><p data-font-sample>Una idea, muchas posibilidades.</p><span data-font-message role="status">Elegí una fuente para ver su muestra.</span></div>
      <button type="button" class="font-apply" data-action="font-apply" disabled>Usar fuente</button>`;
    document.body.append(this.panel);
    const options = { signal: this.abort.signal };
    this.panel.querySelector('form')!.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        void this.preview(this.query().value.trim());
      },
      options,
    );
    this.query().addEventListener(
      'input',
      () => {
        this.revision++;
        this.ready = null;
        this.applyButton().disabled = true;
        this.panel.querySelector<HTMLElement>('[data-font-message]')!.textContent =
          'Elegí una fuente para ver su muestra.';
        this.panel.querySelector<HTMLElement>('[data-font-sample]')!.style.fontFamily = '';
        this.results();
      },
      options,
    );
    this.panel.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>('button');
        if (button?.hasAttribute('data-font-close')) this.close();
        if (button?.hasAttribute('data-font-retry-catalog')) void this.loadCatalogue();
        if (button?.dataset.family) void this.preview(button.dataset.family);
        if (button?.classList.contains('font-apply') && this.ready) {
          this.apply(`google:${this.ready}`);
          this.close();
        }
      },
      options,
    );
    this.panel.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
      },
      options,
    );
    this.panel.addEventListener(
      'toggle',
      () => {
        if (!this.panel.matches(':popover-open')) this.revision++;
      },
      options,
    );
    window.addEventListener('resize', () => this.position(), options);
  }
  private query() {
    return this.panel.querySelector<HTMLInputElement>('#google-font-name')!;
  }
  private applyButton() {
    return this.panel.querySelector<HTMLButtonElement>('.font-apply')!;
  }
  private results(): void {
    const query = this.query().value.trim().toLowerCase();
    const families = (catalogue ?? suggestions.map((family) => ({ family, category: '' })))
      .filter((font) => font.family.toLowerCase().includes(query))
      .slice(0, 40);
    this.panel.querySelector('.font-results')!.innerHTML = families.length
      ? families
          .map(
            ({ family }) =>
              `<button type="button" data-action="font-preview" data-family="${html(family)}" aria-pressed="${this.ready === family}">${html(family)}</button>`,
          )
          .join('')
      : '<p>Sin coincidencias. Podés consultar el nombre exacto con Enter.</p>';
  }
  private async loadCatalogue(): Promise<void> {
    const status = this.panel.querySelector<HTMLElement>('.font-catalog-status')!;
    const retry = this.panel.querySelector<HTMLButtonElement>('[data-font-retry-catalog]')!;
    if (catalogue) {
      status.textContent = `${catalogue.length} familias · filtrá por nombre`;
      this.results();
      return;
    }
    retry.hidden = true;
    status.textContent = 'Cargando catálogo…';
    try {
      const response = await fetch('/api/google-fonts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(12_000)]),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const code = data && typeof data === 'object' && 'error' in data ? String(data.error) : '';
        throw new Error(
          catalogErrors[code] ??
            'No se pudo consultar el catálogo. Revisá la conexión y reintentá.',
        );
      }
      if (
        !data ||
        typeof data !== 'object' ||
        !('families' in data) ||
        !Array.isArray(data.families)
      )
        throw new Error('El catálogo recibido no es válido. Reintentá.');
      catalogue = data.families.filter(
        (item): item is Family =>
          !!item && validGoogleFamily(item.family) && typeof item.category === 'string',
      );
      if (!catalogue.length) {
        catalogue = null;
        throw new Error('Google Fonts devolvió un catálogo vacío. Reintentá.');
      }
      status.textContent = `${catalogue.length} familias · filtrá por nombre`;
      this.results();
    } catch (error) {
      if (this.abort.signal.aborted) return;
      status.textContent =
        error instanceof Error ? error.message : 'No se pudo consultar el catálogo.';
      retry.hidden = false;
    }
  }
  private async preview(family: string): Promise<void> {
    family =
      (catalogue?.map((item) => item.family) ?? suggestions).find(
        (name) => name.toLowerCase() === family.toLowerCase(),
      ) ?? family;
    const revision = ++this.revision;
    this.ready = null;
    this.applyButton().disabled = true;
    const message = this.panel.querySelector<HTMLElement>('[data-font-message]')!;
    const sample = this.panel.querySelector<HTMLElement>('[data-font-sample]')!;
    sample.style.fontFamily = '';
    message.textContent = 'Cargando fuente…';
    try {
      await loadGoogleFont(family, true);
      if (this.abort.signal.aborted || revision !== this.revision) return;
      this.ready = family;
      sample.style.fontFamily = `"${family}", sans-serif`;
      message.textContent = family;
      this.applyButton().disabled = false;
      this.results();
    } catch (error) {
      if (this.abort.signal.aborted || revision !== this.revision) return;
      message.textContent =
        error instanceof GoogleFontError
          ? error.message
          : 'No se pudo cargar la fuente. Reintentá.';
    }
  }
  open(current: NoteFont): void {
    cancelAnimationFrame(this.frame);
    this.ready = null;
    this.applyButton().disabled = true;
    this.panel.querySelector<HTMLElement>('[data-font-sample]')!.style.fontFamily = '';
    this.panel.querySelector<HTMLElement>('[data-font-message]')!.textContent =
      'Elegí una fuente para ver su muestra.';
    this.query().value = '';
    this.results();
    this.panel.showPopover();
    this.position();
    // La superficie puede seguir entrando o desplazándose al abrir el selector.
    const follow = () => {
      if (!this.panel.matches(':popover-open') || this.abort.signal.aborted) return;
      this.position();
      this.frame = requestAnimationFrame(follow);
    };
    this.frame = requestAnimationFrame(follow);
    this.query().focus();
    void this.loadCatalogue();
    const family = googleFamily(current);
    if (family) void this.preview(family);
  }
  private position(): void {
    const rect = this.anchor.getBoundingClientRect();
    const left =
      Math.max(8, Math.min(rect.left, window.innerWidth - this.panel.offsetWidth - 8)) + 'px';
    const top =
      Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - this.panel.offsetHeight - 8)) +
      'px';
    if (this.panel.style.left !== left) this.panel.style.left = left;
    if (this.panel.style.top !== top) this.panel.style.top = top;
  }
  private close(): void {
    this.revision++;
    this.panel.hidePopover();
    this.anchor.focus();
  }
  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.revision++;
    this.panel.remove();
  }
}
