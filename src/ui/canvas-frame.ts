import { visualBounds } from '../domain/rotation';
import type { Context } from '../app/context';
import { canvasCameraTuning } from '../spatial/tuning';

/** Encuadre compartido por el menú de zoom y el menú contextual. */
export function frameCanvas(
  ctx: Context,
  selection: boolean,
  options: { maximumZoom?: number; rightInset?: number; bottomInset?: number } = {},
): void {
  const world = ctx.world(),
    ids = ctx.ui.canvas.selections;
  const items = [
    ...world.nodes.filter((n) => !n.owner && (!selection || ids.includes(n.id))).map(visualBounds),
    ...(!selection ? world.zones : []),
  ];
  if (!items.length) return;
  const minX = Math.min(...items.map((n) => n.x)),
    minY = Math.min(...items.map((n) => n.y));
  const maxX = Math.max(...items.map((n) => n.x + n.width)),
    maxY = Math.max(...items.map((n) => n.y + n.height));
  const left =
    document.querySelector('.canvas-chat.docked:not(.compact)')?.getBoundingClientRect().right ?? 0;
  const right = options.rightInset ?? 0,
    bottom = options.bottomInset ?? 0;
  const z = Math.max(
    canvasCameraTuning.minimumZoom,
    Math.min(
      options.maximumZoom ?? (selection ? canvasCameraTuning.maximumZoom : 1),
      (innerWidth - left - right - 96) / Math.max(1, maxX - minX),
      (innerHeight - 219 - bottom) / Math.max(1, maxY - minY),
    ),
  );
  const camera = {
    x: (left - right) / 2 - ((minX + maxX) / 2) * z,
    y: -28 - bottom / 2 - ((minY + maxY) / 2) * z,
    z,
  };
  ctx.camera?.set(camera, true);
  ctx.act({ type: 'camera', camera }, 'encuadrar Canvas', 'C08-ZOOM-01');
}
