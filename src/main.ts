import { EverettApp } from './app/application';
import { LocalStorage } from './platform/local-storage';
import { trace } from './app/diagnostics/trace';
import { exportDiagnostics } from './platform/export-diagnostics';
const root = document.getElementById('app');
if (!root) throw new Error('Falta el contenedor de Everett.');
async function start(root: HTMLElement): Promise<void> {
  root.textContent = 'Recuperando Everett…';
  try {
    const storage = await LocalStorage.open();
    const restored = await storage.load();
    new EverettApp(root, storage, restored ?? undefined);
  } catch (error) {
    trace.add('storage.recovery.failed', { message: String(error) }, undefined, undefined, 'warn');
    root.textContent = 'No se pudo recuperar Everett. Tus datos guardados se conservaron. ';
    const retry = document.createElement('button');
    retry.textContent = 'Reintentar recuperación';
    retry.onclick = () => void start(root);
    const diagnostic = document.createElement('button');
    diagnostic.textContent = 'Exportar diagnóstico';
    diagnostic.onclick = () => exportDiagnostics(trace, { stage: 'bootstrap' });
    root.append(retry, diagnostic);
  }
}
void start(root);
