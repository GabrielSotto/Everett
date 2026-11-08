import { GoogleFontError, loadGoogleFont } from '../../platform/google-fonts';
import type { NotePart } from '../../domain/note-fonts';
import { icon } from '../../ui/icons';

interface FontLoad {
  key: string;
  family: string;
  state: 'loading' | 'ready' | 'error';
  message?: string;
  load: (retry?: boolean) => void;
}
const pending = new WeakMap<HTMLElement, Map<NotePart, FontLoad>>();

export function restoreNoteFonts(root: HTMLElement, onReady: () => void = () => {}): void {
  for (const paper of root.querySelectorAll<HTMLElement>('.note-paper,.material.note')) {
    const jobs = pending.get(paper) ?? new Map<NotePart, FontLoad>();
    pending.set(paper, jobs);
    const refresh = () => {
      if (!paper.isConnected) return;
      const active = [...jobs.values()];
      for (const part of ['title', 'body'] as const) {
        const state = jobs.get(part)?.state;
        if (state) paper.dataset[`${part}FontState`] = state;
        else delete paper.dataset[`${part}FontState`];
      }
      if (active.length)
        paper.dataset.fontState = active.some((job) => job.state === 'error')
          ? 'error'
          : active.some((job) => job.state === 'loading')
            ? 'loading'
            : 'ready';
      else delete paper.dataset.fontState;
      const failed = active.filter((job) => job.state === 'error');
      let button = paper.querySelector<HTMLButtonElement>('.note-font-warning');
      if (!failed.length) {
        button?.remove();
        return;
      }
      const names = [...new Set(failed.map((job) => job.family))];
      // La otra fuente puede terminar mientras se usa el reintento con teclado.
      // Actualizar el aviso existente conserva su foco y su posición.
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'note-font-warning';
        button.innerHTML = icon('restore', 16);
        button.addEventListener('pointerdown', (event) => event.stopPropagation());
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          for (const job of jobs.values()) if (job.state === 'error') job.load(true);
        });
        button.addEventListener('dblclick', (event) => event.stopPropagation());
        paper.append(button);
      }
      button.setAttribute(
        'aria-label',
        `Reintentar ${names.length === 1 ? 'fuente' : 'fuentes'} ${names.join(', ')}`,
      );
      button.title =
        failed.map((job) => `${job.family}: ${job.message}`).join(' ') +
        ' Se muestra una fuente de reemplazo. Clic para reintentar.';
    };
    for (const part of ['title', 'body'] as const) {
      const prefix = part === 'title' ? 'data-note-title' : 'data-note';
      const family = paper.getAttribute(`${prefix}-font`);
      if (!family) {
        jobs.delete(part);
        continue;
      }
      const weight = Number(paper.getAttribute(`${prefix}-weight`) ?? 400);
      const italic = paper.getAttribute(`${prefix}-italic`) === 'true';
      const key = `${family}:${weight}:${italic}`;
      if (jobs.get(part)?.key === key) continue;
      const job: FontLoad = {
        key,
        family,
        state: 'loading',
        load(retry = false) {
          job.state = 'loading';
          refresh();
          const current = () => paper.isConnected && jobs.get(part) === job;
          void loadGoogleFont(family, retry, weight, italic).then(
            () => {
              if (!current()) return;
              job.state = 'ready';
              refresh();
              onReady();
            },
            (error: unknown) => {
              if (!current()) return;
              job.state = 'error';
              job.message =
                error instanceof GoogleFontError ? error.message : 'Fuente no disponible.';
              refresh();
            },
          );
        },
      };
      jobs.set(part, job);
      job.load();
    }
    refresh();
  }
}
