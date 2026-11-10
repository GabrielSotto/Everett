import { EverettApp } from '../../src/app/application';
import { uiState } from '../../src/app/ui-state';
import { newCanvasText } from '../../src/domain/canvas-text';
import { prepareComponentLayout } from '../../src/domain/component-layout';
import { createArrow, editArrow } from '../../src/domain/free-arrow';
import type { Material } from '../../src/domain/model';
import { seed, emptyWorld } from '../../src/domain/seed';
import { LocalStorage } from '../../src/platform/local-storage';

// Escena de revisión compuesta con materiales ordinarios. Esta página de Vite
// no abre la base de trabajo ni agrega un modo de presentación a Everett.
const assetNames = ['frutilla', 'camion', 'mercado'] as const;
async function compose(storage: LocalStorage) {
  // Microsoft Fluent Emoji, ilustraciones 3D (MIT; ver ilustraciones/LICENSE).
  // https://github.com/microsoft/fluentui-emoji/tree/1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets
  await Promise.all(
    assetNames.map(async (name) => {
      const res = await fetch(new URL('./ilustraciones/' + name + '.png', import.meta.url));
      if (!res.ok) throw new Error('No se pudo cargar la ilustración: ' + name);
      await storage.putAsset(name, await res.blob());
    }),
  );
  const state = seed(true, 42),
    ui = uiState();
  const w = emptyWorld('huerta', 'Cadena de frío', 42, 0, 0);
  state.worlds = [w];
  state.route = { kind: 'surface', world: w.id, surface: 'canvas', entity: null };
  state.camera = {
    x: 0,
    y: 0,
    z: Math.max(0.1, Math.min(1, (innerWidth - 48) / 1000, (innerHeight - 165) / 570)),
  };
  ui.chat.chatMode = 'closed';
  function label(
    id: string,
    text: string,
    x: number,
    y: number,
    width: number,
    size: number,
    color: string,
    weight = 400,
    serif = false,
  ): Material {
    return {
      id,
      x,
      y,
      width,
      height: Math.ceil(size * 1.4),
      owner: null,
      data: { ...newCanvasText('wrap'), text, size, color, weight, font: serif ? 'serif' : 'sans' },
    };
  }
  function note(
    id: string,
    title: string,
    text: string,
    x: number,
    y: number,
    color: string,
  ): Material {
    return {
      id,
      x,
      y,
      width: 250,
      height: 105,
      owner: null,
      data: { kind: 'note', title, text, color, fontSize: 17 },
    };
  }
  function image(
    id: (typeof assetNames)[number],
    title: string,
    x: number,
    y: number,
    size: number,
  ): Material {
    return {
      id,
      x,
      y,
      width: size,
      height: size,
      owner: null,
      data: { kind: 'image', asset: id, title, mime: 'image/png', ratio: 1 },
    };
  }
  const route = createArrow('recorrido', { x: 449, y: 91 }, { x: -360, y: 0 }, true, '#f3ae63', 8);
  w.nodes = [
    editArrow(route, 'bend', { x: 0, y: 82 }),
    label('kicker', 'LOGÍSTICA    /    CADENA DE FRÍO', -470, -236, 550, 14, '#f3b978', 700),
    label('titulo', 'De la huerta al mercado', -474, -210, 940, 57, '#fff0d9', 600, true),
    label(
      'bajada',
      'Un día de viaje para que la frutilla llegue fresca.',
      -470,
      -132,
      900,
      22,
      '#ced6d7',
    ),
    note('origen', 'Cosecha', 'Cajas preenfriadas.', 230, -23, '#f2d9be'),
    note('destino', 'Entrega', 'Fruta lista para exhibir.', -470, 48, '#cfe6d8'),
    image('frutilla', 'Frutilla', 398, -71, 72),
    image('camion', 'Camión refrigerado', -85, -74, 166),
    image('mercado', 'Mercado', -462, -34, 93),
    label('etapa-1', '06:00   /   EN ORIGEN', 232, 116, 255, 15, '#f3b978', 700),
    label('frio', '4 °C en tránsito', -83, 117, 244, 26, '#fff0d9', 600, true),
    label('etapa-3', '18:00   /   EN DESTINO', -468, 171, 253, 15, '#acd7c1', 700),
  ];
  await storage.save(state, ui);
  return { state, ui };
}
async function openExample(root: HTMLElement) {
  try {
    await prepareComponentLayout();
    const storage = await LocalStorage.open('everett-review-composicion');
    new EverettApp(root, storage, (await storage.load()) ?? (await compose(storage)));
  } catch (error) {
    root.textContent = error instanceof Error ? error.message : 'No se pudo abrir el ejemplo.';
  } finally {
    root.removeAttribute('aria-busy');
  }
}
void openExample(document.querySelector<HTMLElement>('#app')!);
