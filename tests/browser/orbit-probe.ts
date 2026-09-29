import type { OrbitPosition, OrbitProfile } from '../../src/spatial/planet-orbit';

export interface RenderedWorld {
  id: string;
  x: number;
  y: number;
  radius: number;
  angle: number;
  orbit: (OrbitProfile & { moon: OrbitPosition }) | null;
}

declare global {
  interface Window {
    EverettOrbitPixels?: { image: ImageData; x: number; y: number; ratio: number };
  }
}

/** Proyecta el mismo sprite en una referencia sin órbita para contrastar los píxeles de cada fotograma. */
export function installOrbitProbe(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('.planet-renderer')!;
  const ctx = canvas.getContext('2d')!;
  const draw = ctx.drawImage;
  const reference = document.createElement('canvas');
  const referenceContext = reference.getContext('2d')!;
  ctx.drawImage = (...args: [CanvasImageSource, number, number, ...number[]]): void => {
    Reflect.apply(draw, ctx, args);
    if (args.length !== 5 || !ctx.filter.startsWith('hue-rotate(')) return;
    const worlds = JSON.parse(canvas.dataset.worlds ?? '[]') as RenderedWorld[];
    const world = worlds.find((w) => w.id === 'scout');
    if (!world || Math.abs(args[1] + args[3]! / 2 - world.x) > 1) return;
    const ratio = canvas.width / canvas.clientWidth,
      x = Math.floor(args[1] * ratio),
      y = Math.floor(args[2] * ratio),
      size = Math.ceil(args[3]! * ratio);
    reference.width = size;
    reference.height = size;
    const transform = ctx.getTransform();
    referenceContext.setTransform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.e - x,
      transform.f - y,
    );
    referenceContext.filter = ctx.filter;
    referenceContext.globalAlpha = ctx.globalAlpha;
    Reflect.apply(draw, referenceContext, args);
    window.EverettOrbitPixels = {
      image: referenceContext.getImageData(0, 0, size, size),
      x,
      y,
      ratio,
    };
  };
}

export function orbitPixels(): {
  rearChanges: number;
  frontChanges: number;
  moonChanges: number;
  moonAlpha: number;
  world: RenderedWorld;
  rearExamples: { dx: number; dy: number; actual: number[]; expected: number[] }[];
} {
  const canvas = document.querySelector<HTMLCanvasElement>('.planet-renderer')!;
  const ctx = canvas.getContext('2d')!;
  const baseline = window.EverettOrbitPixels;
  if (!baseline) throw new Error('Falta el fotograma de referencia del planeta');
  const world = (JSON.parse(canvas.dataset.worlds!) as RenderedWorld[]).find(
    (w) => w.id === 'scout',
  )!;
  if (!world.orbit) throw new Error('Falta la órbita de Resource Scout');
  const final = ctx.getImageData(
    baseline.x,
    baseline.y,
    baseline.image.width,
    baseline.image.height,
  );
  const { moon, moonRadius, angle } = world.orbit;
  let rearChanges = 0,
    frontChanges = 0,
    moonChanges = 0;
  const rearExamples: { dx: number; dy: number; actual: number[]; expected: number[] }[] = [];
  for (let y = 0; y < final.height; y++)
    for (let x = 0; x < final.width; x++) {
      const dx = ((baseline.x + x + 0.5) / baseline.ratio - world.x) / world.radius,
        dy = ((baseline.y + y + 0.5) / baseline.ratio - world.y) / world.radius;
      if (dx * dx + dy * dy > 0.9 ** 2) continue;
      const i = (y * final.width + x) * 4;
      const alpha = final.data[i + 3]!,
        expectedAlpha = baseline.image.data[i + 3]!;
      // La lectura de píxeles semitransparentes amplifica un nivel de redondeo al deshacer la premultiplicación.
      const changed =
        Math.abs(alpha - expectedAlpha) > 1 ||
        [0, 1, 2].some(
          (channel) =>
            Math.abs(
              Math.round((final.data[i + channel]! * alpha) / 255) -
                Math.round((baseline.image.data[i + channel]! * expectedAlpha) / 255),
            ) > 1,
        );
      if (!changed) continue;
      const side = -dx * Math.sin(angle) + dy * Math.cos(angle);
      if (side < -0.08) {
        rearChanges++;
        if (rearExamples.length < 20)
          rearExamples.push({
            dx,
            dy,
            actual: [...final.data.slice(i, i + 4)],
            expected: [...baseline.image.data.slice(i, i + 4)],
          });
      }
      if (side > 0.08) frontChanges++;
      if (Math.hypot(dx - moon.x, dy - moon.y) < moonRadius * 0.65) moonChanges++;
    }
  const moonPixel = ctx.getImageData(
    Math.floor((world.x + moon.x * world.radius) * baseline.ratio),
    Math.floor((world.y + moon.y * world.radius) * baseline.ratio),
    1,
    1,
  ).data;
  return { rearChanges, frontChanges, moonChanges, moonAlpha: moonPixel[3]!, world, rearExamples };
}
