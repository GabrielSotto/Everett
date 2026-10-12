/** Simulación determinista: reorganiza el texto recibido sin inventar evidencia. */
export function canvasProposal(source: string, instruction: string, feedback = ''): string {
  const paragraphs = source
    .trim()
    .split(/\n+/)
    .map((text) => text.trim())
    .filter(Boolean);
  const sentences = paragraphs.flatMap((text) => text.split(/(?<=[.!?])\s+/)).filter(Boolean);
  if (!sentences.length)
    return 'El material no contiene texto disponible para esta instrucción. Revisá el contexto o incorporá contenido antes de aceptar.';
  const request = feedback || instruction;
  if (/resum|breve/i.test(request)) return `Resumen\n${sentences.slice(0, 2).join(' ')}`;
  const points = /concreto/i.test(request) ? sentences.slice(0, 3) : paragraphs;
  if (/analiz/i.test(instruction) && !/otro enfoque/i.test(feedback))
    return `Observaciones del material\n${points.map((text) => '• ' + text).join('\n')}\n\nPregunta para revisar\n¿Qué evidencia permite comprobar «${sentences[0]!.slice(0, 140)}»?`;
  return `Contenido organizado\n${points.map((text) => '• ' + text).join('\n')}`;
}
