import { createArrow, editArrow } from '../../src/domain/free-arrow';
import { label, note, image } from './materiales';

export function truckJourney(compact: boolean) {
  const origin = compact ? { x: -82, y: -166 } : { x: 225, y: -66 };
  const destination = compact ? { x: -169, y: 187 } : { x: -470, y: 66 };
  const truck = compact ? { x: 15, y: -16, size: 101 } : { x: -85, y: -64, size: 166 };
  const start = compact ? { x: 151, y: -52 } : { x: 451, y: 60 };
  const end = compact ? { x: -131, y: 146 } : { x: -207, y: 92 };
  const bend = compact ? { x: 52, y: 88 } : { x: 70, y: 87 };
  const route = createArrow('recorrido', start, end, true, '#f3ae63', compact ? 5 : 8);
  return {
    width: compact ? 366 : 1000,
    height: compact ? 738 : 550,
    nodes: [
      editArrow(route, 'bend', bend),
      label(
        'titulo',
        'De la huerta al mercado',
        compact ? -170 : -470,
        compact ? -344 : -232,
        compact ? 350 : 940,
        compact ? 30 : 57,
        '#fff0d9',
        600,
        true,
      ),
      label(
        'bajada',
        'Un día de viaje para que la frutilla llegue fresca.',
        compact ? -169 : -470,
        compact ? -294 : -153,
        compact ? 343 : 910,
        compact ? 17 : 22,
        '#ced6d7',
      ),
      note('origen', 'Cosecha', 'Cajas preenfriadas.', origin.x, origin.y, '#f2d9be'),
      note(
        'destino',
        'Entrega',
        'Fruta lista para exhibir.',
        destination.x,
        destination.y,
        '#cfe6d8',
      ),
      image('frutilla', 'Frutilla', origin.x + 184, origin.y - 25, 69),
      image('mercado', 'Mercado', destination.x + 169, destination.y - 33, 82),
      image('camion', 'Camión refrigerado', truck.x, truck.y, truck.size),
      label('etapa-1', '06:00  ·  EN ORIGEN', origin.x + 2, origin.y - 31, 230, 18, '#f3b978', 700),
      label(
        'etapa-3',
        '18:00  ·  EN DESTINO',
        destination.x + 2,
        destination.y - 31,
        230,
        18,
        '#acd7c1',
        700,
      ),
      label(
        'frio',
        '4 °C en tránsito',
        compact ? -160 : -90,
        compact ? 81 : 116,
        compact ? 200 : 245,
        compact ? 20 : 26,
        '#fff0d9',
        600,
        true,
      ),
    ],
  };
}
