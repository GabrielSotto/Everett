import type { Command } from '../command-types';
import { getWorld, need, type State } from '../model';
import { captureCanvasCopies, insertCanvasCopies } from '../canvas-copies';
import { ensure } from '../invariants';
import { validLocalContent, publicationNameError } from '../local-content';

type CopyCommand = Extract<
  Command,
  {
    type: 'node.duplicate' | 'nodes.duplicate' | 'nodes.paste' | 'node.local-edit' | 'node.publish';
  }
>;

export function applyCopyCommand(state: State, command: CopyCommand): void {
  const world = getWorld(state, command.world);
  const uid = (): string => `e-${++state.seq}`;
  if (command.type === 'node.duplicate' || command.type === 'nodes.duplicate') {
    const ids = command.type === 'node.duplicate' ? [command.id] : command.nodes;
    insertCanvasCopies(
      world,
      captureCanvasCopies(world, ids),
      uid,
      command.type === 'node.duplicate' ? { x: 28, y: 28 } : command.offset,
    );
    return;
  }
  if (command.type === 'nodes.paste') {
    insertCanvasCopies(world, command.clipboard, uid, command.offset);
    return;
  }
  const node = need(
    world.nodes.find((node) => node.id === command.id),
    'Material no disponible',
  );
  ensure(
    !node.owner && node.data.kind === 'local',
    'LOCAL_MATERIAL',
    'Esta copia no está disponible para editar.',
  );
  if (node.data.kind !== 'local') return;
  if (command.type === 'node.local-edit') {
    ensure(
      validLocalContent(command.content) && command.content.kind === node.data.content.kind,
      'LOCAL_CONTENT',
      'El contenido de la copia no es válido.',
    );
    node.data = { kind: 'local', title: command.title, content: structuredClone(command.content) };
    return;
  }
  const title = command.name.trim();
  ensure(title.length > 0, 'NAME', 'Ingresá un nombre para la copia.');
  const content = node.data.content;
  const nameError = publicationNameError(world, content.kind, title);
  ensure(
    !nameError,
    content.kind === 'file' ? 'FILE_NAME' : 'NAME',
    nameError ?? 'Nombre inválido.',
  );
  const id = uid();
  if (content.kind === 'document') {
    world.docs.push({
      id,
      title,
      body: content.body,
      sheet: content.sheet?.map((row) => [...row]) ?? null,
    });
    node.data = { kind: 'reference', ref: { kind: 'document', id } };
  } else if (content.kind === 'file') {
    world.files.push({ id, name: title, text: content.text, saved: content.text, revision: 0 });
    node.data = { kind: 'reference', ref: { kind: 'file', id } };
  } else if (content.kind === 'task') {
    world.tasks.push({ ...structuredClone(content.task), id, title, origin: 'canvas' });
    node.data = { kind: 'reference', ref: { kind: 'task', id } };
  } else {
    ensure(false, 'PUBLISH_AGENT', 'La copia de un agente se conserva como material local.');
  }
  if (
    state.route.kind === 'material' &&
    state.route.world === world.id &&
    state.route.entity === node.id
  ) {
    const index = state.history.findLastIndex(
      (frame) =>
        frame.route.kind === 'surface' &&
        frame.route.world === world.id &&
        frame.route.surface === 'canvas',
    );
    const frame = state.history[index];
    state.route = { kind: 'surface', world: world.id, surface: 'canvas', entity: null };
    if (frame) {
      state.camera = { ...frame.camera };
      state.history.splice(index);
    }
  }
}
