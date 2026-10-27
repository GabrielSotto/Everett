import { verifyCanvasControls } from './canvas-contracts.mjs';
export function browserSpecs(suites) {
  if (!Array.isArray(suites)) throw new Error('Falta el inventario de pruebas de navegador.');
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...browserSpecs(suite.suites ?? [])]);
}

export function verifyBrowserReport(report, expected) {
  const meta = report?.config?.metadata;
  if (!meta || meta.runId !== expected.runId || meta.version !== expected.version)
    throw new Error('La evidencia de navegador pertenece a otra ejecución o versión.');
  const kind = expected.kind ?? 'artifact';
  if ((meta.targetKind ?? 'artifact') !== kind) throw new Error('El tipo de objetivo no coincide.');
  if ((kind === 'development' ? meta.sourceSha256 : meta.artifactSha256) !== expected.sha256)
    throw new Error(
      kind === 'development'
        ? 'La evidencia de navegador corresponde a otras fuentes de desarrollo.'
        : 'La evidencia de navegador corresponde a otro HTML.',
    );
  const specs = browserSpecs(report.suites);
  const ids = specs.map((spec) => spec.id).sort();
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    JSON.stringify(ids) !== JSON.stringify([...expected.ids].sort())
  )
    throw new Error('La ejecución no cubre exactamente los casos descubiertos.');
  const stats = report.stats;
  if (
    !stats ||
    stats.expected !== specs.length ||
    stats.unexpected !== 0 ||
    stats.skipped !== 0 ||
    stats.flaky !== 0 ||
    !Array.isArray(report.errors) ||
    report.errors.length
  )
    throw new Error('La ejecución contiene fallos, omisiones o resultados contradictorios.');
  for (const spec of specs) {
    const test = spec.tests?.[0];
    const result = test?.results?.[0];
    if (
      !spec.ok ||
      spec.tests.length !== 1 ||
      test.expectedStatus !== 'passed' ||
      test.status !== 'expected' ||
      test.results.length !== 1 ||
      result.status !== 'passed' ||
      result.retry !== 0 ||
      result.errors?.length
    )
      throw new Error(`El caso ${spec.title} no tiene una única ejecución aprobada.`);
    if (
      !test.annotations?.some(
        (item) =>
          item.type === (kind === 'development' ? 'source-sha256' : 'artifact-sha256') &&
          item.description === expected.sha256,
      )
    )
      throw new Error(`El caso ${spec.title} no acredita el objetivo cargado.`);
    for (const name of ['runtime-errors', 'everett-trace', 'controls-used', 'screenshot', 'trace'])
      if (!result.attachments?.some((item) => item.name === name))
        throw new Error(`Falta ${name} en ${spec.title}.`);
    const controls = result.attachments.find((item) => item.name === 'controls-used');
    verifyCanvasControls(
      spec.title,
      JSON.parse(Buffer.from(controls.body ?? '', 'base64').toString()),
    );
    const runtime = result.attachments.find((item) => item.name === 'runtime-errors');
    if (Buffer.from(runtime.body ?? '', 'base64').toString() !== '[]')
      throw new Error(`El caso ${spec.title} registra errores de ejecución.`);
    const diagnostics = result.attachments.find((item) => item.name === 'everett-trace');
    const entries = JSON.parse(Buffer.from(diagnostics.body ?? '', 'base64').toString());
    if (!Array.isArray(entries) || entries.length === 0)
      throw new Error(`Falta la traza de la aplicación en ${spec.title}.`);
    if (entries.some((entry) => entry.level === 'error'))
      throw new Error(`La aplicación registró un fallo en ${spec.title}.`);
  }
  return specs;
}
