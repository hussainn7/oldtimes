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
export function survival(p: Period, r: Region, s: Stats) {
  const temp = p.temperature + r.temperature;
  const exposure = Math.max(0, Math.abs(temp - 20) - 8) * (1 - s.shelter / 150);
  const factors = {
    air: Math.max(0, 18 - p.oxygen) * 8,
    temperature: exposure,
    water: Math.max(0, 70 - p.water - r.water) * 0.4,
    food: (100 - p.food) * 0.14,
    predators: (p.danger + r.danger) * (1 - s.safety / 140) * 0.35,
    condition: (300 - s.health - s.water - s.energy) * 0.12,
  };
  const risk = Object.values(factors).reduce((a, b) => a + b, 0);
  const days = Math.max(
    0.1,
    Math.min(90, (110 - risk) / 5 + s.knowledge * 0.06 + s.shelter * 0.03),
  );
  return {
    days,
    label:
      s.health <= 0
        ? 'Expedition ended'
        : p.oxygen < 10
          ? 'Under 5 minutes'
          : p.oxygen < 16
            ? 'Under 1 hour'
            : temp > 65
              ? 'Under 30 minutes'
              : `${Math.round(days)} ${Math.round(days) === 1 ? 'day' : 'days'}`,
    risk,
    factors,
    temperature: temp,
  };
}
export function tick(s: Stats, p: Period, r: Region): Stats {
  const stress =
    Math.max(0, Math.abs(p.temperature + r.temperature - 20) - 10) / 35;
  return applyChanges(s, {
    water: -0.45 - stress * 0.3,
    energy: -0.3,
    health: -(p.oxygen < 10
      ? 7
      : p.oxygen < 16
        ? 3
        : p.temperature > 65
          ? 5
          : s.water < 15 || s.energy < 10
            ? 2
            : stress * 0.15),
    safety: -0.08,
  });
}
