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
                aria-label={`Journal: ${g.visited.length} of ${periods.length} worlds`}
                onClick={() => g.setPanel('journal')}
              >
                <BookOpen size={14} />
                <span>Journal</span>
                <b>
                  {g.visited.length}
                  <small>/{periods.length}</small>
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
            <h1>
              Earth
              <br />
              <em>through time.</em>
            </h1>
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
          <footer>
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
          </section>

          <aside className="map-panel">
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
                <span> move · drag to look</span>
              </span>
            </div>
            <button
              className="investigate"
              type="button"
              disabled={!g.active || !g.canInvestigate}
              onClick={g.trigger}
            >
              <span>
                {!g.canInvestigate
                  ? g.hasUnseenWildlife
                    ? 'Explore farther'
                    : 'World explored'
                  : g.nearby
                    ? 'Observe'
                    : 'Investigate'}
              </span>
              <kbd>E</kbd>
            </button>
            <button
              className="next-era"
              type="button"
              disabled={g.nextUnvisited === undefined}
              onClick={() => {
                if (g.nextUnvisited !== undefined) g.travel(g.nextUnvisited);
              }}
            >
              {g.nextUnvisited === undefined ? 'Atlas complete' : 'Next world'}
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
              <h2>{g.stats.health <= 0 ? 'Expedition ended' : 'Paused'}</h2>
              <p>
                {g.stats.health <= 0
                  ? 'Discoveries saved. Try again or explore another world.'
                  : 'Your supplies are safe.'}
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
              {g.stats.health <= 0 && g.nextUnvisited !== undefined && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    if (g.nextUnvisited !== undefined)
                      g.travel(g.nextUnvisited);
                  }}
                >
                  Travel to the next world →
                </button>
              )}
            </div>
          )}

          {g.traveling && (
            <div className="travel-flash" aria-hidden="true">
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
