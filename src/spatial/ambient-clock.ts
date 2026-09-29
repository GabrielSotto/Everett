/** El reloj ambiental se pausa al ocultar la página o solicitar movimiento reducido. */
let elapsed = 0,
  previous = 0;
export function ambientSeconds(now: number, running: boolean): number {
  if (previous && running) elapsed += Math.min(100, Math.max(0, now - previous)) / 1000;
  previous = now;
  return elapsed;
}
export function suspendAmbient(): void {
  previous = 0;
}
