import { icon } from './icons';

/** Lupa de los selectores compactos. Mantiene la grilla montada al abrir y cerrar. */
export function pickerSearch(
  header: HTMLElement,
  label: string,
  filter: (value: string) => void,
  first: () => HTMLElement | null,
) {
  const box = document.createElement('div');
  box.className = 'picker-search';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'icon-button';
  toggle.innerHTML = icon('search', 15);
  toggle.title = toggle.ariaLabel = label;
  const field = document.createElement('input');
  field.type = 'search';
  field.id = 'picker-search-' + crypto.randomUUID();
  field.autocomplete = 'off';
  field.placeholder = label + '…';
  field.ariaLabel = label;
  toggle.setAttribute('aria-controls', field.id);
  toggle.setAttribute('aria-expanded', 'false');
  field.disabled = true;
  box.append(toggle, field);
  header.insertBefore(box, header.lastElementChild);
  function collapse() {
    if (field.disabled) return false;
    if (field.value) {
      field.value = '';
      filter('');
    }
    field.disabled = true;
    box.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus({ preventScroll: true });
    return true;
  }
  toggle.onclick = () => {
    if (collapse()) return;
    field.disabled = false;
    box.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    field.focus({ preventScroll: true });
  };
  field.oninput = () => filter(field.value);
  field.onkeydown = (e) => {
    if (
      e.isComposing ||
      (e.key !== 'Enter' && !(e.key === 'Tab' && !e.shiftKey && field.value.trim()))
    )
      return;
    const match = first();
    if (!match) return;
    e.preventDefault();
    match.focus();
  };
  return { collapse, toggle };
}
export const searchKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
