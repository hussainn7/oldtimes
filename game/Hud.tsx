import { ArrowUpRight } from 'lucide-react';
import type { Period, Region, Stats } from './types';
import { survival, factorTone } from './survival';

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
  const estimate = survival(period, region, stats);
  const outlook = [
    { key: 'water', label: 'Water' },
    { key: 'food', label: 'Food' },
    { key: 'predators', label: 'Predators' },
    { key: 'temperature', label: 'Climate' },
  ] as const;

  return (
    <section className="bottom-hud" aria-label="Expedition status">
      <div className="field-note">
        <span className="eyebrow">Field conditions</span>
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
      <button className="survival" onClick={onInfo} type="button">
        <span className="eyebrow">Survival outlook</span>
        <strong>~{estimate.label.replace(/^~/, '')}</strong>
        <div className="survival-factors" aria-hidden="true">
          {outlook.map(({ key, label }) => {
            const tone = factorTone(estimate.factors[key]);
            return (
              <span key={key} className={tone.cls}>
                {label}
                <b>{tone.word}</b>
              </span>
            );
          })}
        </div>
        <small className="disclaimer">Simulated estimate</small>
      </button>
    </section>
  );
}
