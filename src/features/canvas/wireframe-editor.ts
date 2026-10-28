import type { Context } from '../../app/context';
import {
  pasteWireframeCells,
  tableLimits,
  wireframeNames,
  type WireframeContent,
} from '../../domain/wireframes';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { frameCanvas } from '../../ui/canvas-frame';
import { wireframeMarkup } from './wireframe-markup';

/** Listeners locales y observación de tamaño con limpieza al cerrar el formulario. */
export function bindWireframeEditor(
  form: HTMLElement,
  ctx: Context,
  id: string,
  close: () => void,
  position: () => void,
): () => void {
  let activeRow = 0,
    activeColumn = 0;
  const fitText = () => {
    if (!form.classList.contains('wireframe-inline-editor')) return;
    const field = form.querySelector<HTMLTextAreaElement>('textarea');
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = Math.min(240, field.scrollHeight) + 'px';
  };
  form.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
  const current = () => {
    const node = ctx.world().nodes.find((node) => node.id === id);
    return node?.data.kind === 'wireframe' ? node : null;
  };
  const save = (content: WireframeContent): boolean => {
    const original = current();
    let height: number | undefined;
    if (original && content.type === 'text') {
      const measure = document.createElement('div');
      Object.assign(measure.style, {
        position: 'fixed',
        left: '-100000px',
        width: Math.max(1, original.width - 10) + 'px',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        font: '14px/1.45 Inter, system-ui, sans-serif',
      });
      measure.textContent = content.text || ' ';
      document.body.append(measure);
      height = Math.min(
        10000,
        Math.max(32, Math.ceil(measure.getBoundingClientRect().height) + 10),
      );
      measure.remove();
    }
    if (
      !ctx.act(
        {
          type: 'wireframe.edit',
          world: ctx.world().id,
          id,
          content,
          ...(height === undefined ? {} : { height }),
        },
        'editar bosquejo',
        'C08-WIRE-01',
      )
    )
      return false;
    const node = current();
    if (!node) return false;
    // El formulario vive fuera del plano. Repintar la geometría conserva su
    // foco y actualiza también puertos, cables, conjuntos e identificación.
    if ((height !== undefined && height !== original?.height) || content.type === 'screen') {
      ctx.render();
      return true;
    }
    const preview = document.querySelector<HTMLElement>(
      `[data-node="${CSS.escape(id)}"] .wireframe-content`,
    );
    if (preview) preview.outerHTML = wireframeMarkup(structuredClone(node));
    return true;
  };
  const fields = () => {
    const node = current();
    if (!node || node.data.kind !== 'wireframe') return;
    const content = node.data.content;
    const holder = form.querySelector('.wireframe-editor-fields')!;
    if (content.type === 'table') {
      activeRow = Math.min(activeRow, content.cells.length - 1);
      activeColumn = Math.min(activeColumn, content.cells[0]!.length - 1);
      const remaining =
        tableLimits.text -
        content.cells.reduce(
          (total, row) => total + row.reduce((sum, cell) => sum + cell.length, 0),
          0,
        );
      holder.innerHTML = `<div class="wireframe-table-tools"><button type="button" data-table-action="add-row" ${content.cells.length >= tableLimits.rows ? 'disabled' : ''}>Agregar fila</button><button type="button" data-table-action="add-column" ${content.cells[0]!.length >= tableLimits.columns ? 'disabled' : ''}>Agregar columna</button><button type="button" data-table-action="remove-row" ${content.cells.length <= 1 ? 'disabled' : ''}>Quitar fila</button><button type="button" data-table-action="remove-column" ${content.cells[0]!.length <= 1 ? 'disabled' : ''}>Quitar columna</button></div><small class="wireframe-table-status">${content.cells.length} ${content.cells.length === 1 ? 'fila' : 'filas'} · ${content.cells[0]!.length} ${content.cells[0]!.length === 1 ? 'columna' : 'columnas'}</small><div class="wireframe-table-scroll"><table aria-label="Celdas del bosquejo"><tbody>${content.cells.map((row, r) => `<tr>${row.map((cell, c) => `<td><input data-cell-row="${r}" data-cell-column="${c}" aria-label="Fila ${r + 1}, columna ${c + 1}" value="${html(cell)}" maxlength="${remaining + cell.length}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><small>Elegí una celda para quitar su fila o columna. Podés pegar celdas desde una hoja.</small>`;
    } else {
      const multiline = ['text', 'card', 'list', 'menu'].includes(content.type);
      holder.innerHTML = `<label>${content.type === 'screen' ? 'Nombre de la pantalla' : 'Texto'} ${multiline ? `<textarea rows="${content.type === 'text' ? 1 : 4}" aria-label="Contenido del bosquejo" maxlength="${tableLimits.text}">${html(content.text)}</textarea>` : `<input aria-label="Contenido del bosquejo" maxlength="${content.type === 'screen' ? 300 : tableLimits.text}" value="${html(content.type === 'screen' ? node.data.title : content.text)}">`}</label>${['list', 'menu'].includes(content.type) ? '<small>Una opción por línea.</small>' : content.type === 'card' ? '<small>Primera línea: título. Las demás: contenido.</small>' : ''}`;
      if (content.type === 'screen')
        holder.insertAdjacentHTML(
          'afterbegin',
          '<div class="wireframe-screen-presets" role="group" aria-label="Tamaño de pantalla"><button type="button" data-screen-size="390,844">Teléfono</button><button type="button" data-screen-size="768,1024">Tablet</button><button type="button" data-screen-size="1280,800">Escritorio</button></div><small>También podés darle cualquier proporción arrastrando sus esquinas.</small>',
        );
    }
    fitText();
    position();
  };
  form.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement))
      return;
    const node = current();
    if (node?.data.kind !== 'wireframe') return;
    let content: WireframeContent = structuredClone(node.data.content);
    if (content.type === 'table') {
      const row = Number(event.target.dataset.cellRow),
        column = Number(event.target.dataset.cellColumn);
      const value = event.target.value;
      content.cells = content.cells.map((cells, r) =>
        cells.map((cell, c) => (r === row && c === column ? value : cell)),
      );
    } else content.text = event.target.value;
    fitText();
    if (save(content) && content.type === 'table') {
      const remaining =
        tableLimits.text -
        content.cells.reduce(
          (total, row) => total + row.reduce((sum, cell) => sum + cell.length, 0),
          0,
        );
      form.querySelectorAll<HTMLInputElement>('[data-cell-row]').forEach((input) => {
        input.maxLength = remaining + input.value.length;
      });
    }
  });
  form.addEventListener('focusin', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.dataset.cellRow === undefined)
      return;
    activeRow = Number(event.target.dataset.cellRow);
    activeColumn = Number(event.target.dataset.cellColumn);
  });
  form.addEventListener('click', (event) => {
    const preset =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-screen-size]')
        : null;
    if (preset) {
      const node = current();
      if (!node || node.data.kind !== 'wireframe' || node.data.content.type !== 'screen') return;
      const [width, height] = preset.dataset.screenSize!.split(',').map(Number) as [number, number];
      close();
      const changed = ctx.act(
        {
          type: 'node.resize',
          world: ctx.world().id,
          id,
          rect: { x: node.x, y: node.y, width, height },
        },
        'cambiar formato de pantalla',
        'C08-WIRE-01',
      );
      if (changed) {
        const rect = document
          .querySelector(`[data-node="${CSS.escape(id)}"]`)
          ?.getBoundingClientRect();
        if (
          rect &&
          (rect.top < 80 ||
            rect.left < 16 ||
            rect.right > innerWidth - 16 ||
            rect.bottom > innerHeight - 100)
        )
          frameCanvas(ctx, true);
      }
      return;
    }
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-table-action]')
        : null;
    const node = current();
    if (!button || node?.data.kind !== 'wireframe' || node.data.content.type !== 'table') return;
    const cells = node.data.content.cells.map((row) => [...row]);
    switch (button.dataset.tableAction) {
      case 'add-row':
        if (cells.length < tableLimits.rows) cells.push(cells[0]!.map(() => ''));
        break;
      case 'add-column':
        if (cells[0]!.length < tableLimits.columns) cells.forEach((row) => row.push(''));
        break;
      case 'remove-row':
        if (cells.length > 1) cells.splice(activeRow, 1);
        break;
      case 'remove-column':
        if (cells[0]!.length > 1) cells.forEach((row) => row.splice(activeColumn, 1));
        break;
    }
    if (save({ type: 'table', cells })) {
      fields();
      form
        .querySelector<HTMLInputElement>(
          `[data-cell-row="${activeRow}"][data-cell-column="${activeColumn}"]`,
        )
        ?.focus({ preventScroll: true });
    }
  });
  form.addEventListener('paste', (event) => {
    const target = event.target;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const node = current();
    if (
      !(target instanceof HTMLInputElement) ||
      target.dataset.cellRow === undefined ||
      !/[\t\r\n]/.test(text) ||
      node?.data.kind !== 'wireframe' ||
      node.data.content.type !== 'table'
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const cells = pasteWireframeCells(node.data.content.cells, activeRow, activeColumn, text);
    if (!cells) {
      ctx.notice(
        'La tabla admite 100 filas, 20 columnas y 100 000 caracteres. Pegá un rango menor.',
        true,
      );
      return;
    }
    if (save({ type: 'table', cells })) {
      fields();
      form
        .querySelector<HTMLInputElement>(
          `[data-cell-row="${activeRow}"][data-cell-column="${activeColumn}"]`,
        )
        ?.focus({ preventScroll: true });
    }
  });
  form.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (
      event.key === 'Enter' &&
      !event.isComposing &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      if (event.target.dataset.cellRow !== undefined) {
        const row = Number(event.target.dataset.cellRow) + 1;
        form
          .querySelector<HTMLInputElement>(
            `[data-cell-row="${row}"][data-cell-column="${activeColumn}"]`,
          )
          ?.focus();
      } else close();
    }
  });
  const observer = new ResizeObserver(() => {
    if (!form.isConnected) {
      observer.disconnect();
      return;
    }
    position();
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && form.contains(focused))
      focused.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  observer.observe(form);
  observer.observe(form.querySelector('.wireframe-editor-fields')!);
  observer.observe(form.querySelector('.wireframe-editor-head')!);
  fields();
  form
    .querySelector<HTMLInputElement | HTMLTextAreaElement>('input,textarea')
    ?.focus({ preventScroll: true });
  return () => observer.disconnect();
}

export function wireframeEditorMarkup(content: WireframeContent): string {
  return `<section class="canvas-context-form wireframe-editor" role="dialog" aria-label="Editar ${wireframeNames[content.type].toLocaleLowerCase()}"><div class="wireframe-editor-head"><strong>${wireframeNames[content.type]}</strong><button type="button" class="icon-button" data-action="context-close" aria-label="Cerrar edición de bosquejo">${icon('close', 16)}</button></div><div class="wireframe-editor-fields"></div><small>Guardado automático en Canvas</small></section>`;
}
