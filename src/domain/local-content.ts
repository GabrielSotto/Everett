import { statuses, surfaces, type LocalContent, type WorldSnapshot } from './model';

export function publicationNameError(
  world: WorldSnapshot,
  kind: LocalContent['kind'],
  name: string,
): string | null {
  const title = name.trim();
  if (!title) return 'Ingresá un nombre para la copia.';
  if (kind !== 'file') return null;
  if (title.includes('..') || title.startsWith('/') || /[<>:"|?*\\]/.test(title))
    return 'Usá una ruta relativa válida, por ejemplo src/alternativa.ts.';
  if (world.files.some((file) => file.name === title))
    return 'Ya existe un archivo con esa ruta en Code. Elegí otra ruta.';
  return null;
}

export function localText(content: LocalContent): string {
  switch (content.kind) {
    case 'document':
      return content.sheet ? content.sheet.map((row) => row.join('\t')).join('\n') : content.body;
    case 'file':
      return content.text;
    case 'task':
      return content.task.description;
    case 'agent':
      return content.agent.role;
  }
}

export const localNames = { document: 'Documento', file: 'Código', task: 'Tarea', agent: 'Agente' };

/** Frontera compartida por persistencia y portapapeles; no confiar en datos externos. */
export function validLocalContent(value: unknown): value is LocalContent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.kind === 'document')
    return (
      typeof v.body === 'string' &&
      (v.sheet === null ||
        (Array.isArray(v.sheet) &&
          v.sheet.every(
            (row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'),
          )))
    );
  if (v.kind === 'file') return typeof v.text === 'string';
  if (v.kind === 'task') {
    if (!v.task || typeof v.task !== 'object') return false;
    const task = v.task as Record<string, unknown>;
    return (
      ['description', 'priority', 'assignee', 'creator', 'start', 'due'].every(
        (key) => typeof task[key] === 'string',
      ) &&
      statuses.some((status) => status === task.status) &&
      ['blocker', 'required', 'later'].includes(String(task.shipping)) &&
      surfaces.some((surface) => surface === task.origin) &&
      !!task.custom &&
      typeof task.custom === 'object' &&
      !Array.isArray(task.custom) &&
      Object.values(task.custom).every((x) => typeof x === 'string')
    );
  }
  if (v.kind === 'agent') {
    if (!v.agent || typeof v.agent !== 'object') return false;
    const agent = v.agent as Record<string, unknown>;
    return (
      typeof agent.role === 'string' &&
      typeof agent.color === 'string' &&
      typeof agent.active === 'boolean' &&
      [agent.capabilities, agent.memory].every(
        (items) => Array.isArray(items) && items.every((x) => typeof x === 'string'),
      )
    );
  }
  return false;
}
