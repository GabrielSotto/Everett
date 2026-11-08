import { GoogleFontError, loadGoogleFont } from '../../platform/google-fonts';
import { icon } from '../../ui/icons';

export function restoreNoteFonts(root: HTMLElement, onReady: () => void = () => {}): void {
  for (const paper of root.querySelectorAll<HTMLElement>('[data-note-font]')) {
    const family = paper.dataset.noteFont!;
    const load = (retry = false) => {
      paper.dataset.fontState = 'loading';
      paper.querySelector('.note-font-warning')?.remove();
      void loadGoogleFont(family, retry).then(
        () => {
          if (!paper.isConnected || paper.dataset.noteFont !== family) return;
          paper.dataset.fontState = 'ready';
          onReady();
        },
        (error: unknown) => {
          if (!paper.isConnected || paper.dataset.noteFont !== family) return;
          paper.dataset.fontState = 'error';
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'note-font-warning';
          button.setAttribute('aria-label', `Reintentar fuente ${family}`);
          button.title = `${error instanceof GoogleFontError ? error.message : 'Fuente no disponible.'} Se muestra una fuente de reemplazo. Clic para reintentar.`;
          button.innerHTML = icon('restore', 16);
          button.addEventListener('pointerdown', (event) => event.stopPropagation());
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            load(true);
          });
          button.addEventListener('dblclick', (event) => event.stopPropagation());
          paper.append(button);
        },
      );
    };
    load();
  }
}
