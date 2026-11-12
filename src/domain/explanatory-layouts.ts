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
      shape('rectangle', 'Escalera', 485, 155, 65, 68, '#97775e');
      for (let i = 0; i < 4; i++)
        shape('rectangle', 'Peldaño ' + (i + 1), 488, 162 + i * 15, 59, 4, sand);
      text('Escalera', 466, 238, 101, 17, centered);
      text(
        'Acceso al recital   /   Desde la calle Sur, seguí el paso nivelado hasta la rampa.',
        0,
        531,
        798,
        20,
      );
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
    compose({ note, group, text }) {
      const topics = [
        {
          title: 'Encontrar el acceso',
          x: 0,
          color: mint,
          items: [
            ['E1 · Llegada', '“Di dos vueltas para encontrar la puerta.”'],
            ['E3 · Señales', '“Desde la plaza no se ve el cartel.”'],
            ['E5 · Mapa', '“El plano marcaba la oficina, no la entrada.”'],
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
      text('Aún sin patrón', 681, 140, 270, 22, bold);
      note(
        'E6 · Acompañante',
        '“Tuve que reservar los dos asientos por separado.”',
        681,
        185,
        281,
        158,
        blue,
      );
      text('Próxima entrevista', 681, 397, 285, 23, bold);
      text(
        'Preguntar cómo eligieron los asientos. Una sola mención no justifica agruparla con precio o acceso.',
        681,
        447,
        277,
        19,
      );
    },
  },
  fishbone: {
    name: 'Causa y efecto',
    title: 'Por qué llegan cajas dañadas',
    compose({ shape, note, connect, text }) {
      const joint = (x: number) => shape('ellipse', 'Unión de causas', x, 270, 16, 16, sand);
      const first = joint(236),
        second = joint(487);
      const effect = note(
        'Efecto observado',
        '6 de 30 cajas llegaron aplastadas.',
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
          cause: '¿Cedió el cartón del nuevo lote?',
        },
        {
          x: 42,
          y: 367,
          above: false,
          joint: first,
          name: 'Manipulación',
          cause: '¿El peso supera la resistencia de la base?',
        },
        {
          x: 302,
          y: 80,
          above: true,
          joint: second,
          name: 'Transporte',
          cause: '¿Se desplazó la carga al doblar?',
        },
        {
          x: 343,
          y: 367,
          above: false,
          joint: second,
          name: 'Humedad',
          cause: '¿Perdió rigidez el cartón mojado?',
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
      text('Inspección al llegar', 0, 575, 310, 24, bold);
      text(
        'Abajo: 6 dañadas de 10. Arriba: 0 de 20. Solo 2 de las 6 dañadas estaban mojadas.',
        0,
        625,
        400,
        20,
      );
      text('Siguiente despacho', 482, 575, 390, 24, bold);
      text(
        'Comparar dos pilas del mismo lote en el mismo viaje; limitar la altura de una y registrar los daños.',
        482,
        625,
        395,
        20,
      );
    },
  },
  concepts: {
    name: 'Mapa conceptual',
    title: 'Cómo se conserva la humedad',
    compose({ note, connect, text }) {
      const trees = note('Árboles', 'Copa y caída de hojas', 0, 208, 176, 146, mint);
      const shade = note('Sombra', 'Menos sol directo', 250, 76, 198, 146, blue);
      const litter = note('Hojarasca', 'Capa de hojas secas', 250, 353, 198, 146, sand);
      const evap = note('Evaporación', 'Agua que pasa al aire', 572, 76, 216, 146, blue);
      const water = note('Humedad', 'Agua en el suelo', 572, 353, 216, 146, mint);
      connect(trees, shade, 'north', 'west', 'dan');
      connect(trees, litter, 'south', 'west', 'aportan');
      connect(shade, evap, 'east', 'west', 'reduce');
      connect(litter, water, 'east', 'west', 'conserva', { path: 'straight' });
      connect(evap, water, 'south', 'north', 'disminuye');
      text('Comparación en la huerta', 0, 554, 444, 23, bold);
      text(
        'Dos canteros reciben el mismo riego y sombra. Cubrí uno con hojas secas y compará cuánta humedad conserva cada uno al día siguiente.',
        0,
        608,
        777,
        20,
      );
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
      const mat = shape('rectangle', 'Ventana de paspartú', 426, 193, 124, 156, '#e2ceaa', {
        fill: false,
        stroke: '#e2ceaa',
        thickness: 13,
      });
      const photo = picture('national-park', 'Fotografía', 625, 218, 140);
      const back = shape('rectangle', 'Trasera de cartón', 826, 251, 135, 161, '#ac896c');
      connect(frame, glass, 'east', 'west', undefined, line);
      connect(glass, mat, 'east', 'west', undefined, line);
      connect(mat, photo, 'east', 'west', undefined, line);
      connect(photo, back, 'east', 'west', undefined, line);
      const labels = [
        ['Marco', 'Sujeta los bordes', 0],
        ['Vidrio', 'Protege la foto', 204],
        ['Paspartú', 'Separa la foto del vidrio', 407],
        ['Fotografía', 'Cara impresa hacia la ventana', 608],
        ['Trasera', 'Cerrar las pestañas al final', 812],
      ] as const;
      labels.forEach(([title, detail, x]) => {
        text(title, x, 430, 176, 24, bold);
        text(detail, x, 475, 185, 18);
      });
      text('Mesa de montaje', 0, 584, 240, 22, bold);
      text(
        'Apoyá el marco boca abajo. Centrá la foto en la ventana antes de cerrar la trasera.',
        252,
        584,
        716,
        20,
      );
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
      text('Cambio a probar', 0, 610, 132, 19, bold);
      [
        'Mostrar el recorrido sin escalones antes de elegir.',
        'Reservar el asiento y el de la persona acompañante en una sola operación.',
        'Imprimir ambos lugares y el acceso en el mismo pase.',
      ].forEach((v, i) => text(v, 142 + i * 264, 610, 239, 18));
      text(
        'Criterio de éxito: completar la reserva de dos lugares contiguos sin llamar a boletería.',
        0,
        756,
        917,
        20,
        { color: mint, weight: 650 },
      );
    },
  },
  venn: {
    name: 'Diagrama de Venn',
    title: 'Quién puede retirar la carga',
    compose({ shape, text }) {
      text(
        'El depósito exige dos permisos: conducir el utilitario y firmar la salida de la carga.',
        0,
        74,
        850,
        20,
      );
      shape('ellipse', 'Conducir', 12, 200, 458, 300, '#76b4a742', { stroke: mint, thickness: 3 });
      shape('ellipse', 'Firmar', 285, 200, 458, 300, '#86adc642', { stroke: blue, thickness: 3 });
      text('Conducir', 43, 149, 236, 23, { ...centered, color: mint });
      text('Firmar la salida', 451, 149, 260, 23, { ...centered, color: blue });
      text('Solo conducir', 50, 305, 194, 18, centered);
      text('Ana y Leo', 50, 352, 194, 23, centered);
      text('Ambos', 313, 305, 131, 18, centered);
      text('Bruno', 313, 352, 131, 23, centered);
      text('Solo firmar', 511, 305, 201, 18, centered);
      text('Carla', 511, 352, 201, 23, centered);
      text('Sin permisos: Inés (en formación).', 20, 540, 701, 20);
      text(
        'Bruno falta el viernes. ¿Qué dos personas pueden cubrir juntas el retiro?',
        20,
        607,
        735,
        21,
        bold,
      );
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
      text('Del tablero al sendero', 0, 500, 608, 26, bold);
      shape('rectangle', 'Prototipo de cartel', 0, 570, 564, 131, '#324a3b');
      picture('herb', 'Identificador botánico', 18, 593, 85);
      text('Sendero de aromáticas', 122, 609, 343, 24, { color: '#f4d9a9', weight: 650 });
      text('→', 465, 587, 90, 48, { color: '#f4d9a9', weight: 700 });
      text(
        'Prueba en el cruce: ¿se distingue la dirección antes de leer el nombre?',
        595,
        588,
        203,
        18,
      );
    },
  },
} satisfies Record<string, { name: string; title: string; compose(parts: GraphicParts): void }>;
