import { ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';
import type { Period, Region, Stats } from './types';
import { survival } from './survival';

export default function Hud({
  period,
  region,
  stats,
  onInfo,
}: {
  period: Period;
  region: Region;
  stats: Stats;
  onInfo: () => void;
}) {
  const estimate = useMemo(
    () => survival(period, region, stats),
    [period, region, stats],
  );

  return (
    <section className="bottom-hud" aria-label="Expedition status">
      <div className="field-note">
        <p>
          {period.climate}
          <span>·</span>
          {estimate.temperature}°C
        </p>
        <button onClick={onInfo}>
          Field notes <ArrowUpRight size={12} />
        </button>
      </div>
      <div className="vitals">
        {(
          [
            { key: 'health', label: 'Health' },
            { key: 'water', label: 'Water' },
            { key: 'energy', label: 'Energy' },
            { key: 'safety', label: 'Safety' },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className={stats[key] < 25 ? 'critical' : ''}>
            <div>
              <span>{label}</span>
              <b>{Math.round(stats[key])}</b>
            </div>
            <meter min={0} max={100} value={stats[key]} aria-label={label} />
          </div>
        ))}
      </div>
      <button
        className="survival"
        onClick={onInfo}
        type="button"
        aria-label={`Estimated survival here: ${estimate.label}. Changes with conditions and choices.`}
      >
        <span className="eyebrow">You could survive here</span>
        <strong>
          {stats.health > 0 ? '~ ' : ''}
          {estimate.label}
        </strong>
        <small className="disclaimer">
          {stats.health > 0
            ? 'Estimate · changes with your choices'
            : 'Try again to start fresh'}
        </small>
      </button>
    </section>
  );
}
