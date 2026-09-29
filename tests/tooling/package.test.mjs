import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runProcess } from '../../scripts/run-process.mjs';

test('HARNESS-13: un empaquetado inválido o concurrente conserva la candidata y la entrega aprobada', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everett-package-'));
  const staging = join(root, 'output/paquete-en-preparacion');
  try {
    await cp(join(process.cwd(), 'scripts'), join(root, 'scripts'), { recursive: true });
    for (const directory of ['output/paquete', 'entregas/0.7.5', 'output/paquete-en-preparacion'])
      await mkdir(join(root, directory), { recursive: true });
    const candidate = join(root, 'output/paquete/Everett-0.7.5.zip');
    const approved = join(root, 'entregas/0.7.5/Everett-0.7.5.zip');
    await writeFile(candidate, 'candidata anterior');
    await writeFile(approved, 'entrega aprobada');
    await writeFile(join(staging, 'parcial.zip'), 'preparación interrumpida');
    const run = () =>
      runProcess(
        'pwsh',
        [
          '-NoProfile',
          '-File',
          'scripts/package.ps1',
          '-BrowserResult',
          'resultado-ausente.json',
          '-UnitResult',
          'resultado-ausente.json',
        ],
        { cwd: root, timeoutMs: 5000 },
      );
    const failed = await run();
    assert.equal(failed.startError, null);
    assert.equal(failed.timedOut, false);
    assert.notEqual(failed.exitCode, 0);
    await assert.rejects(stat(staging), /ENOENT/);
    await assert.rejects(stat(join(root, 'output/empaquetando.lock')), /ENOENT/);
    await writeFile(join(root, 'output/empaquetando.lock'), 'otra ejecución');
    await mkdir(staging);
    await writeFile(join(staging, 'activo.zip'), 'paquete en curso');
    const concurrent = await run();
    assert.notEqual(concurrent.exitCode, 0);
    assert.equal(await readFile(join(staging, 'activo.zip'), 'utf8'), 'paquete en curso');
    assert.equal(await readFile(candidate, 'utf8'), 'candidata anterior');
    assert.equal(await readFile(approved, 'utf8'), 'entrega aprobada');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
