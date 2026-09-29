import type { Camera, Point } from '../domain/model';
import { clamp } from './math';
import { gravityTuning } from './tuning';

export type FieldPhase = 'captured' | 'escaping' | 'released' | 'approaching';
export interface FieldBody extends Point {
  id: string;
}
export interface FieldSample {
  id: string;
  offset: Point;
  distance: number;
  radius: number;
  proximity: number;
  influence: number;
}

export const smoothstep = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Los campos escalan con el mapa y dejan espacio neutro entre vecinos. */
export function fieldRadius(body: FieldBody, bodies: readonly FieldBody[], zoom: number): number {
  let nearest = Infinity;
  for (const other of bodies)
    if (other.id !== body.id)
      nearest = Math.min(nearest, Math.hypot(body.x - other.x, body.y - other.y));
  const nominal = body.id === 'new' ? gravityTuning.emptyWorldRadius : gravityTuning.worldRadius;
  return (
    Math.min(
      nominal,
      nearest * gravityTuning.neighbourFraction,
      gravityTuning.maximumRadiusPx / zoom,
    ) * zoom
  );
}

export function sampleBody(
  body: FieldBody,
  bodies: readonly FieldBody[],
  camera: Camera,
): FieldSample {
  const offset = { x: body.x * camera.z + camera.x, y: body.y * camera.z + camera.y };
  const radius = fieldRadius(body, bodies, camera.z),
    distance = Math.hypot(offset.x, offset.y);
  const proximity = clamp(1 - distance / radius, 0, 1);
  return { id: body.id, offset, distance, radius, proximity, influence: smoothstep(proximity) };
}

export function sampleField(bodies: readonly FieldBody[], camera: Camera): FieldSample | null {
  let best: FieldSample | null = null;
  for (const body of bodies) {
    const sample = sampleBody(body, bodies, camera);
    if (sample.proximity > 0 && (!best || sample.influence > best.influence)) best = sample;
  }
  return best;
}

/** La resistencia al salir disminuye desde el centro hasta anularse en el límite. */
export function exitGain(progress: number): number {
  return (
    gravityTuning.minimumGain +
    (1 - gravityTuning.minimumGain) * Math.pow(smoothstep(progress), gravityTuning.escapeExponent)
  );
}

/** La atracción se integra en el tiempo, aumenta hacia el centro y vale cero fuera del campo. */
export function captureRate(influence: number): number {
  const strength = clamp(influence, 0, 1);
  // La curva conserva la fuerza central y mantiene una atracción perceptible en la periferia.
  return (
    gravityTuning.capturePerSecond * Math.pow(strength, gravityTuning.captureExponent) +
    0.8 * Math.sqrt(strength) * Math.pow(1 - strength, 4)
  );
}

export function attractionStep(field: FieldSample, seconds: number): Point {
  const factor = 1 - Math.exp(-captureRate(field.influence) * Math.max(0, seconds));
  if (factor === 0) return { x: 0, y: 0 };
  return { x: -field.offset.x * factor, y: -field.offset.y * factor };
}

export interface PanResult {
  camera: Camera;
  gain: number;
  outward: boolean;
  field: string | null;
}
/** Los subpasos detectan el cruce del campo cuando el navegador agrupa eventos del puntero. */
export function panThroughFields(
  camera: Camera,
  delta: Point,
  bodies: readonly FieldBody[],
): PanResult {
  const next = { ...camera },
    length = Math.hypot(delta.x, delta.y);
  const steps = Math.max(1, Math.ceil(length / gravityTuning.inputStepPx));
  const dx = delta.x / steps,
    dy = delta.y / steps;
  let outward = false,
    fieldId: string | null = null;
  for (let step = 0; step < steps; step++) {
    const field = sampleField(bodies, next);
    outward =
      !!field && Math.hypot(field.offset.x + dx, field.offset.y + dy) > field.distance + 0.0001;
    const gain = outward && field ? exitGain(field.distance / field.radius) : 1;
    fieldId = field?.id ?? null;
    next.x += dx * gain;
    next.y += dy * gain;
  }
  const actual = Math.hypot(next.x - camera.x, next.y - camera.y);
  return { camera: next, gain: length > 0 ? actual / length : 1, outward, field: fieldId };
}
