import { parseShippingIntent } from '../../domain/shipping';
import type { Context } from '../../app/context';
import { html, target, value, type View } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { ComposerDisclosure } from '../../ui/disclosure';
import { composer, bindComposer, preserveComposerDrafts } from '../../ui/composer';
export class DocsView implements View {
  private abort = new AbortController();
  private disclosure: ComposerDisclosure;
  private aiOpen = false;
  private response = '';
  private busy = false;
  private displayedDocument: string | null = null;
  private positions = new Map<string, { top: number; left: number }>();
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    this.disclosure = new ComposerDisclosure(root, '.document-page');
    bindComposer(root, this.abort.signal, ctx);
    root.addEventListener(
      'click',
      (e) => {
        const t = target(e);
        if (!t) return;
        const w = ctx.world();
        switch (t.dataset.action) {
          case 'docs-list':
            ctx.ui.docs.docsList = !ctx.ui.docs.docsList;
            this.render();
            break;
          case 'doc-open':
            ctx.go({ kind: 'surface', world: w.id, surface: 'docs', entity: t.dataset.id ?? null });
            break;
          case 'doc-new':
          case 'sheet-new':
            if (
              ctx.act(
                { type: 'document.create', world: w.id, sheet: t.dataset.action === 'sheet-new' },
                'crear documento',
                'DOCS-01',
              )
            )
              ctx.go({
                kind: 'surface',
                world: w.id,
                surface: 'docs',
                entity: ctx.world().docs.at(-1)?.id ?? null,
              });
            break;
          case 'doc-ai':
            this.aiOpen = !this.aiOpen;
            this.disclosure.setOpen(this.aiOpen);
            break;
          case 'doc-insert': {
            const d = this.doc();
            if (d)
              ctx.act(
                {
                  type: 'document.edit',
                  world: w.id,
                  id: d.id,
                  title: d.title,
                  body: d.body + '\n\n' + this.response,
                },
                'incorporar sugerencia',
                'DOCS-01',
              );
            this.response = '';
            this.render();
            break;
          }
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'input',
      (e) => {
        const d = this.doc();
        if (!d || !(e.target instanceof HTMLElement)) return;
        if (e.target.id === 'doc-title' || e.target.id === 'doc-body')
          ctx.act(
            {
              type: 'document.edit',
              world: ctx.world().id,
              id: d.id,
              title: this.root.querySelector('#doc-title')?.textContent ?? '',
              body: this.root.querySelector<HTMLElement>('#doc-body')?.innerText ?? '',
            },
            'editar documento',
            'DOCS-01',
            'keyboard',
          );
        if (e.target instanceof HTMLInputElement && e.target.dataset.cell) {
          const [row, col] = e.target.dataset.cell.split(':').map(Number);
          if (row !== undefined && col !== undefined)
            ctx.act(
              {
                type: 'sheet.edit',
                world: ctx.world().id,
                id: d.id,
                row,
                col,
                value: e.target.value,
              },
              'editar celda',
              'DOCS-01',
              'keyboard',
            );
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'paste',
      (e) => {
        if (e.target instanceof HTMLElement && e.target.isContentEditable) {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'submit',
      (e) => {
        if (e.target instanceof HTMLFormElement && e.target.id === 'doc-composer') {
          e.preventDefault();
          const d = this.doc();
          const text = value(root, '#doc-composer-input').trim();
          if (d && text && !this.busy) {
            const input = root.querySelector<HTMLTextAreaElement>('#doc-composer-input');
            if (input) input.value = '';
            if (parseShippingIntent(text)) {
              this.busy = true;
              void ctx.service
                .talk(ctx.world().id, 'eve', text)
                .then((answer) => {
                  this.response = answer;
                })
                .catch((error) => ctx.fail(error, 'docs.agent'))
                .finally(() => {
                  this.busy = false;
                  if (!this.abort.signal.aborted) this.render();
                });
            } else {
              this.response = d.body.split('\n').filter(Boolean).slice(0, 3).join('\n\n');
              this.render();
            }
          }
        }
      },
      { signal: this.abort.signal },
    );
    this.render();
  }
  private doc() {
    const r = this.ctx.store.get().route,
      w = this.ctx.world();
    return w.docs.find((d) => r.kind === 'surface' && d.id === r.entity) ?? w.docs[0];
  }
  render(): void {
    const restoreDraft = preserveComposerDrafts(this.root);
    const oldScroll = this.root.querySelector<HTMLElement>('.document-scroll');
    if (oldScroll && this.displayedDocument)
      this.positions.set(this.displayedDocument, {
        top: oldScroll.scrollTop,
        left: oldScroll.scrollLeft,
      });
    const d = this.doc(),
      w = this.ctx.world();
    this.root.innerHTML = `<div class="docs-layout">${this.ctx.ui.docs.docsList ? `<aside class="docs-list"><div class="document-actions">${btn('doc-new', 'plus', 'Crear documento')}${btn('sheet-new', 'table', 'Crear hoja')}</div>${w.docs.map((doc) => `<button data-action="doc-open" data-id="${doc.id}" class="${doc.id === d?.id ? 'selected' : ''}">${icon(doc.sheet ? 'table' : 'docs', 15)}<span>${html(doc.title)}</span></button>`).join('')}</aside>` : ''}<div class="document-main"><div class="document-toolbar">${btn('docs-list', 'panel-left', this.ctx.ui.docs.docsList ? 'Ocultar documentos' : 'Mostrar documentos', `aria-expanded="${this.ctx.ui.docs.docsList}"`, this.ctx.ui.docs.docsList)}${!this.ctx.ui.docs.docsList ? btn('doc-new', 'plus', 'Crear documento') + btn('sheet-new', 'table', 'Crear hoja') : ''}</div>${d ? `<div class="document-scroll"><article class="document-page"><h1 contenteditable="true" spellcheck="false" id="doc-title" aria-label="Título del documento">${html(d.title)}</h1>${d.sheet ? `<div class="sheet-scroll"><table class="sheet-grid"><thead><tr><th></th>${d.sheet[0]?.map((_, i) => `<th>${String.fromCharCode(65 + i)}</th>`).join('') ?? ''}</tr></thead><tbody>${d.sheet.map((row, i) => `<tr><th>${i + 1}</th>${row.map((v, j) => `<td><input data-cell="${i}:${j}" aria-label="Celda ${String.fromCharCode(65 + j)}${i + 1}" value="${html(v)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="document-body" id="doc-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Contenido del documento">${html(d.body)}</div>`}</article></div><div class="code-fab-anchor"><button class="agent-fab" data-action="doc-ai" aria-label="Asistente de escritura" data-tip="Asistente de escritura" aria-expanded="${this.aiOpen}">${icon('agents', 21)}</button><div class="composer-reveal ${this.aiOpen ? 'open' : ''}" ${this.aiOpen ? '' : 'inert'}>${composer('doc-composer', 'Trabajá sobre este documento…')}</div>${this.response ? `<div class="agent-response"><p>${html(this.response)}</p>${btn('doc-insert', 'check', 'Incorporar al documento')}</div>` : ''}</div>` : `<button class="empty-create" data-action="doc-new" aria-label="Crear documento">${icon('plus', 26)}</button>`}</div></div>`;
    this.displayedDocument = d?.id ?? null;
    const saved = d ? this.positions.get(d.id) : undefined,
      scroll = this.root.querySelector<HTMLElement>('.document-scroll');
    if (saved && scroll) {
      scroll.scrollTop = saved.top;
      scroll.scrollLeft = saved.left;
    }
    restoreDraft();
    this.disclosure.sync(this.aiOpen);
  }
  closeTransient(): boolean {
    if (!this.aiOpen) return false;
    this.aiOpen = false;
    this.disclosure.setOpen(false);
    return true;
  }
  dispose(): void {
    this.disclosure.dispose();
    this.abort.abort();
  }
}
