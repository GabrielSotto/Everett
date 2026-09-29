/** Solo una ejecución terminada y completa puede producir un resultado aprobado. */
export function parseTapSummary(text, exitCode) {
  if (exitCode !== 0) throw new Error(`El proceso de pruebas terminó con código ${exitCode}.`);
  const counts = {};
  for (const name of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const matches = [...text.matchAll(new RegExp(`^# ${name} (\\d+)\\s*$`, 'gm'))];
    if (matches.length !== 1) throw new Error(`Resumen de pruebas ausente o ambiguo: ${name}.`);
    counts[name] = Number(matches[0][1]);
  }
  if (counts.tests === 0) throw new Error('La ejecución no descubrió ninguna prueba.');
  if (
    counts.pass !== counts.tests ||
    counts.fail ||
    counts.cancelled ||
    counts.skipped ||
    counts.todo
  ) {
    throw new Error('La ejecución contiene pruebas fallidas, canceladas, omitidas o pendientes.');
  }
  if (/^not ok\b/m.test(text)) throw new Error('La salida contiene una prueba fallida.');
  const completed = [...text.matchAll(/^ok (\d+) - .+$/gm)];
  const plans = [...text.matchAll(/^1\.\.(\d+)\s*$/gm)];
  if (
    completed.length !== counts.tests ||
    plans.length !== 1 ||
    Number(plans[0][1]) !== counts.tests ||
    completed.some((match, index) => Number(match[1]) !== index + 1)
  ) {
    throw new Error('La salida no contiene todos los resultados individuales de las pruebas.');
  }
  return counts;
}
