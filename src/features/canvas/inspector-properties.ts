import type { ComponentElement } from '../../domain/component-tree';
import type { DeepReadonly } from '../../domain/readonly';
import type { Point } from '../../domain/model';
import { layerArrangement } from '../../domain/component-arrangement';
import { arrangementNames } from '../../ui/canvas-arrangement';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';

type Part = DeepReadonly<ComponentElement>;

export function option(value: string, label: string, current: string) {
  return `<option value="${html(value)}" ${value === current ? 'selected' : ''}>${html(label)}</option>`;
}

const rounded = (n: number) => Math.round(n * 100) / 100;

export function alignmentProperties(root: Part, rows: Set<string>) {
  const scope = layerArrangement(root, rows);
  if (!scope?.actions.length) return '';
  const title = scope.reference ? 'Alinear al contenedor' : 'Alinear selección';
  const buttons = scope.actions
    .map(
      (action) =>
        `<button type="button" data-component-action="arrange" data-arrange="${action}" aria-label="${arrangementNames[action]}" title="${arrangementNames[action]}">${icon('arrange-' + action, 16)}</button>`,
    )
    .join('');
  return `<section class="property-section"><h4>${title}</h4><div class="property-alignment" role="group" aria-label="${title}">${buttons}</div></section>`;
}

export function geometryProperties(part: Part, parent: Part | undefined, origin: Point) {
  const coordinate = (axis: 'x' | 'y') =>
    `<label class="property-coordinate"><span>${axis.toUpperCase()}</span><input aria-label="Posición ${axis.toUpperCase()}" data-position="${axis}" type="number" step="any" value="${rounded(part[axis] + (parent ? 0 : origin[axis]))}"></label>`;
  const size = (axis: 'width' | 'height', label: string) => {
    const mode = part[`${axis}Mode`];
    const modes =
      option('fixed', 'Fijo', mode) +
      (!part.material ? option('hug', 'Contenido', mode) : '') +
      (parent ? option('fill', 'Rellenar', mode) : '');
    return `<div><label>${label}<input data-prop="${axis}" type="number" step="any" min="4" max="10000" value="${rounded(part[axis])}" aria-label="${label}" ${mode !== 'fixed' || part.background ? 'disabled' : ''}></label>${!part.background ? `<select data-prop="${axis}Mode" aria-label="Comportamiento del ${label.toLowerCase()}">${modes}</select>` : ''}</div>`;
  };
  return `${!parent || (parent.layout.direction === 'free' && !part.background) ? `<section class="property-section"><h4>Posición</h4><div class="component-sizes">${coordinate('x')}${coordinate('y')}</div></section>` : ''}
    <section class="property-section"><h4>Tamaño</h4><div class="component-sizes property-dimensions">${size('width', 'Ancho')}${size('height', 'Alto')}</div></section>`;
}

export function layoutProperties(part: Part) {
  if (part.material) return '';
  const { layout } = part;
  const auto = layout.direction !== 'free';
  const row = layout.direction === 'row';
  const axisOptions = (current: string, start: string, end: string) =>
    option('start', start, current) +
    option('center', 'Centro', current) +
    option('end', end, current);
  const main = layout.justify ?? 'start';
  const padding = `<label>Margen interno<input data-layout="padding" type="number" min="0" max="10000" value="${layout.padding}"></label>`;
  const edges = ['Superior', 'Derecho', 'Inferior', 'Izquierdo'];
  return `<section class="property-section"><h4>Disposición interna</h4>
    <label>Distribución<select data-layout="direction" aria-label="Distribución">${option('free', 'Libre', layout.direction)}${option('row', 'Fila', layout.direction)}${option('column', 'Columna', layout.direction)}</select></label>
    ${
      auto
        ? `<div class="component-sizes"><label>${row ? 'Horizontal' : 'Vertical'}<select data-layout="justify">${axisOptions(main, row ? 'Izquierda' : 'Arriba', row ? 'Derecha' : 'Abajo')}${option('between', 'Entre extremos', main)}</select></label>
    <label>${row ? 'Vertical' : 'Horizontal'}<select data-layout="align">${axisOptions(layout.align, row ? 'Arriba' : 'Izquierda', row ? 'Abajo' : 'Derecha')}${option('stretch', 'Estirar', layout.align)}</select></label></div>
    <div class="component-sizes"><label>Espacio<input data-layout="gap" type="number" min="0" max="10000" value="${layout.gap}"></label>${padding}</div>`
        : part.widthMode === 'hug' ||
            part.heightMode === 'hug' ||
            part.children.some((child) => child.widthMode === 'fill' || child.heightMode === 'fill')
          ? padding
          : ''
    }
    ${auto || layout.insets ? `<details><summary>Márgenes por lado</summary><div class="component-sizes">${edges.map((name, i) => `<label>${name}<input type="number" min="0" max="10000" data-layout-edge="${i}" value="${rounded(layout.insets?.[i] ?? layout.padding)}"></label>`).join('')}</div></details>` : ''}
    ${part.frame ? `<label class="frame-clip-option"><input type="checkbox" data-frame-clip ${part.clipContent ? 'checked' : ''}>Recortar contenido</label>` : ''}</section>`;
}
