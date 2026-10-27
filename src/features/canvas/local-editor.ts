import type { Context } from '../../app/context';
import { statuses, statusNames, type LocalContent } from '../../domain/model';
import { localNames } from '../../domain/local-content';
import { html } from '../../ui/dom';
import { mediaToolbar } from './media-toolbar';
import { publishLocalMaterial } from './local-publish';

/** Las copias editan exclusivamente el material local. La incorporación se confirma aparte. */
export class LocalMaterialEditor {
  private abort = new AbortController();
  constructor(
    private root: HTMLElement,
    private ctx: Context,
    private id: string,
  ) {
    root.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof Element && event.target.closest('[data-copy-publish]'))
          publishLocalMaterial(root, ctx, id, this.abort.signal);
      },
      { signal: this.abort.signal },
    );
    root.addEventListener('input', (event) => this.edit(event), { signal: this.abort.signal });
    root.addEventListener('change', (event) => this.edit(event), { signal: this.abort.signal });
    const unsubscribe = ctx.store.subscribe((change) => {
      if (change.command.type === 'node.rename' && change.command.id === id) {
        const node = ctx.world().nodes.find((n) => n.id === id);
        const field = root.querySelector<HTMLInputElement>('[data-copy-field="title"]');
        if (node?.data.kind === 'local' && field) field.value = node.data.title;
      }
    });
    this.abort.signal.addEventListener('abort', unsubscribe, { once: true });
    this.render();
  }
  private render(): void {
    const node = this.ctx.world().nodes.find((n) => n.id === this.id);
    if (node?.data.kind !== 'local') return;
    const data = node.data,
      content = data.content;
    const text = (label: string, field: string, value: string, code = false) =>
      `<label>${label}<textarea data-copy-field="${field}" aria-label="${label}" class="${code ? 'copy-code' : ''}" spellcheck="${!code}">${html(value)}</textarea></label>`;
    let editor = '';
    if (content.kind === 'document') {
      editor = content.sheet
        ? `<div class="copy-sheet" role="region" aria-label="Hoja de la copia" tabindex="0"><table><tbody>${content.sheet.map((row, r) => `<tr>${row.map((cell, c) => `<td><input data-copy-row="${r}" data-copy-column="${c}" aria-label="Fila ${r + 1}, columna ${c + 1}" value="${html(cell)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        : text('Contenido de la copia', 'body', content.body);
    } else if (content.kind === 'file')
      editor = text('Código de la copia', 'text', content.text, true);
    else if (content.kind === 'task') {
      const task = content.task;
      editor =
        text('Descripción de la copia', 'description', task.description) +
        `<div class="copy-task-fields"><label>Estado<select data-copy-field="status" aria-label="Estado de la copia">${statuses.map((status) => `<option value="${status}" ${status === task.status ? 'selected' : ''}>${statusNames[status]}</option>`).join('')}</select></label><label>Prioridad<input data-copy-field="priority" aria-label="Prioridad de la copia" value="${html(task.priority)}"></label><label>Responsable<input data-copy-field="assignee" aria-label="Responsable de la copia" value="${html(task.assignee)}"></label></div>`;
    } else editor = text('Descripción de la copia', 'role', content.agent.role);
    this.root.innerHTML =
      mediaToolbar(data.title) +
      `<section class="local-material-editor"><div class="local-copy-heading"><span>${localNames[content.kind]} · Solo en Canvas</span><span role="status" class="copy-save-status">Guardado automático en Canvas</span></div><label>Nombre<input data-copy-field="title" aria-label="Nombre de la copia" value="${html(data.title)}"></label>${editor}<p class="local-copy-help">Los cambios de esta copia no modifican el original.</p>${content.kind === 'agent' ? '' : `<button type="button" class="copy-publish-button" data-copy-publish>Crear en ${content.kind === 'document' ? 'Docs' : content.kind === 'file' ? 'Code' : 'Board'}…</button>`}</section>`;
  }
  private edit(event: Event): void {
    const field = event.target;
    if (!(
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ))
      return;
    const node = this.ctx.world().nodes.find((n) => n.id === this.id);
    if (node?.data.kind !== 'local') return;
    let content: LocalContent = structuredClone(node.data.content);
    const key = field.dataset.copyField;
    if (!key && field.dataset.copyRow === undefined) return;
    const title = key === 'title' ? field.value : node.data.title;
    if (content.kind === 'document') {
      if (key === 'body') content.body = field.value;
      if (field.dataset.copyRow !== undefined && content.sheet) {
        const row = Number(field.dataset.copyRow),
          column = Number(field.dataset.copyColumn);
        content.sheet = content.sheet.map((cells, r) =>
          cells.map((value, c) => (r === row && c === column ? field.value : value)),
        );
      }
    } else if (content.kind === 'file' && key === 'text') content.text = field.value;
    else if (content.kind === 'task') {
      if (key === 'status' && statuses.some((status) => status === field.value))
        content.task.status = field.value as typeof content.task.status;
      else if (key === 'description' || key === 'priority' || key === 'assignee')
        content.task[key] = field.value;
    } else if (content.kind === 'agent' && key === 'role') content.agent.role = field.value;
    const ok = this.ctx.act(
      { type: 'node.local-edit', world: this.ctx.world().id, id: node.id, title, content },
      'editar copia local',
      'C08-MAT-08',
    );
    if (ok && key === 'title') {
      const heading = this.root.querySelector('h1');
      if (heading) heading.textContent = title.trim() || 'Sin nombre';
    }
    const status = this.root.querySelector('.copy-save-status');
    if (status)
      status.textContent = ok ? 'Guardado automático en Canvas' : 'No se pudo guardar el cambio';
  }
  dispose(): void {
    this.abort.abort();
  }
}
