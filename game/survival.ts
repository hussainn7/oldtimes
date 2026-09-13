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
/** One simulated minute — never a real-time game timer. */
export const SURVIVAL_STEP_HOURS = 1 / 60;
/** Long enough for a modern lifespan readout; + means still going. */
export const SURVIVAL_LIMIT_HOURS = 80 * 365.25 * 24;

function conditions(p: Period, r: Region, s: Stats) {
  const temp = p.temperature + r.temperature;
  const exposure = Math.max(0, Math.abs(temp - 20) - 8) * (1 - s.shelter / 150);
  const factors = {
    air: Math.max(0, 19.5 - p.oxygen) * 8,
    temperature: exposure,
    water: Math.max(0, 100 - p.water - r.water) * 0.4,
    food: (100 - p.food) * 0.14 * (1 - s.knowledge / 200),
    // Predators matter in encounters; thirst, air, and exposure dominate the estimate.
    predators: p.species.some((species) => species.behavior === 'hunt')
      ? Math.max(0, p.danger + r.danger) * (1 - s.safety / 140) * 0.12
      : 0,
    condition: (300 - s.health - s.water - s.energy) * 0.12,
  };
  const risk = Object.values(factors).reduce((a, b) => a + b, 0);
  return { risk, factors, temperature: temp };
}

function airDamage(oxygen: number) {
  // OSHA-informed thresholds; rates tuned to the era table (minutes → hours → years).
  if (oxygen < 1) return 5000;
  if (oxygen < 6) return 2000;
  if (oxygen < 8) return 350;
  if (oxygen < 11) return 90;
  if (oxygen < 14) return 28;
  if (oxygen < 16) return 7;
  if (oxygen < 18) return 1.2;
  if (oxygen < 19) return 0.35;
  return Math.max(0, 19.5 - oxygen) * 0.2;
}

/** Rates of change per simulated hour at the current state. */
function hourlyRates(p: Period, r: Region, s: Stats) {
  const { temperature } = conditions(p, r, s);
  const protection = 1 - s.shelter / 125;
  const heat = Math.max(0, temperature - 30);
  const cold = Math.max(0, 5 - temperature);
  const waterEnv = p.water + r.water;
  const forage =
    (0.85 + s.knowledge / 200) * (0.45 + s.shelter / 250 + s.safety / 350);
  // Landscape foraging can refill reserves when water/food exist; barren worlds cannot.
  const water =
    waterEnv * 0.015 * forage - (0.42 + heat * 0.04 + cold * 0.002);
  const energy =
    p.food * 0.013 * forage * (1 + s.knowledge / 180) -
    (0.2 + cold * 0.004 + Math.max(0, 45 - p.food) * 0.002);
  // Mild warmth is uncomfortable; only hard heat/cold cuts health quickly.
  const heatHit = Math.max(0, heat - 2) ** 2 * 0.08 * protection;
  const coldHit = Math.max(0, cold - 8) * 0.012 * protection;
  const chronic =
    (0.00008 +
      p.danger * 0.000006 +
      Math.max(0, 50 - p.food) * 0.000012 +
      Math.max(0, 35 - waterEnv) * 0.00001) *
    (1 - s.shelter / 200) *
    (1 - s.knowledge / 300);
  const health = -(
    airDamage(p.oxygen) +
    heatHit +
    coldHit +
    chronic +
    Math.max(0, 15 - s.water) * 1.1 +
    Math.max(0, 10 - s.energy) * 0.35
  );
  return { water, energy, health, temperature };
}

/**
 * Hypothetical survival with current gear and landscape foraging, no new gear
 * drops and no fresh encounter rolls. Calibrated to modern-human physiology
 * across deep time; not a lab measurement.
 */
export function survival(p: Period, r: Region, s: Stats) {
  let projected = { ...s };
  let hours = 0;
  const limit = SURVIVAL_LIMIT_HOURS;
  while (projected.health > 0 && hours < limit) {
    const rates = hourlyRates(p, r, projected);
    const drain = Math.max(0.0001, -rates.health);
    const resourceFloor = Math.min(projected.water, projected.energy);
    // Fine steps while dying fast or cascading; coarse steps once stable.
    let step =
      drain > 5 || resourceFloor < 20 || p.oxygen < 16
        ? SURVIVAL_STEP_HOURS
        : drain > 0.05
          ? 1
          : 24;
    step = Math.min(step, limit - hours);
    if (step >= 1 && drain > 0) step = Math.min(step, projected.health / drain / 4);
    step = Math.max(SURVIVAL_STEP_HOURS, step);
    projected = tick(projected, p, r, step);
    hours += step;
  }
  return {
    hours,
    days: hours / 24,
    label:
      s.health <= 0
        ? 'Expedition over'
        : `${formatSurvival(hours)}${projected.health > 0 ? '+' : ''}`,
    ...conditions(p, r, s),
  };
}

export function formatSurvival(hours: number) {
  if (hours <= 0) return '0 minutes';
  const minutes = Math.max(1, Math.round(hours * 60));
  const unit = (n: number, name: string) =>
    `${n} ${name}${n === 1 ? '' : 's'}`;
  if (minutes < 60) return unit(minutes, 'minute');
  if (minutes < 48 * 60) {
    const remainder = minutes % 60;
    return `${unit(Math.floor(minutes / 60), 'hour')}${remainder ? ` ${remainder} min` : ''}`;
  }
  if (minutes < 14 * 1440) {
    const days = Math.floor(minutes / 1440);
    const remainder = Math.floor((minutes % 1440) / 60);
    return `${unit(days, 'day')}${remainder ? ` ${remainder} hr` : ''}`;
  }
  if (minutes < 60 * 1440) {
    const weeks = Math.max(1, Math.round(minutes / (7 * 1440)));
    return unit(weeks, 'week');
  }
  if (minutes < 365.25 * 1440) {
    const months = Math.max(1, Math.round(minutes / (30 * 1440)));
    return unit(months, 'month');
  }
  const years = minutes / (365.25 * 1440);
  if (years < 10) return `${Math.round(years * 10) / 10} years`;
  return unit(Math.round(years), 'year');
}

/** Map a risk factor score into a short field word for the HUD. */
export function factorTone(n: number): { word: string; cls: string } {
  if (n < 8) return { word: 'good', cls: 'ok' };
  if (n < 18) return { word: 'fair', cls: '' };
  if (n < 30) return { word: 'limited', cls: 'warn' };
  return { word: 'high', cls: 'warn' };
}

export function tick(
  s: Stats,
  p: Period,
  r: Region,
  hours: number = SURVIVAL_STEP_HOURS,
): Stats {
  if (s.health <= 0) return s;
  const rates = hourlyRates(p, r, s);
  return applyChanges(s, {
    water: rates.water * hours,
    energy: rates.energy * hours,
    health: rates.health * hours,
    // Animal attacks are resolved on choices, not as unavoidable passive damage.
  });
}
