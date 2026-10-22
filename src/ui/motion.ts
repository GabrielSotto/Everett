/** Duraciones de presentación independientes de la confirmación de rutas. */
export const motion = {
  navigateMs: 390,
  contentMs: 320,
  composerMs: 380,
  composerCloseMs: 290,
  panelOpenMs: 250,
  panelCloseMs: 150,
  panelEase: 'cubic-bezier(.22,1,.36,1)',
  reducedMs: 70,
  ease: 'cubic-bezier(.18,.76,.22,1)',
  expand: 'cubic-bezier(.22,.86,.18,1)',
} as const;
export function reducedMotion(): boolean {
  return (
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.body.dataset.canvasMotion === 'reduced'
  );
}
