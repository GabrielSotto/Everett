import { alpha, rgba, toHsv, fromHsv } from './color';

/** Selector visual nativo DOM, sin encadenar otro diálogo de color del navegador. */
export function bindColorPicker(
  panel: HTMLElement,
  initial: string,
  changed: (color: string) => void,
): void {
  let hsv = toHsv(initial),
    opacity = alpha(initial),
    pointer: number | null = null;
  panel.innerHTML = `<div class="color-area" data-action="color-pick" tabindex="0" role="slider" aria-label="Saturación y brillo" aria-roledescription="Selector de color bidimensional" aria-valuemin="0" aria-valuemax="100" aria-describedby="color-keys"><span class="color-cursor"></span></div><span id="color-keys" class="sr-only">Flechas izquierda y derecha: saturación. Arriba y abajo: brillo. Shift: pasos de diez.</span><label class="sr-only" for="picker-hue">Tono</label><input id="picker-hue" class="color-hue" type="range" min="0" max="360" step="1" aria-label="Tono"><label class="color-alpha-label" for="picker-alpha">Opacidad <span><input id="picker-opacity" type="number" min="0" max="100" aria-label="Porcentaje de opacidad"> %</span></label><input id="picker-alpha" class="color-alpha" type="range" min="0" max="100" aria-label="Opacidad"><div class="color-values"><span class="color-swatch" aria-hidden="true"></span><label for="picker-rgb">HEX</label><input id="picker-rgb" type="text" spellcheck="false" maxlength="7" aria-label="Color hexadecimal"></div><p class="color-error" role="status"></p>`;
  const area = panel.querySelector<HTMLElement>('.color-area')!,
    cursor = area.querySelector<HTMLElement>('.color-cursor')!;
  const hue = panel.querySelector<HTMLInputElement>('#picker-hue')!,
    hex = panel.querySelector<HTMLInputElement>('#picker-rgb')!,
    range = panel.querySelector<HTMLInputElement>('#picker-alpha')!,
    number = panel.querySelector<HTMLInputElement>('#picker-opacity')!;
  const paint = (notify = true): void => {
    const color = fromHsv(hsv),
      value = rgba(color, opacity);
    area.style.setProperty('--hue-color', fromHsv({ h: hsv.h, s: 100, v: 100 }));
    cursor.style.left = hsv.s + '%';
    cursor.style.top = 100 - hsv.v + '%';
    cursor.style.background = color;
    area.setAttribute('aria-valuenow', String(Math.round(hsv.s)));
    area.setAttribute(
      'aria-valuetext',
      `Saturación ${Math.round(hsv.s)} %, brillo ${Math.round(hsv.v)} %`,
    );
    hue.value = String(hsv.h);
    range.value = number.value = String(opacity);
    hex.value = color.toUpperCase();
    hex.removeAttribute('aria-invalid');
    panel.style.setProperty('--picker-color', color);
    panel.style.setProperty('--picker-value', value);
    panel.querySelector('.color-error')!.textContent = '';
    if (notify) changed(value);
  };
  const sample = (event: PointerEvent): void => {
    const bounds = area.getBoundingClientRect();
    hsv.s = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    hsv.v = Math.max(0, Math.min(100, 100 - ((event.clientY - bounds.top) / bounds.height) * 100));
    paint();
  };
  area.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    pointer = event.pointerId;
    area.focus({ preventScroll: true });
    area.setPointerCapture(event.pointerId);
    sample(event);
  });
  area.addEventListener('pointermove', (event) => {
    if (pointer === event.pointerId) sample(event);
  });
  const release = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    if (area.hasPointerCapture(event.pointerId)) area.releasePointerCapture(event.pointerId);
  };
  area.addEventListener('pointerup', release);
  area.addEventListener('pointercancel', release);
  area.addEventListener('lostpointercapture', () => {
    pointer = null;
  });
  area.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
      return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft') hsv.s -= step;
    else if (event.key === 'ArrowRight') hsv.s += step;
    else if (event.key === 'ArrowUp') hsv.v += step;
    else if (event.key === 'ArrowDown') hsv.v -= step;
    else hsv.s = event.key === 'Home' ? 0 : 100;
    hsv.s = Math.max(0, Math.min(100, hsv.s));
    hsv.v = Math.max(0, Math.min(100, hsv.v));
    paint();
  });
  panel.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target === hue) {
      hsv.h = Number(hue.value);
      paint();
    }
    if (event.target === range) {
      opacity = Number(range.value);
      paint();
    }
  });
  panel.addEventListener('change', (event) => {
    if (event.target === hex) {
      const value = /^#?[\da-f]{6}$/i.test(hex.value) ? '#' + hex.value.replace('#', '') : null;
      if (!value) {
        hex.setAttribute('aria-invalid', 'true');
        panel.querySelector('.color-error')!.textContent = 'Ingresá seis dígitos hexadecimales.';
        return;
      }
      const next = toHsv(value);
      if (next.s === 0) next.h = hsv.h;
      hsv = next;
      paint();
    } else if (event.target === number) {
      const value = Number(number.value);
      if (!number.value || !Number.isFinite(value) || value < 0 || value > 100) {
        number.value = String(opacity);
        return;
      }
      opacity = Math.round(value);
      paint();
    }
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.target === hex || event.target === number)) {
      event.preventDefault();
      event.target.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  paint(false);
  // El primer foco permite operar la misma área visual con flechas.
  area.focus({ preventScroll: true });
}
