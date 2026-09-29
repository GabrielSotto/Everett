import { stableHash } from '../domain/agent-fixtures';
import { clamp } from './math';

export interface SpinProfile {
  periodSeconds: number;
  direction: 1 | -1;
  tiltRadians: number;
  phaseRadians: number;
}
/** La longitud de la textura cambia manteniendo fijas la luz, las etiquetas y las áreas de interacción. */
export function spinProfile(id: string): SpinProfile {
  const h = stableHash(id + ':spin-072'),
    a = stableHash(id + ':axis-072');
  return {
    periodSeconds: 120 + (h % 9001) / 100,
    direction: h % 2 ? 1 : -1,
    tiltRadians: (((a % 2501) / 100 - 12.5) * Math.PI) / 180,
    phaseRadians: (((h % 1401) / 100 - 7) * Math.PI) / 180,
  };
}
export function longitudeAt(profile: SpinProfile, seconds: number): number {
  return profile.phaseRadians + (seconds / profile.periodSeconds) * Math.PI * 2 * profile.direction;
}
export interface AtmosphereStyle {
  radiusPx: number;
  thicknessPx: number;
  extentPx: number;
  opacity: number;
}
/** La luz de foco disminuye suavemente dentro de un límite; los demás cuerpos conservan un borde tenue. */
export function atmosphereStyle(radiusPx: number, capture: number): AtmosphereStyle {
  const radius = Math.max(0.01, radiusPx),
    strength = clamp(capture, 0, 1);
  const thickness = Math.min(radius * 0.055, 3.1);
  // El foco conserva visibilidad a distancia y limita su intensidad antes de entrar.
  // La geometría permanece fija durante el cambio de iluminación.
  const proximity = clamp((radius - 80) / 140, 0, 1);
  const closeFalloff = proximity * proximity * (3 - 2 * proximity);
  return {
    radiusPx: radius,
    thicknessPx: thickness,
    extentPx: Math.min(radius * 0.18, 16),
    opacity: 0.018 + (0.962 - 0.12 * closeFalloff) * strength,
  };
}
/** El vuelo tiene aceleración breve, frenado prolongado y velocidad final nula. */
export function flightProgress(value: number): number {
  const t = clamp(value, 0, 1),
    peak = 0.32;
  const integral = (u: number): number => u * u * u - 0.5 * u * u * u * u;
  if (t <= peak) return 2 * peak * integral(t / peak);
  const u = (t - peak) / (1 - peak);
  return peak + 2 * (1 - peak) * (u - integral(u));
}
export function flightDuration(distancePx: number): number {
  return 420 + Math.min(410, Math.max(0, distancePx) * 0.045);
}
