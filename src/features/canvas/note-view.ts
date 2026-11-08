import type { Context } from '../../app/context';
import { html, target, value, type View } from '../../ui/dom';
import { icon } from '../../ui/icons';
import {
  colors,
  colorNames,
  noteInk,
  noteStyle,
  noteFontAttributes,
  noteFontMetadata,
} from './note-colors';
import { noteTypography, type NotePart, type NoteTextStyle } from '../../domain/note-fonts';
import { NoteFontPicker } from './note-font-picker';
import { restoreNoteFonts } from './note-font-loading';

export class NoteView implements View {
  private abort = new AbortController();
  private fonts: NoteFontPicker | null = null;
  private part: NotePart = 'body';
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    root.addEventListener(
      'focusin',
      (event) => {
        if (!(event.target instanceof HTMLElement)) return;
        if (event.target.id === 'note-title') this.selectPart('title');
        if (event.target.id === 'note-text') this.selectPart('body');
      },
      { signal: this.abort.signal },
    );
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
  private selectPart(part: NotePart): void {
    const note = this.note();
    if (note?.data.kind !== 'note') return;
    const changed = this.part !== part;
    this.part = part;
    const label = part === 'title' ? 'título' : 'cuerpo';
    this.root.querySelector('#note-font')?.setAttribute('aria-label', `Tipografía del ${label}`);
    this.root.querySelector('#note-weight')?.setAttribute('aria-label', `Peso del ${label}`);
    if (changed) {
      const style = noteTypography(note.data)[part];
      this.fonts?.setValue(style.font, style.weight, style.italic);
    }
  }
  private save(style?: NoteTextStyle): void {
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
          ...(style ? { typography: { part: this.part, style } } : {}),
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
    for (const [key, value] of Object.entries(noteFontMetadata(note.data)))
      paper.setAttribute(key, value);
    restoreNoteFonts(this.root, () => this.grow());
    this.grow();
  }
  render(): void {
    const n = this.note();
    if (n?.data.kind !== 'note') return;
    const data = n.data;
    this.fonts?.dispose();
    this.root.innerHTML = `<div class="note-editor"><div class="note-editor-nav"><button type="button" data-action="note-return" aria-label="Volver al Canvas" data-tip="Volver al Canvas">${icon('chevron-left', 18)}</button></div><div class="note-format" role="group" aria-label="Formato de la nota"><div class="note-type"><label for="note-font">Tipografía</label><div><div class="note-font-field"><input id="note-font" role="combobox" aria-label="Tipografía del cuerpo" aria-haspopup="grid" aria-controls="note-font-list" aria-expanded="false" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Buscar fuente…" maxlength="100"><button type="button" tabindex="-1" aria-label="Mostrar fuentes">${icon('chevron', 14)}</button></div><select id="note-weight" aria-label="Peso del cuerpo"></select><label class="note-size"><input id="note-size" aria-label="Tamaño del texto" type="number" min="12" max="32" required value="${data.fontSize ?? 16}"><span>px</span></label></div></div><div class="note-palette"><span>Color</span><div class="note-colors" role="group" aria-label="Color de la nota">${colors.map((c, i) => `<button type="button" data-action="note-color" data-color="${c}" aria-label="Color ${colorNames[i]}" data-tip="${colorNames[i]}" aria-pressed="${data.color === c}"><span style="background:${c};color:${noteInk(c)}">${icon('check', 14)}</span></button>`).join('')}</div></div></div><article class="note-paper" ${noteFontAttributes(data)} data-color="${data.color}" style="${noteStyle(data)}"><textarea id="note-title" rows="1" aria-label="Título de la nota" placeholder="Sin nombre">${html(data.title)}</textarea><textarea id="note-text" aria-label="Contenido de la nota" placeholder="Escribí una nota…">${html(data.text)}</textarea></article></div>`;
    this.fonts = new NoteFontPicker(
      this.root.querySelector<HTMLElement>('.note-font-field')!,
      noteTypography(data)[this.part].font,
      noteTypography(data)[this.part].weight,
      noteTypography(data)[this.part].italic,
      this.ctx.ui.favoriteFonts ?? [],
      (font, weight, italic) => {
        this.save({ font, weight, italic });
        this.updatePaper();
      },
      (fonts) => {
        this.ctx.ui.favoriteFonts = fonts;
        this.ctx.persist();
      },
    );
    this.selectPart(this.part);
    restoreNoteFonts(this.root, () => this.grow());
    this.grow();
  }
  dispose(): void {
    this.abort.abort();
    this.fonts?.dispose();
  }
}
