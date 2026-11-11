import { icon } from '../../ui/icons';
import {
  drawingColors,
  illustrationPreview,
  illustrationFromAsset,
  type Illustration,
} from './illustrations';

export function illustrationColors(
  asset: string,
  apply: (source: Illustration) => void,
  fit: () => void,
) {
  const panel = document.createElement('section');
  panel.tabIndex = -1;
  panel.className = 'canvas-context-form illustration-colors';
  panel.role = 'dialog';
  panel.ariaLabel = 'Colores de la ilustración';
  panel.innerHTML =
    '<header><strong>Colores de la ilustración</strong><button type="button" class="icon-button" data-action="context-close" aria-label="Cerrar">' +
    icon('close', 14) +
    '</button></header><img alt="Vista previa"><div class="ink-swatches" role="group" aria-label="Colores del dibujo"></div><footer><button type="button" data-reset>Restablecer</button><button type="button" data-apply disabled>Aplicar</button></footer><p role="status"></p>';
  const status = panel.querySelector<HTMLElement>('[role=status]')!;
  async function load() {
    try {
      const source = await illustrationFromAsset(asset);
      if (!panel.isConnected) return;
      if (!source) throw Error('No se encontró este dibujo en la biblioteca.');
      const colors = new Map(source.colors);
      const draft = { ...source, colors };
      const swatches = panel.querySelector('.ink-swatches')!;
      const preview = panel.querySelector('img')!;
      const applyButton = panel.querySelector<HTMLButtonElement>('[data-apply]')!;
      const reset = panel.querySelector<HTMLButtonElement>('[data-reset]')!;
      function paint() {
        preview.src = illustrationPreview(draft);
        let changed = false;
        for (const field of swatches.querySelectorAll('input')) {
          const original = field.dataset.original!;
          field.value = colors.get(original) ?? original;
          if (field.value !== (source!.colors?.get(original) ?? original)) changed = true;
        }
        applyButton.disabled = !changed;
        reset.disabled = colors.size === 0;
      }
      for (const original of drawingColors(source)) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'color';
        input.dataset.original = original;
        label.title = input.ariaLabel = 'Cambiar color ' + original;
        input.oninput = () => {
          if (input.value === original) colors.delete(original);
          else colors.set(original, input.value);
          paint();
        };
        label.append(input);
        swatches.append(label);
      }
      paint();
      fit();
      reset.onclick = () => {
        colors.clear();
        paint();
      };
      applyButton.onclick = () => apply(draft);
    } catch {
      status.textContent = 'No se pudieron abrir los colores del dibujo. ';
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Reintentar';
      b.onclick = () => {
        status.textContent = '';
        void load();
      };
      status.append(b);
    }
  }
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') e.stopPropagation();
  });
  void load();
  return panel;
}
