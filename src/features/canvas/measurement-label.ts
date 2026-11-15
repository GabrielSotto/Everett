/** Las cotas se leen en pantalla aunque el plano esté alejado o la retícula esté girada. */
export function measurementLabel(
  x: number,
  y: number,
  caption: string,
  horizontal: boolean,
  zoom: number,
  rotation = 0,
): string {
  const sideways = Math.abs(Math.sin((rotation * Math.PI) / 180)) > Math.SQRT1_2;
  const aboveLine = horizontal !== sideways;
  return `<g transform="translate(${x} ${y}) rotate(${-rotation}) scale(${1 / zoom})"><text x="${aboveLine ? 0 : 7}" y="${aboveLine ? -7 : 4}" text-anchor="${aboveLine ? 'middle' : 'start'}">${caption}</text></g>`;
}
