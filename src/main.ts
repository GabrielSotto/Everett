import { EverettApp } from './app/application';
import { trace } from './app/diagnostics/trace';
import { exportDiagnostics } from './platform/export-diagnostics';
const root = document.getElementById('app');
if (!root) throw new Error('Falta el contenedor de Everett.');
try {
  new EverettApp(root);
} catch (error) {
  trace.error(error, 'bootstrap');
  root.textContent = 'No se pudo abrir Everett.';
  const button = document.createElement('button');
  button.textContent = 'Exportar diagnóstico';
  button.onclick = () => exportDiagnostics(trace, { stage: 'bootstrap' });
  root.append(button);
  throw error;
}
