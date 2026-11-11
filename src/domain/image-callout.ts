import { validDetail, detailPoint } from './cable-geometry';
import { ensure } from './invariants';
import { newCanvasText } from './canvas-text';
import type { World, Point } from './model';
import { clearOrigin } from './visual-placement';
import { visualBounds, centerOf } from './rotation';
export function createImageCallout(
  world: World,
  image: string,
  detail: Point,
  text: string,
  uid: () => string,
) {
  const target = world.nodes.find((n) => n.id === image && !n.owner && n.data.kind === 'image');
  ensure(
    !!target && validDetail(detail),
    'IMAGE_DETAIL',
    'Elegí un punto dentro de una imagen disponible.',
  );
  const value = text.trim();
  ensure(
    value.length > 0 && value.length <= 120,
    'CALLOUT_TEXT',
    'Escribí un rótulo de hasta 120 caracteres.',
  );
  if (!target) return;
  const point = detailPoint(target, detail),
    left = point.x < centerOf(target).x,
    box = visualBounds(target);
  const width = 195,
    height = 32 * Math.max(1, Math.ceil(value.length / 17));
  const x = left ? box.x - 52 - width : box.x + box.width + 52;
  // Buscar la fila libre más cercana sin tapar rótulos ya escritos.
  const y0 = point.y - height / 2;
  const obstacles = world.nodes.filter((n) => !n.owner).map(visualBounds);
  const { y } = clearOrigin({ x, y: y0 }, { width, height }, obstacles, 12, true);
  const id = uid(),
    fromAnchor = left ? 'east' : 'west';
  world.nodes.push({
    id,
    x,
    y,
    width,
    height,
    owner: null,
    data: {
      ...newCanvasText('wrap'),
      text: value,
      align: left ? 'right' : 'left',
      size: 20,
      weight: 600,
    },
  });
  world.links.push({
    id: uid(),
    from: id,
    to: image,
    fromAnchor,
    toAnchor: left ? 'west' : 'east',
    detail: { ...detail },
    direction: 'forward',
    thickness: 3,
  });
}
