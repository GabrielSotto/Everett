import type { CanvasGroup, Material, Point } from './model';
import {
  wireframeMaterial,
  wireframeNames,
  type WireframeKind,
  type WireframeAppearance,
} from './wireframes';

export const compositionKinds = ['card', 'list', 'menu', 'carousel'] as const;
export type CompositionKind = (typeof compositionKinds)[number];
export function isWireframeComposition(kind: WireframeKind): kind is CompositionKind {
  return (compositionKinds as readonly string[]).includes(kind);
}

/** Recetas de piezas normales: cada parte conserva edición, selección e historial. */
export function wireframeComposition(
  kind: CompositionKind,
  id: string,
  center: Point,
): { nodes: Material[]; group: CanvasGroup } {
  const frame = wireframeMaterial(kind, id, center);
  const nodes: Material[] = [];
  const piece = (
    name: string,
    type: WireframeKind,
    x: number,
    y: number,
    width: number,
    height: number,
    text?: string,
    appearance?: WireframeAppearance,
  ): Material => {
    const node = wireframeMaterial(type, nodes.length ? id + '-' + name : id, center);
    Object.assign(node, { x: frame.x + x, y: frame.y + y, width, height });
    if (node.data.kind === 'wireframe' && node.data.content.type !== 'table') {
      if (text !== undefined) Object.assign(node.data.content, { text, placeholder: false });
      if (appearance) node.data.content.appearance = appearance;
    }
    nodes.push(node);
    return node;
  };
  if (kind === 'card') {
    piece('fondo', 'block', 0, 0, 260, 180);
    const title = piece('titulo', 'text', 16, 20, 220, 28);
    if (title.data.kind === 'wireframe') title.data.content.placeholderLines = 1;
    piece('contenido', 'text', 16, 64, 220, 64);
    piece('accion', 'button', 16, 136, 110, 32);
  } else if (kind === 'list') {
    piece('fondo', 'block', 0, 0, 240, 150);
    for (let i = 0; i < 3; i++) {
      piece('imagen-' + i, 'block', 12, 12 + i * 46, 28, 28, '', {
        fill: '#d5d8da',
        stroke: '#d5d8da',
        text: '#26323c',
        radius: 4,
      });
      piece('texto-' + i, 'text', 52, 10 + i * 46, 172, 32);
    }
  } else if (kind === 'menu') {
    piece('fondo', 'block', 0, 40, 210, 130);
    piece('desplegar', 'button', 0, 0, 210, 36, 'Menú  ⌄');
    for (let i = 0; i < 3; i++) {
      const option = piece('opcion-' + i, 'text', 14, 48 + i * 40, 182, 30);
      if (option.data.kind === 'wireframe') option.data.content.placeholderLines = 1;
    }
  } else {
    piece('fondo', 'block', 0, 0, 360, 200);
    piece('imagen', 'image', 8, 8, 344, 156, 'Imagen');
    piece('anterior', 'button', 16, 68, 28, 32, '‹');
    piece('siguiente', 'button', 316, 68, 28, 32, '›');
    for (let i = 0; i < 3; i++)
      piece('pagina-' + i, 'block', 164 + i * 12, 178, 6, 6, '', {
        fill: i === 0 ? '#485361' : '#c3c7ca',
        stroke: i === 0 ? '#485361' : '#c3c7ca',
        text: '#26323c',
        radius: 3,
      });
  }
  return {
    nodes,
    group: { id: id + '-group', name: wireframeNames[kind], nodes: nodes.map((node) => node.id) },
  };
}
