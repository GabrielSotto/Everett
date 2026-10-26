import assert from 'node:assert/strict';
import test from 'node:test';
import { publicIssues } from '../public/evidence.mjs';

test('HARNESS-15: un gesto público fallido bloquea la entrega aunque la regresión controlada pase', () => {
  const hash = 'a'.repeat(64);
  const network = {
    artifact: hash,
    cases: [
      ...['reader', 'image', 'video'].map((kind) => ({
        kind,
        bytes: 10,
        sha256: hash,
        reloadSameBytes: true,
      })),
      { kind: 'provider', playback: { playing: true, time: 1, videoWidth: 1280 } },
      { kind: 'youtube-focused-modifier', passed: true },
      { kind: 'youtube-parent-modifier', passed: true },
      { kind: 'youtube-local-wheel', staysInside: true, geometryStable: true },
      { kind: 'dns-not-found', problem: 'host-not-found' },
    ],
  };
  const inspection = {
    artifact: hash,
    cases: [
      ...['visual-selected-gallery', 'visual-spatial-shortcut'].map((kind) => ({
        kind,
        contained: true,
        width: 320,
        textScale: 2,
      })),
      { kind: 'inline-completion', acceptedBy: 'Tab' },
    ],
  };
  assert.deepEqual(publicIssues(hash, network, inspection), []);
  const failed = structuredClone(network);
  failed.cases.find((item) => item.kind === 'youtube-focused-modifier').passed = false;
  assert.ok(
    publicIssues(hash, failed, inspection).some((issue) =>
      issue.includes('youtube-focused-modifier'),
    ),
  );
  assert.ok(
    publicIssues('otra versión', network, inspection).some((issue) => issue.includes('artefacto')),
  );
  assert.ok(publicIssues(hash, { artifact: hash, cases: [] }, inspection).length > 0);
  const missing = structuredClone(network);
  missing.cases = missing.cases.filter((item) => item.kind !== 'image');
  assert.ok(publicIssues(hash, missing, inspection).some((issue) => issue.includes('image')));
  const noPlayback = structuredClone(network);
  noPlayback.cases.find((item) => item.kind === 'provider').playback.time = 0;
  assert.ok(
    publicIssues(hash, noPlayback, inspection).some((issue) => issue.includes('reproducción')),
  );
});
