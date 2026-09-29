import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { latestTestResult, removeOutput, withTestRun } from '../../scripts/output-runs.mjs';

test('HARNESS-09: conserva el último diagnóstico y elimina solo ejecuciones reemplazadas', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everett-retention-'));
  try {
    await mkdir(join(root, 'entregas/0.7.5'), { recursive: true });
    await writeFile(join(root, 'entregas/0.7.5/entrega.zip'), 'entrega aprobada');
    await writeFile(join(root, 'fuente.ts'), 'fuente');
    let first;
    await withTestRun(root, 'unitarias', async ({ directory, runId }) => {
      first = directory;
      await writeFile(join(directory, 'result.json'), JSON.stringify({ runId }));
    });
    const initialResult = await latestTestResult(root, 'unitarias');
    assert.match(initialResult, /unitarias\/\d{4}-\d{2}-\d{2}_.*Z\/result.json$/);
    await mkdir(join(root, 'output/pruebas/unitarias/material-ajeno'));
    await assert.rejects(
      withTestRun(root, 'unitarias', async () => {
        throw new Error('fallo para diagnosticar');
      }),
      /fallo para diagnosticar/,
    );
    await assert.rejects(readFile(join(first, 'result.json')), /ENOENT/);
    const current = await latestTestResult(root, 'unitarias');
    assert.notEqual(current, initialResult);
    assert.match(
      await readFile(join(root, current.replace('result.json', 'error.log')), 'utf8'),
      /fallo para diagnosticar/,
    );
    assert.equal(
      await readFile(join(root, 'entregas/0.7.5/entrega.zip'), 'utf8'),
      'entrega aprobada',
    );
    assert.equal(await readFile(join(root, 'fuente.ts'), 'utf8'), 'fuente');
    assert.ok((await readdir(join(root, 'output/pruebas/unitarias'))).includes('material-ajeno'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('HARNESS-10: una segunda ejecución no borra ni sustituye pruebas en curso', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everett-lock-'));
  try {
    await withTestRun(root, 'navegador', async ({ directory }) => {
      await writeFile(join(directory, 'results.json'), 'resultado en curso');
      await assert.rejects(
        withTestRun(root, 'navegador', () => assert.fail('No debe iniciar')),
        /Ya hay una ejecución/,
      );
      await assert.rejects(latestTestResult(root, 'navegador'), /siguen en curso/);
      await withTestRun(root, 'unitarias', async ({ directory: other }) => {
        await writeFile(join(other, 'result.json'), 'unitarias');
      });
      assert.equal(await readFile(join(directory, 'results.json'), 'utf8'), 'resultado en curso');
    });
    assert.match(await latestTestResult(root, 'navegador'), /navegador/);
    assert.match(await latestTestResult(root, 'unitarias'), /unitarias/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('HARNESS-11: la limpieza rechaza escapes de ruta, entregas y enlaces a otras carpetas', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everett-cleanup-'));
  const outside = await mkdtemp(join(tmpdir(), 'everett-protected-'));
  try {
    await writeFile(join(outside, 'conservar.txt'), 'contenido protegido');
    for (const path of ['.', 'output', '../otra-carpeta', 'entregas/0.7.5', outside])
      await assert.rejects(removeOutput(root, path), /fuera de output/);
    await mkdir(join(root, 'output'));
    await symlink(outside, join(root, 'output/pruebas'), 'junction');
    await assert.rejects(
      withTestRun(root, 'unitarias', () => assert.fail('No debe iniciar')),
      /carpeta local/,
    );
    await assert.rejects(removeOutput(root, 'output/pruebas/conservar.txt'), /rechaza enlaces/);
    assert.equal(await readFile(join(outside, 'conservar.txt'), 'utf8'), 'contenido protegido');
    await assert.rejects(
      withTestRun(root, '../entregas', () => {}),
      /Grupo de pruebas inválido/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
