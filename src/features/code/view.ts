import { compareLines } from '../../domain/code-diff';
import { ComposerDisclosure } from '../../ui/disclosure';
import type { Context } from '../../app/context';
import type { CodeFile } from '../../domain/model';
import { html, target, value, type View } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { composer, bindComposer, preserveComposerDrafts } from '../../ui/composer';
import { slot, bindSlot } from '../../ui/slot';
function highlight(text: string): string {
  const re =
    /(\/\/[^\n]*|"[^"\n]*"|'[^'\n]*'|\b(?:export|interface|function|const|return|readonly|typeof|throw|new|if|import|from|type|string|number|boolean|unknown)\b|\b\d+\b)/g;
  let output = '',
    offset = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index;
    output += html(text.slice(offset, start));
    const s = match[0];
    output += `<span class="syntax-${s.startsWith('//') ? 'comment' : /^['"]/.test(s) ? 'string' : /^\d/.test(s) ? 'number' : 'keyword'}">${html(s)}</span>`;
    offset = start + s.length;
  }
  return output + html(text.slice(offset));
}
function editor(file: CodeFile): string {
  return `<div class="editor-body"><div class="gutter" aria-hidden="true"><pre id="code-gutter">${file.text
    .split('\n')
    .map((_, i) => i + 1)
    .join(
      '\n',
    )}</pre></div><div class="editor-surface"><pre id="code-highlight" aria-hidden="true">${highlight(file.text)}\n</pre><textarea id="code-editor" aria-label="Editar ${html(file.name)}" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off">${html(file.text)}</textarea></div></div>`;
}
function diff(before: string, after: string): string {
  let left = 0,
    right = 0;
  return `<div class="diff" role="region" aria-label="Comparación de cambios"><div class="diff-header"><span>Actual</span><span>Propuesta</span></div><div class="diff-lines">${compareLines(
    before,
    after,
  )
    .map(
      (row) =>
        `<div class="diff-row ${row.type}"><div class="diff-cell ${row.type === 'remove' ? 'removed' : ''}"><span class="diff-number">${row.before !== null ? ++left : ''}</span><code>${row.before === null ? '' : html(row.before) || ' '}</code></div><div class="diff-cell ${row.type === 'insert' ? 'added' : ''}"><span class="diff-number">${row.after !== null ? ++right : ''}</span><code>${row.after === null ? '' : html(row.after) || ' '}</code></div></div>`,
    )
    .join('')}</div></div>`;
}
export class CodeView implements View {
  private abort = new AbortController();
  private disclosure: ComposerDisclosure;
  private newFile = false;
  private displayedFile: string | null = null;
  private positions = new Map<string, { top: number; left: number; start: number; end: number }>();
  constructor(
    private root: HTMLElement,
    private ctx: Context,
  ) {
    this.disclosure = new ComposerDisclosure(root, '.code-main');
    bindComposer(root, this.abort.signal, ctx);
    bindSlot(root, ctx, this.abort.signal);
    root.addEventListener('click', (e) => this.click(e), { signal: this.abort.signal });
    root.addEventListener('input', (e) => this.input(e), { signal: this.abort.signal });
    root.addEventListener(
      'change',
      (e) => {
        if (e.target instanceof HTMLInputElement && e.target.id === 'branch')
          ctx.act(
            { type: 'branch', world: ctx.world().id, name: e.target.value },
            'cambiar rama',
            'CODE-02',
          );
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'submit',
      (e) => {
        if (!(e.target instanceof HTMLFormElement)) return;
        if (e.target.id === 'code-composer') {
          e.preventDefault();
          const f = this.file(),
            text = value(root, '#code-composer-input');
          if (f) {
            const input = root.querySelector<HTMLTextAreaElement>('#code-composer-input');
            if (input) input.value = '';
            ctx.ui.code.codeResponse = true;
            void ctx.service
              .code(ctx.world().id, f.id, text)
              .catch((error) => ctx.fail(error, 'code.request'));
          }
        }
        if (e.target.id === 'new-file') {
          e.preventDefault();
          const name = value(root, '#new-file-name');
          if (
            ctx.act(
              { type: 'file.create', world: ctx.world().id, name },
              'crear archivo',
              'CODE-02',
            )
          ) {
            ctx.ui.code.currentFile = ctx.world().files.at(-1)?.id ?? null;
            this.newFile = false;
            this.render();
          }
        }
        if (e.target.id === 'find-code') {
          e.preventDefault();
          this.find(value(root, '#code-find-input'));
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'keydown',
      (e) => {
        if (e.target instanceof HTMLTextAreaElement && e.target.id === 'code-editor') {
          if (e.key === 'Tab') {
            e.preventDefault();
            e.target.setRangeText('  ', e.target.selectionStart, e.target.selectionEnd, 'end');
            e.target.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const f = this.file();
            if (f)
              ctx.act(
                { type: 'file.save', world: ctx.world().id, id: f.id },
                'guardar archivo',
                'CODE-02',
                'keyboard',
              );
          }
        }
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'scroll',
      (e) => {
        if (e.target instanceof HTMLTextAreaElement && e.target.id === 'code-editor')
          this.sync(e.target);
      },
      { capture: true, signal: this.abort.signal },
    );
    this.render();
  }
  private file(): CodeFile | undefined {
    const w = this.ctx.world(),
      r = this.ctx.store.get().route;
    return (
      w.files.find((f) => f.id === this.ctx.ui.code.currentFile) ??
      w.files.find((f) => r.kind === 'surface' && f.id === r.entity) ??
      w.files[0]
    );
  }
  private click(e: MouseEvent): void {
    const t = target(e);
    if (!t) return;
    const { ctx } = this,
      w = ctx.world();
    switch (t.dataset.action) {
      case 'code-fab':
        ctx.ui.code.codeComposer = !ctx.ui.code.codeComposer;
        this.disclosure.setOpen(ctx.ui.code.codeComposer);
        break;
      case 'code-tree':
        ctx.ui.code.codeTree = !ctx.ui.code.codeTree;
        this.render();
        break;
      case 'code-file':
        ctx.ui.code.currentFile = t.dataset.id ?? null;
        ctx.ui.code.codeDiff = false;
        this.render();
        break;
      case 'code-new':
        this.newFile = !this.newFile;
        this.render();
        this.root.querySelector<HTMLInputElement>('#new-file-name')?.focus();
        break;
      case 'code-save': {
        const f = this.file();
        if (f) ctx.act({ type: 'file.save', world: w.id, id: f.id }, 'guardar archivo', 'CODE-02');
        break;
      }
      case 'code-diff':
        ctx.ui.code.codeDiff = !ctx.ui.code.codeDiff;
        if (ctx.ui.code.codeDiff) ctx.ui.code.codeResponse = false;
        this.render();
        break;
      case 'code-find':
        ctx.ui.code.codeFind = !ctx.ui.code.codeFind;
        this.render();
        this.root.querySelector<HTMLInputElement>('#code-find-input')?.focus();
        break;
      case 'code-terminal':
        ctx.ui.auxiliary.slot = ctx.ui.auxiliary.slot === 'terminal' ? null : 'terminal';
        this.render();
        break;
      case 'code-accept':
      case 'code-reject':
        if (
          ctx.act(
            { type: 'code.accept', world: w.id, accept: t.dataset.action === 'code-accept' },
            t.dataset.action === 'code-accept' ? 'aceptar cambios' : 'rechazar cambios',
            'CODE-02',
          )
        ) {
          ctx.ui.code.codeDiff = false;
          this.render();
        }
        break;
      case 'response-close':
        ctx.ui.code.codeResponse = false;
        this.render();
        break;
    }
  }
  private sync(ta: HTMLTextAreaElement): void {
    const h = this.root.querySelector<HTMLElement>('#code-highlight'),
      g = this.root.querySelector<HTMLElement>('#code-gutter');
    if (h) h.style.transform = `translate(${-ta.scrollLeft}px,${-ta.scrollTop}px)`;
    if (g) g.style.transform = `translateY(${-ta.scrollTop}px)`;
  }
  private input(e: Event): void {
    if (!(e.target instanceof HTMLTextAreaElement) || e.target.id !== 'code-editor') return;
    const f = this.file();
    if (!f) return;
    this.ctx.act(
      { type: 'file.edit', world: this.ctx.world().id, id: f.id, text: e.target.value },
      'editar código',
      'CODE-02',
      'keyboard',
    );
    const h = this.root.querySelector('#code-highlight'),
      g = this.root.querySelector('#code-gutter');
    if (h) h.innerHTML = highlight(e.target.value) + '\n';
    if (g)
      g.textContent = e.target.value
        .split('\n')
        .map((_, i) => i + 1)
        .join('\n');
    const saved = this.root.querySelector('#save-status');
    if (saved) saved.textContent = 'Sin guardar';
    this.sync(e.target);
  }
  private find(text: string): void {
    const ta = this.root.querySelector<HTMLTextAreaElement>('#code-editor');
    if (!ta || !text) return;
    const start = ta.value.toLowerCase().indexOf(text.toLowerCase(), ta.selectionEnd),
      pos = start >= 0 ? start : ta.value.toLowerCase().indexOf(text.toLowerCase());
    if (pos >= 0) {
      ta.focus();
      ta.setSelectionRange(pos, pos + text.length);
      const line = ta.value.slice(0, pos).split('\n').length;
      ta.scrollTop = Math.max(0, line * 24 - ta.clientHeight / 2);
    } else this.ctx.notice('Sin coincidencias.');
  }
  render(): void {
    const restoreDraft = preserveComposerDrafts(this.root);
    const oldEditor = this.root.querySelector<HTMLTextAreaElement>('#code-editor');
    if (oldEditor && this.displayedFile)
      this.positions.set(this.displayedFile, {
        top: oldEditor.scrollTop,
        left: oldEditor.scrollLeft,
        start: oldEditor.selectionStart,
        end: oldEditor.selectionEnd,
      });
    const { ctx } = this,
      w = ctx.world(),
      f = this.file(),
      p = w.proposal;
    this.root.innerHTML = `<div class="code-layout">${ctx.ui.code.codeTree ? `<aside class="file-tree"><div class="tree-actions">${btn('code-new', 'plus', 'Crear archivo')}</div>${this.newFile ? '<form id="new-file"><input id="new-file-name" aria-label="Nombre del archivo" placeholder="src/archivo.ts" required></form>' : ''}${w.files.map((file) => `<button class="file-entry ${f?.id === file.id ? 'selected' : ''}" data-action="code-file" data-id="${file.id}">${icon(file.name.endsWith('.md') ? 'docs' : 'code', 14)}<span>${html(file.name)}</span>${file.text !== file.saved ? '<i class="dirty"></i>' : ''}</button>`).join('')}</aside>` : ''}<div class="code-main"><div class="editor-toolbar">${btn('code-tree', 'panel-left', ctx.ui.code.codeTree ? 'Ocultar archivos' : 'Mostrar archivos', `aria-expanded="${ctx.ui.code.codeTree}"`, ctx.ui.code.codeTree)}${!ctx.ui.code.codeTree ? btn('code-new', 'plus', 'Crear archivo') : ''}${!ctx.ui.code.codeTree && this.newFile ? '<form id="new-file"><input id="new-file-name" aria-label="Nombre del archivo" placeholder="src/archivo.ts" required></form>' : ''}<span class="file-name">${html(f?.name ?? '')}</span><div>${btn('code-find', 'search', 'Buscar en el archivo')}${btn('code-diff', 'code', 'Ver diferencias', '', ctx.ui.code.codeDiff)}${btn('code-terminal', 'terminal', 'Terminal', '', ctx.ui.auxiliary.slot === 'terminal')}${btn('code-save', 'save', 'Guardar archivo')}</div></div>${p && ctx.ui.code.codeDiff ? `<div class="diff-review"><span>${html(p.summary)}</span>${btn('code-reject', 'close', 'Rechazar cambios')}${btn('code-accept', 'check', 'Aceptar cambios')}</div>` : ''}${ctx.ui.code.codeFind ? '<form id="find-code" class="find-bar"><input id="code-find-input" aria-label="Buscar en código" placeholder="Buscar…"><button type="submit" class="icon-button" aria-label="Siguiente coincidencia">' + icon('arrow') + '</button></form>' : ''}${f ? (ctx.ui.code.codeDiff ? diff(p?.file === f.id ? p.before : f.saved, p?.file === f.id ? p.after : f.text) : editor(f)) : '<button class="empty-create" data-action="code-new">' + icon('plus') + '</button>'}<footer class="code-status">${icon('branch', 12)}<input id="branch" aria-label="Rama" value="${html(w.branch)}"><span id="save-status">${f?.text === f?.saved ? 'Guardado' : 'Sin guardar'}</span><span>${f?.name.endsWith('.ts') ? 'TypeScript' : 'Texto'} · UTF-8</span></footer><div class="code-fab-anchor"><button type="button" id="code-fab" class="agent-fab ${ctx.ui.code.codeComposer ? 'active' : ''}" data-action="code-fab" aria-label="Hablar con Milo" data-tip="Hablar con Milo" aria-expanded="${ctx.ui.code.codeComposer}">${icon('agents', 22)}</button><div id="code-composer-reveal" class="composer-reveal ${ctx.ui.code.codeComposer ? 'open' : ''}" ${ctx.ui.code.codeComposer ? '' : 'inert'}>${composer('code-composer', 'Pedile un cambio a Milo…', false, f?.name ?? '')}</div>${
      ctx.ui.code.codeResponse && w.codeMessages.length
        ? `<div class="agent-response"><div class="response-close">${btn('response-close', 'close', 'Cerrar respuesta')}</div>${w.codeMessages
            .filter((m) => m.role === 'agent')
            .slice(-1)
            .map((m) => `<p>${html(m.text)}</p>`)
            .join(
              '',
            )}${p ? `<div class="proposal-actions">${btn('code-diff', 'code', 'Revisar propuesta')}${btn('code-reject', 'close', 'Rechazar propuesta')}${btn('code-accept', 'check', 'Aceptar propuesta')}</div>` : ''}</div>`
        : ''
    }</div></div>${slot(ctx)}</div>`;
    this.displayedFile = f?.id ?? null;
    const saved = f ? this.positions.get(f.id) : undefined,
      editorElement = this.root.querySelector<HTMLTextAreaElement>('#code-editor');
    if (saved && editorElement) {
      editorElement.scrollTop = saved.top;
      editorElement.scrollLeft = saved.left;
      editorElement.setSelectionRange(saved.start, saved.end);
      this.sync(editorElement);
    }
    restoreDraft();
    this.disclosure.sync(this.ctx.ui.code.codeComposer);
  }
  closeTransient(): boolean {
    if (!this.ctx.ui.code.codeComposer) return false;
    this.ctx.ui.code.codeComposer = false;
    this.disclosure.setOpen(false);
    return true;
  }
  dispose(): void {
    this.disclosure.dispose();
    this.abort.abort();
  }
}
