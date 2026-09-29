import { motion, reducedMotion } from './motion';
import { trace } from '../app/diagnostics/trace';

/** El FAB lateral y el composer centrado comparten una transición reversible. */
export class ComposerDisclosure {
  private readonly resize: ResizeObserver;
  private reveal: HTMLElement | null = null;
  private animation: Animation | null = null;
  private contentAnimation: Animation | null = null;
  private open = false;
  private request = 0;
  private token = 0;
  constructor(
    private readonly root: HTMLElement,
    private readonly workspace: string,
  ) {
    this.resize = new ResizeObserver(() => {
      cancelAnimationFrame(this.request);
      this.request = requestAnimationFrame(() => this.layout());
    });
    this.resize.observe(root);
  }
  /** Restaura el estado tras renderizar la vista sin repetir la animación de apertura. */
  sync(open: boolean): void {
    const element = this.root.querySelector<HTMLElement>('.composer-reveal');
    if (this.reveal !== element) {
      this.cancel();
      this.reveal = element;
      this.resize.disconnect();
      this.resize.observe(this.root);
      const area = this.root.querySelector<HTMLElement>(this.workspace);
      if (area) this.resize.observe(area);
      if (element) this.resize.observe(element);
    }
    this.open = open;
    if (!element) return;
    element.classList.toggle('open', open);
    element.inert = !open;
    this.layout();
  }
  layout(): void {
    const anchor = this.root.querySelector<HTMLElement>('.code-fab-anchor'),
      reveal = this.reveal;
    const area = this.root.querySelector<HTMLElement>(this.workspace) ?? this.root;
    if (!anchor || !reveal || !area.isConnected) return;
    // La escala transitoria de la página altera las medidas proyectadas.
    // Esperar su fin permite ubicar el composer con las coordenadas del layout.
    if (
      this.root.getAnimations().some((animation) => animation.playState === 'running') ||
      area.getAnimations().some((animation) => animation.playState === 'running')
    ) {
      cancelAnimationFrame(this.request);
      this.request = requestAnimationFrame(() => this.layout());
      return;
    }
    const viewport =
      document.getElementById('viewport')?.getBoundingClientRect() ??
      this.root.getBoundingClientRect();
    const rect = area.getBoundingClientRect(),
      fab = anchor.getBoundingClientRect();
    const available = Math.min(rect.width, viewport.width);
    const width = Math.max(160, Math.min(460, available - 48));
    const left = Math.max(
      viewport.left + 14,
      Math.min(viewport.right - width - 14, rect.left + (rect.width - width) / 2),
    );
    anchor.style.setProperty('--composer-width', `${width}px`);
    anchor.style.setProperty('--composer-left', `${left - fab.left}px`);
    // En espacios estrechos el composer puede superponerse al FAB.
    // Desplazarlo verticalmente conserva el acceso a ambos controles y la posición del FAB.
    const overlapsFab = left < fab.right + 14 && left + width > fab.left - 14;
    anchor.style.setProperty('--composer-bottom', `${overlapsFab ? fab.height + 14 : 0}px`);
    // El diagnóstico expone la geometría de la región de trabajo en modo de lectura.
    reveal.dataset.workspaceLeft = String(rect.left);
    reveal.dataset.workspaceWidth = String(rect.width);
  }
  setOpen(open: boolean): void {
    if (!this.reveal) return;
    this.layout();
    const reveal = this.reveal,
      fab = this.root.querySelector<HTMLElement>('.agent-fab');
    if (!fab) return;
    const current = this.animation
      ? { transform: getComputedStyle(reveal).transform, opacity: getComputedStyle(reveal).opacity }
      : null;
    this.cancel();
    this.open = open;
    const token = ++this.token;
    reveal.classList.add('open');
    reveal.inert = !open;
    reveal.style.transform = 'none';
    reveal.style.opacity = '1';
    const destination = reveal.getBoundingClientRect(),
      origin = fab.getBoundingClientRect();
    const folded = `translate(${origin.left - destination.left}px,${origin.top - destination.top}px) scale(${origin.width / destination.width},${origin.height / destination.height})`;
    reveal.style.removeProperty('transform');
    reveal.style.removeProperty('opacity');
    const duration = reducedMotion()
      ? motion.reducedMs
      : open
        ? motion.composerMs
        : motion.composerCloseMs;
    const first: Keyframe =
      current ??
      (open
        ? { transform: folded, opacity: 0.3, borderRadius: '18px' }
        : { transform: 'none', opacity: 1 });
    const last: Keyframe = open
      ? { transform: 'translate(0,0) scale(1)', opacity: 1 }
      : { transform: folded, opacity: 0.08 };
    const intent = trace.intent(open ? 'desplegar composer' : 'contraer composer', 'MORPH-07');
    trace.add(
      'composer.morph.started',
      {
        open,
        duration,
        origin: { x: origin.x, y: origin.y, width: origin.width, height: origin.height },
        destination: {
          x: destination.x,
          y: destination.y,
          width: destination.width,
          height: destination.height,
        },
      },
      intent,
    );
    this.animation = reveal.animate(
      reducedMotion() ? [{ opacity: open ? 0 : 1 }, { opacity: open ? 1 : 0 }] : [first, last],
      { duration, easing: motion.expand, fill: 'both' },
    );
    const content = reveal.querySelector<HTMLElement>('.composer');
    // El contenido aparece después de expandir el contenedor desde el FAB.
    if (content)
      this.contentAnimation = content.animate(
        open
          ? [{ opacity: 0 }, { opacity: 0, offset: 0.23 }, { opacity: 1 }]
          : [{ opacity: 1 }, { opacity: 0, offset: 0.7 }, { opacity: 0 }],
        { duration, easing: 'linear', fill: 'none' },
      );
    fab.setAttribute('aria-expanded', String(open));
    fab.classList.toggle('active', open);
    if (!open && reveal.contains(document.activeElement)) fab.focus({ preventScroll: true });
    void this.animation.finished
      .then(() => {
        if (token !== this.token) return;
        this.animation?.cancel();
        this.animation = null;
        reveal.classList.toggle('open', this.open);
        trace.add('composer.morph.finished', { open: this.open }, intent);
      })
      .catch(() => trace.add('composer.morph.interrupted', { open }, intent));
  }
  private cancel(): void {
    this.token++;
    this.animation?.cancel();
    this.contentAnimation?.cancel();
    this.animation = null;
    this.contentAnimation = null;
  }
  dispose(): void {
    this.cancel();
    this.resize.disconnect();
    cancelAnimationFrame(this.request);
  }
}
