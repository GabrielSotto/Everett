import type { Trace } from '../app/diagnostics/trace';
import { version } from '../version';

export function exportDiagnostics(trace: Trace, context: unknown): void {
  const report = {
    version,
    build: document.querySelector('meta[name=everett-build]')?.getAttribute('content'),
    session: trace.session,
    at: new Date().toISOString(),
    environment: {
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight },
      context,
    },
    entries: trace.snapshot(),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
  );
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = `everett-${trace.session}.json`;
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
