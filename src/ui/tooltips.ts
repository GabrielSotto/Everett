export function bindTooltips(root: HTMLElement, signal: AbortSignal): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const tooltip = root.querySelector<HTMLElement>('#tooltip');
  if (!tooltip) return;
  const hide = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    tooltip.classList.remove('visible');
  };
  signal.addEventListener('abort', hide, { once: true });
  root.addEventListener('pointerdown', hide, { capture: true, signal });
  const show = (event: Event) => {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tip]') : null;
    if (!target || target.getAttribute('aria-expanded') === 'true') {
      hide();
      return;
    }
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!target.isConnected || target.getAttribute('aria-expanded') === 'true') return;
      tooltip.textContent = target.dataset.tip ?? '';
      const bounds = target.getBoundingClientRect();
      tooltip.style.left =
        Math.max(
          8,
          Math.min(
            innerWidth - tooltip.offsetWidth - 8,
            bounds.x + bounds.width / 2 - tooltip.offsetWidth / 2,
          ),
        ) + 'px';
      tooltip.style.top =
        (bounds.bottom + 30 < innerHeight ? bounds.bottom + 8 : bounds.top - 32) + 'px';
      tooltip.classList.add('visible');
    }, 260);
  };
  root.addEventListener('pointerover', show, { signal });
  root.addEventListener(
    'focusin',
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.matches('.canvas-actions-trigger:focus-visible')
      )
        show(event);
    },
    { signal },
  );
  root.addEventListener(
    'focusout',
    (event) => {
      if (event.target instanceof Element && event.target.matches('.canvas-actions-trigger'))
        hide();
    },
    { signal },
  );
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return;
      if (
        tooltip.classList.contains('visible') &&
        event.target instanceof Element &&
        event.target.matches('.canvas-actions-trigger:focus-visible')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
      hide();
    },
    { signal },
  );
  root.addEventListener(
    'pointerout',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-tip]') : null;
      if (target && event.relatedTarget instanceof Node && target.contains(event.relatedTarget))
        return;
      hide();
    },
    { signal },
  );
}
