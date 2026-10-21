import type { State } from '../domain/model';
import type { Ui } from '../app/ui-state';
import { validate } from '../domain/invariants';

interface Personal {
  schema: 1;
  state: Omit<State, 'worlds' | 'seq'>;
  ui: Ui;
}
interface Shared {
  schema: 1;
  worlds: State['worlds'];
  seq: number;
}
function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error('No se pudo leer el almacenamiento'));
  });
}
function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo guardar'));
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar'));
  });
}
/** Estado compartido y contexto personal se confirman juntos; los archivos conservan bytes. */
export class LocalStorage {
  private constructor(private db: IDBDatabase) {}
  static async open(): Promise<LocalStorage> {
    const opening = indexedDB.open('everett-canvas', 1);
    opening.onupgradeneeded = () => {
      for (const name of ['worlds', 'personal', 'assets']) opening.result.createObjectStore(name);
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () =>
        reject(opening.error ?? new Error('No se pudo abrir el almacenamiento.'));
      opening.onblocked = () =>
        reject(new Error('Otra ventana bloquea el almacenamiento. Cerrala y reintentá.'));
    });
    db.onversionchange = () => db.close();
    return new LocalStorage(db);
  }
  async load(): Promise<{ state: State; ui: Ui } | null> {
    const tx = this.db.transaction(['worlds', 'personal'], 'readonly');
    const [shared, personal] = await Promise.all([
      request(tx.objectStore('worlds').get('shared')) as Promise<Shared | undefined>,
      request(tx.objectStore('personal').get('local-user')) as Promise<Personal | undefined>,
    ]);
    if (!shared && !personal) return null;
    if (!shared || !personal || shared.schema !== 1 || personal.schema !== 1)
      throw new Error('El guardado está incompleto o tiene un formato desconocido.');
    const state: State = { ...personal.state, ...shared, version: 1 };
    validate(state);
    const ui = personal.ui;
    ui.shell.showSurfaceMenu = ui.shell.showSurfaceMenu === true;
    ui.shell.canvasDockOrientation =
      ui.shell.canvasDockOrientation === 'vertical' ? 'vertical' : 'horizontal';
    if (!ui.shell.showSurfaceMenu) ui.shell.surfaceMenu = false;
    ui.canvas.tool = 'select';
    ui.canvas.linkStart = null;
    ui.canvas.commentTarget = null;
    const route = state.route;
    const world = route.kind === 'universe' ? null : state.worlds.find((w) => w.id === route.world);
    if (!world?.nodes.some((n) => n.id === ui.canvas.selection && !n.owner))
      ui.canvas.selection = null;
    ui.canvas.selections = ui.canvas.selections.filter((id) =>
      world?.nodes.some((n) => n.id === id && !n.owner),
    );
    if (!world?.zones.some((z) => z.id === ui.canvas.zoneSelection)) ui.canvas.zoneSelection = null;
    if (!world?.links.some((l) => l.id === ui.canvas.linkSelection)) ui.canvas.linkSelection = null;
    return { state, ui };
  }
  async save(state: State, ui: Ui): Promise<void> {
    const { worlds, seq, ...personalState } = structuredClone(state);
    const personal = structuredClone(ui);
    // Abrir la transacción durante el evento que cambió el dato; IndexedDB ordena
    // las transacciones de escritura. No dejar el último borrador en un debounce.
    const tx = this.db.transaction(['worlds', 'personal'], 'readwrite');
    const complete = finished(tx);
    try {
      tx.objectStore('worlds').put({ schema: 1, worlds, seq } satisfies Shared, 'shared');
      tx.objectStore('personal').put(
        { schema: 1, state: personalState, ui: personal } satisfies Personal,
        personal.userId,
      );
    } catch (error) {
      tx.abort();
      await complete.catch(() => undefined);
      throw error;
    }
    return complete;
  }
  async putAsset(id: string, file: Blob): Promise<void> {
    const tx = this.db.transaction('assets', 'readwrite'),
      complete = finished(tx);
    tx.objectStore('assets').put(file, id);
    await complete;
  }
  async asset(id: string): Promise<Blob> {
    const value: unknown = await request(
      this.db.transaction('assets').objectStore('assets').get(id),
    );
    if (!(value instanceof Blob))
      throw new Error('El archivo incorporado no está disponible. Reintentá la recuperación.');
    return value;
  }
  async backup(state: State, ui: Ui): Promise<Blob> {
    const assets: { id: string; mime: string; data: string }[] = [];
    const ids = new Set(
      state.worlds.flatMap((w) =>
        w.nodes.flatMap((n) => ('asset' in n.data ? [n.data.asset] : [])),
      ),
    );
    for (const id of ids) {
      const blob = await this.asset(id);
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      assets.push({ id, mime: blob.type, data });
    }
    return new Blob([JSON.stringify({ schema: 1, state, ui, assets })], {
      type: 'application/json',
    });
  }
}
