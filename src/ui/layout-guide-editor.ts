import type { Context } from '../app/context';
import {
  layoutFrame,
  layoutGuideError,
  type LayoutGuides,
  type LayoutTarget,
} from '../domain/layout-guides';
import { bindDismiss } from './popover';
import { icon } from './icons';

let closeCurrent: (() => void) | null = null;
export function openLayoutGuideEditor(
  ctx: Context,
  target: LayoutTarget,
  anchor: HTMLElement,
  parent: AbortSignal,
): void {
  closeCurrent?.();
  const world = ctx.world().id,
    frame = layoutFrame(ctx.world(), target);
  if (!frame) return;
  const abort = new AbortController(),
    panel = document.createElement('form');
  panel.className = 'layout-guide-editor';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Retícula del marco');
  const close = (focus = false): void => {
    panel.remove();
    abort.abort();
    if (closeCurrent === close) closeCurrent = null;
    if (focus) document.querySelector<HTMLElement>('[data-action=canvas-view]')?.focus();
  };
  closeCurrent = close;
  parent.addEventListener('abort', () => close(), { once: true, signal: abort.signal });
  const initial: LayoutGuides = structuredClone(
    frame.guides.columns || frame.guides.rows
      ? frame.guides
      : {
          columns: {
            count: 4,
            margin: Math.min(16, frame.width / 16),
            gap: Math.min(16, frame.width / 16),
          },
        },
  );
  const section = (axis: 'columns' | 'rows', name: string): string => {
    const tracks = initial[axis] ?? { count: 4, margin: 16, gap: 16 };
    return `<section data-tracks="${axis}"><div class="layout-track-heading"><strong>${name}</strong><button type="button" class="settings-switch" role="switch" aria-label="${name}" aria-checked="${!!initial[axis]}"><span></span></button></div><fieldset ${initial[axis] ? '' : 'disabled'}><div class="layout-track-fields">${(
      [
        ['count', 'Cantidad', 1, 64],
        ['margin', 'Margen', 0, 10000],
        ['gap', 'Separación', 0, 10000],
      ] as const
    )
      .map(
        ([key, label, min, max]) =>
          `<label>${label}<input type="number" name="${axis}-${key}" aria-label="${label} de ${name.toLowerCase()}" min="${min}" max="${max}" step="${key === 'count' ? '1' : 'any'}" value="${tracks[key]}" required></label>`,
      )
      .join(
        '',
      )}</div><div class="layout-track-presets" role="group" aria-label="Valores frecuentes de ${name.toLowerCase()}">${[4, 8, 12].map((count) => `<button type="button" data-count="${count}">${count}</button>`).join('')}</div></fieldset></section>`;
  };
  panel.innerHTML = `<header><strong>Retícula del marco</strong><button type="button" data-close aria-label="Cerrar retícula">${icon('close', 16)}</button></header><small>${Math.round(frame.width)} × ${Math.round(frame.height)}</small>${section('columns', 'Columnas')}${section('rows', 'Filas')}<p class="layout-guide-error" role="alert" hidden></p><footer><button type="button" data-remove ${frame.guides.columns || frame.guides.rows ? '' : 'disabled'}>Quitar</button><button type="submit">Aplicar</button></footer>`;
  document.body.append(panel);
  const initialError =
    frame.guides.columns || frame.guides.rows ? layoutGuideError(frame, frame.guides) : null;
  const alert = panel.querySelector<HTMLElement>('[role=alert]')!;
  alert.hidden = !initialError;
  alert.textContent = initialError;
  const position = (): void => {
    const rect = anchor.isConnected
      ? anchor.getBoundingClientRect()
      : document.querySelector<HTMLElement>('[data-action=canvas-view]')!.getBoundingClientRect();
    panel.style.left = Math.max(8, Math.min(innerWidth - panel.offsetWidth - 8, rect.left)) + 'px';
    panel.style.top =
      Math.max(8, Math.min(rect.bottom + 8, innerHeight - panel.offsetHeight - 8)) + 'px';
    panel.style.maxHeight = innerHeight - 16 + 'px';
  };
  position();
  window.addEventListener('resize', position, { signal: abort.signal });
  bindDismiss(
    abort.signal,
    () => panel.isConnected,
    (source) => close(source === 'keyboard'),
    '.layout-guide-editor,[data-action=layout-guides-edit]',
  );
  panel.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') event.stopPropagation();
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
        event.preventDefault();
        panel.requestSubmit();
      }
    },
    { signal: abort.signal },
  );
  panel.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.hasAttribute('data-close')) close(true);
      else if (button.hasAttribute('data-remove')) {
        if (
          ctx.act(
            { type: 'layout-guides.set', world, target, guides: null },
            'quitar retícula',
            'C08-LAYOUT-01',
          )
        )
          close(true);
      } else if (button.role === 'switch') {
        const enabled = button.getAttribute('aria-checked') !== 'true';
        button.setAttribute('aria-checked', String(enabled));
        button.closest('section')!.querySelector('fieldset')!.disabled = !enabled;
      } else if (button.dataset.count) {
        button.closest('section')!.querySelector<HTMLInputElement>('input')!.value =
          button.dataset.count;
      }
    },
    { signal: abort.signal },
  );
  panel.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      const guides: LayoutGuides = {};
      for (const axis of ['columns', 'rows'] as const) {
        if (
          panel
            .querySelector(`[data-tracks=${axis}] [role=switch]`)!
            .getAttribute('aria-checked') !== 'true'
        )
          continue;
        const value = (key: string) =>
          panel.querySelector<HTMLInputElement>(`[name=${axis}-${key}]`)!.valueAsNumber;
        guides[axis] = { count: value('count'), margin: value('margin'), gap: value('gap') };
      }
      const current = ctx.world().id === world ? layoutFrame(ctx.world(), target) : null;
      const configured = !!(guides.columns || guides.rows);
      const error = current
        ? configured
          ? layoutGuideError(current, guides)
          : null
        : 'El marco ya no está disponible.';
      const message = panel.querySelector<HTMLElement>('[role=alert]')!;
      message.hidden = !error;
      message.textContent = error;
      if (error) return;
      if (
        ctx.act(
          { type: 'layout-guides.set', world, target, guides: configured ? guides : null },
          'configurar retícula',
          'C08-LAYOUT-01',
        )
      )
        close(true);
    },
    { signal: abort.signal },
  );
  panel.querySelector<HTMLInputElement>('fieldset:not(:disabled) input')?.focus();
}
