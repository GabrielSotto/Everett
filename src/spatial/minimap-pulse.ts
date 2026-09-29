/** El pulso anima la presentación sin alterar áreas de interacción ni navegación. */
export interface MinimapPulseStyle {
  coreRadius: number;
  coreAlpha: number;
  glowRadius: number;
  glowOpacity: number;
  ringRadius: number;
  ringOpacity: number;
  ringWidth: number;
  phase: number;
}
export const minimapPulsePeriodMs = 2200;
export function minimapPulseStyle(elapsedMs: number, reducedMotion: boolean): MinimapPulseStyle {
  if (reducedMotion)
    return {
      coreRadius: 3.2,
      coreAlpha: 1,
      glowRadius: 4.4,
      glowOpacity: 0.18,
      ringRadius: 5.8,
      ringOpacity: 0,
      ringWidth: 1,
      phase: 0,
    };
  const phase = (Math.max(0, elapsedMs) % minimapPulsePeriodMs) / minimapPulsePeriodMs;
  const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const eased = Math.pow(wave, 0.88);
  return {
    coreRadius: 3.2,
    coreAlpha: 0.92 + 0.08 * eased,
    glowRadius: 4.8 + 1.7 * eased,
    glowOpacity: 0.22 + 0.32 * eased,
    ringRadius: 5.4 + 2.4 * eased,
    ringOpacity: 0.18 + 0.24 * eased,
    ringWidth: 1.05 + 0.25 * eased,
    phase,
  };
}
