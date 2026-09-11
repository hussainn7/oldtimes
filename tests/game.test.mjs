import test from 'node:test';
import assert from 'node:assert/strict';
import { periods, regions, shortDate } from '../.test-build/data.js';
import {
  events,
  eligibleEvents,
  historicalDiscovery,
  nextEncounter,
} from '../.test-build/events.js';
import {
  freshStats,
  applyChanges,
  survival,
  tick,
  TICK_MS,
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
  assert.ok(survival(periods[0], regions[0], base).seconds < 60);
  assert.equal(
    survival(periods[0], regions[0], { ...base, health: 0 }).label,
    'Expedition ended',
  );
});
test('remaining time matches actual depletion in every world and region', () => {
  for (const p of periods)
    for (const r of regions) {
      for (const initial of [
        freshStats(),
        { ...freshStats(), health: 28, water: 8, shelter: 60, knowledge: 45 },
      ]) {
        const estimate = survival(p, r, initial);
        let state = initial;
        let elapsed = 0;
        while (state.health > 0 && elapsed < 20000) {
          state = tick(state, p, r);
          elapsed += TICK_MS / 1000;
        }
        assert.equal(state.health, 0);
        assert.equal(estimate.seconds, elapsed, `${p.id}/${r.id}`);
        assert.ok(Math.abs(estimate.days * 86400 - estimate.seconds) < 1e-9);
        const afterTick = survival(p, r, tick(initial, p, r));
        assert.equal(
          afterTick.seconds,
          Math.max(0, estimate.seconds - TICK_MS / 1000),
        );
      }
    }
});
test('regional heat and low reserves shorten the forecast; ended means zero', () => {
  const mild = { ...periods[13], temperature: 60, oxygen: 21 };
  assert.ok(
    survival(mild, regions[1], freshStats()).seconds <
      survival(mild, regions[0], freshStats()).seconds,
  );
  const low = { ...freshStats(), health: 20, water: 0, energy: 0 };
  assert.ok(
    survival(periods[13], regions[0], low).seconds <
      survival(periods[13], regions[0], freshStats()).seconds,
  );
  assert.equal(survival(mild, regions[0], { ...low, health: 0 }).seconds, 0);
});
test('every era introduces a unique historical discovery before generic encounters', () => {
  const discoveries = periods.map(historicalDiscovery);
  assert.equal(new Set(discoveries.map((e) => e.id)).size, periods.length);
  assert.equal(new Set(discoveries.map((e) => e.body)).size, periods.length);
  periods.forEach((p) =>
    assert.equal(nextEncounter(p, regions[0], []).id, `history:${p.id}`),
  );
});
test('encounters never repeat across eras, reloads, exhausted pools or nearby wildlife', () => {
  let seen = [];
  for (const p of [...periods, ...periods]) {
    for (const nearby of ['', ...p.species.map((s) => s.name)]) {
      let event;
      while ((event = nextEncounter(p, regions[0], seen, nearby, () => 0.6))) {
        assert.ok(!seen.includes(event.id));
        seen = JSON.parse(JSON.stringify([...seen, event.id]));
      }
      assert.equal(nextEncounter(p, regions[0], seen, nearby), null);
    }
  }
  assert.equal(new Set(seen).size, seen.length);
});
test('encounters respect local climate, flying species and extinction cause', () => {
  const jurassic = periods[13];
  assert.ok(!eligibleEvents(jurassic, regions[0]).some((e) => e.id === 'heat'));
  assert.ok(eligibleEvents(jurassic, regions[1]).some((e) => e.id === 'heat'));
  assert.ok(
    !eligibleEvents(periods[27], regions[0]).some((e) => e.id === 'cold'),
  );
  const volcanic = eligibleEvents(periods.find((p) => p.id === 'great-dying'));
  assert.ok(volcanic.some((e) => e.id === 'volcanic-aftermath'));
  assert.ok(!volcanic.some((e) => e.id === 'ashfall'));
  assert.ok(
    eligibleEvents(periods.find((p) => p.id === 'impact')).some(
      (e) => e.id === 'ashfall',
    ),
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
