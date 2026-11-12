import { explanatoryLayouts } from './explanatory-layouts';
import type { Anchor, Shape } from './model';

export interface GraphicTextStyle {
  weight?: number;
  align?: 'center' | 'left' | 'right';
  color?: string;
  serif?: boolean;
}

export interface GraphicParts {
  bars(
    title: string,
    rows: readonly import('./bar-chart').BarDatum[],
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
  text(
    value: string,
    x: number,
    y: number,
    width: number,
    size: number,
    style?: GraphicTextStyle,
  ): string;
  picture(key: string, title: string, x: number, y: number, size: number): string;
  shape(
    type: Shape,
    title: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    appearance?: { fill?: boolean; stroke?: string; thickness?: number },
  ): string;
  note(
    title: string,
    body: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ): string;
  connect(
    from: string,
    to: string,
    fromAnchor: Anchor,
    toAnchor: Anchor,
    label?: string,
    style?: Pick<import('./model').Link, 'direction' | 'path'>,
  ): void;
  group(name: string, nodes: string[]): void;
}

const apricot = '#f5be86',
  mint = '#a8d3bf',
  blue = '#accce6',
  paper = '#e9dfcd';
const caption = { weight: 650, color: apricot } as const;
const center = { align: 'center', weight: 650 } as const;

export const graphicLayouts = {
  decision: {
    name: 'Árbol de decisión',
    title: 'Qué hacer con un equipo devuelto',
    compose({ note, connect }) {
      const root = note(
        'Inspección inicial',
        '¿La carcasa está intacta?',
        390,
        88,
        256,
        143,
        paper,
      );
      const power = note(
        'Probar encendido',
        '¿Arranca con una fuente de prueba?',
        137,
        326,
        262,
        152,
        blue,
      );
      const damage = note(
        'Revisar el golpe',
        '¿Están sanos la placa y sus anclajes?',
        667,
        326,
        262,
        152,
        blue,
      );
      const ready = note(
        'Volver a uso',
        'Limpiar y registrar el número de serie.',
        0,
        589,
        242,
        161,
        mint,
      );
      const bench = note(
        'Enviar al banco',
        'Diagnosticar la falla de alimentación.',
        273,
        589,
        242,
        161,
        apricot,
      );
      const casing = note(
        'Cambiar carcasa',
        'Montar en otra carcasa y probar de nuevo.',
        551,
        589,
        242,
        161,
        paper,
      );
      const salvage = note(
        'Recuperar piezas',
        'Retirar el equipo y conservar solo los módulos sanos.',
        828,
        589,
        265,
        167,
        apricot,
      );
      for (const [parent, yes, no] of [
        [root, power, damage],
        [power, ready, bench],
        [damage, casing, salvage],
      ] as const) {
        connect(parent, yes, 'south', 'north', 'Sí');
        connect(parent, no, 'south', 'north', 'No');
      }
    },
  },
  timeline: {
    name: 'Cronología',
    title: 'La noche del festival',
    compose({ text, shape }) {
      text('Sábado   /   Programa de sala y regreso en micro', 0, 67, 815, 22);
      const events = [
        ['18:00', 'Abren las puertas', 'Ingreso por la plaza.'],
        ['18:40', 'Prueba de sonido', 'La sala sigue abierta durante la prueba.'],
        ['19:00', 'Aviso de demora', 'Se anuncia el nuevo horario al público.'],
        ['19:45', 'Empieza el recital', 'Duración prevista: 90 minutos.'],
        ['21:00', 'Último micro', 'Sale de la plaza aunque siga el recital.'],
        ['21:15', 'Cierre del recital', 'La salida peatonal queda abierta.'],
      ] as const;
      shape('rectangle', 'Orden de los hitos', 112, 159, 4, 379, blue);
      events.forEach(([time, name, detail], i) => {
        const y = 139 + i * 75;
        const color = i === 4 ? apricot : mint;
        shape('ellipse', name + ' · hito', 103, y + 11, 22, 22, color);
        text(time, 0, y, 94, 25, { weight: 650, color });
        text(name, 156, y, 275, 24, { weight: 650 });
        text(detail, 448, y + 2, 418, 19);
      });
    },
  },
  priority: {
    name: 'Matriz de prioridades',
    title: 'Qué resolver antes de la preventa',
    compose({ text, note, shape }) {
      text('La tienda tiene dos jornadas libres antes de abrir las ventas.', 0, 68, 940, 21);
      text('Hasta dos jornadas', 172, 137, 387, 23, center);
      text('Más de dos jornadas', 604, 137, 393, 23, center);
      shape('rectangle', 'División por esfuerzo', 568, 184, 4, 510, '#71868a');
      shape('rectangle', 'División por impacto', 140, 510, 864, 4, '#71868a');
      text('Impide\ncomprar', 0, 275, 135, 22, caption);
      text('Se puede\ncontinuar', 0, 562, 139, 22, caption);
      note(
        'Mostrar el envío',
        '1 jornada · 38 abandonos al ver el total.',
        157,
        194,
        395,
        145,
        mint,
      );
      note(
        'Recuperar la clave',
        '2 jornadas · 12 abandonos por clave vencida.',
        157,
        348,
        395,
        145,
        mint,
      );
      note('Unificar stock', '8 jornadas · Se venden lugares agotados.', 590, 231, 406, 151, blue);
      note(
        'Aclarar la fecha',
        '1 jornada · Evita consultas al soporte.',
        157,
        540,
        395,
        137,
        paper,
      );
      note(
        'Renovar iconos',
        '5 jornadas · El flujo actual se entiende.',
        590,
        540,
        406,
        137,
        apricot,
      );
      text('Decisión pendiente', 0, 725, 261, 23, caption);
      text(
        '¿Qué cambio recuperaría más compras esta semana? Las estimaciones vienen de los abandonos de la prueba piloto.',
        276,
        725,
        725,
        20,
      );
    },
  },
  handoff: {
    name: 'Carriles por equipo',
    title: 'Quién avisa que el pedido salió',
    compose({ text, note, shape, connect }) {
      const divider = (y: number) =>
        shape('rectangle', 'Límite de carril', 0, y, 1060, 4, '#6d8589');
      text('Tienda', 0, 164, 130, 23, caption);
      text('Depósito', 0, 374, 130, 23, caption);
      text('Correo', 0, 582, 130, 23, caption);
      divider(279);
      divider(491);
      const paid = note('Validar pago', 'Liberar la orden de retiro.', 150, 107, 228, 142, paper);
      const pack = note('Armar paquete', 'Pesar y cerrar la caja.', 392, 316, 238, 146, mint);
      const scan = note('Retirar', 'Escanear al subirla al móvil.', 641, 534, 244, 151, blue);
      const notify = note(
        'Avisar al cliente',
        'Enviar la guía para consultar el envío.',
        819,
        107,
        245,
        150,
        paper,
      );
      connect(paid, pack, 'south', 'west', 'Orden pagada');
      connect(pack, scan, 'south', 'west', 'Bulto listo');
      connect(scan, notify, 'east', 'south', 'Guía de retiro');
    },
  },
  hierarchy: {
    name: 'Mapa jerárquico',
    title: 'El equipo del festival',
    compose({ note, connect }) {
      const lead = note('Coordinación', 'Agenda y recursos', 315, 78, 210, 122, apricot);
      const stage = note('Programación', 'Arma la cartelera.', 98, 246, 210, 122, blue);
      const floor = note('Producción', 'Prepara el predio.', 532, 246, 210, 122, blue);
      connect(lead, stage, 'south', 'north');
      connect(lead, floor, 'south', 'north');
      const crews = [
        [stage, 'Artistas', 'Convocatoria'],
        [stage, 'Horarios', 'Turnos y ensayos'],
        [floor, 'Escenario', 'Sonido y luces'],
        [floor, 'Accesos', 'Ingreso y salidas'],
      ] as const;
      const branches = crews.map(([parent, title, body], i) => {
        const team = note(title, body, i * 216, 422, 194, 122, paper);
        connect(parent, team, 'south', 'north');
        return team;
      });
      const sound = note('Sonido', 'Consola y prueba de micrófonos.', 341, 661, 220, 155, paper);
      const light = note('Luces', 'Potencia y focos del escenario.', 628, 661, 220, 155, paper);
      connect(branches[2]!, sound, 'south', 'north');
      connect(branches[2]!, light, 'south', 'north');
    },
  },
  story: {
    name: 'Storyboard',
    title: 'El desvío al festival',
    compose({ text, picture, shape }) {
      text('Guion de acceso   /   Una ciclista llega por primera vez al predio.', 0, 68, 925, 21);
      const scenes = [
        [
          'General',
          'La llegada',
          'La ciclista avista el predio desde la plaza.',
          'deciduous-tree',
          'stadium',
          'bicycle',
          52,
          46,
        ],
        [
          'Medio',
          'La barrera',
          'Se detiene frente a la puerta cerrada.',
          'stop-sign',
          'door',
          'bicycle',
          73,
          74,
        ],
        ['Detalle', 'La pista', 'Un cartel indica el acceso lateral.', 'label', 'door', null, 0, 0],
        [
          'Seguimiento',
          'El rodeo',
          'Bordea la plaza en la dirección del cartel.',
          'deciduous-tree',
          'deciduous-tree',
          'bicycle',
          126,
          67,
        ],
        [
          'Medio',
          'El encuentro',
          'Una voluntaria le muestra la entrada.',
          'door',
          'waving-hand',
          'bicycle',
          44,
          67,
        ],
        [
          'General',
          'Adentro',
          'Estaciona la bici y entra al recital.',
          'stadium',
          'performing-arts',
          'bicycle',
          16,
          37,
        ],
      ] as const;
      scenes.forEach(([shot, title, action, left, right, bike, bx, size], i) => {
        const x = (i % 3) * 321,
          y = 137 + Math.floor(i / 3) * 315;
        text(String(i + 1).padStart(2, '0') + '   /   ' + shot, x, y, 287, 17, caption);
        shape('rectangle', 'Plano · ' + title, x, y + 38, 294, 143, i < 3 ? '#d6d6bc' : '#bad3c4');
        if (i !== 2) {
          shape(
            'rectangle',
            title + ' · suelo',
            x + 1,
            y + 137,
            292,
            43,
            i < 3 ? '#bdc5aa' : '#96bba9',
          );
          if (i === 1) {
            shape('rectangle', 'Valla en el acceso A', x + 120, y + 120, 77, 12, '#825448');
            shape('rectangle', 'Poste de valla', x + 177, y + 128, 5, 38, '#825448');
          }
        }
        if (i === 2) {
          shape('rectangle', 'Cartel de desvío', x + 30, y + 63, 234, 84, '#224c45');
          text('Acceso B  →', x + 48, y + 82, 202, 28, { color: '#fff3d7', weight: 700 });
        } else {
          picture(left, title + ' · entorno', x + 15, y + 52, i === 0 || i === 5 ? 67 : 83);
          picture(right, title + ' · destino', x + 190, y + 50, i === 0 || i === 5 ? 83 : 67);
          if (bike) picture(bike, 'Ciclista · ' + title, x + bx, y + 176 - size, size);
        }
        text(title, x, y + 197, 286, 25, { weight: 700 });
        text(action, x, y + 240, 286, 18);
      });
    },
  },
  identity: {
    name: 'Composición de marca',
    title: 'Marea · Escuela de navegación',
    compose({ text, shape }) {
      const sea = '#234c55',
        foam = '#aedbc9',
        chalk = '#f1e8d4';
      const reversed = { color: sea, weight: 650 };
      const sail = (x: number, y: number, size: number, ground: string, mark: string) => {
        shape('ellipse', 'Disco marino', x, y, size, size, ground);
        shape('triangle', 'Vela', x + size * 0.23, y + size * 0.15, size * 0.52, size * 0.56, mark);
        shape(
          'rectangle',
          'Línea de flotación',
          x + size * 0.19,
          y + size * 0.75,
          size * 0.62,
          size * 0.055,
          mark,
        );
      };
      text(
        'Para quienes suben a un velero por primera vez. Una voz serena y directa.',
        0,
        69,
        900,
        21,
      );
      shape('rectangle', 'Cartel de muelle', 0, 132, 600, 222, chalk);
      sail(26, 188, 106, sea, foam);
      text('Marea', 154, 158, 390, 64, { ...reversed, serif: true });
      text('Escuela de navegación', 160, 250, 406, 24, reversed);
      text('Muelle 2   /   Embarque', 160, 296, 412, 18, { color: sea });
      text('Avatar', 638, 134, 192, 22, caption);
      sail(649, 183, 86, foam, sea);
      text('Solo el símbolo', 638, 288, 240, 19);
      // A 32 px se conserva la vela y se omite la línea fina del logo de muelle.
      shape('ellipse', 'Avatar a 32 px', 802, 209, 32, 32, foam);
      shape('triangle', 'Vela simplificada', 810, 216, 16, 16, sea);
      text('32 px', 788, 257, 82, 17, center);
      text('Paleta en uso', 0, 395, 380, 27, { weight: 700 });
      const colors = [
        [sea, 'Mar', 'Tinta y símbolo'],
        [foam, 'Espuma', 'Acentos'],
        [chalk, 'Vela', 'Fondos'],
      ] as const;
      colors.forEach(([color, name, role], i) => {
        const x = i * 152;
        shape('rectangle', name, x, 456, 131, 42, color);
        text(name, x, 511, 134, 21, { weight: 650 });
        text(role, x, 548, 150, 17);
        text(color.toUpperCase(), x, 584, 145, 16, { color: paper });
      });
      text('Tipografía y voz', 486, 395, 402, 27, { weight: 700 });
      text('Titular  /  Serif', 486, 449, 410, 17, caption);
      text('Tu primera travesía', 486, 485, 410, 34, { serif: true, weight: 700 });
      text('Indicaciones  /  Sans serif', 486, 550, 410, 17, caption);
      text('Traé abrigo. Te esperamos en el muelle.', 486, 584, 410, 20);
    },
  },
  bars: {
    name: 'Barras comparativas',
    title: 'Cómo llega el público',
    compose({ bars, text }) {
      text('Encuesta de salida   /   Sábado en la plaza', 0, 75, 720, 22, caption);
      bars(
        'Personas encuestadas',
        [
          { label: 'A pie', value: 40 },
          { label: 'Bicicleta', value: 30 },
          { label: 'Colectivo', value: 20 },
          { label: 'Auto', value: 10 },
          { label: 'Moto', value: 0 },
          { label: 'Combi', value: null },
        ],
        0,
        147,
        740,
        390,
      );
      text(
        'Cada visitante declara un solo medio principal. La encuesta registra personas, no la cantidad de viajes.',
        0,
        564,
        735,
        19,
      );
    },
  },
  ...explanatoryLayouts,
} satisfies Record<string, { name: string; title: string; compose(parts: GraphicParts): void }>;
