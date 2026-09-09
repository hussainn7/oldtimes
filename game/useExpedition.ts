'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { periods, regions } from './data';
import { applyChanges, freshStats, tick } from './survival';
import { eligibleEvents, type Encounter, type Choice } from './events';
import type { WorldHandle } from './types';
export interface Entry {
  title: string;
  detail: string;
  period: string;
}
export function useExpedition() {
  const [index, setIndex] = useState(13),
    [regionIndex, setRegion] = useState(0),
    [started, setStarted] = useState(false),
    [paused, setPaused] = useState(false),
    [stats, setStats] = useState(freshStats),
    [distance, setDistance] = useState(0),
    [visited, setVisited] = useState<string[]>([]),
    [entries, setEntries] = useState<Entry[]>([]),
    [encounter, setEncounter] = useState<Encounter | null>(null),
    [outcome, setOutcome] = useState<Choice | null>(null),
    [panel, setPanel] = useState<
      'notes' | 'journal' | 'help' | 'credits' | null
    >(null),
    [traveling, setTraveling] = useState(false),
    [nearby, setNearby] = useState('');
  const world = useRef<WorldHandle>({
      x: 650,
      moving: false,
      distance: 0,
      nearby: '',
    }),
    direction = useRef(0),
    eventCount = useRef(0),
    lastEvent = useRef(0),
    travelTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    loaded = useRef(false);
  const period = periods[index],
    region = regions[regionIndex];
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = JSON.parse(
          localStorage.getItem('earth-expedition-v1') || 'null',
        );
        if (raw) {
          setVisited(
            Array.isArray(raw.visited)
              ? raw.visited.filter((id: unknown) =>
                  periods.some((p) => p.id === id),
                )
              : [],
          );
          setEntries(
            Array.isArray(raw.entries)
              ? raw.entries
                  .filter(
                    (e: Entry) =>
                      typeof e.title === 'string' &&
                      typeof e.detail === 'string' &&
                      typeof e.period === 'string',
                  )
                  .slice(0, 80)
              : [],
          );
        }
      } catch {
        /* Private storage may be unavailable. */
      }
      loaded.current = true;
    });
    return () => {
      cancelled = true;
      if (travelTimer.current) clearTimeout(travelTimer.current);
    };
  }, []);
  useEffect(() => {
    if (loaded.current)
      try {
        localStorage.setItem(
          'earth-expedition-v1',
          JSON.stringify({ visited, entries }),
        );
      } catch {
        /* Exploration remains available without persistence. */
      }
  }, [visited, entries]);
  const record = useCallback(
    (title: string, detail: string) =>
      setEntries((old) =>
        [{ title, detail, period: periods[index].name }, ...old].slice(0, 80),
      ),
    [index],
  );
  const travel = useCallback((i: number) => {
    if (!Number.isInteger(i) || i < 0 || i >= periods.length) return;
    setIndex(i);
    setEncounter(null);
    setOutcome(null);
    setStats(freshStats());
    setTraveling(true);
    direction.current = 0;
    world.current = { x: 650, moving: false, distance: 0, nearby: '' };
    setDistance(0);
    setNearby('');
    lastEvent.current = 0;
    eventCount.current = 0;
    setVisited((old) =>
      old.includes(periods[i].id) ? old : [...old, periods[i].id],
    );
    if (travelTimer.current) clearTimeout(travelTimer.current);
    travelTimer.current = setTimeout(() => setTraveling(false), 800);
  }, []);
  const begin = () => {
    setStarted(true);
    travel(index);
  };
  const active =
    started &&
    !paused &&
    !encounter &&
    !panel &&
    stats.health > 0 &&
    !traveling;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (!document.hidden) setStats((s) => tick(s, period, region));
    }, 1500);
    return () => clearInterval(timer);
  }, [active, period, region]);
  const trigger = useCallback(() => {
    if (encounter || stats.health <= 0) return;
    const list = eligibleEvents(period);
    if (!list.length) return;
    let e = list[eventCount.current % list.length];
    if (world.current.nearby) {
      const species = period.species.find(
        (s) => s.name === world.current.nearby,
      );
      const wildlife = list.find(
        (e) => e.id === (species?.behavior === 'hunt' ? 'predator' : 'herd'),
      );
      if (wildlife)
        e = {
          ...wildlife,
          title:
            species?.behavior === 'hunt'
              ? `${world.current.nearby} is watching`
              : `An encounter with ${world.current.nearby}`,
          body:
            species?.behavior === 'hunt'
              ? `A ${world.current.nearby} has noticed movement along your route. Give it space.`
              : `You spot a ${world.current.nearby} moving through this ancient habitat. A quiet approach keeps the encounter at a safe distance.`,
        };
    }
    eventCount.current++;
    setEncounter(e);
    setOutcome(null);
    direction.current = 0;
    lastEvent.current = world.current.distance;
  }, [encounter, stats.health, period]);
  const explore = useCallback(
    (d: number) => {
      setDistance(d);
      setNearby(world.current.nearby);
      if (d - lastEvent.current > 400) trigger();
    },
    [trigger],
  );
  const choose = (choice: Choice) => {
    if (outcome) return;
    setStats((s) => applyChanges(s, choice.changes));
    setOutcome(choice);
    record(encounter?.title || 'Encounter', choice.outcome);
  };
  const changeRegion = (i: number) => {
    if (i < 0 || i >= regions.length) return;
    setRegion(i);
    setEncounter(null);
    setOutcome(null);
    world.current.nearby = '';
    record('A new route', `Moved to ${regions[i].name}.`);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          'input,select,[role="slider"],[role="dialog"],[contenteditable="true"]',
        )
      )
        return;
      if (e.key === 'e' || e.key === 'E') {
        if (active) trigger();
      } else if (e.key === 'Escape' && !panel && !encounter)
        setPaused((p) => !p);
      else if (e.key === '[') travel(Math.max(0, index - 1));
      else if (e.key === ']') travel(Math.min(periods.length - 1, index + 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active, trigger, index, travel, panel, encounter]);
  const startWalking = (dir: number) => {
    if (!active) return;
    direction.current = dir;
    const old = world.current.x;
    world.current.x = Math.max(100, Math.min(6100, old + dir * 16));
    world.current.distance += Math.abs(world.current.x - old);
    explore(world.current.distance);
  };
  return {
    startWalking,
    stopWalking: () => {
      direction.current = 0;
    },
    nearby,
    index,
    regionIndex,
    started,
    paused,
    setPaused,
    stats,
    distance,
    visited,
    entries,
    encounter,
    outcome,
    panel,
    setPanel,
    traveling,
    world,
    direction,
    period,
    region,
    travel,
    begin,
    active,
    trigger,
    explore,
    choose,
    changeRegion,
    closeEncounter: () => {
      setEncounter(null);
      setOutcome(null);
    },
    retry: () => {
      setStats(freshStats());
      setPaused(false);
      world.current.x = 650;
    },
    record,
  };
}
