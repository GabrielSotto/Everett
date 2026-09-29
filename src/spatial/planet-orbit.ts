import { stableHash } from '../domain/agent-fixtures';
import type { Point } from '../domain/model';

export interface OrbitProfile {
  radius: number;
  minorRadius: number;
  angle: number;
  moonRadius: number;
  periodSeconds: number;
  direction: 1 | -1;
  phase: number;
}

export interface OrbitPosition extends Point {
  depth: number;
}

/** Radios relativos al Mundo; la profundidad positiva corresponde al tramo delantero. */
export function orbitProfile(id: string, angleDegrees: number): OrbitProfile {
  const hash = stableHash(id + ':orbit');
  return {
    radius: 1.5 + (hash % 16) / 100,
    minorRadius: 0.5 + (hash % 9) / 100,
    angle: (angleDegrees * Math.PI) / 180,
    moonRadius: 0.065 + (hash % 3) / 100,
    periodSeconds: 38 + (hash % 19),
    direction: hash % 2 ? 1 : -1,
    phase: ((hash % 360) * Math.PI) / 180,
  };
}

export function orbitPosition(profile: OrbitProfile, seconds: number): OrbitPosition {
  const phase = profile.phase + (seconds / profile.periodSeconds) * Math.PI * 2 * profile.direction;
  const x = profile.radius * Math.cos(phase),
    y = profile.minorRadius * Math.sin(phase),
    c = Math.cos(profile.angle),
    s = Math.sin(profile.angle);
  return {
    x: x * c - y * s,
    y: x * s + y * c,
    depth: Math.sqrt(profile.radius ** 2 - profile.minorRadius ** 2) * Math.sin(phase),
  };
}

export function drawOrbit(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  profile: OrbitProfile,
  moon: OrbitPosition,
  side: 'back' | 'front',
): void {
  ctx.save();
  ctx.translate(center.x, center.y);
  if (side === 'back') {
    // El recorte mantiene la oclusión incluso cuando un filtro atenúa el Mundo completo.
    ctx.beginPath();
    ctx.rect(-radius * 2, -radius * 2, radius * 4, radius * 4);
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip('evenodd');
  }
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    radius * profile.radius,
    radius * profile.minorRadius,
    profile.angle,
    side === 'front' ? 0 : Math.PI,
    side === 'front' ? Math.PI : Math.PI * 2,
  );
  ctx.lineWidth = Math.max(0.65, radius * 0.007);
  ctx.strokeStyle = side === 'front' ? 'rgba(176,190,207,.36)' : 'rgba(176,190,207,.24)';
  ctx.stroke();
  if (moon.depth >= 0 === (side === 'front')) {
    const x = moon.x * radius,
      y = moon.y * radius,
      r = radius * profile.moonRadius;
    const light = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
    light.addColorStop(0, '#d4d8de');
    light.addColorStop(0.45, '#8d94a2');
    light.addColorStop(1, '#252c38');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(31,38,49,.3)';
    for (const [dx, dy, size] of [
      [-0.25, -0.15, 0.2],
      [0.25, 0.35, 0.13],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, r * size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
