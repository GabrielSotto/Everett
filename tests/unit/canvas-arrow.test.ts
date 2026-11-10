import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, project, intent } from './fixtures';
import { createArrow, editArrow, restrokeArrow } from '../../src/domain/free-arrow';
import { captureCanvasCopies, parseCanvasClipboard } from '../../src/domain/canvas-copies';
test('C08-U77: una flecha se curva y cambia de grosor sin desplazar extremos; el estilo del cable viaja y se valida', () => {
  const { store } = setup(),
    world = 'project';
  const arrow = createArrow('arrow', { x: 250, y: 20 }, { x: 10, y: 20 }, false, '#aa6611', 2);
  const bent = editArrow(arrow, 'bend', { x: 120, y: -60 });
  const thick = restrokeArrow(bent, 8);
  for (const material of [bent, thick]) {
    assert.deepEqual(
      material.data.points.map((p) => [Math.round(p.x + material.x), Math.round(p.y + material.y)]),
      [
        [250, 20],
        [120, -60],
        [10, 20],
      ],
    );
    assert.ok(material.y <= -60 && material.height >= 80);
  }
  store.dispatch({ type: 'node.create', world, node: arrow }, intent);
  store.dispatch({ type: 'link.thickness', world, id: 'link', thickness: 12 }, intent);
  const clip = captureCanvasCopies(project(store), ['note-a', 'note-b', 'arrow']);
  assert.equal(parseCanvasClipboard(JSON.stringify(clip)).links[0]!.thickness, 12);
  assert.throws(
    () => store.dispatch({ type: 'link.thickness', world, id: 'link', thickness: 999 }, intent),
    { code: 'LINK_STYLE' },
  );
  clip.links[0]!.thickness = -9;
  assert.throws(() => parseCanvasClipboard(JSON.stringify(clip)), { code: 'CLIPBOARD_LINK' });
  store.dispatch({ type: 'canvas.undo', world }, intent);
  assert.equal(project(store).links[0]!.thickness, undefined);
});
