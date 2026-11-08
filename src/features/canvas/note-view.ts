import type { Context } from '../../app/context';
import { html, target, value, type View } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { colors, colorNames, noteInk, noteStyle } from './note-colors';
import { googleFamily, type NoteFont } from '../../domain/note-fonts';
import { NoteFontPicker } from './note-font-picker';
import { restoreNoteFonts } from './note-font-loading';

export class NoteView implements View {
  private abort = new AbortController();
  private fonts: NoteFontPicker | null = null;
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    root.addEventListener(
      'input',
      (event) => {
        if (
          event.target instanceof HTMLElement &&
          ['note-title', 'note-text'].includes(event.target.id)
        ) {
          this.grow();
          this.save();
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'change',
      (event) => {
        const control = event.target;
        if (
          !(control instanceof HTMLSelectElement || control instanceof HTMLInputElement) ||
          control.id !== 'note-size'
        )
          return;
        if (!control.reportValidity()) return;
        this.save();
        this.updatePaper();
        this.grow();
      },
      { signal: this.abort.signal },
    );
    window.addEventListener('resize', () => this.grow(), { signal: this.abort.signal });
    root.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Enter' &&
          event.target instanceof HTMLElement &&
          event.target.id === 'note-title'
        ) {
          event.preventDefault();
          this.root.querySelector<HTMLTextAreaElement>('#note-text')?.focus();
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (t?.dataset.action === 'note-return') this.ctx.back();
        if (t?.dataset.action === 'note-color' && t.dataset.color) {
          const paper = root.querySelector<HTMLElement>('.note-paper');
          if (paper) {
            paper.dataset.color = t.dataset.color;
            paper.style.background = t.dataset.color;
            paper.style.setProperty('--note-fill', t.dataset.color);
            paper.style.setProperty('--note-ink', noteInk(t.dataset.color));
            root
              .querySelectorAll('[data-action=note-color]')
              .forEach((button) =>
                button.setAttribute(
                  'aria-pressed',
                  String((button as HTMLElement).dataset.color === t.dataset.color),
                ),
              );
            this.save();
          }
        }
      },
      { signal: this.abort.signal },
    );
    this.render();
  }
  private grow(): void {
    for (const text of this.root.querySelectorAll<HTMLTextAreaElement>('#note-title,#note-text')) {
      text.style.height = 'auto';
      text.style.height = text.scrollHeight + 'px';
    }
  }
  private note() {
    const r = this.ctx.store.get().route;
    return r.kind === 'note' ? this.ctx.world().nodes.find((n) => n.id === r.entity) : undefined;
  }
  private save(font?: NoteFont, weight?: number, italic?: boolean): void {
    const n = this.note();
    if (n?.data.kind === 'note')
      this.ctx.act(
        {
          type: 'node.edit',
          world: this.ctx.world().id,
          id: n.id,
          title: value(this.root, '#note-title'),
          text: value(this.root, '#note-text'),
          color: this.root.querySelector<HTMLElement>('.note-paper')?.dataset.color ?? n.data.color,
          font: font ?? n.data.font ?? 'sans',
          ...((weight ?? n.data.fontWeight) !== undefined
            ? { fontWeight: weight ?? n.data.fontWeight! }
            : {}),
          ...((italic ?? n.data.fontItalic) !== undefined
            ? { fontItalic: italic ?? n.data.fontItalic! }
            : {}),
          fontSize: this.root.querySelector<HTMLInputElement>('#note-size')?.validity.valid
            ? Number(value(this.root, '#note-size'))
            : (n.data.fontSize ?? 16),
        },
        'editar nota',
        'ZOOM-01',
        'keyboard',
      );
  }
  private updatePaper(): void {
    const note = this.note(),
      paper = this.root.querySelector<HTMLElement>('.note-paper');
    if (note?.data.kind !== 'note' || !paper) return;
    paper.style.cssText = noteStyle(note.data);
    const family = googleFamily(note.data.font);
    paper.dataset.noteItalic = String(!!note.data.fontItalic);
    paper.dataset.noteWeight = String(note.data.fontWeight ?? 400);
    if (family) {
      paper.dataset.noteFont = family;
      restoreNoteFonts(this.root, () => this.grow());
    } else {
      delete paper.dataset.noteFont;
      delete paper.dataset.fontState;
      paper.querySelector('.note-font-warning')?.remove();
    }
    this.grow();
  }
  render(): void {
    const n = this.note();
    if (n?.data.kind !== 'note') return;
    const data = n.data;
    this.fonts?.dispose();
    this.root.innerHTML = `<div class="note-editor"><div class="note-editor-status"><button type="button" data-action="note-return" aria-label="Volver al Canvas" data-tip="Volver al Canvas">${icon('chevron-left', 18)}</button><span>Guardado automático</span></div><div class="note-format" role="group" aria-label="Formato de la nota"><div class="note-type"><label for="note-font">Tipografía</label><div><div class="note-font-field"><input id="note-font" role="combobox" aria-label="Tipografía de la nota" aria-haspopup="grid" aria-controls="note-font-list" aria-expanded="false" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Buscar fuente…" maxlength="100"><button type="button" tabindex="-1" aria-label="Mostrar fuentes">${icon('chevron', 14)}</button></div><select id="note-weight" aria-label="Peso de la fuente"></select><label class="note-size"><input id="note-size" aria-label="Tamaño del texto" type="number" min="12" max="32" required value="${data.fontSize ?? 16}"><span>px</span></label></div></div><div class="note-palette"><span>Color</span><div class="note-colors" role="group" aria-label="Color de la nota">${colors.map((c, i) => `<button type="button" data-action="note-color" data-color="${c}" aria-label="Color ${colorNames[i]}" data-tip="${colorNames[i]}" aria-pressed="${data.color === c}"><span style="background:${c};color:${noteInk(c)}">${icon('check', 14)}</span></button>`).join('')}</div></div></div><article class="note-paper" data-note-weight="${data.fontWeight ?? 400}" data-note-italic="${!!data.fontItalic}" ${googleFamily(data.font) ? `data-note-font="${html(googleFamily(data.font)!)}"` : ''} data-color="${data.color}" style="${noteStyle(data)}"><textarea id="note-title" rows="1" aria-label="Título de la nota" placeholder="Sin nombre">${html(data.title)}</textarea><textarea id="note-text" aria-label="Contenido de la nota" placeholder="Escribí una nota…">${html(data.text)}</textarea></article></div>`;
    this.fonts = new NoteFontPicker(
      this.root.querySelector<HTMLElement>('.note-font-field')!,
      data.font ?? 'sans',
      data.fontWeight ?? 400,
      !!data.fontItalic,
      this.ctx.ui.favoriteFonts ?? [],
      (font, weight, italic) => {
        this.save(font, weight, italic);
        this.updatePaper();
      },
      (fonts) => {
        this.ctx.ui.favoriteFonts = fonts;
        this.ctx.persist();
      },
    );
    restoreNoteFonts(this.root, () => this.grow());
    this.grow();
  }
  dispose(): void {
    this.abort.abort();
    this.fonts?.dispose();
  }
}
