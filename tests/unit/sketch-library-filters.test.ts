import test from 'node:test';
import assert from 'node:assert/strict';
import { entries } from '../../design/wireframe-library/samples.js';
import { libraryFilters } from '../../src/ui/sketch-library-filters';

test('C08-U55: cada entrada tiene una clasificación útil y única en su pestaña', () => {
  for (const tab of ['base', 'components', 'screens']) {
    const filters = libraryFilters(tab).filter((filter) => filter.id !== 'all');
    const items = entries.filter((item) =>
      tab === 'components' ? !['base', 'screens'].includes(item.family) : item.family === tab,
    );
    assert.ok(filters.length > 1);
    for (const entry of items)
      assert.equal(filters.filter((filter) => filter.includes(entry)).length, 1, entry.id);
    for (const filter of filters)
      assert.ok(
        items.some((item) => filter.includes(item)),
        filter.id,
      );
  }
  // Los nombres también son claves de búsqueda: la codificación debe conservar acentos.
  const symbols = entries.find((entry) => entry.id === 'symbol')!;
  assert.equal(symbols.variants.find((variant) => variant.id === 'bell')?.label, 'Notificación');
  for (const entry of entries) {
    for (const label of [entry.name, ...entry.variants.map((variant) => variant.label)])
      assert.doesNotMatch(label, /[\u00c3\u00c2\ufffd]/, label);
  }
});
