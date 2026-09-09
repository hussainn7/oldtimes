import test from 'node:test';
import assert from 'node:assert/strict';
import { periods, regions, shortDate } from '../.test-build/data.js';
import { events, eligibleEvents } from '../.test-build/events.js';
import {
  freshStats,
  applyChanges,
  survival,
  tick,
} from '../.test-build/survival.js';
test('all checkpoints have unique descending dates and playable content', () => {
  assert.equal(periods.length, 28);
  assert.equal(new Set(periods.map((p) => p.id)).size, 28);
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (i) assert.ok(p.mya < periods[i - 1].mya);
    assert.ok(eligibleEvents(p).length >= 2);
    assert.ok(p.description && p.continents && p.sky.length === 2);
    for (const r of regions) {
      const result = survival(p, r, freshStats());
      assert.ok(Number.isFinite(result.days));
      assert.ok(result.label.length > 0);
    }
  }
});
test('deep time cannot show anachronistic animals', () => {
  assert.ok(
    periods.filter((p) => p.mya >= 1000).every((p) => p.species.length === 0),
  );
  assert.ok(
    periods
      .filter((p) => p.mya <= 66)
      .every(
        (p) =>
          !p.species.some((s) =>
            ['sauropod', 'theropod', 'stegosaur', 'pterosaur'].includes(s.kind),
          ),
      ),
  );
});
test('survival responds to supplies, shelter, location and breathable air', () => {
  const j = periods.find((p) => p.id === 'jurassic');
  const base = freshStats();
  assert.ok(
    survival(j, regions[0], base).days > survival(j, regions[1], base).days,
  );
  assert.ok(
    survival(j, regions[0], applyChanges(base, { shelter: 50, knowledge: 40 }))
      .days > survival(j, regions[0], base).days,
  );
  assert.match(survival(periods[0], regions[0], base).label, /minutes/);
  assert.equal(
    survival(periods[0], regions[0], { ...base, health: 0 }).label,
    'Expedition ended',
  );
});
test('every event choice stays in bounds and has a consequence', () => {
  assert.equal(events.length, 22);
  for (const e of events) {
    assert.ok(e.choices.length >= 2);
    for (const c of e.choices) {
      assert.ok(c.outcome);
      assert.ok(Object.keys(c.changes).length);
      for (const edge of [0, 100]) {
        const s = Object.fromEntries(
          Object.keys(freshStats()).map((k) => [k, edge]),
        );
        assert.ok(
          Object.values(applyChanges(s, c.changes)).every(
            (n) => n >= 0 && n <= 100,
          ),
        );
      }
    }
  }
});
test('hostile atmosphere ends an expedition and retry supplies are healthy', () => {
  let s = freshStats();
  for (let i = 0; i < 20; i++) s = tick(s, periods[0], regions[0]);
  assert.equal(s.health, 0);
  assert.equal(freshStats().health, 100);
});
test('recent dates do not round to zero', () => {
  assert.equal(shortDate(periods[26]), '200 YA');
  assert.equal(shortDate(periods[27]), 'TODAY');
});

import {
  heightAt,
  stepPosition,
  bounds,
} from '../.test-build/three/terrain.js';
import { buildSpeciesRegistry } from '../.test-build/assets.js';
test('3D terrain is finite across all era/region pairs and shoreline stays underwater', () => {
  for (const p of periods)
    for (const r of regions) {
      for (const x of [2, 13, 70, 122])
        for (const z of [-9, 0, 3, 13]) {
          assert.ok(Number.isFinite(heightAt(x, z, p.biome, r)));
          assert.ok(
            Math.abs(
              heightAt(x + 0.1, z, p.biome, r) - heightAt(x, z, p.biome, r),
            ) < 0.5,
          );
        }
    }
  assert.ok(heightAt(13, -40, 'ocean', regions[0]) < -1.6);
});
test('3D movement slides out of obstacles and respects the expedition boundary', () => {
  const obstacles = [{ x: 10, z: 3, radius: 1 }];
  const p = stepPosition(8, 3, 1.5, 0.2, obstacles);
  assert.ok(Math.hypot(p.x - 10, p.z - 3) >= 1.319);
  const edge = stepPosition(3, 1, -200, 200, []);
  assert.equal(edge.x, bounds.minX);
  assert.equal(edge.z, bounds.maxZ);
  const stationary = stepPosition(13, 3, 0, 0, []);
  assert.deepEqual(stationary, { x: 13, z: 3 });
});
test('3D species keys are stable and retain all historical memberships', () => {
  const registry = buildSpeciesRegistry(periods);
  assert.equal(new Set(registry.map((s) => s.id)).size, registry.length);
  for (const p of periods)
    for (const species of p.species) {
      const item = registry.find((s) => s.name === species.name);
      assert.ok(item.periodIds.includes(p.id));
      assert.match(item.id, /^[a-z0-9-]+$/);
      assert.ok(item.model.scale > 0);
    }
});
