import assert from 'node:assert/strict';
import test from 'node:test';
import { setup, project, intent, note } from './fixtures';
import { linkUrl, validLinkPreview } from '../../src/domain/link-previews';
import { linkCardMarkup } from '../../src/features/canvas/link-card';
import { searchWorkspace } from '../../src/domain/workspace-search';

test('C08-U26: metadata tardía conserva identidad, nombre, geometría e historial y nunca resucita enlaces', () => {
  const { store } = setup();
  const act = (c: Parameters<typeof store.dispatch>[0]) => store.dispatch(c, intent);
  const url = 'https://example.org/article';
  act({
    type: 'node.create',
    world: 'project',
    node: { ...note('bookmark'), data: { kind: 'link', title: 'Mi nombre', url } },
  });
  act({ type: 'node.move', world: 'project', id: 'bookmark', point: { x: 450, y: 250 } });
  const before = structuredClone(project(store).nodes.at(-1)!);
  const count = store.canvasHistory.status('project').undo;
  const metadata = {
    status: 'ready' as const,
    checkedAt: 123,
    resolvedUrl: url,
    title: 'Título publicado',
    imageAsset: 'cover',
  };
  assert.equal(searchWorkspace(store.get(), 'Título publicado').length, 0);
  act({ type: 'node.link-preview', world: 'project', id: 'bookmark', url, metadata });
  const found = searchWorkspace(store.get(), 'Título publicado');
  assert.equal(found.length, 1);
  assert.equal(found[0]?.id, 'bookmark');
  assert.equal(found[0]?.title, 'Mi nombre');
  assert.equal(store.canvasHistory.status('project').undo, count);
  assert.deepEqual(project(store).nodes.at(-1), { ...before, data: { ...before.data, metadata } });
  act({ type: 'canvas.undo', world: 'project' });
  assert.equal(
    (project(store).nodes.at(-1)!.data as { metadata: unknown }).metadata &&
      project(store).nodes.at(-1)!.x,
    10,
  );
  act({ type: 'canvas.redo', world: 'project' });
  assert.deepEqual(project(store).nodes.at(-1), { ...before, data: { ...before.data, metadata } });
  act({
    type: 'node.link-preview',
    world: 'project',
    id: 'bookmark',
    url: url + '/other',
    metadata: { ...metadata, title: 'No reemplazar' },
  });
  assert.equal(
    (project(store).nodes.at(-1)!.data as { metadata: typeof metadata }).metadata.title,
    metadata.title,
  );
  act({ type: 'node.delete', world: 'project', id: 'bookmark' });
  act({ type: 'node.link-preview', world: 'project', id: 'bookmark', url, metadata });
  assert.equal(
    project(store).nodes.some((n) => n.id === 'bookmark'),
    false,
  );
  assert.equal(searchWorkspace(store.get(), 'Título publicado').length, 0);
  assert.equal(linkUrl('javascript:alert(1)'), null);
  assert.equal(linkUrl('https://user:secret@example.org/'), null);
  assert.equal(validLinkPreview({ ...metadata, title: 'x'.repeat(513) }), false);
  const card = linkCardMarkup(
    {
      kind: 'link',
      title: 'Manual',
      url,
      metadata: {
        ...metadata,
        title: '<img onerror=alert(1)>',
        description: '<script>bad()</script>',
      },
    },
    'bookmark',
  );
  assert.ok(card.includes('&lt;img'));
  assert.ok(!card.includes('<script>'));
});
