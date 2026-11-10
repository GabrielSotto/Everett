import { EverettApp } from './app/application';
import { LocalStorage } from './platform/local-storage';
import { trace } from './app/diagnostics/trace';
import { exportDiagnostics } from './platform/export-diagnostics';
import { prepareComponentLayout } from './domain/component-layout';
const root = document.getElementById('app');
if (!root) throw new Error('Falta el contenedor de Everett.');
async function start(root: HTMLElement): Promise<void> {
  root.textContent = 'Recuperando Everett…';
  let stage = 'component-layout';
  const slow = window.setTimeout(() => {
    root.textContent =
      stage === 'storage'
        ? 'Esperando el guardado local. Si otra pestaña de Everett dejó de responder, cerrala. El proyecto se abrirá acá cuando termine la lectura.'
        : 'Preparando el espacio de trabajo…';
  }, 4000);
  try {
    await prepareComponentLayout();
    stage = 'storage';
    const storage = await LocalStorage.open();
    const restored = await storage.load();
    new EverettApp(root, storage, restored ?? undefined);
  } catch (error) {
    trace.add(`${stage}.recovery.failed`, { message: String(error) }, undefined, undefined, 'warn');
    root.textContent =
      stage === 'component-layout'
        ? 'No se pudo cargar el motor de distribución. Tus datos se conservaron. '
        : 'No se pudo recuperar Everett. Tus datos guardados se conservaron. ';
    const retry = document.createElement('button');
    retry.textContent = 'Reintentar recuperación';
    retry.onclick = () => void start(root);
    const diagnostic = document.createElement('button');
    diagnostic.textContent = 'Exportar diagnóstico';
    diagnostic.onclick = () => exportDiagnostics(trace, { stage: 'bootstrap' });
    root.append(retry, diagnostic);
  } finally {
    window.clearTimeout(slow);
  }
}
void start(root);
