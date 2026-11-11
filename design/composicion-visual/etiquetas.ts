import type { Material } from '../../src/domain/model';
import { createArrow, editArrow } from '../../src/domain/free-arrow';
import { image, label } from './materiales';

// Dos diseños del mismo envase. Tanto los paquetes como sus anotaciones son piezas del Canvas.
export function compareLabels(stacked: boolean) {
  const x = stacked ? -196 : -427;
  const heading = stacked ? -342 : -220;
  const nodes: Material[] = [
    label(
      'titulo',
      'El frío, de un vistazo',
      x,
      heading,
      stacked ? 400 : 850,
      stacked ? 35 : 52,
      '#fff0d9',
      600,
      true,
    ),
    label(
      'bajada',
      'Dos etiquetas para la misma caja de frutillas.',
      x + 1,
      heading + (stacked ? 50 : 74),
      stacked ? 400 : 850,
      stacked ? 17 : 22,
      '#ced6d7',
    ),
  ];
  function pack(id: string, left: number, top: number, proposed: boolean) {
    const dark = '#283438',
      accent = proposed ? '#acd7c1' : '#f3b978';
    nodes.push(
      label(
        id + '-variante',
        proposed ? 'Propuesta' : 'Etiqueta actual',
        left,
        top - 42,
        385,
        23,
        accent,
        650,
      ),
      {
        id: id + '-papel',
        x: left,
        y: top,
        width: 392,
        height: 156,
        owner: null,
        data: {
          kind: 'shape',
          shape: 'rectangle',
          title: 'Papel de la etiqueta',
          fill: true,
          color: proposed ? '#ddebdc' : '#f1dec8',
          stroke: proposed ? '#ddebdc' : '#f1dec8',
          thickness: 1,
        },
      },
      image(id + '-fruta', 'Frutilla', left + 270, top + 30, 103, 'frutilla'),
      label(
        id + '-producto',
        'Frutillas',
        left + 24,
        top + 16,
        238,
        proposed ? 23 : 42,
        dark,
        600,
        true,
      ),
      label(
        id + '-frio',
        proposed ? '4 °C' : 'Conservar a 4 °C',
        left + 24,
        top + (proposed ? 49 : 104),
        240,
        proposed ? 51 : 17,
        dark,
        proposed ? 750 : 400,
      ),
      label(
        id + '-peso',
        proposed ? 'Peso neto · 250 g' : '250 g',
        left + 24,
        top + (proposed ? 121 : 78),
        245,
        17,
        dark,
      ),
    );
    const target = { x: left + (proposed ? 171 : 176), y: top + (proposed ? 93 : 116) };
    const callout = createArrow(
      id + '-flecha',
      { x: left + 219, y: top + 192 },
      target,
      true,
      proposed ? '#4c8768' : '#a67341',
      3,
    );
    nodes.push(
      editArrow(callout, 'bend', { x: left + 209, y: top + 144 }),
      label(
        id + '-observacion',
        proposed ? 'La temperatura se lee primero.' : 'El frío queda entre los datos secundarios.',
        left,
        top + 202,
        394,
        18,
        accent,
        550,
      ),
    );
  }
  pack('actual', x, stacked ? -192 : -38, false);
  pack('propuesta', stacked ? x : 35, stacked ? 97 : -38, true);
  return { nodes, width: stacked ? 408 : 866, height: stacked ? 730 : 490 };
}
