import { motion, reducedMotion } from './motion';

/** Conserva la presentación de los paneles hijos cuando el render reemplaza su DOM. */
export class PanelMotion {
  private animations = new Set<Animation>();
  private exits = new Set<HTMLElement>();

  constructor(
    private root: HTMLElement,
    private selectors: readonly string[],
  ) {}

  prepare(): () => void {
    const previous = this.selectors.flatMap((selector) => {
      const element = this.root.querySelector<HTMLElement>(selector);
      if (!element) return [];
      const style = getComputedStyle(element);
      return [
        {
          selector,
          element,
          opacity: style.opacity,
          transform: style.transform,
          left: element.offsetLeft,
          top: element.offsetTop,
          width: element.offsetWidth,
          height: element.offsetHeight,
          scrollTop: element.scrollTop,
        },
      ];
    });
    this.dispose();
    return () => {
      const reduced = reducedMotion();
      for (const selector of this.selectors) {
        const element = this.root.querySelector<HTMLElement>(selector);
        const old = previous.find((frame) => frame.selector === selector);
        if (element) {
          element.style.animation = 'none';
          element.style.transformOrigin = 'top right';
          if (old && Number(old.opacity) >= 0.999 && old.transform === 'none') continue;
          const first = {
            opacity: old?.opacity ?? '0',
            ...(reduced ? {} : { transform: old?.transform ?? 'translateY(-6px) scale(.97)' }),
          };
          this.animate(
            element,
            [first, { opacity: 1, ...(reduced ? {} : { transform: 'none' }) }],
            reduced ? motion.reducedMs : motion.panelOpenMs,
          );
        } else if (old) {
          const ghost = old.element.cloneNode(true) as HTMLElement;
          ghost.removeAttribute('id');
          ghost.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
          ghost.classList.add('panel-exit');
          ghost.inert = true;
          ghost.setAttribute('aria-hidden', 'true');
          Object.assign(ghost.style, {
            position: 'absolute',
            left: `${old.left}px`,
            top: `${old.top}px`,
            right: 'auto',
            width: `${old.width}px`,
            height: `${old.height}px`,
            pointerEvents: 'none',
            animation: 'none',
            transformOrigin: 'top right',
          });
          this.root.append(ghost);
          ghost.scrollTop = old.scrollTop;
          this.exits.add(ghost);
          this.animate(
            ghost,
            [
              { opacity: old.opacity, ...(reduced ? {} : { transform: old.transform }) },
              { opacity: 0, ...(reduced ? {} : { transform: 'translateY(-3px) scale(.99)' }) },
            ],
            reduced ? motion.reducedMs : motion.panelCloseMs,
            () => {
              ghost.remove();
              this.exits.delete(ghost);
            },
          );
        }
      }
    };
  }

  private animate(
    element: HTMLElement,
    frames: Keyframe[],
    duration: number,
    complete?: () => void,
  ): void {
    const animation = element.animate(frames, { duration, easing: motion.panelEase, fill: 'none' });
    this.animations.add(animation);
    void animation.finished
      .catch(() => {})
      .finally(() => {
        this.animations.delete(animation);
        complete?.();
      });
  }

  dispose(): void {
    this.animations.forEach((animation) => animation.cancel());
    this.animations.clear();
    this.exits.forEach((element) => element.remove());
    this.exits.clear();
  }
}
