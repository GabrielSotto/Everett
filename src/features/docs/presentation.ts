import type { Document, WorldSnapshot } from '../../domain/model';
import type { DeepReadonly } from '../../domain/readonly';
import { html } from '../../ui/dom';
import { btn, icon } from '../../ui/icons';
import { composer, type ComposerDraft } from '../../ui/composer';

interface DocsPresentation {
  world: WorldSnapshot;
  document: DeepReadonly<Document> | undefined;
  listOpen: boolean;
  aiOpen: boolean;
  response: string;
  draft: ComposerDraft;
}

function createActions(): string {
  return btn('doc-new', 'plus', 'Crear documento') + btn('sheet-new', 'table', 'Crear hoja');
}

function documentPage(document: DeepReadonly<Document>): string {
  const body = document.sheet
    ? `<div class="sheet-scroll"><table class="sheet-grid">
        <thead><tr><th></th>${document.sheet[0]?.map((_, col) => `<th>${String.fromCharCode(65 + col)}</th>`).join('') ?? ''}</tr></thead>
        <tbody>${document.sheet.map((row, r) => `<tr><th>${r + 1}</th>${row.map((cell, col) => `<td><input data-cell="${r}:${col}" aria-label="Celda ${String.fromCharCode(65 + col)}${r + 1}" value="${html(cell)}"></td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`
    : `<textarea class="document-body" id="doc-body" aria-label="Contenido del documento" spellcheck="false">${html(document.body)}</textarea>`;
  return `<div class="document-scroll"><article class="document-page">
    <h1 contenteditable="true" spellcheck="false" id="doc-title" aria-label="Título del documento">${html(document.title)}</h1>
    ${body}
  </article></div>`;
}

export function docsPresentation({
  world,
  document,
  listOpen,
  aiOpen,
  response,
  draft,
}: DocsPresentation): string {
  const list = listOpen
    ? `<aside class="docs-list"><div class="document-actions">${createActions()}</div>${world.docs.map((doc) => `<button data-action="doc-open" data-id="${doc.id}" class="${doc.id === document?.id ? 'selected' : ''}">${icon(doc.sheet ? 'table' : 'docs', 15)}<span>${html(doc.title)}</span></button>`).join('')}</aside>`
    : '';
  const assistant = `<div class="code-fab-anchor">
    <button class="agent-fab" data-action="doc-ai" aria-label="Asistente de escritura" data-tip="Asistente de escritura" aria-expanded="${aiOpen}">${icon('agents', 21)}</button>
    <div class="composer-reveal ${aiOpen ? 'open' : ''}" ${aiOpen ? '' : 'inert'}>${composer('doc-composer', 'Trabajá sobre este documento…', false, '', draft)}</div>
    ${response ? `<div class="agent-response"><p>${html(response)}</p>${btn('doc-insert', 'check', 'Incorporar al documento')}</div>` : ''}
  </div>`;
  return `<div class="docs-layout">${list}<div class="document-main">
    <div class="document-toolbar">${btn('docs-list', 'panel-left', listOpen ? 'Ocultar documentos' : 'Mostrar documentos', `aria-expanded="${listOpen}"`, listOpen)}${listOpen ? '' : createActions()}</div>
    ${document ? documentPage(document) + assistant : `<button class="empty-create" data-action="doc-new" aria-label="Crear documento">${icon('plus', 26)}</button>`}
  </div></div>`;
}
