import assert from 'node:assert/strict';
import test from 'node:test';
import { seed } from '../../src/domain/seed';
import { planetAppearance } from '../../src/spatial/appearance';
import { orbitPosition, orbitProfile, type OrbitProfile } from '../../src/spatial/planet-orbit';

test('ORBIT-01: cada órbita tiene una luna con identidad estable y separada del Mundo', () => {
  const worlds = seed(false, 42, 0).worlds;
  const orbiting = worlds.filter((w) => planetAppearance(w.seed, w.id, 88).orbit);
  assert.ok(orbiting.length > 0 && orbiting.length < worlds.length);
  for (const world of orbiting) {
    const appearance = planetAppearance(world.seed, world.id, 88);
    const profile = orbitProfile(world.id, appearance.orbitAngle);
    assert.deepEqual(orbitProfile(world.id, appearance.orbitAngle), profile);
    assert.ok(profile.moonRadius > 0 && profile.radius - profile.moonRadius > 1);
    assert.ok(profile.periodSeconds >= 38 && profile.periodSeconds <= 56);
    for (let step = 0; step < 32; step++) {
      const position = orbitPosition(profile, (step / 32) * profile.periodSeconds);
      assert.ok(
        Math.abs(Math.hypot(position.x, position.y, position.depth) - profile.radius) < 1e-10,
      );
    }
    const initial = orbitPosition(profile, 0),
      returned = orbitPosition(profile, profile.periodSeconds);
    assert.ok(
      Math.hypot(initial.x - returned.x, initial.y - returned.y, initial.depth - returned.depth) <
        1e-10,
    );
  }
});

test('ORBIT-02: inclinación y sentido conservan profundidad y continuidad delante y detrás', () => {
  const profile: OrbitProfile = {
    radius: 1.6,
    minorRadius: 0.55,
    angle: 0,
    moonRadius: 0.08,
    periodSeconds: 40,
    direction: 1,
    phase: 0,
  };
  const near = orbitPosition(profile, 10),
    far = orbitPosition(profile, 30);
  assert.ok(near.depth > 0 && far.depth < 0);
  assert.ok(Math.hypot(far.x, far.y) + profile.moonRadius < 1);
  assert.ok(Math.abs(near.y - 0.55) < 1e-10);
  assert.ok(Math.abs(far.y + 0.55) < 1e-10);
  const tilted = orbitPosition({ ...profile, angle: Math.PI / 2 }, 10);
  assert.ok(Math.abs(tilted.x + 0.55) < 1e-10);
  assert.equal(tilted.depth, near.depth);
  const reverse = orbitPosition({ ...profile, direction: -1 }, 10);
  assert.ok(reverse.depth < 0 && Math.abs(reverse.y - far.y) < 1e-10);
  const before = orbitPosition(profile, 19.999),
    after = orbitPosition(profile, 20.001);
  assert.ok(before.depth > 0 && after.depth < 0);
  assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < 0.001);
});
