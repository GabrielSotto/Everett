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
    title: '¿Se puede reparar?',
    compose({ note, connect }) {
      const root = note('Evaluar la pieza', '¿La carcasa está intacta?', 196, 84, 244, 112, paper);
      const repair = note(
        'Reparar',
        'Cambiar el módulo y probar el equipo.',
        0,
        292,
        228,
        146,
        mint,
      );
      const recycle = note(
        'Recuperar piezas',
        'Separar los componentes aprovechables.',
        408,
        292,
        228,
        146,
        apricot,
      );
      connect(root, repair, 'south', 'north', 'Sí');
      connect(root, recycle, 'south', 'north', 'No');
    },
  },
  timeline: {
    name: 'Cronología',
    title: 'Una noche de observación',
    compose({ text, shape }) {
      shape('rectangle', 'Línea de tiempo', 72, 195, 584, 5, blue);
      const events = [
        ['19:30', 'Preparación', 'Nivelar el trípode.'],
        ['21:00', 'Observación', 'Apuntar a Saturno.'],
        ['22:30', 'Registro', 'Anotar lo observado.'],
      ] as const;
      events.forEach(([time, name, detail], i) => {
        const x = i * 285;
        shape('ellipse', 'Hito', x + 64, 185, 24, 24, apricot);
        text(time, x, 130, 152, 26, { ...center, color: apricot });
        text(name, x, 234, 230, 25, { weight: 650 });
        text(detail, x, 284, 240, 20);
      });
    },
  },
  priority: {
    name: 'Matriz de prioridades',
    title: 'Qué mejorar primero',
    compose({ text, note }) {
      text('Impacto alto', 0, 166, 145, 19, caption);
      text('Impacto bajo', 0, 339, 145, 19, caption);
      text('Poco esfuerzo', 160, 86, 234, 22, center);
      text('Mucho esfuerzo', 422, 86, 234, 22, center);
      note('Hacer ahora', 'Aclarar el costo de envío.', 160, 140, 234, 144, mint);
      note('Planificar', 'Unificar los dos inventarios.', 422, 140, 234, 144, blue);
      note('Si queda tiempo', 'Ordenar las etiquetas.', 160, 308, 234, 144, paper);
      note('Postergar', 'Redibujar todos los íconos.', 422, 308, 234, 144, apricot);
    },
  },
  handoff: {
    name: 'Carriles por equipo',
    title: 'Del pedido a la entrega',
    compose({ text, note, shape, connect }) {
      text('Tienda', 0, 118, 114, 23, caption);
      text('Depósito', 0, 292, 114, 23, caption);
      shape('rectangle', 'División entre equipos', 0, 240, 800, 4, '#81909a');
      const order = note('Confirmar', 'Verificar el pago.', 140, 84, 182, 112, paper);
      const pack = note('Preparar', 'Armar el paquete.', 364, 268, 182, 112, mint);
      const send = note('Despachar', 'Registrar la guía.', 588, 268, 182, 112, blue);
      connect(order, pack, 'east', 'north');
      connect(pack, send, 'east', 'west');
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
      crews.forEach(([parent, title, body], i) => {
        const team = note(title, body, i * 216, 422, 194, 122, paper);
        connect(parent, team, 'south', 'north');
      });
    },
  },
  story: {
    name: 'Storyboard',
    title: 'Un afiche encuentra su público',
    compose({ text, picture, shape }) {
      const scenes = [
        ['pencil', 'La idea', 'Una vecina dibuja el afiche.'],
        ['printer', 'La tirada', 'El taller imprime las copias.'],
        ['bicycle', 'La calle', 'Un ciclista reparte los afiches.'],
      ] as const;
      scenes.forEach(([asset, title, detail], i) => {
        const x = i * 264;
        shape(
          'rectangle',
          'Fondo de viñeta',
          x,
          84,
          242,
          138,
          ['#d8c6ab', '#acccc1', '#b8cbdc'][i]!,
        );
        picture(asset, title, x + 70, 102, 102);
        text(title, x, 247, 240, 26, { weight: 650 });
        text(detail, x, 298, 238, 17);
      });
    },
  },
  identity: {
    name: 'Composición de marca',
    title: 'Identidad de Marea',
    compose({ text, shape }) {
      shape('ellipse', 'Disco marino', 18, 104, 150, 150, mint);
      shape('triangle', 'Vela', 58, 129, 77, 92, '#234c55');
      text('Marea', 204, 105, 510, 77, { weight: 700, serif: true });
      text('Escuela de navegación', 209, 214, 470, 25);
      [mint, '#234c55', paper].forEach((color, i) =>
        shape('rectangle', 'Muestra de color', 209 + 82 * i, 290, 68, 30, color),
      );
    },
  },
  bars: {
    name: 'Barras comparativas',
    title: 'Cómo llega el público',
    compose({ bars }) {
      bars(
        'Personas encuestadas',
        [
          { label: 'A pie', value: 40 },
          { label: 'Bicicleta', value: 30 },
          { label: 'Colectivo', value: 20 },
          { label: 'Auto', value: 10 },
        ],
        0,
        85,
        650,
        252,
      );
    },
  },
  ...explanatoryLayouts,
} satisfies Record<string, { name: string; title: string; compose(parts: GraphicParts): void }>;
