'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { periods, regions } from './data';
import { applyChanges, freshStats, tick, TICK_MS } from './survival';
import {
  availableEvents,
  nextEncounter,
  type Encounter,
  type Choice,
} from './events';
import type { WorldHandle } from './types';
export interface Entry {
  title: string;
  detail: string;
  period: string;
}
export function uniqueEntries(entries: Entry[]) {
  return entries
    .filter(
      (entry, index, all) =>
        all.findIndex(
          (other) =>
            other.title === entry.title &&
            other.detail === entry.detail &&
            other.period === entry.period,
        ) === index,
    )
    .slice(0, 80);
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
    [seenEvents, setSeenEvents] = useState<string[]>([]),
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
    depth = useRef(0),
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
          setSeenEvents(
            Array.isArray(raw.seenEvents)
              ? raw.seenEvents.filter((id: unknown) => typeof id === 'string')
              : [],
          );
          setEntries(
            uniqueEntries(
              Array.isArray(raw.entries)
                ? raw.entries
                    .filter(
                      (e: Entry) =>
                        e &&
                        typeof e.title === 'string' &&
                        typeof e.detail === 'string' &&
                        typeof e.period === 'string',
                    )
                    .slice(0, 80)
                : [],
            ),
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
          JSON.stringify({ visited, entries, seenEvents }),
        );
      } catch {
        /* Exploration remains available without persistence. */
      }
  }, [visited, entries, seenEvents]);
  const record = useCallback(
    (title: string, detail: string) =>
      setEntries((old) =>
        uniqueEntries([{ title, detail, period: periods[index].name }, ...old]),
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
    depth.current = 0;
    world.current = { x: 650, moving: false, distance: 0, nearby: '' };
    setDistance(0);
    setNearby('');
    lastEvent.current = 0;
    setVisited((old) =>
      old.includes(periods[i].id) ? old : [...old, periods[i].id],
    );
    if (travelTimer.current) clearTimeout(travelTimer.current);
    travelTimer.current = setTimeout(() => setTraveling(false), 1100);
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
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active, period, region]);
  const trigger = useCallback(() => {
    if (encounter || stats.health <= 0) return;
    const e = nextEncounter(period, region, seenEvents, world.current.nearby);
    lastEvent.current = world.current.distance;
    if (!e) return;
    setSeenEvents((old) => (old.includes(e.id) ? old : [...old, e.id]));
    setEncounter(e);
    setOutcome(null);
    direction.current = 0;
    depth.current = 0;
    lastEvent.current = world.current.distance;
  }, [encounter, stats.health, period, region, seenEvents]);
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
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i >= regions.length ||
      i === regionIndex
    )
      return;
    setRegion(i);
    setEncounter(null);
    setOutcome(null);
    world.current.nearby = '';
    setNearby('');
    lastEvent.current = world.current.distance;
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
  };
  return {
    hasUnseenWildlife: period.species.some(
      (s) => !seenEvents.includes(`wildlife:${s.name}`),
    ),
    canInvestigate:
      availableEvents(period, region, seenEvents).length > 0 ||
      (period.species.some((s) => s.name === nearby) &&
        !seenEvents.includes(`wildlife:${nearby}`)),
    nextUnvisited: periods
      .map((_, offset) => (index + offset + 1) % periods.length)
      .find((i) => !visited.includes(periods[i].id)),
    startWalking,
    startDepth: (dir: number) => {
      if (active) depth.current = dir;
    },
    stopDepth: () => {
      depth.current = 0;
    },
    depth,
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
      world.current = {
        ...world.current,
        x: 650,
        z: 3,
        moving: false,
        nearby: '',
      };
    },
    record,
  };
}
