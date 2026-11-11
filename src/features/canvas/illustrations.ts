import { illustrationAssetPrefix } from '../../domain/illustration-asset';

interface Drawing {
  id: string;
  name: string;
  category: string;
  keywords: string;
  body: string;
}
export interface Illustration extends Drawing {
  colors?: ReadonlyMap<string, string>;
}
const prefix = illustrationAssetPrefix;
let current: Map<string, Drawing> | undefined;
export async function loadIllustrations(): Promise<Drawing[]> {
  const { default: items } = await import('../../assets/illustrations/fluent-flat.json');
  current ??= new Map(items.map((i) => [i.id, i]));
  return items;
}
export function loadedIllustration(id: string) {
  return current?.get(id);
}
export function illustrationAsset(item: Illustration) {
  return (
    prefix +
    item.id +
    Array.from(item.colors ?? [])
      .filter(([a, b]) => a !== b)
      .sort()
      .map(([a, b]) => '~' + a.slice(1) + '.' + b.slice(1))
      .join('')
  );
}
export const isLibraryAsset = (asset: string) => asset.startsWith(prefix);
const normalizeColor = (hex: string) =>
  hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
const paint = /((?:fill|stroke|stop-color)=")(#[\da-f]{6}|#[\da-f]{3})"/gi;
// Las tintas que definen una silueta no se ven: cambiar una máscara puede recortar el dibujo.
const geometry = /(<(?:clipPath|mask)\b[^>]*>[\s\S]*?<\/(?:clipPath|mask)>)/gi;
export function drawingColors(item: Illustration) {
  return [
    ...new Set(
      [...item.body.replace(geometry, '').matchAll(paint)].map((m) =>
        normalizeColor(m[2]!.toLowerCase()),
      ),
    ),
  ];
}
export async function illustrationFromAsset(asset: string): Promise<Illustration | undefined> {
  if (!isLibraryAsset(asset)) return;
  const [id, ...changes] = asset.slice(prefix.length).split('~');
  await loadIllustrations();
  const item = current?.get(id!);
  if (!item) return;
  const colors = new Map<string, string>();
  for (const change of changes) {
    if (!/^[\da-f]{6}\.[\da-f]{6}$/i.test(change)) continue;
    colors.set('#' + change.slice(0, 6), '#' + change.slice(7));
  }
  return { ...item, colors };
}
function svg(item: Illustration) {
  const body = item.colors?.size
    ? item.body
        .split(geometry)
        .map((part, i) =>
          i % 2
            ? part
            : part.replace(paint, (all: string, prop: string, col: string) => {
                const next = item.colors?.get(normalizeColor(col.toLowerCase()));
                return next && /^#[\da-f]{6}$/i.test(next) ? prop + next + '"' : all;
              }),
        )
        .join('')
    : item.body;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 32 32">' +
    body +
    '</svg>'
  );
}
export const illustrationPreview = (item: Illustration) =>
  'data:image/svg+xml,' + encodeURIComponent(svg(item));
export const illustrationBlob = (item: Illustration) =>
  new Blob([svg(item)], { type: 'image/svg+xml' });
