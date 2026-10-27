import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  canvasCases,
  verifyCanvasCoverage,
  verifyContractInventory,
  standaloneCases,
} from '../../scripts/canvas-contracts.mjs';

test('HARNESS-C08: rechaza cobertura ausente, duplicada y contratos sin caso obligatorio', () => {
  verifyContractInventory(readFileSync('docs/iteraciones/0.8.md', 'utf8'));
  for (const layer of ['unit', 'browser']) {
    const titles = canvasCases
      .filter((item) => item.layer === layer)
      .map((item) => item.id + ': comprobación real');
    assert.equal(verifyCanvasCoverage(layer, titles).length, titles.length);
    for (let index = 0; index < titles.length; index++) {
      assert.throws(() =>
        verifyCanvasCoverage(
          layer,
          titles.filter((_, i) => i !== index),
        ),
      );
      assert.throws(() => verifyCanvasCoverage(layer, [...titles, titles[index]]));
    }
    assert.throws(() => verifyCanvasCoverage(layer, ['UI-CANVAS-01: evidencia anterior']));
  }
  assert.throws(() => verifyContractInventory('C08-NEW-01'));
});

test('HARNESS-DEV-COVERAGE: desarrollo exige todos los casos aplicables y conserva el gate de archivo autónomo', () => {
  const titles = canvasCases
    .filter((c) => c.layer === 'browser' && !standaloneCases.includes(c.id))
    .map((c) => c.id + ': recorrido de fuentes');
  verifyCanvasCoverage('browser', titles, { targetKind: 'development' });
  assert.throws(() => verifyCanvasCoverage('browser', titles), /C08-B13|C08-B90/);
  for (let index = 0; index < titles.length; index++) {
    assert.throws(() =>
      verifyCanvasCoverage(
        'browser',
        titles.filter((_, i) => i !== index),
        { targetKind: 'development' },
      ),
    );
    assert.throws(() =>
      verifyCanvasCoverage('browser', [...titles, titles[index]], { targetKind: 'development' }),
    );
  }
  assert.throws(() => verifyCanvasCoverage('browser', titles, { targetKind: 'otro' }), /inválido/);
});
