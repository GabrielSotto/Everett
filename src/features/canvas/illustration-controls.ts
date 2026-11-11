import type { Point } from '../../domain/model';
import { icon } from '../../ui/icons';
import { searchKey } from '../../ui/picker-search';

/** El puntero mueve la paleta en coordenadas de pantalla; la cámara no participa. */
export function bindPaletteMove(
  panel: HTMLElement,
  grip: HTMLButtonElement,
  move: (point: Point) => void,
) {
  let drag: { id: number; dx: number; dy: number } | undefined;
  grip.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = {
      id: event.pointerId,
      dx: event.clientX - panel.offsetLeft,
      dy: event.clientY - panel.offsetTop,
    };
    grip.setPointerCapture(event.pointerId);
    grip.classList.add('moving');
  });
  grip.addEventListener('pointermove', (event) => {
    if (drag?.id === event.pointerId)
      move({ x: event.clientX - drag.dx, y: event.clientY - drag.dy });
  });
  grip.addEventListener('lostpointercapture', () => {
    drag = undefined;
    grip.classList.remove('moving');
  });
  grip.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 32 : 8;
    const delta: Record<string, Point> = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    };
    const d = delta[event.key];
    if (!d) return;
    event.preventDefault();
    event.stopPropagation();
    move({ x: panel.offsetLeft + d.x, y: panel.offsetTop + d.y });
  });
}

export function categoryMenu(panel: HTMLElement, choose: (category: string) => void) {
  const header = panel.querySelector('header')!;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'icon-button illustration-category';
  toggle.title = toggle.ariaLabel = 'Filtrar por categoría';
  toggle.innerHTML = icon('filter', 18);
  const menu = document.createElement('div');
  menu.className = 'library-filter-menu illustration-category-menu';
  menu.role = 'menu';
  menu.ariaLabel = 'Categorías de ilustraciones';
  menu.id = 'illustration-categories-' + crypto.randomUUID();
  menu.hidden = true;
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-controls', menu.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.disabled = true;
  header.insertBefore(toggle, header.lastElementChild);
  panel.append(menu);
  function close(restoreFocus = false) {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus({ preventScroll: true });
  }
  function open() {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    menu.querySelector<HTMLButtonElement>('[aria-checked=true]')?.focus();
  }
  toggle.onclick = () => (menu.hidden ? open() : close());
  toggle.onkeydown = (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    open();
  };
  menu.onclick = (event) => {
    const option = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!option) return;
    menu.querySelector('[aria-checked=true]')?.setAttribute('aria-checked', 'false');
    option.setAttribute('aria-checked', 'true');
    toggle.classList.toggle('active', !!option.value);
    toggle.title = option.value ? 'Categoría: ' + option.value : 'Filtrar por categoría';
    close(true);
    choose(option.value);
  };
  menu.onkeydown = (event) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    const options = Array.from(menu.querySelectorAll('button'));
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    let next: HTMLButtonElement | undefined;
    if (event.key === 'Home') next = options[0];
    else if (event.key === 'End') next = options.at(-1);
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      next =
        options[(index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length];
    else if (
      event.key.length === 1 &&
      event.key.trim() &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    )
      next = [...options.slice(index + 1), ...options.slice(0, index + 1)].find((o) =>
        searchKey(o.textContent ?? '').startsWith(searchKey(event.key)),
      );
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };
  panel.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node) && !toggle.contains(e.target as Node))
      close();
  });
  menu.addEventListener('focusout', (e) => {
    if (
      !menu.hidden &&
      e.relatedTarget &&
      !menu.contains(e.relatedTarget as Node) &&
      !toggle.contains(e.relatedTarget as Node)
    )
      close();
  });
  return (categories: string[]) => {
    toggle.disabled = false;
    menu.replaceChildren(
      ...['', ...categories].map((name) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.role = 'menuitemradio';
        option.tabIndex = -1;
        option.value = name;
        option.setAttribute('aria-checked', String(!name));
        option.textContent = name || 'Todas las categorías';
        return option;
      }),
    );
  };
}
