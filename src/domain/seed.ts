import type { State, World, Property, Agent } from './model';
import { layoutWorlds } from './world-layout';
import { seedAgentActivity } from './agent-fixtures';
export const properties: Property[] = [
  ['status', 'Estado'],
  ['priority', 'Prioridad'],
  ['assignee', 'Asignado'],
  ['creator', 'Creado por'],
  ['start', 'Inicio'],
  ['due', 'Vencimiento'],
  ['origin', 'Origen'],
].map(([id, name]) => ({
  id: id ?? '',
  name: name ?? '',
  type: id === 'start' || id === 'due' ? 'date' : 'text',
  custom: false,
}));
export function agents(): Agent[] {
  return [
    {
      id: 'eve',
      name: 'Eve',
      role: 'Diseño y materiales',
      color: '#ae91d4',
      active: true,
      capabilities: [
        'Organizar notas y referencias',
        'Transformar materiales asignados',
        'Entregar propuestas para revisión',
      ],
      memory: ['Conservar el origen y la responsabilidad del material.'],
    },
    {
      id: 'milo',
      name: 'Milo',
      role: 'Código y revisión',
      color: '#82a5cd',
      active: true,
      capabilities: [
        'Proponer cambios sobre archivos',
        'Comparar versiones y presentar diferencias',
        'Detectar conflictos antes de incorporar cambios',
      ],
      memory: ['No sobrescribir ediciones posteriores a la propuesta.'],
    },
    {
      id: 'nora',
      name: 'Nora',
      role: 'Investigación y contexto',
      color: '#c7ab7b',
      active: true,
      capabilities: [
        'Reunir referencias del mundo',
        'Resumir documentos disponibles',
        'Preparar preguntas y tareas',
      ],
      memory: ['Distinguir observaciones y conclusiones.'],
    },
  ];
}
export function emptyWorld(id: string, name: string, seed: number, x: number, y: number): World {
  return {
    shipping: { active: false, changedAt: null, source: null },
    id,
    name: name.trim() || 'Sin título',
    seed,
    x,
    y,
    region: 'Ideas',
    archived: false,
    objective: '',
    docs: [],
    files: [],
    tasks: [],
    agents: agents(),
    nodes: [],
    links: [],
    zones: [],
    assignments: [],
    comments: [],
    messages: [],
    chat: [],
    participants: ['Gabi'],
    codeMessages: [],
    runs: [],
    proposal: null,
    properties: structuredClone(properties),
    visibleProperties: properties.map((p) => p.id),
    boardView: 'kanban',
    branch: 'main',
    activity: [],
  };
}
type Brief = [string, string, string, string, string, string];
const briefs: Brief[] = [
  [
    'everett',
    'Everett',
    'Desarrollo',
    'Un entorno espacial para desarrollar ideas con materiales, documentos, código y agentes.',
    'Conservar el origen al navegar',
    'Revisar la propiedad de materiales',
  ],
  [
    'scout',
    'Resource Scout',
    'Desarrollo',
    'Memoria local consultable. Capturar información con su fuente, contexto situacional y nota opcional; recuperarla ante una intención.',
    'Reducir la fricción de captura',
    'Recuperar evidencia útil para una tarea',
  ],
  [
    'relay',
    'Agent Relay',
    'Desarrollo',
    'Agentes personales independientes que coordinan trabajo con permiso explícito. Pruebas con un Moto G52 y un Moto G13.',
    'Aislar cuentas y contexto',
    'Conservar versiones y aprobaciones',
  ],
  [
    'island',
    'Desktop Island',
    'Diseño',
    'Una superficie de escritorio que se expande según el contexto sin reservar una franja permanente.',
    'Probar expansión y contracción',
    'Conservar el espacio de trabajo',
  ],
  [
    'token',
    'Token Quest',
    'Diseño',
    'Aprender construyendo una máquina persistente: tokens, contexto y selección mediante módulos y encargos.',
    'Probar el módulo de contexto',
    'Revisar brazos, silueta y apoyo de los personajes',
  ],
  [
    'watch',
    'Watch With AI',
    'Investigación',
    'Compañero de escucha para programas y podcasts. Distinguir interlocutores y no confundir al usuario con el audio reproducido.',
    'Separar voz del usuario y programa',
    'Registrar cambios de interlocutor',
  ],
  [
    'autogen',
    'Autogen',
    'Desarrollo',
    'Transformar feedback real en cambios trazables y verificables, manteniendo aprobación humana para acciones sensibles.',
    'Vincular propuestas con evidencia',
    'Probar la aprobación antes de ejecutar',
  ],
  [
    'paper',
    'Computadora de papel',
    'Diseño',
    'Trabajo con lápiz y teclado desacoplable. Explorar modos tablet y escritorio con continuidad de escritura.',
    'Bocetar ambos modos',
    'Definir las interacciones con lápiz',
  ],
  [
    'voice',
    'Mesa redonda de voz',
    'Investigación',
    'Una conversación compartida con varios agentes conversacionales activos y turnos explícitos.',
    'Probar interrupciones',
    'Conservar la atribución de cada intervención',
  ],
  [
    'intent',
    'Intent Surface',
    'Diseño',
    'Reunir acciones y materiales alrededor de una intención de trabajo.',
    'Definir una intención de prueba',
    'Revisar continuidad entre acciones',
  ],
];
const extra: [string, string, string][] = [
  ['type', 'Estudio tipográfico', 'Diseño'],
  ['motion', 'Biblioteca de movimiento', 'Diseño'],
  ['sound', 'Paisajes sonoros', 'Diseño'],
  ['color', 'Color y contraste', 'Diseño'],
  ['gestures', 'Gestos naturales', 'Investigación'],
  ['memory', 'Memoria asociativa', 'Investigación'],
  ['attention', 'Atención y contexto', 'Investigación'],
  ['systems', 'Sistemas complejos', 'Investigación'],
  ['lab', 'Cuaderno de laboratorio', 'Investigación'],
  ['observatory', 'Observatorio', 'Investigación'],
  ['components', 'Componentes compartidos', 'Desarrollo'],
  ['local', 'Herramientas locales', 'Desarrollo'],
  ['capture', 'Laboratorio de captura', 'Desarrollo'],
  ['web', 'Experimentos web', 'Desarrollo'],
  ['protocols', 'Protocolos y mensajes', 'Desarrollo'],
  ['seeds', 'Semillas', 'Ideas'],
  ['sketches', 'Bocetos sueltos', 'Ideas'],
  ['reading', 'Lecturas pendientes', 'Ideas'],
  ['notebook', 'Cuadernos anteriores', 'Ideas'],
  ['maps', 'Mapas de conceptos', 'Investigación'],
  ['archive', 'Archivo', 'Ideas'],
  ['materials', 'Materiales cotidianos', 'Ideas'],
];
const descriptions: Record<string, string> = {
  type: 'Ritmo de lectura y jerarquía de textos.',
  motion: 'Transiciones interrumpibles y estados de movimiento.',
  sound: 'Capas de audio y ambientes de escucha.',
  color: 'Paletas con contraste legible.',
  gestures: 'Expectativas al manipular objetos.',
  memory: 'Asociaciones y pistas de recuperación.',
  attention: 'Interrupciones y recuperación del contexto.',
  systems: 'Modelar relaciones y cambios emergentes.',
  lab: 'Hipótesis, observaciones y experimentos.',
  observatory: 'Fuentes y observaciones para seguir.',
  components: 'Contratos de piezas reutilizables.',
  local: 'Trabajo sin conexión a servidores.',
  capture: 'Entradas visuales de baja fricción.',
  web: 'Pequeñas pruebas funcionales de interacción.',
  protocols: 'Intercambio de contexto entre procesos.',
  seeds: 'Ideas todavía sin forma definida.',
  sketches: 'Exploraciones visuales para retomar.',
  reading: 'Referencias y preguntas de lectura.',
  notebook: 'Decisiones de etapas anteriores.',
  maps: 'Relaciones entre conceptos.',
  archive: 'Trabajos pausados que conservan su contexto.',
  materials: 'Texturas, formas y usos posibles.',
};
extra.forEach(([id, name, region]) =>
  briefs.push([
    id,
    name,
    region,
    descriptions[id] ?? name,
    `Explorar ${name.toLowerCase()}`,
    `Registrar una decisión sobre ${name.toLowerCase()}`,
  ]),
);
export function seed(empty = false, variation = 0, now = Date.now()): State {
  const positions = layoutWorlds(briefs.map((b) => b[0]));
  const worlds: World[] = [];
  if (!empty)
    briefs.forEach(([id, name, region, objective, a, b], i) => {
      const p = positions.get(id)!;
      const w = emptyWorld(id, name, i, p.x, p.y);
      w.region = region;
      w.objective = objective;
      w.archived = ['archive', 'notebook', 'sketches'].includes(id);
      const tasks = [
        a,
        b,
        `Comparar alternativas de ${name}`,
        `Preparar la próxima prueba de ${name}`,
      ];
      w.docs = [
        {
          id: 'vision',
          title: name + ' · visión',
          body: objective + '\n\nEn exploración\n\n' + a + '\n\n' + b,
          sheet: null,
        },
        {
          id: 'decisions',
          title: 'Decisiones y preguntas',
          body: 'Próxima decisión\n\n' + b,
          sheet: null,
        },
        {
          id: 'tracking',
          title: 'Seguimiento',
          body: '',
          sheet: [
            ['Actividad', 'Responsable', 'Estado'],
            ...tasks.map((t) => [t, 'Gabi', 'Pendiente']),
          ],
        },
      ];
      const code =
        id === 'scout'
          ? 'export interface Capture {\n  id: string;\n  source: string;\n  note?: string;\n}\n\nexport function createCapture(source: string): Capture {\n  return { id: crypto.randomUUID(), source };\n}\n'
          : `export interface Material {\n  id: string;\n  title: string;\n  source?: string;\n}\n\nexport const worldName = ${JSON.stringify(name)};\n\nexport function addMaterial(\n  items: readonly Material[],\n  item: Material,\n): Material[] {\n  return [...items, item];\n}\n`;
      const readme =
        '# ' +
        name +
        '\n\n' +
        objective +
        '\n\n## Próximas preguntas\n\n' +
        tasks.map((t) => '- ' + t).join('\n');
      w.files = [
        {
          id: 'main',
          name: id === 'scout' ? 'src/capture.ts' : 'src/materials.ts',
          text: code,
          saved: code,
          revision: 0,
        },
        { id: 'readme', name: 'README.md', text: readme, saved: readme, revision: 0 },
      ];
      w.tasks = tasks.map((title, j) => ({
        shipping: j === 0 ? 'blocker' : j === 3 ? 'later' : 'required',
        id: `task-${j + 1}`,
        title,
        description: j % 2 ? a : b,
        status: (['progress', 'pending', 'review', 'planned'] as const)[j] ?? 'pending',
        priority: j < 2 ? 'Alta' : 'Media',
        assignee: j === 1 ? 'Eve' : 'Gabi',
        creator: 'Gabi',
        start: '2026-09-26',
        due: `2026-09-${27 + j}`,
        origin: j === 1 ? 'canvas' : 'session',
        custom: {},
      }));
      w.nodes = [
        {
          id: 'note-a',
          x: -470,
          y: -200,
          width: 240,
          height: 180,
          owner: null,
          data: { kind: 'note', title: a, text: objective, color: '#f3ebcf' },
        },
        {
          id: 'note-b',
          x: -470,
          y: 62,
          width: 240,
          height: 175,
          owner: null,
          data: {
            kind: 'note',
            title: b,
            text: 'Conservar observaciones, decisiones y preguntas abiertas.',
            color: '#e8e1f3',
          },
        },
        {
          id: 'doc-ref',
          x: -105,
          y: -200,
          width: 255,
          height: 190,
          owner: null,
          data: { kind: 'reference', ref: { kind: 'document', id: 'vision' } },
        },
        {
          id: 'file-ref',
          x: -105,
          y: 75,
          width: 255,
          height: 132,
          owner: null,
          data: { kind: 'reference', ref: { kind: 'file', id: 'main' } },
        },
        {
          id: 'task-ref',
          x: -100,
          y: 285,
          width: 250,
          height: 112,
          owner: null,
          data: { kind: 'reference', ref: { kind: 'task', id: 'task-1' } },
        },
      ];
      w.zones = [
        { id: 'zone-eve', agent: 'eve', name: 'Eve', x: 315, y: -210, width: 360, height: 415 },
      ];
      w.links = [
        { id: 'link-1', from: 'note-a', to: 'doc-ref', fromAnchor: 'east', toAnchor: 'west' },
      ];
      w.comments = [
        { id: 'comment-1', node: 'note-a', author: 'Gabi', text: b, resolved: false, replies: [] },
      ];
      seedAgentActivity(w, variation, now);
      worlds.push(w);
    });
  return {
    version: 1,
    profile: { name: 'Gabi', bio: '', language: 'es-AR' },
    worlds,
    route: { kind: 'universe' },
    camera: { x: 0, y: 0, z: empty ? 0.9 : 0.36 },
    history: [],
    seq: 100,
  };
}
