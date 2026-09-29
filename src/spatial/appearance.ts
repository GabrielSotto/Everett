import { stableHash } from '../domain/agent-fixtures';

export interface PlanetAppearance {
  texture: number;
  rotation: number;
  hueShift: number;
  orbit: boolean;
  orbitAngle: number;
  signature: string;
}
/** La identidad visual del Mundo se conserva al renderizar y filtrar. */
export function planetAppearance(seed: number, id: string, textures: number): PlanetAppearance {
  const texture = Math.abs(seed) % Math.max(1, textures),
    hash = stableHash(id);
  const rotation = (hash % 27) - 13;
  const hueShift = (Math.floor(seed / Math.max(1, textures)) * 47 + (hash % 13)) % 360;
  return {
    texture,
    rotation,
    hueShift,
    orbit: seed % 9 === 1 || seed % 13 === 6,
    orbitAngle: -38 + (hash % 31),
    signature: `${texture}:${rotation}:${hueShift}`,
  };
}
