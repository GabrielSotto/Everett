import { parseShippingIntent } from '../../domain/shipping';
import { conversation } from '../../domain/conversations';
import type { Context } from '../../app/context';
import { target, value, type View } from '../../ui/dom';
import { docsPresentation } from './presentation';
import { focusReference } from '../../ui/reference-focus';
import { ComposerDisclosure } from '../../ui/disclosure';
import { bindComposer, preserveComposerDrafts, composerDraft } from '../../ui/composer';
export class DocsView implements View {
  private abort = new AbortController();
  private resize = new ResizeObserver(() => this.resizeBody());
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
    this.resize.observe(root);
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
        if (e.target.id === 'doc-body') this.resizeBody();
        if (e.target.id === 'doc-title' || e.target.id === 'doc-body')
          ctx.act(
            {
              type: 'document.edit',
              world: ctx.world().id,
              id: d.id,
              title: this.root.querySelector('#doc-title')?.textContent ?? '',
              body: value(this.root, '#doc-body'),
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
            if (input) {
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (parseShippingIntent(text)) {
              this.busy = true;
              void ctx.service
                .talk(ctx.world().id, 'eve', text, conversation(ctx.world(), ctx.ui).id)
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
  private resizeBody(): void {
    const body = this.root.querySelector<HTMLTextAreaElement>('#doc-body');
    if (!body) return;
    body.style.height = 'auto';
    body.style.height = `${body.scrollHeight}px`;
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
    this.root.innerHTML = docsPresentation({
      world: w,
      document: d,
      listOpen: this.ctx.ui.docs.docsList,
      aiOpen: this.aiOpen,
      response: this.response,
      draft: composerDraft(this.ctx, 'doc-composer', d?.id ?? ''),
    });
    const body = this.root.querySelector<HTMLTextAreaElement>('#doc-body');
    if (body && d) body.value = d.body;
    this.resizeBody();
    this.displayedDocument = d?.id ?? null;
    const saved = d ? this.positions.get(d.id) : undefined,
      scroll = this.root.querySelector<HTMLElement>('.document-scroll');
    if (saved && scroll) {
      scroll.scrollTop = saved.top;
      scroll.scrollLeft = saved.left;
    }
    restoreDraft();
    this.disclosure.sync(this.aiOpen);
    focusReference(this.root, this.ctx);
  }
  closeTransient(): boolean {
    if (!this.aiOpen) return false;
    this.aiOpen = false;
    this.disclosure.setOpen(false);
    return true;
  }
  dispose(): void {
    this.resize.disconnect();
    this.disclosure.dispose();
    this.abort.abort();
  }
}
