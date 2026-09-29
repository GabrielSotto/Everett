/** Los ajustes perceptuales requieren repetir la regresión de intención y gestos. */
export const cameraTuning = {
  minimumZoom: 0.1,
  maximumZoom: 6,
  zoomSensitivity: 0.00165,
  dragResponseMs: 39,
  releaseResponseMs: 85,
  inertiaMultiplier: 1.7,
  maximumInertiaPx: 85,
} as const;
export const focusTuning = {
  escapeTravelPx: 360,
  minimumGain: 0.1,
  worldHysteresisPx: 68,
  surfaceHysteresisPx: 32,
} as const;
export const navigationTuning = {
  minimumProjectedSizePx: 290,
  maximumProjectedSizePx: 570,
  viewportEntryRatio: 0.58,
  maximumFocusOffsetRatio: 0.3,
  worldExitZoom: 0.4,
  wheelStepLimit: 240,
  cooldownMs: 440,
} as const;

/** La fuerza de los campos es independiente del destino seleccionado. */
export const gravityTuning = {
  worldRadius: 610,
  emptyWorldRadius: 690,
  neighbourFraction: 0.38,
  maximumRadiusPx: 500,
  minimumGain: 0.075,
  escapeExponent: 0.44,
  capturePerSecond: 6.8,
  captureExponent: 1.45,
  capturedCoreRatio: 0.12,
  inputStepPx: 5,
  haloResponseMs: 60,
  dragResponseMs: 24,
} as const;
