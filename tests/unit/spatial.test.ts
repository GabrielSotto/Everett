import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attractionStep,
  exitGain,
  fieldRadius,
  panThroughFields,
  sampleBody,
  sampleField,
} from '../../src/spatial/gravity';
import { focus, toWorld } from '../../src/spatial/math';
import { WheelIntent } from '../../src/spatial/wheel-intent';

test('SPATIAL-01: una ráfaga de rueda produce una sola entrada y respeta el bloqueo', () => {
  const wheel = new WheelIntent();
  assert.equal(wheel.consume(-70, 1000), null);
  assert.equal(wheel.consume(-90, 1040), 'enter');
  assert.equal(wheel.consume(-300, 1100), null);
  assert.equal(wheel.consume(160, 1500), 'leave');
  wheel.lock(440, 1600);
  assert.equal(wheel.consume(-160, 2000), null);
  assert.equal(wheel.consume(-160, 2050), 'enter');
});

test('SPATIAL-02: invertir el gesto o esperar inicia una intención nueva', () => {
  const wheel = new WheelIntent();
  assert.equal(wheel.consume(-130, 1000), null);
  assert.equal(wheel.consume(70, 1040), null);
  assert.equal(wheel.consume(90, 1100), 'leave');
  assert.equal(wheel.consume(-130, 1600), null);
  assert.equal(wheel.consume(-40, 2200), null);
  assert.equal(wheel.consume(Number.NaN, 2210), null);
});

test('SPATIAL-03: el paneo fuera de campos aplica el desplazamiento completo', () => {
  const camera = { x: 1000, y: 1000, z: 1 };
  const result = panThroughFields(camera, { x: 100, y: -50 }, [{ id: 'one', x: 0, y: 0 }]);
  assert.ok(Math.abs(result.camera.x - 1100) < 1e-8);
  assert.ok(Math.abs(result.camera.y - 950) < 1e-8);
  assert.deepEqual(camera, { x: 1000, y: 1000, z: 1 });
  assert.equal(result.field, null);
});

test('SPATIAL-04: los campos dejan espacio libre y atraen hacia el mundo enfocado', () => {
  const bodies = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 1000, y: 0 },
  ];
  assert.ok(fieldRadius(bodies[0]!, bodies, 1) * 2 < 1000);
  assert.equal(sampleField(bodies, { x: -500, y: 0, z: 1 }), null);
  const field = sampleBody(bodies[0]!, bodies, { x: 100, y: 0, z: 1 });
  const delta = attractionStep(field, 1 / 60);
  assert.ok(delta.x < 0 && delta.x > -100);
  assert.equal(Math.abs(delta.y), 0);
  assert.deepEqual(attractionStep(field, 0), { x: 0, y: 0 });
  assert.equal(exitGain(1), 1);
  assert.ok(exitGain(0) > 0);
});

test('SPATIAL-05: la histéresis evita cambios de foco por diferencias pequeñas', () => {
  const items = [
    { id: 'a', x: -10, y: 0 },
    { id: 'b', x: 10, y: 0 },
  ];
  assert.equal(focus(items, { x: -2, y: 0, z: 1 }, 'a', 50), 'a');
  assert.equal(focus(items, { x: -100, y: 0, z: 1 }, 'a', 5), 'b');
  assert.equal(focus([], { x: 0, y: 0, z: 1 }, null), null);
});

test('SPATIAL-06: convertir coordenadas conserva la relación con paneo y zoom', () => {
  const point = toWorld(
    { x: 620, y: 280 },
    { x: 20, y: -20, z: 2 },
    { x: 100, y: 50, width: 800, height: 600 },
  );
  assert.deepEqual(point, { x: 50, y: -25 });
});
