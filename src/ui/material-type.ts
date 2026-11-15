import type { NodeData } from '../domain/model';
import type { DeepReadonly } from '../domain/readonly';
import { localNames } from '../domain/local-content';

export function materialTypeName(data: DeepReadonly<NodeData>): string {
  if (data.kind === 'local') return localNames[data.content.kind] + ' · copia local';
  if (data.kind === 'reference')
    return { document: 'Documento', file: 'Archivo', task: 'Tarea de Board', agent: 'Agente' }[
      data.ref.kind
    ];
  return {
    bars: 'Gráfico',
    wireframe: 'Bosquejo',
    text: 'Texto',
    note: 'Nota',
    shape: 'Forma',
    drawing: 'Dibujo',
    image: 'Imagen',
    video: 'Video',
    pdf: 'PDF',
    link: 'Enlace',
  }[data.kind];
}
