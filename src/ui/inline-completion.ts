/** Completa únicamente historial local. Tab conserva su navegación cuando no hay coincidencia. */
export function inlineCompletion(
  input: HTMLInputElement,
  candidates: string[],
  signal: AbortSignal,
): void {
  const wrap = document.createElement('div');
  wrap.className = 'inline-completion';
  input.replaceWith(wrap);
  wrap.append(input);
  input.autocomplete = 'off';
  const ghost = document.createElement('span');
  ghost.className = 'completion-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  wrap.append(ghost);
  let suggestion = '';
  const paint = (): void => {
    const style = getComputedStyle(input);
    Object.assign(ghost.style, {
      font: style.font,
      padding: style.padding,
      borderWidth: style.borderWidth,
      letterSpacing: style.letterSpacing,
    });
    const prefix = input.value;
    suggestion =
      prefix.length >= 2 &&
      input.selectionStart === prefix.length &&
      input.selectionEnd === prefix.length
        ? (candidates
            .flatMap((value) => [
              value,
              value.replace(/^https?:\/\//, ''),
              value.replace(/^https?:\/\/www\./, ''),
            ])
            .find(
              (value) =>
                value.length > prefix.length &&
                value.toLowerCase().startsWith(prefix.toLowerCase()),
            ) ?? '')
        : '';
    ghost.replaceChildren();
    if (suggestion) {
      const typed = document.createElement('span');
      typed.style.visibility = 'hidden';
      typed.textContent = prefix;
      ghost.append(typed, suggestion.slice(prefix.length));
    }
    ghost.scrollLeft = input.scrollLeft;
    input.setAttribute(
      'aria-description',
      suggestion ? `Tab completa ${suggestion}` : 'Ingresá la dirección del enlace',
    );
  };
  for (const event of ['input', 'click', 'keyup', 'scroll'])
    input.addEventListener(event, paint, { signal });
  input.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Tab' || event.shiftKey || !suggestion) return;
      event.preventDefault();
      input.value = suggestion;
      input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    { signal },
  );
}
