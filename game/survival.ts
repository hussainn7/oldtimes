import type { Period, Region, Stats } from './types';
export const freshStats = (): Stats => ({
  health: 100,
  water: 82,
  energy: 88,
  safety: 70,
  knowledge: 0,
  shelter: 0,
});
export const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function applyChanges(stats: Stats, changes: Partial<Stats>): Stats {
  return Object.fromEntries(
    Object.entries(stats).map(([k, v]) => [
      k,
      clamp(v + (changes[k as keyof Stats] || 0)),
    ]),
  ) as unknown as Stats;
}
/** One update is 1.5 seconds of active play; paused time never counts. */
export const TICK_MS = 1500;

function conditions(p: Period, r: Region, s: Stats) {
  const temp = p.temperature + r.temperature;
  const exposure = Math.max(0, Math.abs(temp - 20) - 8) * (1 - s.shelter / 150);
  const factors = {
    air: Math.max(0, 19.5 - p.oxygen) * 8,
    temperature: exposure,
    water: Math.max(0, 70 - p.water - r.water) * 0.4,
    food: (100 - p.food) * 0.14 * (1 - s.knowledge / 200),
    predators: Math.max(0, p.danger + r.danger) * (1 - s.safety / 140) * 0.35,
    condition: (300 - s.health - s.water - s.energy) * 0.12,
  };
  const risk = Object.values(factors).reduce((a, b) => a + b, 0);
  return { risk, factors, temperature: temp };
}

/** Forecast by replaying the same updates used by the live game, without choices. */
export function survival(p: Period, r: Region, s: Stats) {
  let projected = { ...s };
  let ticks = 0;
  while (projected.health > 0 && ticks < 10000) {
    projected = tick(projected, p, r);
    ticks++;
  }
  const seconds = (ticks * TICK_MS) / 1000;
  return {
    seconds,
    days: seconds / 86400,
    label: s.health <= 0 ? 'Expedition ended' : formatRemaining(seconds),
    ...conditions(p, r, s),
  };
}

export function formatRemaining(seconds: number) {
  const rounded = Math.ceil(seconds);
  if (rounded < 60) return `${rounded}s`;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}m${remainder ? ` ${remainder}s` : ''}`;
}

/** Map a risk factor score into a short field word for the HUD. */
export function factorTone(n: number): { word: string; cls: string } {
  if (n < 8) return { word: 'good', cls: 'ok' };
  if (n < 18) return { word: 'fair', cls: '' };
  if (n < 30) return { word: 'limited', cls: 'warn' };
  return { word: 'high', cls: 'warn' };
}
export function tick(s: Stats, p: Period, r: Region): Stats {
  if (s.health <= 0) return s;
  const { factors, temperature } = conditions(p, r, s);
  const airDamage = p.oxygen < 10 ? 7 : p.oxygen < 16 ? 3 : factors.air * 0.01;
  const exposureDamage = temperature > 65 ? 5 : factors.temperature * 0.012;
  return applyChanges(s, {
    water: -0.35 - factors.temperature * 0.009 - factors.water * 0.012,
    energy: -0.22 - factors.food * 0.012,
    health: -(
      airDamage +
      exposureDamage +
      factors.predators * 0.003 +
      (s.water < 15 ? 2 : 0) +
      (s.energy < 10 ? 1 : 0)
    ),
    safety: -0.08,
  });
}
