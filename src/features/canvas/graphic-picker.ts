import { shortcutCombination } from '../../domain/shortcuts';
import { barChartSvg } from './bar-chart';
import { shapeVertices } from '../../domain/geometry';
import { pickerSearch, searchKey } from '../../ui/picker-search';
import type { GraphicTool } from './state';
import type { Context } from '../../app/context';
import { selectionFlow } from '../../domain/visual-flow';
import { graphicParts, graphics, type GraphicKind } from '../../domain/visual-graphics';
import { illustrationAssetPrefix } from '../../domain/illustration-asset';
import { cableGeometry } from '../../domain/cable-geometry';
import { selectionBounds } from '../../domain/alignment';
import type { Point } from '../../domain/model';
import { frameCanvas } from '../../ui/canvas-frame';
import { html } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { bindDismiss } from '../../ui/popover';
import { toWorld } from '../../spatial/math';
import {
  illustrationBlob,
  illustrationPreview,
  loadIllustrations,
  loadedIllustration,
} from './illustrations';

const tools: ReadonlyArray<[GraphicTool, string, string]> = [
  ['illustrations', 'Ilustraciones', 'sticker'],
  ['text', 'Texto', 'text'],
  ['note', 'Nota', 'note'],
  ['rectangle', 'Rectángulo', 'rectangle'],
  ['ellipse', 'Elipse', 'ellipse'],
  ['triangle', 'Triángulo', 'triangle'],
  ['star', 'Estrella', 'star'],
  ['drawing', 'Dibujo libre', 'draw'],
  ['straight-arrow', 'Flecha recta', 'straight-arrow'],
  ['curved-arrow', 'Flecha curva', 'curved-arrow'],
  ['connect', 'Conector', 'link'],
];
const graphicKeywords: Record<GraphicKind, string> = {
  sequence: 'proceso etapas pasos',
  cycle: 'circular proceso bucle retorno vaso reutilizar',
  comparison: 'alternativas opciones',
  anatomy: 'señalar partes detalle llamada',
  decision: 'ramas sí no flujo',
  timeline: 'tiempo hitos fechas historia',
  priority: 'impacto esfuerzo cuadrantes',
  handoff: 'responsabilidades flujo traspaso swimlane',
  hierarchy: 'organigrama estructura organización',
  story: 'guion viñetas relato escenas',
  identity: 'logo logotipo símbolo paleta tipografía identidad avatar marca',
  bars: 'gráfico datos encuesta cantidades',
  floorplan:
    'orientación plano acceso accesible entrada escaleras rampa salida escenario cómo llegar',
  affinity: 'agrupar comentarios patrones descubrir temas investigación observaciones hallazgos',
  fishbone: 'por qué falló una entrega causas problema diagnóstico espina de pescado ishikawa',
  concepts: 'explicar relaciones entre conceptos conectar ideas aprender enseñar',
  exploded: 'cómo encajan las piezas armar ensamblar montaje separar despiece',
  journey: 'recorrido de usuario experiencia cliente abandono reserva fricciones evidencia',
  venn: 'pertenece a ambos intersección conjuntos solapamiento elementos en común',
  moodboard: 'referencias visuales inspiración moodboard dirección visual fotos materiales',
};
function parts(kind: GraphicKind) {
  let i = 0;
  return graphicParts(kind, () => String(++i));
}
function drawingFor(asset: string) {
  const drawing = loadedIllustration(asset.slice(illustrationAssetPrefix.length));
  if (!drawing) throw Error('Falta una ilustración de este gráfico.');
  return drawing;
}
/** La miniatura usa las mismas piezas y posiciones que van al Canvas. */
function thumbnail({ nodes, links }: ReturnType<typeof parts>) {
  const content = nodes.slice(1);
  const b = selectionBounds(content);
  const leaders: string[] = [];
  const paths = links.flatMap((l) => {
    const a = nodes.find((n) => n.id === l.from)!,
      b = nodes.find((n) => n.id === l.to)!;
    const path = `<path d="${cableGeometry(l, a, b).path}" fill="none" stroke="${l.detail ? '#ffd18b' : '#a7bbc8'}" stroke-width="6"/>`;
    if (l.detail) {
      leaders.push(path);
      return [];
    }
    return [path];
  });
  for (const n of content) {
    const d = n.data;
    if (d.kind === 'bars') {
      paths.push(
        `<svg x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}">${barChartSvg(d)}</svg>`,
      );
    } else if (d.kind === 'image') {
      paths.push(
        `<image x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" href="${html(illustrationPreview(drawingFor(d.asset)))}"/>`,
      );
    } else if (d.kind === 'note') {
      paths.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="7" fill="${d.color}"/>`,
      );
      for (const [i, length] of [d.title.length, d.text.length].entries()) {
        paths.push(
          `<rect x="${n.x + 13}" y="${n.y + 21 + i * 27}" width="${Math.min(n.width - 28, length * (i ? 5 : 8))}" height="${i ? 5 : 9}" rx="2" fill="#40505a"/>`,
        );
      }
    } else if (d.kind === 'shape') {
      const { x, y, width, height } = n;
      const paint = `fill="${d.fill === false ? 'none' : html(d.color)}" stroke="${html(d.stroke ?? d.color)}" stroke-width="${d.thickness ?? 1}"`;
      if (d.shape === 'ellipse')
        paths.push(
          `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" ${paint}/>`,
        );
      else if (d.shape === 'rectangle')
        paths.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" ${paint}/>`);
      else {
        const points = shapeVertices(d.shape)
          .map((p) => x + p.x * width + ',' + (y + p.y * height))
          .join(' ');
        paths.push(`<polygon points="${points}" ${paint}/>`);
      }
    } else if (d.kind === 'text') {
      for (const [i, s] of d.text.split('\n').entries()) {
        const width = Math.min(n.width, s.length * d.size * 0.46);
        const x =
          n.x +
          (d.align === 'center'
            ? (n.width - width) / 2
            : d.align === 'right'
              ? n.width - width
              : 0);
        paths.push(
          `<rect x="${x}" y="${n.y + i * d.size * 1.4 + d.size * 0.45}" width="${width}" height="${d.size * 0.32}" rx="2" fill="${d.color}"/>`,
        );
      }
    }
  }
  return `<svg aria-hidden="true" viewBox="${b.x - 12} ${b.y - 12} ${b.width + 24} ${b.height + 24}">${[...paths, ...leaders].join('')}</svg>`;
}
export function openGraphicPicker(
  ctx: Context,
  trigger: () => HTMLElement | null,
  parentSignal: AbortSignal,
  onClosed: () => void,
) {
  const controller = new AbortController(),
    { signal } = controller;
  const worldId = ctx.world().id;
  const center = (): Point => {
    const box = document.querySelector('#canvas-stage')!.getBoundingClientRect();
    const left = Math.max(
      box.left,
      document.querySelector('.canvas-chat.docked:not(.compact)')?.getBoundingClientRect().right ??
        box.left,
    );
    return toWorld(
      { x: (left + box.right) / 2, y: box.top + box.height / 2 },
      ctx.currentCamera(),
      box,
    );
  };
  const panel = document.createElement('section');
  panel.className = 'canvas-context-form graphic-picker';
  panel.id = 'canvas-graphics-menu';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Gráficos explicativos');
  panel.innerHTML = `<header><strong>Gráficos explicativos</strong><button class="icon-button" type="button" data-close aria-label="Cerrar">${icon('close', 18)}</button></header><fieldset class="graphic-tools"><legend>Componer</legend><div class="graphic-materials"></div><div class="graphic-marks"></div></fieldset><h3>Plantillas <span data-count></span></h3><div class="graphic-options" role="group" aria-label="Plantillas"></div><p data-empty hidden>Sin coincidencias.</p><p role="status"></p>`;
  const grid = panel.querySelector<HTMLElement>('.graphic-options')!,
    status = panel.querySelector<HTMLElement>('[role=status]')!;
  const close = (focus = true) => {
    if (signal.aborted) return;
    controller.abort();
    panel.remove();
    onClosed();
    trigger()?.setAttribute('aria-expanded', 'false');
    if (focus) trigger()?.focus({ preventScroll: true });
  };
  const pieces = panel.querySelector<HTMLElement>('.graphic-tools')!;
  for (const [tool, name, symbol] of tools) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.graphicTool = tool;
    const material = tool === 'illustrations' || tool === 'text' || tool === 'note';
    button.title = name;
    button.setAttribute('aria-label', name);
    button.innerHTML = icon(symbol, 17) + (material ? '<span>' + name + '</span>' : '');
    const shortcut = ctx.ui.shortcuts[tool];
    if (shortcut) {
      const hint = document.createElement('kbd');
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = shortcut;
      button.append(hint);
      button.title = name + ' · ' + shortcut;
      button.setAttribute('aria-keyshortcuts', shortcut.replace(/^Ctrl\+/, 'Control+'));
    }
    button.onclick = (event) => {
      event.stopPropagation();
      close(false);
      ctx.activateGraphicTool(tool);
    };
    pieces.querySelector(material ? '.graphic-materials' : '.graphic-marks')!.append(button);
  }
  const position = () => {
    const anchor = trigger()?.getBoundingClientRect();
    if (!anchor?.width || ctx.world().id !== worldId) return close(false);
    panel.style.left =
      Math.max(8, Math.min(anchor.left, innerWidth - panel.offsetWidth - 8)) + 'px';
    panel.style.setProperty('--graphic-room', Math.max(0, innerHeight - anchor.bottom - 16) + 'px');
    panel.style.top = anchor.bottom + 8 + 'px';
  };
  parentSignal.addEventListener('abort', () => close(false), { once: true, signal });
  const count = panel.querySelector<HTMLElement>('[data-count]')!;
  const entries = Object.keys(graphics) as GraphicKind[];
  count.textContent = String(entries.length);
  const search = pickerSearch(
    panel.querySelector('header')!,
    'Buscar plantilla',
    (value) => {
      const words = searchKey(value).split(/\s+/);
      let matches = 0;
      for (const button of grid.querySelectorAll<HTMLButtonElement>('[data-graphic]')) {
        button.hidden = !words.every((word) => button.dataset.terms!.includes(word));
        if (!button.hidden) matches++;
      }
      count.textContent = String(matches);
      grid.scrollTop = 0;
      panel.querySelector<HTMLElement>('[data-empty]')!.hidden = matches > 0;
    },
    () => grid.querySelector('[data-graphic]:not([hidden])'),
  );
  bindDismiss(
    signal,
    () => true,
    (source) => {
      if (source === 'keyboard' && search.collapse()) return;
      close(source === 'keyboard');
    },
    '.graphic-picker,[data-action=canvas-graphics]',
  );
  panel.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => close();
  window.addEventListener('resize', position, { signal });
  panel.addEventListener(
    'keydown',
    (event) => {
      if (event.target instanceof HTMLInputElement) {
        event.stopPropagation();
        return;
      }
      const key = shortcutCombination(event);
      const tool = key && tools.find(([id]) => ctx.ui.shortcuts[id] === key)?.[0];
      if (tool) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat)
          pieces.querySelector<HTMLButtonElement>('[data-graphic-tool="' + tool + '"]')!.click();
        return;
      }
      const buttons = [
          ...panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([hidden])'),
        ],
        i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (
        event.key === 'Tab' &&
        ((i === buttons.length - 1 && !event.shiftKey) || (i === 0 && event.shiftKey))
      ) {
        close();
        return;
      }
      const shelf = document.activeElement?.closest(
        '.graphic-options,.graphic-marks,.graphic-materials',
      );
      const columns = shelf === grid ? 2 : 1;
      const step =
        (
          { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns } as Record<
            string,
            number
          >
        )[event.key] ?? 0;
      if (step || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const items = shelf ? buttons.filter((button) => shelf.contains(button)) : buttons;
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        items[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (current + step + items.length) % items.length
        ]?.focus();
      }
      event.stopPropagation();
    },
    { signal },
  );
  for (const k of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.graphic = k;
    button.dataset.terms = searchKey(
      [graphics[k].name, graphics[k].title, graphicKeywords[k]].join(' '),
    );
    button.innerHTML = `<span class="graphic-thumb" aria-hidden="true"></span><strong>${graphics[k].name}</strong><small>${graphics[k].title}</small>`;
    grid.append(button);
    button.onclick = () => void insert(k);
  }
  const ids = [...ctx.ui.canvas.selections];
  const flows = document.createElement('fieldset');
  flows.className = 'graphic-flows';
  flows.innerHTML = '<legend>Conectar la selección</legend>';
  for (const k of ['sequence', 'cycle'] as const) {
    const plan = selectionFlow(ctx.world(), ids, k);
    if (!plan) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = k === 'cycle' ? 'En ciclo' : 'En secuencia';
    button.title = plan.order;
    button.setAttribute('aria-description', plan.order);
    button.onclick = () => {
      if (
        ctx.act(
          { type: 'graphic.connect', world: ctx.world().id, kind: k, nodes: ids },
          'conectar la selección',
          'C08-VIS-01',
        )
      )
        close();
    };
    flows.append(button);
  }
  if (flows.childElementCount > 1) panel.querySelector('h3')!.before(flows);
  async function load() {
    await Promise.all(
      entries.map(async (kind) => {
        const scene = parts(kind);
        if (scene.nodes.some((n) => n.data.kind === 'image')) await loadIllustrations();
        if (panel.isConnected)
          grid.querySelector('[data-graphic="' + kind + '"] .graphic-thumb')!.innerHTML =
            thumbnail(scene);
      }),
    );
  }
  const loadPreviews = () =>
    void load().catch(() => {
      if (panel.isConnected)
        status.textContent = 'No se cargaron las miniaturas. Elegí un gráfico para reintentar.';
    });
  async function insert(kind: GraphicKind) {
    if (panel.getAttribute('aria-busy') === 'true') return;
    panel.setAttribute('aria-busy', 'true');
    const world = ctx.world().id;
    let failure =
      'No se cargó la biblioteca de ilustraciones. Volvé a elegir el gráfico para reintentar.';
    status.textContent = 'Preparando gráfico…';
    try {
      const assets = new Set(
        parts(kind).nodes.flatMap((n) => (n.data.kind === 'image' ? [n.data.asset] : [])),
      );
      if (assets.size) {
        if (!ctx.storage) throw Error('El guardado local no está disponible.');
        await loadIllustrations();
        if (!panel.isConnected || ctx.world().id !== world) return;
      }
      failure =
        'No se pudieron guardar las ilustraciones en este navegador. Revisá el espacio disponible y volvé a intentarlo.';
      await Promise.all(
        [...assets].map((asset) =>
          ctx.storage!.putAsset(asset, illustrationBlob(drawingFor(asset))),
        ),
      );
      if (!panel.isConnected || ctx.world().id !== world) return;
      failure = 'No se pudo insertar el gráfico en este Mundo. Volvé a intentarlo.';
      const before = new Set(ctx.world().nodes.map((n) => n.id));
      if (
        !ctx.act(
          { type: 'graphic.insert', world, kind, center: center() },
          'insertar gráfico explicativo',
          'C08-VIS-01',
        )
      ) {
        status.textContent = failure;
        return;
      }
      const ids = ctx
        .world()
        .nodes.filter((n) => !before.has(n.id))
        .map((n) => n.id);
      Object.assign(ctx.ui.canvas, {
        tool: 'select',
        selection: null,
        selections: [],
        zoneSelection: null,
        linkSelection: null,
      });
      close();
      ctx.render();
      frameCanvas(ctx, true, { nodes: ids, maximumZoom: 1 });
      ctx.persist();
    } catch (error) {
      if (panel.isConnected) {
        ctx.fail(error, 'insertar gráfico explicativo');
        status.textContent = !ctx.storage
          ? 'El guardado local no está disponible. Volvé a abrir el Mundo para reintentar.'
          : error instanceof DOMException && error.name === 'QuotaExceededError'
            ? 'No queda espacio para guardar las ilustraciones. Liberá espacio y volvé a elegir el gráfico.'
            : failure;
      }
    } finally {
      panel.removeAttribute('aria-busy');
    }
  }
  document.body.append(panel);
  loadPreviews();
  trigger()?.setAttribute('aria-expanded', 'true');
  position();
  panel.querySelector<HTMLButtonElement>('[data-graphic-tool]')?.focus({ preventScroll: true });
  return { close, position };
}
