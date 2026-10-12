import type { Context } from '../../app/context';
import { html, target, value, type View } from '../../ui/dom';
import { colors, colorNames, noteInk } from './note-colors';

export class NoteView implements View {
  private abort = new AbortController();
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    root.addEventListener('input', () => this.save(), { signal: this.abort.signal });
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
  private note() {
    const r = this.ctx.store.get().route;
    return r.kind === 'note' ? this.ctx.world().nodes.find((n) => n.id === r.entity) : undefined;
  }
  private save(): void {
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
        },
        'editar nota',
        'ZOOM-01',
        'keyboard',
      );
  }
  render(): void {
    const n = this.note();
    if (n?.data.kind !== 'note') return;
    const data = n.data;
    this.root.innerHTML = `<div class="note-editor"><div class="note-editor-status"><button type="button" data-action="note-return">Volver al Canvas</button><span>Guardado automático</span></div><article class="note-paper" data-color="${n.data.color}" style="background:${n.data.color};--note-ink:${noteInk(n.data.color)}"><div class="note-colors">${colors.map((c, i) => `<button type="button" data-action="note-color" data-color="${c}" style="background:${c}" aria-label="Color ${colorNames[i]}" data-tip="${colorNames[i]}" aria-pressed="${data.color === c}"></button>`).join('')}</div><input id="note-title" aria-label="Título de la nota" placeholder="Sin nombre" value="${html(n.data.title)}"><textarea id="note-text" aria-label="Contenido de la nota" placeholder="Escribí…">${html(n.data.text)}</textarea></article></div>`;
  }
  dispose(): void {
    this.abort.abort();
  }
}
