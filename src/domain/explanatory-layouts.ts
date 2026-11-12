import type { GraphicParts } from './graphic-layouts';

const mint = '#b9dbc9',
  sand = '#f0cba2',
  blue = '#b5d3e4',
  ink = '#e6edef';
const bold = { weight: 650 } as const;
const centered = { align: 'center', weight: 650 } as const;
const line = { path: 'straight', direction: 'none' } as const;

export const explanatoryLayouts = {
  floorplan: {
    name: 'Plano de orientación',
    title: 'Cómo llegar al escenario',
    compose({ shape, text, picture, connect }) {
      // Dejar el interior libre para seleccionar o reconectar los tramos de la ruta.
      shape('rectangle', 'Límite norte', 0, 85, 800, 4, '#829497');
      shape('rectangle', 'Límite sur', 0, 483, 800, 4, '#829497');
      shape('rectangle', 'Límite este', 796, 85, 4, 402, '#829497');
      shape('rectangle', 'Límite oeste', 0, 85, 4, 209, '#829497');
      shape('rectangle', 'Plaza de puestos', 245, 125, 195, 120, '#4c6666');
      text('Puestos', 266, 171, 152, 23, centered);
      const gate = picture('door', 'Entrada accesible', 26, 314, 67);
      text('Entrada accesible', 15, 398, 196, 19, bold);
      const turn = shape('ellipse', 'Giro junto a la plaza', 489, 343, 14, 14, sand);
      const stage = picture('performing-arts', 'Escenario', 630, 130, 82);
      text('Escenario', 595, 91, 155, 21, centered);
      picture('deciduous-tree', 'Jardín', 84, 125, 62);
      text('Jardín', 71, 198, 94, 18, centered);
      connect(gate, turn, 'east', 'west', 'Paso nivelado', {
        path: 'straight',
        direction: 'forward',
      });
      connect(turn, stage, 'east', 'south', 'Rampa', { path: 'straight', direction: 'forward' });
    },
  },
  affinity: {
    name: 'Diagrama de afinidad',
    title: 'Qué se repite en las entrevistas',
    compose({ note, group }) {
      const topics = [
        {
          title: 'Encontrar el acceso',
          x: 0,
          color: mint,
          items: [
            ['E1 · Llegada', '“Di dos vueltas para encontrar la puerta.”'],
            ['E3 · Señales', '“Desde la plaza no se ve el cartel.”'],
          ],
        },
        {
          title: 'Entender el precio',
          x: 337,
          color: sand,
          items: [
            ['E2 · Reserva', '“El total cambió en el último paso.”'],
            ['E4 · Pago', '“No sabía si incluía el envío.”'],
          ],
        },
      ];
      for (const topic of topics) {
        const ids = topic.items.map(([title, body], i) =>
          note(title!, body!, topic.x, 185 + i * 180, 281, 158, topic.color),
        );
        group(topic.title, ids);
      }
    },
  },
  fishbone: {
    name: 'Causa y efecto',
    title: 'Por qué llegan cajas dañadas',
    compose({ shape, note, connect }) {
      const joint = (x: number) => shape('ellipse', 'Unión de causas', x, 270, 16, 16, sand);
      const first = joint(236),
        second = joint(487);
      const effect = note(
        'Efecto observado',
        'Cajas aplastadas al recibir el pedido.',
        650,
        220,
        235,
        158,
        sand,
      );
      connect(first, second, 'east', 'west', undefined, line);
      connect(second, effect, 'east', 'west', undefined, { path: 'straight' });
      const branches = [
        {
          x: 8,
          y: 80,
          above: true,
          joint: first,
          name: 'Embalaje',
          cause: 'Cartón de baja resistencia.',
        },
        {
          x: 42,
          y: 367,
          above: false,
          joint: first,
          name: 'Manipulación',
          cause: 'Apilado sin límite de altura.',
        },
        {
          x: 302,
          y: 80,
          above: true,
          joint: second,
          name: 'Transporte',
          cause: 'La carga se mueve en las curvas.',
        },
        {
          x: 343,
          y: 367,
          above: false,
          joint: second,
          name: 'Humedad',
          cause: 'El depósito moja la base.',
        },
      ];
      for (const b of branches) {
        const id = note(b.name, b.cause, b.x, b.y, 226, 165, blue);
        connect(
          id,
          b.joint,
          b.above ? 'south' : 'north',
          b.above ? 'north' : 'south',
          undefined,
          line,
        );
      }
    },
  },
  concepts: {
    name: 'Mapa conceptual',
    title: 'Cómo se conserva la humedad',
    compose({ note, connect }) {
      const trees = note('Árboles', 'Copa y raíces', 0, 208, 176, 146, mint);
      const shade = note('Sombra', 'Menos sol directo', 250, 76, 198, 146, blue);
      const roots = note('Raíces', 'Poros en el suelo', 250, 353, 198, 146, sand);
      const evap = note('Evaporación', 'Agua que pasa al aire', 572, 76, 216, 146, blue);
      const water = note('Humedad', 'Agua en el suelo', 572, 353, 216, 146, mint);
      connect(trees, shade, 'north', 'west', 'dan');
      connect(trees, roots, 'south', 'west', 'tienen');
      connect(shade, evap, 'east', 'west', 'reduce');
      connect(roots, water, 'east', 'west', 'retienen');
      connect(evap, water, 'south', 'north', 'disminuye');
    },
  },
  exploded: {
    name: 'Despiece de montaje',
    title: 'Cómo encaja un portarretratos',
    compose({ shape, text, picture, connect }) {
      const frame = shape('rectangle', 'Marco con hueco', 12, 132, 135, 161, '#dcac73', {
        fill: false,
        stroke: '#dcac73',
        thickness: 8,
      });
      const glass = shape('rectangle', 'Vidrio', 220, 167, 135, 161, '#8fc7d336', {
        stroke: '#96cbd7',
        thickness: 3,
      });
      const photo = picture('national-park', 'Fotografía', 434, 194, 145);
      const back = shape('rectangle', 'Trasera de cartón', 657, 236, 135, 161, '#ac896c');
      connect(frame, glass, 'east', 'west', undefined, line);
      connect(glass, photo, 'east', 'west', undefined, line);
      connect(photo, back, 'east', 'west', undefined, line);
      const labels = [
        ['Marco', 'Sujeta los bordes', 0],
        ['Vidrio', 'Protege la foto', 204],
        ['Fotografía', 'Mira al vidrio', 424],
        ['Trasera', 'Cierra el marco', 641],
      ] as const;
      labels.forEach(([title, detail, x]) => {
        text(title, x, 430, 176, 24, bold);
        text(detail, x, 475, 185, 18);
      });
    },
  },
  journey: {
    name: 'Mapa de experiencia',
    title: 'Reservar una entrada accesible',
    compose({ text, note }) {
      text('Persona: visitante que usa silla de ruedas', 0, 75, 700, 21, { color: mint });
      const stages = [
        [
          'Elegir función',
          'Busca una función con acceso sin escalones.',
          'El símbolo no explica por dónde entrar.',
          'E1 · “¿Es accesible toda la sala?”',
        ],
        [
          'Elegir asiento',
          'Busca dos lugares contiguos.',
          'El mapa separa a su acompañante.',
          'E2 · Abandonó al elegir la fila.',
        ],
        [
          'Confirmar',
          'Revisa el ingreso y guarda el pase.',
          'El acceso figura en la confirmación.',
          'E3 · Guardó el plano del acceso.',
        ],
      ];
      ['Etapa', 'Acción', 'Experiencia', 'Evidencia'].forEach((name, i) =>
        text(name, 0, [140, 206, 310, 504][i]!, 130, 18, { color: mint, weight: 650 }),
      );
      stages.forEach(([name, action, friction, evidence], i) => {
        const x = 142 + i * 264;
        text(name!, x, 133, 245, 22, bold);
        text(action!, x, 203, 232, 18);
        note(i === 2 ? 'Ayuda' : 'Fricción', friction!, x, 296, 240, 178, i === 2 ? mint : sand);
        text(evidence!, x, 499, 249, 17);
      });
    },
  },
  venn: {
    name: 'Diagrama de Venn',
    title: 'Qué se repara y qué se recicla',
    compose({ shape, text }) {
      shape('ellipse', 'Reparables', 12, 120, 458, 330, '#76b4a742', {
        stroke: mint,
        thickness: 3,
      });
      shape('ellipse', 'Reciclables', 285, 120, 458, 330, '#86adc642', {
        stroke: blue,
        thickness: 3,
      });
      text('Reparables', 55, 75, 240, 25, { ...centered, color: mint });
      text('Reciclables', 458, 75, 240, 25, { ...centered, color: blue });
      text('Solo reparar', 47, 229, 202, 18, centered);
      text('Calzado de cuero', 44, 278, 212, 20, centered);
      text('Ambos', 313, 229, 131, 18, centered);
      text('Bicicleta', 313, 278, 131, 20, centered);
      text('Solo reciclar', 511, 229, 201, 18, centered);
      text('Lata vacía', 511, 278, 201, 20, centered);
    },
  },
  moodboard: {
    name: 'Tablero de referencias',
    title: 'Señalética para el jardín',
    compose({ picture, text, shape }) {
      const refs = [
        [
          'fallen-leaf',
          'Hoja seca',
          'Color',
          'Ocres sobre verde oscuro para los hitos del sendero.',
        ],
        [
          'compass',
          'Brújula',
          'Orientación',
          'Una punta clara para indicar el rumbo de cada cruce.',
        ],
        ['herb', 'Rama', 'Silueta', 'Contornos simples que se reconozcan a distancia.'],
      ];
      refs.forEach(([asset, name, topic, reason], i) => {
        const x = i * 267;
        shape(
          'rectangle',
          name! + ' · muestra',
          x,
          88,
          239,
          174,
          ['#384b43', '#384852', '#4c4541'][i]!,
        );
        picture(asset!, name!, x + 60, 105, 132);
        text(topic!, x, 286, 235, 25, bold);
        text(reason!, x, 337, 228, 19, { color: ink });
      });
    },
  },
} satisfies Record<string, { name: string; title: string; compose(parts: GraphicParts): void }>;
