import { EverettApp } from '../../src/app/application';
import { uiState } from '../../src/app/ui-state';
import { truckJourney } from './viaje';
import { compareLabels } from './etiquetas';
import { printProof, pinholeCamera } from './taller';
import proofArt from './ilustraciones/prueba-registro.svg?raw';
import cameraArt from './ilustraciones/camara-oscura.svg?raw';
import type { Link, Material } from '../../src/domain/model';
import { prepareComponentLayout } from '../../src/domain/component-layout';
import { seed, emptyWorld } from '../../src/domain/seed';
import { LocalStorage } from '../../src/platform/local-storage';
import {
  loadIllustrations,
  illustrationAsset,
  illustrationBlob,
} from '../../src/features/canvas/illustrations';

// Escena de revisión compuesta con materiales ordinarios. Esta página de Vite
// no abre la base de trabajo ni agrega un modo de presentación a Everett.
const params = new URLSearchParams(location.search);
const sceneName = params.get('escena');
const comparison = sceneName === 'etiquetas';
interface ReviewScene {
  nodes: Material[];
  links?: Link[];
  width: number;
  height: number;
}
const workshops = {
  imprenta: { name: 'Prueba de imprenta', create: printProof, art: proofArt, asset: 'prueba' },
  optica: { name: 'Cámara oscura', create: pinholeCamera, art: cameraArt, asset: 'corte' },
};
const workshop =
  sceneName === 'imprenta' || sceneName === 'optica' ? workshops[sceneName] : undefined;
async function compose(storage: LocalStorage) {
  const state = seed(true, 42),
    ui = uiState();
  const w = emptyWorld(
    workshop ? sceneName! : 'huerta',
    workshop?.name ?? (comparison ? 'Diseño de etiquetas' : 'Cadena de frío'),
    42,
    0,
    0,
  );
  state.worlds = [w];
  state.route = { kind: 'surface', world: w.id, surface: 'canvas', entity: null };
  state.camera = { x: 0, y: 0, z: 1 };
  ui.chat.chatMode = 'closed';
  const create = workshop?.create ?? (comparison ? compareLabels : truckJourney);
  const scene: ReviewScene = create(innerWidth < 680);
  w.nodes = scene.nodes;
  w.links = scene.links ?? [];
  state.camera.z = Math.max(
    0.1,
    Math.min(1, (innerWidth - 32) / scene.width, (innerHeight - 155) / scene.height),
  );
  const ids: Record<string, string> = {
    camion: 'delivery-truck',
    mercado: 'convenience-store',
    frutilla: 'strawberry',
  };
  const assets = new Map<string, Blob>();
  const drawings = workshop ? [] : await loadIllustrations();
  for (const { data } of w.nodes) {
    if (data.kind !== 'image') continue;
    if (workshop && data.asset === workshop.asset) {
      assets.set(data.asset, new Blob([workshop.art], { type: 'image/svg+xml' }));
      continue;
    }
    const drawing = drawings.find((d) => d.id === ids[data.asset]);
    if (!drawing) throw Error('Falta la ilustración del ejemplo: ' + data.asset);
    const asset = illustrationAsset(drawing);
    if (!assets.has(asset)) assets.set(asset, illustrationBlob(drawing));
    data.asset = asset;
    data.mime = 'image/svg+xml';
  }
  await Promise.all([...assets].map(([id, blob]) => storage.putAsset(id, blob)));
  await storage.save(state, ui);
  return { state, ui };
}
async function openExample(root: HTMLElement) {
  try {
    if (workshop || comparison) document.title = (workshop?.name ?? 'Dos etiquetas') + ' · Everett';
    await prepareComponentLayout();
    const previousComparison = comparison && params.get('revision') === 'anterior';
    const storage = await LocalStorage.open(
      workshop
        ? 'everett-review-' + sceneName
        : comparison
          ? previousComparison
            ? 'everett-review-etiquetas'
            : 'everett-review-etiquetas-peso'
          : sceneName === 'viaje'
            ? 'everett-review-viaje'
            : 'everett-review-composicion',
    );
    const saved = await storage.load();
    if (!saved && previousComparison) {
      const link = document.createElement('a');
      link.href = '?escena=etiquetas';
      link.textContent = 'Abrir la comparación actual';
      root.replaceChildren('No hay una comparación anterior guardada en este navegador. ', link);
      return;
    }
    new EverettApp(root, storage, saved ?? (await compose(storage)));
  } catch (error) {
    root.textContent = error instanceof Error ? error.message : 'No se pudo abrir el ejemplo.';
  } finally {
    root.removeAttribute('aria-busy');
  }
}
void openExample(document.querySelector<HTMLElement>('#app')!);
