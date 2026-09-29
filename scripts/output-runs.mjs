import { lstat, mkdir, open, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const kinds = ['unitarias', 'navegador'];
const runName = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z$/;

export function createRunId() {
  return new Date().toISOString().replace('T', '_').replaceAll(':', '-').replace('.', '-');
}

async function runParent(root, kind) {
  if (!kinds.includes(kind)) throw new Error(`Grupo de pruebas inválido: ${kind}`);
  const base = await realpath(root);
  let directory = base;
  for (const part of ['output', 'pruebas', kind]) {
    directory = resolve(directory, part);
    await mkdir(directory).catch((error) => {
      if (error.code !== 'EEXIST') throw error;
    });
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error(`La salida debe ser una carpeta local: ${directory}`);
  }
  return directory;
}

export async function removeOutput(root, path) {
  const base = await realpath(root);
  const target = resolve(base, path);
  const local = relative(base, target);
  if (!local.startsWith(`output${sep}`) || local.split(sep).includes('..'))
    throw new Error(`Limpieza fuera de output: ${path}`);
  let cursor = base;
  for (const part of local.split(sep)) {
    cursor = resolve(cursor, part);
    const info = await lstat(cursor).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (!info) return;
    if (info.isSymbolicLink()) throw new Error(`La limpieza rechaza enlaces: ${cursor}`);
  }
  await rm(target, { recursive: true, force: true });
}

export async function withTestRun(root, kind, execute) {
  const parent = await runParent(root, kind);
  const lockPath = resolve(parent, 'en-curso.json');
  const lock = await open(lockPath, 'wx').catch((error) => {
    if (error.code === 'EEXIST')
      throw new Error(`Ya hay una ejecución de ${kind}. Consultá ${lockPath}.`);
    throw error;
  });
  const runId = createRunId();
  const directory = resolve(parent, runId);
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, runId }) + '\n');
    await mkdir(directory);
    await writeFile(resolve(directory, 'ejecucion.json'), JSON.stringify({ kind, runId }) + '\n');
    try {
      await execute({ runId, directory });
    } catch (error) {
      await writeFile(resolve(directory, 'error.log'), String(error.stack ?? error) + '\n');
      throw error;
    } finally {
      // La última ejecución conserva su diagnóstico aunque falle; las entregas viven fuera de output.
      for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (entry.name === runId || !runName.test(entry.name)) continue;
        const candidate = resolve(parent, entry.name);
        if (!entry.isDirectory() || entry.isSymbolicLink())
          throw new Error(`Salida anterior inválida: ${candidate}`);
        const record = JSON.parse(await readFile(resolve(candidate, 'ejecucion.json'), 'utf8'));
        if (record.kind !== kind || record.runId !== entry.name)
          throw new Error(`Identidad de salida anterior inválida: ${candidate}`);
        await removeOutput(root, candidate);
      }
    }
  } finally {
    await lock.close();
    await rm(lockPath);
  }
}

export async function latestTestResult(root, kind) {
  const parent = await runParent(root, kind);
  const entries = await readdir(parent);
  if (entries.includes('en-curso.json')) throw new Error(`Las pruebas de ${kind} siguen en curso.`);
  const runs = entries.filter((name) => runName.test(name));
  if (runs.length !== 1)
    throw new Error(`Se esperaba una ejecución de ${kind}; hay ${runs.length}.`);
  const file = kind === 'unitarias' ? 'result.json' : 'results.json';
  return relative(root, resolve(parent, runs[0], file)).replaceAll('\\', '/');
}
