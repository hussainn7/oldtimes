import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { periods, shortDate } from './data';
import { useMemo } from 'react';
import { survival } from './survival';
import { fatalChance } from './events';
import type { useExpedition } from './useExpedition';
export default function Panels({
  game: g,
}: {
  game: ReturnType<typeof useExpedition>;
}) {
  const estimate = useMemo(
    () => survival(g.period, g.region, g.stats),
    [g.period, g.region, g.stats],
  );
  return (
    <>
      <Dialog
        open={!!g.panel}
        onOpenChange={(open) => {
          if (!open) g.setPanel(null);
        }}
      >
        <DialogContent className="field-dialog">
          <DialogTitle className="dialog-title">
            {g.panel === 'notes'
              ? g.period.name
              : g.panel === 'journal'
                ? 'Field journal'
                : g.panel === 'credits'
                  ? 'Science & credits'
                  : 'How to play'}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {g.panel === 'notes'
              ? g.period.date
              : g.panel === 'journal'
                ? `${g.visited.length} of 28 worlds · saved on this device`
                : g.panel === 'credits'
                  ? 'History informed by science. Worlds shaped by art.'
                  : 'Walk. Observe. Choose. Travel.'}
          </DialogDescription>
          <div className="panel-body">
            {g.panel === 'notes' ? (
              <>
                <p>{g.period.description}</p>
                <dl>
                  <div>
                    <dt>Climate in this region</dt>
                    <dd>
                      {g.period.climate} · {estimate.temperature}°C
                    </dd>
                  </div>
                  <div>
                    <dt>Atmosphere</dt>
                    <dd>~{g.period.oxygen}% oxygen (game parameter)</dd>
                  </div>
                  <div>
                    <dt>Vegetation</dt>
                    <dd>{g.period.vegetation}</dd>
                  </div>
                  <div>
                    <dt>Landscape</dt>
                    <dd>{g.period.geology}</dd>
                  </div>
                  <div>
                    <dt>Continents</dt>
                    <dd>{g.period.continents}</dd>
                  </div>
                  <div>
                    <dt>Hazards</dt>
                    <dd>{g.period.hazards.join(' · ')}</dd>
                  </div>
                </dl>
                <h3>Life in this world</h3>
                <p>
                  {g.period.species.length
                    ? g.period.species.map((s) => s.name).join(' · ')
                    : 'No animals. Early checkpoints show a world before animal ecosystems.'}
                </p>
                <h3>How long you could survive here</h3>
                <p className="estimate-large">
                  {g.stats.health > 0 ? '~ ' : ''}
                  {estimate.label}
                </p>
                <p>
                  Your estimated survival in {g.period.name}, in the{' '}
                  {g.region.name.toLowerCase()}, with your current health,
                  water, energy, and shelter. It assumes ordinary clothing, no
                  breathing gear, and foraging from whatever water and food the
                  landscape offers — not airdrops or modern tools.
                </p>
                <p>
                  Once the air is breathable, thirst, exposure, injury, and
                  infection usually matter more than predators. This is a
                  hypothetical lifespan, not a timer. Waiting or walking does
                  not use it up. Risky decisions can still end an expedition
                  immediately.
                </p>
                <div className="risk-factors">
                  {Object.entries(estimate.factors).map(([name, n]) => (
                    <div key={name}>
                      <span>{name}</span>
                      <meter
                        min={0}
                        max={100}
                        value={Math.min(n, 100)}
                        aria-label={`${name} risk`}
                      />
                    </div>
                  ))}
                </div>
                <p className="fineprint">
                  Tuned to a modern-human breathability ladder across deep time.
                  Ancient oxygen and climate are uncertain, so the number is a
                  game estimate — not a lab prediction. Fatal choice percentages
                  are authored odds, not historical attack rates.
                </p>
              </>
            ) : g.panel === 'journal' ? (
              <>
                <div className="journal-progress">
                  <strong>{g.visited.length}/28</strong>
                  <p>
                    {g.visited.length === 28
                      ? 'Atlas complete. Every horizon recorded.'
                      : 'Choose a world to explore.'}
                  </p>
                </div>
                <div className="atlas-grid" aria-label="Discovered worlds">
                  {periods.map((p, i) => {
                    const found = g.visited.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={found ? 'discovered' : ''}
                        onClick={() => {
                          g.travel(i);
                          g.setPanel(null);
                        }}
                        title={p.name}
                      >
                        <small>{shortDate(p)}</small>
                        <span>{found ? p.name : '—'}</span>
                      </button>
                    );
                  })}
                </div>
                {g.entries.length ? (
                  g.entries.map((e, i) => (
                    <article className="journal-entry" key={i}>
                      <small>{e.period}</small>
                      <h3>{e.title}</h3>
                      <p>{e.detail}</p>
                    </article>
                  ))
                ) : (
                  <p>Investigate to record your first discovery.</p>
                )}
              </>
            ) : g.panel === 'help' ? (
              <>
                <div className="help-row">
                  <kbd>WASD</kbd>
                  <p>
                    Explore with WASD or arrow keys. Hold Shift to move faster.
                    Drag the world to look around; scroll to zoom. R recenters
                    the camera. Touch arrows work too.
                  </p>
                </div>
                <div className="help-row">
                  <kbd>E</kbd>
                  <p>
                    Investigate the area. Encounters also appear as you explore.
                  </p>
                </div>
                <div className="help-row">
                  <kbd>[</kbd>
                  <kbd>]</kbd>
                  <p>
                    Travel to the previous or next checkpoint. Or drag the
                    timeline, use its slider, scroll, or pick an era.
                  </p>
                </div>
                <div className="help-row">
                  <kbd>Esc</kbd>
                  <p>Pause your expedition while you step away.</p>
                </div>
                <p>
                  Choose a region beside the globe. Watch your water, energy,
                  health, and safety. Decisions affect your prospects; travel
                  and retry reset supplies and encounters, keeping your journal.
                  Risky choices show a fatal chance before you choose. Giving
                  wildlife space avoids an attack roll. The survival estimate
                  changes with conditions and choices, never with time spent
                  playing. Discover all 28 worlds to complete your atlas.
                </p>
              </>
            ) : (
              <>
                <h3>Scientific reference points</h3>
                <ul>
                  <li>
                    <a
                      href="https://www.osha.gov/laws-regs/standardinterpretations/2008-05-01"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OSHA — effects of oxygen-deficient air
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.cdc.gov/niosh/heat-stress/about/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CDC / NIOSH — heat, humidity, and exposure
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.nhm.ac.uk/discover/news/2023/april/can-ancient-food-webs-help-predict-biodiversity-collapse.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Natural History Museum — the Great Dying
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://stratigraphy.org/ICSchart/ChronostratChart2024-12.pdf"
                      target="_blank"
                      rel="noreferrer"
                    >
                      International Commission on Stratigraphy — chronology
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.nhm.ac.uk/discover/the-jurassic-period.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Natural History Museum — Jurassic ecosystems
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.nhm.ac.uk/discover/the-cretaceous-period.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Natural History Museum — Cretaceous ecosystems
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.nhm.ac.uk/discover/origin-of-life-on-earth.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Natural History Museum — early life
                    </a>
                  </li>
                </ul>
                <p>
                  Dates are representative snapshots, not period boundaries.
                  Continental maps are schematic approximations; early
                  reconstructions are particularly uncertain. Animals are
                  stylized representatives, and broad region selection changes
                  the environment without claiming exact species distributions.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!g.encounter}
        onOpenChange={(open) => {
          if (!open) g.closeEncounter();
        }}
      >
        <DialogContent className="encounter-dialog">
          <span className="eyebrow">{g.encounter?.category}</span>
          <DialogTitle className="dialog-title">
            {g.encounter?.title}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {g.outcome ? g.outcome.outcome : g.encounter?.body}
          </DialogDescription>
          {g.outcome ? (
            <>
              <div className="consequences">
                {Object.entries(g.outcome.changes).map(([stat, value]) => (
                  <span
                    className={value > 0 ? 'positive' : 'negative'}
                    key={stat}
                  >
                    {value > 0 ? '+' : ''}
                    {value} {stat}
                  </span>
                ))}
              </div>
              <button className="primary" onClick={g.closeEncounter}>
                Continue expedition <span>→</span>
              </button>
            </>
          ) : (
            <div className="choices">
              {g.encounter?.choices.map((c, i) => {
                const chance = fatalChance(c, g.period, g.region, g.stats);
                return (
                  <button key={c.label} onClick={() => g.choose(c)}>
                    <small>0{i + 1}</small>
                    <span className="choice-copy">
                      {c.label}
                      <small
                        className={chance > 0 ? 'choice-danger' : 'choice-safe'}
                      >
                        {chance > 0
                          ? `${Math.round(chance * 100)}% fatal chance`
                          : 'No fatal risk from this choice'}
                      </small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                );
              })}
            </div>
          )}
          {!g.outcome && (
            <p className="fineprint">
              Risk reflects this world, your condition, and the action you take.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
