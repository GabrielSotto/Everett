/** Registra la estructura de las entradas para reproducir acciones sin copiar su contenido textual. */
const contentKeys = new Set([
  'text',
  'body',
  'title',
  'name',
  'message',
  'summary',
  'before',
  'after',
  'objective',
  'description',
  'memory',
  'source',
  'bio',
  'instruction',
  'url',
  'resolvedUrl',
]);
export function traceInput(input: unknown, key = ''): unknown {
  if (contentKeys.has(key) && typeof input === 'string')
    return { redacted: true, characters: input.length };
  if (Array.isArray(input)) return input.map((value) => traceInput(value, key));
  if (input !== null && typeof input === 'object')
    return Object.fromEntries(
      Object.entries(input).map(([childKey, value]) => [childKey, traceInput(value, childKey)]),
    );
  return input;
}
