import { EverettApp } from '../../src/app/application';
import { uiState } from '../../src/app/ui-state';
import { truckJourney } from './viaje';
import { compareLabels } from './etiquetas';
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
const sceneName = new URLSearchParams(location.search).get('escena');
const comparison = sceneName === 'etiquetas';
async function compose(storage: LocalStorage) {
  const state = seed(true, 42),
    ui = uiState();
  const w = emptyWorld('huerta', comparison ? 'Diseño de etiquetas' : 'Cadena de frío', 42, 0, 0);
  state.worlds = [w];
  state.route = { kind: 'surface', world: w.id, surface: 'canvas', entity: null };
  state.camera = { x: 0, y: 0, z: 1 };
  ui.chat.chatMode = 'closed';
  const scene = comparison ? compareLabels(innerWidth < 680) : truckJourney(innerWidth < 680);
  w.nodes = scene.nodes;
  state.camera.z = Math.max(
    0.1,
    Math.min(1, (innerWidth - 32) / scene.width, (innerHeight - 155) / scene.height),
  );
  const drawings = await loadIllustrations();
  const ids: Record<string, string> = {
    camion: 'delivery-truck',
    mercado: 'convenience-store',
    frutilla: 'strawberry',
  };
  const assets = new Map<string, Blob>();
  for (const { data } of w.nodes) {
    if (data.kind !== 'image') continue;
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
    if (comparison) document.title = 'Dos etiquetas · Everett';
    await prepareComponentLayout();
    const storage = await LocalStorage.open(
      comparison
        ? 'everett-review-etiquetas'
        : sceneName === 'viaje'
          ? 'everett-review-viaje'
          : 'everett-review-composicion',
    );
    new EverettApp(root, storage, (await storage.load()) ?? (await compose(storage)));
  } catch (error) {
    root.textContent = error instanceof Error ? error.message : 'No se pudo abrir el ejemplo.';
  } finally {
    root.removeAttribute('aria-busy');
  }
}
void openExample(document.querySelector<HTMLElement>('#app')!);
