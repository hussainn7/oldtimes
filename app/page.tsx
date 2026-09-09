'use client';
import {
  BookOpen,
  Pause,
  Play,
  Info,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import World from '@/game/World';
import Timeline from '@/game/Timeline';
import EarthMap from '@/game/Map';
import Hud from '@/game/Hud';
import Panels from '@/game/Panels';
import Audio from '@/game/Audio';
import { useWebMCP } from '@/game/useWebMCP';
import { useExpedition } from '@/game/useExpedition';
import { regions, periods } from '@/game/data';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

export default function Game() {
  const g = useExpedition();
  useWebMCP(g);

  return (
    <main
      className={`${g.started ? 'playing' : 'landing'} ${g.traveling ? 'traveling' : ''}`}
    >
      <World
        period={g.period}
        region={g.region}
        active={g.active}
        onExplore={g.explore}
        worldRef={g.world}
        direction={g.direction}
        depth={g.depth}
        showLabels={g.started}
      />
      <div className="vignette" />

      <header>
        <button
          className="brand"
          type="button"
          onClick={() => g.setPanel('help')}
          aria-label="Earth Through Time — how to play"
        >
          <span>
            Earth <em>Through Time</em>
          </span>
        </button>
        <div className="header-right">
          {g.started && (
            <>
              <button
                className="journal-button"
                type="button"
                onClick={() => g.setPanel('journal')}
              >
                <BookOpen size={14} />
                <span>Journal</span>
                <b>
                  {g.visited.length}
                  <small>/28</small>
                </b>
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={g.paused ? 'Resume expedition' : 'Pause expedition'}
                onClick={() => g.setPaused(!g.paused)}
              >
                {g.paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
            </>
          )}
          <Audio biome={g.period.biome} paused={g.paused} />
          <button
            className="icon-button"
            type="button"
            aria-label="How to play"
            onClick={() => g.setPanel('help')}
          >
            <Info size={15} />
          </button>
        </div>
      </header>

      {!g.started ? (
        <>
          <section className="start">
            <span className="eyebrow">
              <span className="tiny-line" />A natural-history expedition
            </span>
            <h1>
              Earth
              <br />
              <em>through time.</em>
            </h1>
            <p>Walk 4.5 billion years of one living planet.</p>
            <button className="primary" type="button" onClick={g.begin}>
              Begin journey <ArrowRight size={16} />
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                g.begin();
                g.travel(0);
              }}
            >
              Start from the beginning →
            </button>
          </section>
          <div className="landing-caption">
            <span className="eyebrow">Late Jurassic</span>
            <p>150 million years before you.</p>
          </div>
          <footer>
            <span>Walk into the past. Find your place in it.</span>
            <button
              className="text-button"
              type="button"
              onClick={() => g.setPanel('credits')}
            >
              Science & credits →
            </button>
          </footer>
        </>
      ) : (
        <>
          <Timeline index={g.index} onChange={g.travel} />

          <section className="period-title" aria-live="polite">
            <span className="eyebrow">
              <span className="tiny-line" />
              {g.period.era} · {g.period.date}
            </span>
            <h1>{g.period.name}</h1>
            <p>
              {g.period.biome === 'jurassic'
                ? 'Before us, a world of giants.'
                : `${g.period.climate} · ${g.period.vegetation}`}
            </p>
          </section>

          <aside className="map-panel">
            <div className="map-label">Earth</div>
            <EarthMap period={g.period} region={g.region} />
            <div className="region-picker">
              <NativeSelect
                aria-label="Starting region"
                value={g.regionIndex}
                onChange={(e) => g.changeRegion(Number(e.target.value))}
              >
                {regions.map((r, i) => (
                  <NativeSelectOption value={i} key={r.id}>
                    {r.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </aside>

          <div className="exploration" aria-live="polite">
            <b>{Math.round(g.distance)} m</b>
            <div className="route-progress">
              <i style={{ width: `${Math.min(100, g.distance / 55)}%` }} />
            </div>
          </div>

          <div className="world-actions">
            <div className="walk-controls">
              <button
                type="button"
                aria-label="Walk forward"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  g.startDepth(1);
                }}
                onPointerUp={g.stopDepth}
                onPointerCancel={g.stopDepth}
                onLostPointerCapture={g.stopDepth}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                aria-label="Walk backward"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  g.startDepth(-1);
                }}
                onPointerUp={g.stopDepth}
                onPointerCancel={g.stopDepth}
                onLostPointerCapture={g.stopDepth}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label="Walk left"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  g.startWalking(-1);
                }}
                onPointerUp={g.stopWalking}
                onPointerCancel={g.stopWalking}
                onLostPointerCapture={g.stopWalking}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Walk right"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  g.startWalking(1);
                }}
                onPointerUp={g.stopWalking}
                onPointerCancel={g.stopWalking}
                onLostPointerCapture={g.stopWalking}
              >
                <ArrowRight size={16} />
              </button>
              <span>
                <kbd>WASD</kbd>
              </span>
            </div>
            <button
              className="investigate"
              type="button"
              disabled={!g.active}
              onClick={g.trigger}
            >
              <span>{g.nearby ? 'Observe wildlife' : 'Investigate'}</span>
              <kbd>E</kbd>
            </button>
            <button
              className="next-era"
              type="button"
              onClick={() => g.travel((g.index + 1) % periods.length)}
            >
              {g.index === 27 ? 'Back to start' : 'Next world'}
              <ArrowRight size={14} />
            </button>
          </div>

          <Hud
            period={g.period}
            region={g.region}
            stats={g.stats}
            onInfo={() => g.setPanel('notes')}
          />

          {(g.paused || g.stats.health <= 0) && !g.panel && !g.encounter && (
            <div className="pause-screen">
              <span className="eyebrow">
                {g.stats.health <= 0
                  ? 'The expedition ends. Curiosity does not.'
                  : 'Take your time'}
              </span>
              <h2>
                {g.stats.health <= 0
                  ? 'A difficult world.'
                  : 'Expedition paused.'}
              </h2>
              <p>
                {g.stats.health <= 0
                  ? 'Your discoveries stay in the journal. Retry with fresh supplies, or travel onward.'
                  : 'Supplies hold while you pause.'}
              </p>
              <button
                className="primary"
                type="button"
                onClick={() =>
                  g.stats.health <= 0 ? g.retry() : g.setPaused(false)
                }
              >
                {g.stats.health <= 0 ? 'Try again' : 'Resume'}
                <ArrowRight size={15} />
              </button>
              {g.stats.health <= 0 && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => g.travel((g.index + 1) % periods.length)}
                >
                  Travel to the next world →
                </button>
              )}
            </div>
          )}

          {g.traveling && (
            <div className="travel-flash" aria-hidden="true">
              <span>Traveling through deep time</span>
              <strong>{g.period.name}</strong>
              <small>{g.period.date}</small>
            </div>
          )}
        </>
      )}
      <Panels game={g} />
    </main>
  );
}
