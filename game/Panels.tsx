import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { periods, shortDate } from './data';
import { survival } from './survival';
import type { useExpedition } from './useExpedition';
export default function Panels({
  game: g,
}: {
  game: ReturnType<typeof useExpedition>;
}) {
  const estimate = survival(g.period, g.region, g.stats);
  return (
    <>
      <Dialog
        open={!!g.panel}
        onOpenChange={(open) => {
          if (!open) g.setPanel(null);
        }}
      >
        <DialogContent className="field-dialog">
          <span className="eyebrow">
            EARTH THROUGH TIME · EXPEDITION ARCHIVE
          </span>
          <DialogTitle className="dialog-title">
            {g.panel === 'notes'
              ? g.period.name
              : g.panel === 'journal'
                ? 'Your field journal'
                : g.panel === 'credits'
                  ? 'A living reconstruction'
                  : 'A little curiosity goes a long way.'}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {g.panel === 'notes'
              ? g.period.date
              : g.panel === 'journal'
                ? `${g.visited.length} of ${28} worlds discovered. Your discoveries are saved on this device.`
                : g.panel === 'credits'
                  ? 'History informed by science. Worlds interpreted through art.'
                  : 'Walk ancient worlds. Observe. Make a choice. Then travel somewhere new.'}
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
                <h3>How long would you survive?</h3>
                <p className="estimate-large">{estimate.label}</p>
                <p>
                  Calculated from atmosphere, temperature, water, food,
                  predators, shelter, knowledge, and your condition. Time travel
                  restores your supplies for a new expedition.
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
                  A fictional game estimate, not medical or survival advice.
                  Climate and oxygen values are simplified design parameters,
                  not precise reconstructions. Organisms represent regional
                  ecosystems around each checkpoint; they are not a claim of
                  universal coexistence.
                </p>
              </>
            ) : g.panel === 'journal' ? (
              <>
                <div className="journal-progress">
                  <strong>{g.visited.length}/28</strong>
                  <p>
                    {g.visited.length === 28
                      ? 'Every world discovered. The story continues with us.'
                      : 'Every unfamiliar horizon is another page.'}
                  </p>
                </div>
                <div className="atlas-grid" aria-label="Discovered worlds">
                  {periods.map((p, i) => (
                    <button
                      key={p.id}
                      className={g.visited.includes(p.id) ? 'discovered' : ''}
                      onClick={() => {
                        g.travel(i);
                        g.setPanel(null);
                      }}
                      title={p.name}
                    >
                      <small>
                        {g.visited.includes(p.id) ? '✓' : '○'} {shortDate(p)}
                      </small>
                      <span>{p.name}</span>
                    </button>
                  ))}
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
                  <p>
                    Walk into the landscape and investigate your first
                    encounter. Your observations and decisions will appear here.
                  </p>
                )}
              </>
            ) : g.panel === 'help' ? (
              <>
                <div className="help-row">
                  <kbd>A</kbd>
                  <kbd>D</kbd>
                  <p>
                    Walk left or right. Arrow keys and touch controls work too.
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
                  <p>
                    Pause your expedition. Reading notes and making decisions
                    also pauses survival.
                  </p>
                </div>
                <p>
                  Choose a region beside the globe. Watch your water, energy,
                  health, and safety. Decisions affect your prospects; travel
                  resets supplies. Discover all 28 worlds to complete your
                  atlas.
                </p>
              </>
            ) : (
              <>
                <p>
                  Created for Hussain. Procedural landscapes, articulated
                  wildlife, and synthesized ambience keep the expedition
                  lightweight and independent of external asset servers.
                </p>
                <h3>Scientific reference points</h3>
                <ul>
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
          <span className="eyebrow">
            {g.encounter?.category} · FIELD ENCOUNTER
          </span>
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
              {g.encounter?.choices.map((c, i) => (
                <button key={c.label} onClick={() => g.choose(c)}>
                  <small>0{i + 1}</small>
                  {c.label}
                  <span>↗</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
