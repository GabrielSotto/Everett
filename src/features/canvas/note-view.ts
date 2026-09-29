import type { Context } from '../../app/context';
import { html, target, value, type View } from '../../ui/dom';
import { colors } from './note-colors';

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
        if (t?.dataset.action === 'note-color' && t.dataset.color) {
          const paper = root.querySelector<HTMLElement>('.note-paper');
          if (paper) {
            paper.dataset.color = t.dataset.color;
            paper.style.background = t.dataset.color;
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
    this.root.innerHTML = `<div class="note-editor"><article class="note-paper" data-color="${n.data.color}" style="background:${n.data.color}"><div class="note-colors">${colors.map((c) => `<button data-action="note-color" data-color="${c}" style="background:${c}" aria-label="Color ${c}" data-tip="Color ${c}"></button>`).join('')}</div><input id="note-title" aria-label="Título de la nota" placeholder="Sin título" value="${html(n.data.title)}"><textarea id="note-text" aria-label="Contenido de la nota" placeholder="Escribí…">${html(n.data.text)}</textarea></article></div>`;
  }
  dispose(): void {
    this.abort.abort();
  }
}
