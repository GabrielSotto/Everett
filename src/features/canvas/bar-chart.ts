import { barScale, type BarChart, type BarDatum } from '../../domain/bar-chart';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';

const numbers = new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 21 });
const scientificTicks = new Intl.NumberFormat('es-AR', {
  notation: 'scientific',
  maximumSignificantDigits: 3,
});
function numberLabel(value: number) {
  return Math.abs(value) >= 1e9 || (value !== 0 && Math.abs(value) < 0.001)
    ? value.toExponential().replace('.', ',')
    : numbers.format(value);
}
/** El lienzo y la miniatura consultan la misma serie y la misma escala lineal. */
export function barChartSvg(chart: BarChart) {
  const { min, max, zero, position } = barScale(chart.rows);
  const start = 188,
    span = 335,
    left = start + zero * span;
  const top = 38,
    step = 48,
    end = top + step * chart.rows.length;
  const text = (x: number, y: number, value: string, anchor = 'start', size = 18) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="currentColor">${html(value)}</text>`;
  const marks = chart.rows.map((row, i) => {
    const y = top + i * step;
    const label = Array.from(row.label);
    const visible = label.length > 16 ? label.slice(0, 15).join('') + '…' : row.label;
    const target = row.value === null ? left : start + span * position(row.value);
    const mark =
      row.value === null
        ? ''
        : `<rect data-bar-mark x="${Math.min(left, target)}" y="${y + 6}" width="${Math.abs(left - target)}" height="22" rx="2" fill="#accce6"/>`;
    const value = row.value === null ? 'Sin dato' : numberLabel(row.value);
    const valueSize = Math.min(18, 178 / value.length);
    return `<g data-bar-row><title>${html(row.label)} · ${html(value)}</title>${text(0, y + 24, visible)}${mark}${text(642, y + 24, value, 'end', valueSize)}</g>`;
  });
  const interiorZero = min < 0 && max > 0 && zero * span > 48 && (1 - zero) * span > 48;
  const ticks = [...new Set(interiorZero ? [min, 0, max] : [min, max])].map((v) => {
    const label = numberLabel(v);
    return text(
      start + position(v) * span,
      end + 6,
      label.length > 10 ? scientificTicks.format(v) : label,
      'middle',
      14,
    );
  });
  return `<svg class="bar-plot" viewBox="0 0 650 ${end + 15}" role="img" aria-label="${html(chart.title)}" style="color:#ecf0ee"><title>${html(chart.title)}</title><desc>${html(chart.rows.map((row) => row.label + ' · ' + (row.value === null ? 'Sin dato' : numberLabel(row.value))).join(', '))}</desc>${text(0, 22, chart.title.length > 56 ? chart.title.slice(0, 55) + '…' : chart.title)}<line x1="${left}" x2="${left}" y1="${top}" y2="${end - 13}" stroke="#82929c"/>${marks.join('')}${ticks.join('')}</svg>`;
}
export function barEditor(
  chart: BarChart,
  save: (rows: BarDatum[]) => void,
  close: () => void,
  fit: () => void,
) {
  const form = document.createElement('form');
  form.className = 'canvas-context-form bar-editor';
  form.setAttribute('role', 'dialog');
  form.setAttribute('aria-label', 'Editar datos de barras');
  form.innerHTML = `<header><strong>Datos de barras</strong><button type="button" class="icon-button" aria-label="Cerrar">${icon('close', 16)}</button></header>
    <div class="bar-fields"><div class="bar-head" aria-hidden="true"><span>Categoría</span><span>Valor</span></div><div class="bar-rows"></div></div>
    <small>Dejá el valor vacío para indicar que falta el dato.</small>
    <footer><button type="button" data-add>Agregar fila</button><button type="submit">Aplicar</button></footer>`;
  const list = form.querySelector<HTMLElement>('.bar-rows')!;
  function syncRemove() {
    list
      .querySelectorAll<HTMLButtonElement>('button')
      .forEach((b) => (b.disabled = list.children.length === 1));
  }
  function add(row: BarDatum) {
    const item = document.createElement('div');
    item.className = 'bar-input-row';
    item.innerHTML = `<input aria-label="Categoría" required><input aria-label="Valor" type="number" step="any"><button type="button" class="icon-button" aria-label="Quitar fila">${icon('close', 14)}</button>`;
    const [label, value] = Array.from(item.querySelectorAll('input')) as [
      HTMLInputElement,
      HTMLInputElement,
    ];
    label.value = row.label;
    value.value = row.value === null ? '' : String(row.value);
    label.oninput = () => label.setCustomValidity('');
    item.querySelector('button')!.onclick = () => {
      const next = item.nextElementSibling ?? item.previousElementSibling;
      item.remove();
      syncRemove();
      next?.querySelector('input')?.focus();
      fit();
    };
    list.append(item);
    return label;
  }
  chart.rows.forEach(add);
  syncRemove();
  form.querySelector<HTMLButtonElement>('[data-add]')!.onclick = () => {
    const input = add({ label: '', value: null });
    syncRemove();
    fit();
    input.focus();
  };
  form.querySelector<HTMLButtonElement>('header button')!.onclick = close;
  form.onsubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rows: BarDatum[] = [];
    for (const item of list.children) {
      const [label, value] = Array.from(item.querySelectorAll('input')) as [
        HTMLInputElement,
        HTMLInputElement,
      ];
      if (!label.value.trim()) {
        label.setCustomValidity('Escribí una categoría.');
        label.reportValidity();
        return;
      }
      rows.push({
        label: label.value.trim(),
        value: value.value === '' ? null : value.valueAsNumber,
      });
    }
    save(rows);
  };
  return form;
}
