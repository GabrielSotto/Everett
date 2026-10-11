import type { Rect, Route } from '../domain/model';
import { routeKey } from '../domain/model';
import { trace, type Intent } from '../app/diagnostics/trace';
import { motion, reducedMotion } from './motion';
type TransitionScope = 'scene' | 'content';

/** Congelar los píxeles antes de liberar las URLs de la vista saliente. */
function mediaSnapshot(original: HTMLImageElement | HTMLVideoElement): HTMLCanvasElement {
  const frame = document.createElement('canvas'),
    style = getComputedStyle(original),
    image = original instanceof HTMLImageElement;
  frame.className = original.className + ' media-snapshot' + (image ? ' image-snapshot' : '');
  frame.width = (image ? original.naturalWidth : original.videoWidth) || 1;
  frame.height = (image ? original.naturalHeight : original.videoHeight) || 1;
  Object.assign(frame.style, {
    width: style.width,
    height: style.height,
    maxWidth: style.maxWidth,
    maxHeight: style.maxHeight,
    display: style.display,
    objectFit: style.objectFit,
    margin: style.margin,
    borderRadius: style.borderRadius,
  });
  const ready = image
    ? original.complete && original.naturalWidth > 0
    : original.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  if (ready) frame.getContext('2d')?.drawImage(original, 0, 0);
  return frame;
}

/** Anima la presentación de las rutas y contextos ya confirmados por el dominio. */
export class TransitionLayer {
  private animations: Animation[] = [];
  private ghost: HTMLElement | null = null;
  private token = 0;
  private scope: TransitionScope = 'scene';
  capture(scene: HTMLElement | null, host: HTMLElement, scope: TransitionScope = 'scene'): void {
    this.cancel();
    this.scope = scope;
    if (!scene) return;
    const rect = scene.getBoundingClientRect(),
      parent = host.getBoundingClientRect();
    this.ghost = scene.cloneNode(true) as HTMLElement;
    this.ghost.removeAttribute('id');
    this.ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    this.ghost.classList.add('transition-ghost');
    this.ghost.setAttribute('aria-hidden', 'true');
    this.ghost.inert = true;
    // Los fondos espaciales ocupan el viewport completo durante la transición.
    if (scene.querySelector('.space')) this.ghost.style.background = 'transparent';
    if (scope === 'content') {
      Object.assign(this.ghost.style, {
        position: 'absolute',
        left: `${rect.x - parent.x}px`,
        top: `${rect.y - parent.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        flex: 'none',
      });
    }
    const sourceCanvases = scene.querySelectorAll('canvas');
    this.ghost.querySelectorAll('canvas').forEach((target, index) => {
      const original = sourceCanvases[index];
      if (original && original.width && original.height) {
        target.width = original.width;
        target.height = original.height;
        target.getContext('2d')?.drawImage(original, 0, 0);
      }
    });
    // El fantasma conserva píxeles, sin cargar archivos ni otro reproductor activo.
    // Evitar que cloneNode solicite URLs Blob que la vista libera al desmontarse.
    const sourceImages = scene.querySelectorAll('img');
    this.ghost.querySelectorAll('img').forEach((image, index) => {
      const original = sourceImages[index];
      if (!original?.src.startsWith('blob:')) return;
      const frame = mediaSnapshot(original);
      image.removeAttribute('src');
      image.removeAttribute('srcset');
      image.replaceWith(frame);
    });
    const sourceVideos = scene.querySelectorAll('video');
    this.ghost.querySelectorAll('video').forEach((video, index) => {
      const original = sourceVideos[index];
      if (!original) return;
      const frame = mediaSnapshot(original);
      if (original.controls) {
        const play = video.parentElement?.querySelector<HTMLElement>('.video-play');
        if (play) play.style.display = 'none';
      }
      video.removeAttribute('src');
      video.querySelectorAll('source').forEach((source) => source.remove());
      video.load();
      video.replaceWith(frame);
    });
    host.append(this.ghost);
    // cloneNode omite el desplazamiento actual; copiarlo conserva la vista de salida.
    const source = [scene, ...scene.querySelectorAll<HTMLElement>('*')];
    const clone = [this.ghost, ...this.ghost.querySelectorAll<HTMLElement>('*')];
    source.forEach((element, index) => {
      const target = clone[index];
      if (target && (element.scrollTop || element.scrollLeft)) {
        target.scrollTop = element.scrollTop;
        target.scrollLeft = element.scrollLeft;
      }
    });
  }
  play(
    scene: HTMLElement,
    host: HTMLElement,
    from: Route,
    to: Route,
    origin: Rect | null,
    leaving: boolean,
    intent: Intent,
  ): void {
    const token = ++this.token,
      started = performance.now(),
      scope = this.scope;
    const viewport = host.getBoundingClientRect(),
      reduced = reducedMotion();
    const pivot =
      origin && scope === 'scene'
        ? `${origin.x + origin.width / 2 - viewport.x}px ${origin.y + origin.height / 2 - viewport.y}px`
        : '50% 50%';
    const duration = reduced
      ? motion.reducedMs
      : scope === 'content'
        ? motion.contentMs
        : motion.navigateMs;
    const dx =
      origin && scope === 'scene'
        ? (origin.x + origin.width / 2 - viewport.x - viewport.width / 2) * 0.14
        : 0;
    const dy =
      origin && scope === 'scene'
        ? (origin.y + origin.height / 2 - viewport.y - viewport.height / 2) * 0.14
        : 0;
    const prefix = scope === 'content' ? 'content.transition' : 'transition';
    const meta = {
      from: routeKey(from),
      to: routeKey(to),
      origin,
      direction: leaving ? 'out' : 'in',
      duration,
      scope,
    };
    trace.add(prefix + '.started', meta, intent);
    scene.style.transformOrigin = leaving ? '50% 50%' : pivot;
    const small = scope === 'content' ? 0.88 : 0.77,
      large = scope === 'content' ? 1.12 : 1.23;
    const options: KeyframeAnimationOptions = { duration, easing: motion.ease, fill: 'none' };
    const incoming = scene.animate(
      reduced
        ? [{ opacity: 0.6 }, { opacity: 1 }]
        : [
            {
              transform: leaving ? `scale(${large})` : `translate(${dx}px,${dy}px) scale(${small})`,
              opacity: 0.05,
            },
            { transform: leaving ? 'scale(1.035)' : 'scale(.96)', opacity: 0.94, offset: 0.7 },
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
          ],
      options,
    );
    this.animations.push(incoming);
    const ghost = this.ghost;
    if (ghost) {
      ghost.style.transformOrigin = pivot;
      this.animations.push(
        ghost.animate(
          reduced
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [
                { transform: 'scale(1)', opacity: 1 },
                {
                  transform: leaving
                    ? `scale(${small})`
                    : `scale(${scope === 'content' ? 1.12 : 1.33})`,
                  opacity: 0,
                },
              ],
          options,
        ),
      );
    }
    void incoming.finished
      .then(() => {
        if (token !== this.token) return;
        ghost?.remove();
        this.ghost = null;
        this.animations = [];
        scene.style.removeProperty('transform-origin');
        trace.add(prefix + '.finished', { ...meta, elapsed: performance.now() - started }, intent);
      })
      .catch(() =>
        trace.add(
          prefix + '.interrupted',
          { ...meta, elapsed: performance.now() - started },
          intent,
        ),
      );
  }
  cancel(): void {
    this.token++;
    this.animations.forEach((a) => a.cancel());
    this.animations = [];
    this.ghost?.remove();
    this.ghost = null;
  }
}
