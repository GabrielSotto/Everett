export function rgb(color: string): string {
  return /^#[\da-f]{6}([\da-f]{2})?$/i.test(color) ? color.slice(0, 7) : '#766ae5';
}
export function alpha(color: string): number {
  return color.length === 9 ? Math.round((parseInt(color.slice(7), 16) / 255) * 100) : 100;
}
export function rgba(color: string, opacity: number): string {
  const value = Math.round((Math.max(0, Math.min(100, opacity)) * 255) / 100);
  return rgb(color) + (value === 255 ? '' : value.toString(16).padStart(2, '0'));
}
