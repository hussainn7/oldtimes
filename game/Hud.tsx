import { Heart, Droplets, Zap, Shield, ArrowUpRight } from 'lucide-react';
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
  const estimate = survival(period, region, stats);
  return (
    <section className="bottom-hud" aria-label="Expedition status">
      <div className="field-note">
        <span className="eyebrow">FIELD CONDITIONS</span>
        <p>
          {period.climate}
          <span> / </span>
          {estimate.temperature}°C
        </p>
        <button onClick={onInfo}>
          Read field notes <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="vitals">
        {(
          [
            { key: 'health', label: 'Health', Icon: Heart },
            { key: 'water', label: 'Water', Icon: Droplets },
            { key: 'energy', label: 'Energy', Icon: Zap },
            { key: 'safety', label: 'Safety', Icon: Shield },
          ] as const
        ).map(({ key, label, Icon }) => (
          <div key={key} className={stats[key] < 25 ? 'critical' : ''}>
            <div>
              <Icon size={14} />
              <span>{label}</span>
              <b>{Math.round(stats[key])}</b>
            </div>
            <meter min={0} max={100} value={stats[key]} aria-label={label} />
          </div>
        ))}
      </div>
      <button className="survival" onClick={onInfo}>
        <span className="eyebrow">HOW LONG WOULD YOU SURVIVE?</span>
        <strong>
          {estimate.label}
          <ArrowUpRight size={18} />
        </strong>
        <small>SIMULATED GAME ESTIMATE</small>
      </button>
    </section>
  );
}
