import { nodeTitle, type Assignment, type ProposalMaterial, type WorldSnapshot } from './model';
import type { DeepReadonly } from './readonly';
import { canvasProposal } from './canvas-proposal';
import { materialText } from './material-content';

/** Simulación local: los archivos conservan sus bytes; no se infiere contenido visual. */
export function proposalMaterials(
  world: WorldSnapshot,
  job: DeepReadonly<Assignment>,
  legacy = false,
): ProposalMaterial[] {
  const source = world.nodes.find((node) => node.id === job.node);
  if (!source) return [];
  const material = structuredClone(source) as ProposalMaterial['material'];
  material.id = `proposal-${job.id}-1`;
  material.owner = null;
  const result: ProposalMaterial = { material };
  const title = nodeTitle(world, source);
  const text =
    job.text ||
    canvasProposal(job.input ?? materialText(world, source), job.instruction, job.feedback);
  if (material.data.kind === 'note') {
    material.data = { ...material.data, title, text, ...(legacy ? { color: '#e4efdf' } : {}) };
    material.width = 270;
    material.height = 220;
    if (!legacy && /analiz/i.test(job.instruction) && !/breve/i.test(job.feedback ?? '')) {
      const split = text.split('\n\nPregunta para revisar\n');
      if (split[1]) {
        material.data.text = split[0]!;
        const question = structuredClone(material);
        question.id = `proposal-${job.id}-2`;
        question.data = {
          kind: 'note',
          title: 'Pregunta para revisar',
          text: split[1],
          color: '#e8e1f3',
        };
        return [result, { material: question }];
      }
    }
  } else if (material.data.kind === 'reference') {
    const reference = material.data.ref;
    if (reference.kind === 'document') {
      const document = world.docs.find((item) => item.id === reference.id);
      if (document) {
        const anchor = world.referenceAnchors?.find((a) => a.id === reference.fragment);
        if (reference.fragment) {
          // Un fragmento propone un cambio acotado; el resto del documento se conserva.
          if (anchor?.status === 'attached')
            result.document = {
              id: document.id,
              before: document.body,
              body: document.body.slice(0, anchor.start) + text + document.body.slice(anchor.end),
            };
        } else result.document = { id: document.id, body: text };
      }
    }
  }
  return [result];
}

export function proposalSummary(world: WorldSnapshot, job: DeepReadonly<Assignment>): string {
  const source = world.nodes.find((node) => node.id === job.node);
  if (!source) return 'El material de origen ya no está disponible.';
  const kind = source.data.kind;
  if (kind === 'image' || kind === 'video' || kind === 'pdf')
    return 'Organizar este archivo junto a la zona. Se conserva su contenido completo; la simulación no interpreta ni modifica sus bytes.';
  if (
    kind === 'shape' ||
    kind === 'drawing' ||
    kind === 'link' ||
    kind === 'wireframe' ||
    kind === 'local'
  )
    return 'Organizar el material conservando su tipo y contenido.';
  if (kind === 'reference' && source.data.ref.kind !== 'document')
    return 'Organizar la referencia conservando el mismo registro de origen.';
  return source.data.kind === 'reference'
    ? 'Aplicar el contenido propuesto al mismo documento de Docs después de aceptar.'
    : 'Crear las notas mostradas después de aceptar; el material recibido se conserva.';
}
