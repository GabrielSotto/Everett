import type { Context } from '../../app/context';
import {
  pasteWireframeCells,
  tableLimits,
  wireframeNames,
  wireframeAppearance,
  type WireframeContent,
} from '../../domain/wireframes';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { frameCanvas } from '../../ui/canvas-frame';
import { wireframeMarkup } from './wireframe-markup';
import { bindColorPicker } from './color-picker';
import { sketchSymbols } from '../../domain/sketch-symbols';

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
  let itemPage = 0;
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
    const previous = original?.data.kind === 'wireframe' ? original.data.content : null;
    if (
      original &&
      content.type === 'text' &&
      !content.placeholder &&
      previous?.type === 'text' &&
      (previous.text !== content.text ||
        previous.placeholder ||
        previous.piece?.style.fontSize !== content.piece?.style.fontSize)
    ) {
      const measure = document.createElement('div');
      Object.assign(measure.style, {
        position: 'fixed',
        left: '-100000px',
        width: Math.max(1, original.width - 10) + 'px',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        font: '14px/1.45 Inter, system-ui, sans-serif',
      });
      if (content.piece)
        Object.assign(measure.style, {
          width: original.width + 'px',
          fontSize: content.piece.style.fontSize,
          lineHeight: content.piece.style.lineHeight,
          fontWeight: content.piece.style.fontWeight,
        });
      measure.textContent = content.text || ' ';
      document.body.append(measure);
      height = Math.min(
        10000,
        Math.max(24, Math.ceil(measure.getBoundingClientRect().height) + (content.piece ? 0 : 10)),
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
    const heightField = form.querySelector<HTMLInputElement>('[data-size=height]');
    if (heightField && height !== undefined) heightField.value = String(node.height);
    // El formulario vive fuera del plano. Repintar la geometría conserva su
    // foco y actualiza también puertos, cables, conjuntos e identificación.
    if ((height !== undefined && height !== original?.height) || content.type === 'screen') {
      ctx.render();
      return true;
    }
    const preview = document.querySelector<HTMLElement>(
      `[data-node="${CSS.escape(id)}"] :is(.wireframe-content,[data-library-piece])`,
    );
    if (preview) preview.outerHTML = wireframeMarkup(structuredClone(node), ctx.world());
    return true;
  };
  const fields = () => {
    const node = current();
    if (!node || node.data.kind !== 'wireframe') return;
    const content = node.data.content;
    const holder = form.querySelector('.wireframe-editor-fields')!;
    if (content.piece && content.type !== 'text') {
      holder.innerHTML = content.piece.symbol
        ? `<label>Símbolo<select data-piece-symbol aria-label="Símbolo de la pieza">${Object.entries(
            sketchSymbols,
          )
            .map(
              ([id, name]) =>
                `<option value="${id}" ${content.piece!.symbol === id ? 'selected' : ''}>${name}</option>`,
            )
            .join('')}</select></label>`
        : '';
    } else if (content.type === 'table') {
      activeRow = Math.min(activeRow, content.cells.length - 1);
      activeColumn = Math.min(activeColumn, content.cells[0]!.length - 1);
      const remaining =
        tableLimits.text -
        content.cells.reduce(
          (total, row) => total + row.reduce((sum, cell) => sum + cell.length, 0),
          0,
        );
      holder.innerHTML = `<div class="wireframe-table-tools"><button type="button" data-table-action="add-row" ${content.cells.length >= tableLimits.rows ? 'disabled' : ''}>Agregar fila</button><button type="button" data-table-action="add-column" ${content.cells[0]!.length >= tableLimits.columns ? 'disabled' : ''}>Agregar columna</button><button type="button" data-table-action="remove-row" ${content.cells.length <= 1 ? 'disabled' : ''}>Quitar fila</button><button type="button" data-table-action="remove-column" ${content.cells[0]!.length <= 1 ? 'disabled' : ''}>Quitar columna</button></div><small class="wireframe-table-status">${content.cells.length} ${content.cells.length === 1 ? 'fila' : 'filas'} · ${content.cells[0]!.length} ${content.cells[0]!.length === 1 ? 'columna' : 'columnas'}</small><div class="wireframe-table-scroll"><table aria-label="Celdas del bosquejo"><tbody>${content.cells.map((row, r) => `<tr>${row.map((cell, c) => `<td><input data-cell-row="${r}" data-cell-column="${c}" aria-label="Fila ${r + 1}, columna ${c + 1}" value="${html(cell)}" maxlength="${remaining + cell.length}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><small>Elegí una celda para quitar su fila o columna. Podés pegar celdas desde una hoja.</small>`;
    } else if (['list', 'menu', 'carousel'].includes(content.type)) {
      const lines = content.text.split('\n');
      itemPage = Math.min(itemPage, Math.floor((lines.length - 1) / 20));
      const offset = itemPage * 20;
      holder.innerHTML = `<div class="wireframe-items" role="group" aria-label="Elementos del bosquejo">${lines
        .slice(offset, offset + 20)
        .map((line, local) => {
          const index = offset + local;
          return `<div class="wireframe-item"><label>Elemento ${index + 1}<input data-item-index="${index}" aria-label="Elemento ${index + 1}" value="${html(line)}" maxlength="${tableLimits.text - content.text.length + line.length}"></label><button type="button" class="icon-button" data-item-remove="${index}" aria-label="Quitar elemento ${index + 1}" ${lines.length === 1 ? 'disabled' : ''}>${icon('close', 14)}</button></div>`;
        })
        .join(
          '',
        )}<button type="button" data-item-add ${content.text.length >= tableLimits.text ? 'disabled' : ''}>Agregar elemento</button>${lines.length > 20 ? `<div class="wireframe-items-pages"><button type="button" data-item-page="${itemPage - 1}" ${itemPage === 0 ? 'disabled' : ''}>Anteriores</button><small>${offset + 1}–${Math.min(offset + 20, lines.length)} de ${lines.length}</small><button type="button" data-item-page="${itemPage + 1}" ${offset + 20 >= lines.length ? 'disabled' : ''}>Siguientes</button></div>` : ''}</div>`;
    } else {
      const multiline = ['text', 'card', 'list', 'menu'].includes(content.type);
      holder.innerHTML = `<label>${content.type === 'screen' ? 'Nombre de la pantalla' : 'Rótulo opcional'} ${multiline ? `<textarea rows="${content.type === 'text' ? 1 : 4}" aria-label="Contenido del bosquejo" maxlength="${tableLimits.text}">${html(content.text)}</textarea>` : `<input aria-label="Contenido del bosquejo" maxlength="${content.type === 'screen' ? 300 : tableLimits.text}" value="${html(content.type === 'screen' ? node.data.title : content.text)}">`}</label>${content.type === 'card' ? '<small>Primera línea: título. Las demás: contenido.</small>' : ''}`;
      if (content.type === 'screen')
        holder.insertAdjacentHTML(
          'afterbegin',
          '<div class="wireframe-screen-presets" role="group" aria-label="Tamaño de pantalla"><button type="button" data-screen-size="390,844" aria-label="Teléfono">Teléfono<small>390 × 844</small></button><button type="button" data-screen-size="768,1024" aria-label="Tablet">Tablet<small>768 × 1024</small></button><button type="button" data-screen-size="1280,800" aria-label="Escritorio">Escritorio<small>1280 × 800</small></button></div><small>También podés darle cualquier proporción arrastrando sus esquinas.</small>',
        );
    }
    const settings = form.querySelector<HTMLElement>('.wireframe-settings')!;
    const appearance = wireframeAppearance(content);
    settings.innerHTML = `${content.type !== 'screen' && content.type !== 'table' ? `<label class="wireframe-placeholder-control"><input type="checkbox" data-wireframe-placeholder ${content.placeholder ? 'checked' : ''}>Texto simulado</label>` : ''}<fieldset class="wireframe-dimensions"><legend>Tamaño · px</legend><label>Ancho<input type="number" data-size="width" min="4" max="10000" step="any" value="${node.width}" aria-label="Ancho de la pieza"></label><label>Alto<input type="number" data-size="height" min="4" max="10000" step="any" value="${node.height}" aria-label="Alto de la pieza"></label></fieldset><div class="wireframe-appearance"><label>Radio de esquina · px<input type="number" data-radius min="0" max="10000" step="any" value="${appearance.radius}" aria-label="Radio de esquina"></label><div class="wireframe-color-tools">${(['fill', 'stroke', 'text'] as const).map((field) => `<button type="button" data-wireframe-color="${field}" aria-label="${field === 'fill' ? 'Relleno de la pieza' : field === 'stroke' ? 'Borde de la pieza' : 'Color del texto'}"><span style="background:${appearance[field]}" aria-hidden="true"></span>${field === 'fill' ? 'Relleno' : field === 'stroke' ? 'Borde' : 'Texto'}</button>`).join('')}</div><div class="wireframe-color-panel" hidden></div></div>`;
    if (content.piece && content.type !== 'text')
      settings.querySelector('.wireframe-placeholder-control')?.remove();
    if (content.piece && content.type === 'text')
      settings.insertAdjacentHTML(
        'afterbegin',
        `<fieldset class="wireframe-dimensions"><legend>Tipografía</legend><label>Tamaño<input data-piece-font type="number" min="6" max="200" value="${parseFloat(content.piece.style.fontSize ?? '13')}" aria-label="Tamaño del texto"></label><label>Peso<select data-piece-weight aria-label="Peso del texto">${['400', '500', '600', '700'].map((weight) => `<option value="${weight}" ${content.piece!.style.fontWeight === weight ? 'selected' : ''}>${weight}</option>`).join('')}</select></label></fieldset>`,
      );
    fitText();
    position();
  };
  form.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement))
      return;
    if (!event.target.closest('.wireframe-editor-fields')) return;
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
    } else {
      if (event.target.dataset.itemIndex !== undefined) {
        const lines = content.text.split('\n');
        lines[Number(event.target.dataset.itemIndex)] = event.target.value;
        content.text = lines.join('\n');
      } else content.text = event.target.value;
      content.placeholder = false;
      const toggle = form.querySelector<HTMLInputElement>('[data-wireframe-placeholder]');
      if (toggle) toggle.checked = false;
    }
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
  form.addEventListener('change', (event) => {
    const field = event.target;
    const node = current();
    if (
      !(field instanceof HTMLInputElement || field instanceof HTMLSelectElement) ||
      node?.data.kind !== 'wireframe'
    )
      return;
    if (
      node.data.content.piece &&
      field.matches('[data-piece-symbol],[data-piece-font],[data-piece-weight]')
    ) {
      if (!field.reportValidity()) return;
      const content: WireframeContent = structuredClone(node.data.content);
      if (field.matches('[data-piece-symbol]')) content.piece!.symbol = field.value;
      else if (field.matches('[data-piece-weight]')) content.piece!.style.fontWeight = field.value;
      else {
        content.piece!.style.fontSize = field.value + 'px';
        content.piece!.style.lineHeight = Number(field.value) * 1.45 + 'px';
      }
      save(content);
      return;
    }
    if (!(field instanceof HTMLInputElement)) return;
    if (field.hasAttribute('data-wireframe-placeholder')) {
      save({ ...node.data.content, placeholder: field.checked });
    } else if (field.dataset.size || field.hasAttribute('data-radius')) {
      if (!field.reportValidity() || !field.value.trim()) return;
      if (field.hasAttribute('data-radius')) {
        save({
          ...node.data.content,
          appearance: { ...wireframeAppearance(node.data.content), radius: field.valueAsNumber },
        });
      } else {
        ctx.act(
          {
            type: 'node.resize',
            world: ctx.world().id,
            id,
            rect: {
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height,
              [field.dataset.size!]: field.valueAsNumber,
            },
          },
          'cambiar tamaño del bosquejo',
          'C08-WIRE-01',
        );
      }
    }
  });
  form.addEventListener('focusin', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.dataset.cellRow === undefined)
      return;
    activeRow = Number(event.target.dataset.cellRow);
    activeColumn = Number(event.target.dataset.cellColumn);
  });
  form.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const page = target?.closest<HTMLElement>('[data-item-page]');
    if (page) {
      itemPage = Number(page.dataset.itemPage);
      fields();
      form.querySelector<HTMLElement>('[data-item-index]')?.focus({ preventScroll: true });
      return;
    }
    if (target?.closest('[data-wireframe-properties]')) {
      form.classList.remove('wireframe-inline-editor');
      form.style.width = 'min(320px, calc(100vw - 24px))';
      position();
      return;
    }
    const color = target?.closest<HTMLElement>('[data-wireframe-color]');
    if (color) {
      const node = current();
      if (node?.data.kind !== 'wireframe') return;
      const key = color.dataset.wireframeColor as 'fill' | 'stroke' | 'text';
      const previous = form.querySelector<HTMLElement>('.wireframe-color-panel')!;
      const panel = document.createElement('div');
      panel.className = 'wireframe-color-panel';
      previous.replaceWith(panel);
      panel.setAttribute('aria-label', color.getAttribute('aria-label')!);
      panel.setAttribute('role', 'group');
      bindColorPicker(panel, wireframeAppearance(node.data.content)[key], (value) => {
        const currentNode = current();
        if (currentNode?.data.kind !== 'wireframe') return;
        save({
          ...currentNode.data.content,
          appearance: { ...wireframeAppearance(currentNode.data.content), [key]: value },
        });
        color.querySelector<HTMLElement>('span')!.style.background = value;
      });
      panel.scrollIntoView({ block: 'nearest' });
      return;
    }
    const item = target?.closest<HTMLElement>('[data-item-add],[data-item-remove]');
    if (item) {
      const node = current();
      if (node?.data.kind !== 'wireframe' || node.data.content.type === 'table') return;
      const lines = node.data.content.text.split('\n');
      if (item.hasAttribute('data-item-add')) {
        lines.push('');
        itemPage = Math.floor((lines.length - 1) / 20);
      } else if (lines.length > 1) lines.splice(Number(item.dataset.itemRemove), 1);
      if (save({ ...node.data.content, text: lines.join('\n') })) {
        fields();
        const index = Math.min(
          Number(item.dataset.itemRemove ?? lines.length - 1),
          lines.length - 1,
        );
        form.querySelector<HTMLInputElement>(`[data-item-index="${index}"]`)?.focus();
      }
      return;
    }
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
    if (save({ ...node.data.content, cells })) {
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
    if (save({ ...node.data.content, cells })) {
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
    if (event.target instanceof Element && event.target.closest('.wireframe-color-panel')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        form.querySelector<HTMLElement>('.wireframe-color-panel')!.hidden = true;
        form.querySelector<HTMLElement>('[data-wireframe-color]')?.focus();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (
      event.key === 'Enter' &&
      event.target instanceof HTMLInputElement &&
      (event.target.dataset.size ||
        event.target.hasAttribute('data-radius') ||
        event.target.hasAttribute('data-piece-font'))
    ) {
      event.preventDefault();
      event.target.dispatchEvent(new Event('change', { bubbles: true }));
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
  return `<section class="canvas-context-form wireframe-editor" role="dialog" aria-label="Editar ${wireframeNames[content.type].toLocaleLowerCase()}"><div class="wireframe-editor-head"><strong>${wireframeNames[content.type]}</strong><button type="button" class="icon-button" data-action="context-close" aria-label="Cerrar edición de bosquejo">${icon('close', 16)}</button></div><div class="wireframe-editor-fields"></div><button type="button" class="wireframe-inline-properties" data-wireframe-properties>Apariencia y tamaño</button><div class="wireframe-settings"></div><small>Guardado automático en Canvas</small></section>`;
}
