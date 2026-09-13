import type { Biome, Stats, Period, Region, Species } from './types';
import { applyChanges, clamp } from './survival';
export interface Choice {
  label: string;
  outcome: string;
  changes: Partial<Stats>;
  risk?: {
    kind: 'wildlife' | 'terrain' | 'exposure' | 'poison' | 'air';
    base: number;
    fatal: string;
  };
}

/** Displayed odds and the actual roll share this function. These are game odds. */
export function fatalChance(c: Choice, p: Period, r: Region, s: Stats) {
  if (s.health <= 0) return 0;
  if (applyChanges(s, c.changes).health <= 0) return 1;
  if (!c.risk) return 0;
  const vulnerability = 1 + (100 - s.health) / 200 + (100 - s.energy) / 400;
  const caution = 1 - s.safety / 250 - s.knowledge / 500;
  const danger = clamp(p.danger + r.danger);
  const temperature = p.temperature + r.temperature;
  const environment =
    c.risk.kind === 'air'
      ? 1 + Math.max(0, 19.5 - p.oxygen) / 10
      : c.risk.kind === 'exposure'
        ? (1 + Math.max(0, Math.abs(temperature - 20) - 10) / 30) *
          (1 - s.shelter / 200)
        : 0.7 + danger / 100;
  return (
    Math.round(
      Math.max(
        0.01,
        Math.min(0.95, c.risk.base * vulnerability * caution * environment),
      ) * 100,
    ) / 100
  );
}

export function resolveChoice(
  c: Choice,
  p: Period,
  r: Region,
  s: Stats,
  random = Math.random,
) {
  const chance = fatalChance(c, p, r, s);
  const fatal = chance === 1 || (chance > 0 && random() < chance);
  const next = applyChanges(s, c.changes);
  if (fatal) next.health = 0;
  const outcome = fatal
    ? `You died. ${chance === 1 ? 'Your injuries were more than you could survive.' : c.risk?.fatal} Expedition over.`
    : c.outcome;
  const changes = Object.fromEntries(
    Object.entries(next)
      .filter(([key, value]) => value !== s[key as keyof Stats])
      .map(([key, value]) => [key, value - s[key as keyof Stats]]),
  ) as Partial<Stats>;
  return { stats: next, outcome: { ...c, outcome, changes }, fatal };
}

/** Size is a visual scale, so behavior and body type determine the main threat. */
function wildlifeThreat(s: Species) {
  if (s.behavior === 'hunt')
    return s.kind === 'theropod' ? 0.48 : s.size >= 1 ? 0.35 : 0.2;
  if (['sauropod', 'mammoth', 'ceratopsian', 'stegosaur'].includes(s.kind))
    return 0.25;
  if (
    s.behavior === 'graze' &&
    s.size >= 0.65 &&
    ['deer', 'amphibian', 'bird', 'theropod'].includes(s.kind)
  )
    return 0.12;
  return 0;
}
export interface Encounter {
  id: string;
  category: string;
  title: string;
  body: string;
  biomes: Biome[];
  choices: Choice[];
  requires?: 'animals' | 'plants' | 'air';
}
const land: Biome[] = [
  'swamp',
  'desert',
  'jurassic',
  'flower',
  'savanna',
  'ice',
  'modern',
];
const green: Biome[] = ['swamp', 'jurassic', 'flower', 'savanna', 'modern'];
const choice = (
  label: string,
  outcome: string,
  changes: Partial<Stats>,
  risk?: Choice['risk'],
): Choice => ({ label, outcome, changes, ...(risk ? { risk } : {}) });
export const events: Encounter[] = [
  {
    id: 'river',
    category: 'Water',
    title: 'A river through the trees',
    body: 'Clear water slips between the stones. Clear does not always mean safe.',
    biomes: land,
    choices: [
      choice(
        'Follow it upstream',
        'You find a sheltered bank. The search costs energy, but reveals a better water source.',
        { water: 16, energy: -6, knowledge: 4 },
      ),
      choice(
        'Drink directly',
        'You rehydrate, but stomach trouble slows you down.',
        { water: 25, health: -12 },
        {
          kind: 'poison',
          base: 0.06,
          fatal:
            'Contaminated water causes a fatal illness before you can find help.',
        },
      ),
      choice('Keep moving', 'You leave the river behind.', {
        water: -5,
        energy: -3,
      }),
    ],
  },
  {
    id: 'storm',
    category: 'Weather',
    title: 'The sky turns',
    body: 'Wind shifts. Dark clouds rise beyond the ridge; the low ground could flood.',
    biomes: land,
    choices: [
      choice(
        'Find shelter above the river',
        'A sheltered rise protects you from the worst of the storm.',
        { shelter: 20, safety: 12, energy: -8 },
      ),
      choice('Keep walking', 'Rain and wind leave you cold and tired.', {
        energy: -15,
        health: -6,
      }),
      choice(
        'Climb an exposed ridge',
        'The height avoids floodwater but exposes you to wind.',
        { safety: -8, energy: -12 },
        {
          kind: 'terrain',
          base: 0.14,
          fatal: 'A gust knocks you from the exposed ridge.',
        },
      ),
    ],
  },
  {
    id: 'predator',
    category: 'Wildlife',
    title: 'Something is watching',
    body: 'Movement stops at the edge of the clearing. A predator is paying attention to you.',
    biomes: land,
    requires: 'animals',
    choices: [
      choice(
        'Back away slowly',
        'You give the animal space and avoid a close encounter.',
        { safety: 12, energy: -4, knowledge: 3 },
      ),
      choice('Stay concealed', 'You wait in cover until the animal moves on.', {
        safety: 18,
        energy: -7,
      }),
      choice(
        'Run across the clearing',
        'Sudden movement draws attention. Your escape leaves you exhausted.',
        { energy: -22, safety: -16, health: -8 },
        {
          kind: 'wildlife',
          base: 0.32,
          fatal: 'The predator gives chase and catches you in the open.',
        },
      ),
    ],
  },
  {
    id: 'plant',
    category: 'Foraging',
    title: 'An unfamiliar plant',
    body: 'A cluster of fleshy stems looks tempting. Recognition matters more than appearance.',
    biomes: green,
    requires: 'plants',
    choices: [
      choice(
        'Record it; leave it',
        'A careful sketch adds to your field knowledge.',
        { knowledge: 8, energy: -3 },
      ),
      choice(
        'Try a mouthful',
        'The plant is irritating. The gamble costs you.',
        { health: -18, energy: 4 },
        {
          kind: 'poison',
          base: 0.18,
          fatal:
            'The unidentified plant is poisonous. You cannot recover without treatment.',
        },
      ),
      choice(
        'Search the open ground',
        'You spend energy surveying another patch.',
        { energy: -6, knowledge: 3 },
      ),
    ],
  },
  {
    id: 'cold',
    category: 'Exposure',
    title: 'Cold comes quickly',
    body: 'The light is fading and wind cuts through your clothes.',
    biomes: ['ice', 'modern', 'savanna'],
    choices: [
      choice('Build a windbreak', 'A low shelter reduces exposure.', {
        shelter: 25,
        energy: -12,
        safety: 8,
      }),
      choice('Gather dry fuel', 'You find material for a warming fire.', {
        shelter: 15,
        energy: -8,
      }),
      choice('Keep going', 'You cover ground but lose warmth.', {
        health: -12,
        energy: -14,
      }),
    ],
  },
  {
    id: 'herd',
    category: 'Wildlife',
    title: 'Let the giants pass',
    body: 'A herd crosses the trail. The youngest animals stay close to the adults.',
    biomes: land,
    requires: 'animals',
    choices: [
      choice(
        'Observe from a distance',
        'You learn how the herd uses the landscape.',
        { knowledge: 12, safety: 5, energy: -3 },
      ),
      choice(
        'Walk between them',
        'A defensive animal forces you to retreat.',
        {
          safety: -20,
          health: -8,
          energy: -8,
        },
        {
          kind: 'wildlife',
          base: 0.24,
          fatal: 'A protective adult charges and tramples you.',
        },
      ),
      choice(
        'Take a wide detour',
        'You pass safely at the cost of a longer walk.',
        { energy: -9, safety: 8 },
      ),
    ],
  },
  {
    id: 'tracks',
    category: 'Discovery',
    title: 'Tracks in soft ground',
    body: 'Fresh impressions lead toward a shaded channel.',
    biomes: land,
    requires: 'animals',
    choices: [
      choice(
        'Study the tracks',
        'You distinguish a travel route from a feeding area.',
        { knowledge: 10, safety: 6 },
      ),
      choice(
        'Follow them',
        'You find activity ahead, but lose a safe line of retreat.',
        { knowledge: 6, safety: -12, energy: -6 },
        {
          kind: 'wildlife',
          base: 0.12,
          fatal: 'The tracks lead straight into a dangerous animal encounter.',
        },
      ),
    ],
  },
  {
    id: 'spring',
    category: 'Water',
    title: 'A seep in the hillside',
    body: 'Water emerges from a crack in the rock. Your supply is running low.',
    biomes: land,
    choices: [
      choice(
        'Collect cautiously',
        'You improve your water reserve; treatment would still be wise.',
        { water: 18, energy: -4 },
      ),
      choice('Mark the location', 'You remember a useful landmark for later.', {
        knowledge: 7,
        water: -3,
      }),
    ],
  },
  {
    id: 'heat',
    category: 'Exposure',
    title: 'Heat above the plain',
    body: 'There is little shade ahead. Walking at full pace will cost water.',
    biomes: ['desert', 'savanna', 'flower', 'jurassic'],
    choices: [
      choice(
        'Rest in shade',
        'You recover some energy and avoid the hottest hours.',
        { energy: 12, water: -5, safety: 5 },
      ),
      choice(
        'Push through',
        'The crossing drains your reserves.',
        {
          water: -20,
          energy: -13,
        },
        {
          kind: 'exposure',
          base: 0.13,
          fatal: 'You collapse from heat exposure before reaching shelter.',
        },
      ),
      choice(
        'Move along the shaded edge',
        'The longer route offers intermittent shelter.',
        { energy: -7, water: -4, shelter: 5 },
      ),
    ],
  },
  {
    id: 'fossil',
    category: 'Discovery',
    title: 'A story in the stone',
    body: 'Layers in an exposed bank reveal traces of an older world beneath this one.',
    biomes: [...land, 'ash'],
    choices: [
      choice(
        'Study the layers',
        'You record how the local environment has changed.',
        { knowledge: 14, energy: -4 },
      ),
      choice(
        'Continue the expedition',
        'You save your strength for the route ahead.',
        { energy: 3 },
      ),
    ],
  },
  {
    id: 'marsh',
    category: 'Terrain',
    title: 'The ground gives way',
    body: 'A soft patch of sediment sinks underfoot.',
    biomes: ['swamp', 'jurassic', 'flower', 'modern'],
    choices: [
      choice('Retrace your steps', 'You return to firm ground.', {
        safety: 8,
        energy: -6,
      }),
      choice(
        'Force a crossing',
        'Mud slows you and consumes your strength.',
        {
          energy: -20,
          health: -5,
        },
        {
          kind: 'terrain',
          base: 0.2,
          fatal: 'You lose your footing and drown in the deep channel.',
        },
      ),
      choice('Probe a route along the edge', 'You learn to read the marsh.', {
        knowledge: 7,
        energy: -8,
      }),
    ],
  },
  {
    id: 'insects',
    category: 'Wildlife',
    title: 'Wings in the haze',
    body: 'Insects gather above still water. Their movement reveals a rich habitat.',
    biomes: green,
    choices: [
      choice(
        'Observe from the breeze',
        'You add an ecological observation to your journal.',
        { knowledge: 9 },
      ),
      choice(
        'Wade closer',
        'You disturb the bank and pick up irritating bites.',
        { health: -6, knowledge: 4, energy: -4 },
      ),
    ],
  },
  {
    id: 'cliff',
    category: 'Terrain',
    title: 'The path ends abruptly',
    body: 'A steep drop cuts across your route. A lower pass is visible in the distance.',
    biomes: land,
    choices: [
      choice('Take the lower pass', 'The detour is tiring but safe.', {
        energy: -10,
        safety: 8,
      }),
      choice(
        'Climb down',
        'Loose rock makes the descent difficult.',
        {
          health: -12,
          energy: -10,
          safety: -8,
        },
        {
          kind: 'terrain',
          base: 0.22,
          fatal: 'A foothold breaks and the fall is fatal.',
        },
      ),
    ],
  },
  {
    id: 'night',
    category: 'Shelter',
    title: 'Before the last light',
    body: 'You have enough daylight to prepare a sheltered stopping place.',
    biomes: land,
    choices: [
      choice('Prepare camp', 'A protected camp improves your prospects.', {
        shelter: 22,
        energy: -8,
        safety: 12,
      }),
      choice(
        'Keep exploring',
        'You gain knowledge but are caught outside after dark.',
        { knowledge: 8, safety: -15, energy: -9 },
      ),
    ],
  },
  {
    id: 'berries',
    category: 'Foraging',
    title: 'A familiar-looking fruit',
    body: 'Fruit grows at the woodland edge. Familiarity is not reliable identification.',
    biomes: ['flower', 'savanna', 'modern'],
    choices: [
      choice('Leave an uncertain food', 'You avoid an unnecessary risk.', {
        knowledge: 5,
        safety: 4,
      }),
      choice(
        'Eat without identifying it',
        'An unpleasant reaction costs health.',
        { energy: 10, health: -20 },
        {
          kind: 'poison',
          base: 0.22,
          fatal: 'The fruit is toxic. The poisoning proves fatal.',
        },
      ),
    ],
  },
  {
    id: 'tide',
    category: 'Ocean',
    title: 'The returning tide',
    body: 'Water rises across the shallow shelf. There is higher rocky ground behind you.',
    biomes: ['ocean'],
    choices: [
      choice(
        'Move to high ground',
        'You avoid the rising water, but the atmosphere remains a problem.',
        { safety: 15, energy: -6, knowledge: 8 },
      ),
      choice(
        'Stay to observe',
        'You record marine patterns as the water rises.',
        { knowledge: 12, safety: -20, health: -12 },
        {
          kind: 'terrain',
          base: 0.28,
          fatal: 'The tide cuts off your escape and sweeps you away.',
        },
      ),
    ],
  },
  {
    id: 'air',
    category: 'Atmosphere',
    title: 'A world you cannot breathe',
    body: 'Your time instrument warns that this atmosphere cannot support an unprotected modern human. Travel to a breathable era soon.',
    biomes: ['ocean', 'volcanic'],
    choices: [
      choice(
        'Record from the landing point',
        'You record a brief observation. This cannot solve the oxygen problem.',
        { knowledge: 15, health: -10 },
      ),
      choice(
        'Search farther inland',
        'No location can make an oxygen-poor atmosphere breathable.',
        { health: -25, energy: -12 },
        {
          kind: 'air',
          base: 0.3,
          fatal:
            'You collapse in the oxygen-poor air, too far from the landing point.',
        },
      ),
    ],
  },
  {
    id: 'eruption',
    category: 'Geology',
    title: 'The horizon glows',
    body: 'New lava lights the haze. Hot gases gather in low places.',
    biomes: ['volcanic'],
    choices: [
      choice(
        'Retreat across the ridge',
        'You avoid the flow, but this world remains lethally hostile.',
        { safety: 8, health: -8, energy: -10 },
      ),
      choice(
        'Approach the glow',
        'Heat drives you back.',
        {
          health: -28,
          knowledge: 6,
        },
        {
          kind: 'exposure',
          base: 0.42,
          fatal: 'Superheated gases engulf the path before you can retreat.',
        },
      ),
    ],
  },
  {
    id: 'ashfall',
    category: 'Extinction',
    title: 'A quiet unlike any other',
    body: 'Dust dims the sky. Food is scarce and distant forests stand damaged.',
    biomes: ['ash'],
    choices: [
      choice(
        'Conserve your supplies',
        'You slow your pace and shelter from falling dust.',
        { shelter: 10, energy: 5, water: -6 },
      ),
      choice(
        'Survey the damaged landscape',
        'You document ecological disruption at a physical cost.',
        { knowledge: 15, health: -8, energy: -12 },
      ),
    ],
  },
  {
    id: 'ice-river',
    category: 'Water',
    title: 'Water beneath the ice',
    body: 'A narrow channel runs under a frozen surface. The ice may not bear your weight.',
    biomes: ['ice'],
    choices: [
      choice(
        'Collect from the bank',
        'You stay on solid ground and find a little water.',
        { water: 15, energy: -8 },
      ),
      choice(
        'Cross the ice',
        'The surface cracks; you retreat soaked and chilled.',
        { health: -18, energy: -15 },
        {
          kind: 'terrain',
          base: 0.32,
          fatal:
            'The ice breaks beneath you and you cannot escape the freezing water.',
        },
      ),
    ],
  },
  {
    id: 'birds',
    category: 'Discovery',
    title: 'A call from above',
    body: 'A flying animal circles the water. You watch how it uses the air.',
    biomes: ['jurassic', 'flower', 'savanna', 'modern', 'desert'],
    requires: 'animals',
    choices: [
      choice(
        'Watch and sketch',
        'An observation becomes a new journal entry.',
        { knowledge: 12, energy: -3 },
      ),
      choice('Follow its course', 'The flight leads you toward water.', {
        water: 8,
        knowledge: 5,
        energy: -7,
      }),
    ],
  },
  {
    id: 'rest',
    category: 'Recovery',
    title: 'A sheltered hollow',
    body: 'A dry hollow offers a place to rest away from the open trail.',
    biomes: land,
    choices: [
      choice(
        'Rest and recover',
        'You regain strength while using some water.',
        { health: 10, energy: 18, water: -8, shelter: 8 },
      ),
      choice(
        'Survey before resting',
        'You check nearby tracks and choose a safer resting place.',
        { energy: 8, safety: 10, knowledge: 4 },
      ),
    ],
  },
];
export function eligibleEvents(p: Period, r?: Region) {
  const temperature = p.temperature + (r?.temperature ?? 0);
  const generic = events.filter(
    (e) =>
      e.biomes.includes(p.biome) &&
      (!e.requires || e.requires !== 'animals' || p.species.length > 0) &&
      (e.id !== 'predator' || p.species.some((s) => s.behavior === 'hunt')) &&
      (e.id !== 'herd' ||
        p.species.some((s) => s.behavior === 'graze' && s.size >= 0.7)) &&
      (e.id !== 'birds' || p.species.some((s) => s.behavior === 'fly')) &&
      (e.id !== 'cold' || temperature < 12) &&
      (e.id !== 'heat' || temperature >= 28) &&
      (e.id !== 'air' || p.oxygen < 19.5) &&
      (e.id !== 'fossil' || p.mya < 3500),
  );
  // These extinction events had different causes; sharing an ash biome must
  // not turn the end-Permian greenhouse into an asteroid impact winter.
  return generic.map((e) =>
    e.id === 'predator'
      ? {
          ...e,
          choices: e.choices.map((c) =>
            c.risk?.kind === 'wildlife'
              ? {
                  ...c,
                  risk: {
                    ...c.risk,
                    base: Math.max(
                      ...p.species
                        .filter((s) => s.behavior === 'hunt')
                        .map(wildlifeThreat),
                    ),
                  },
                }
              : c,
          ),
        }
      : e.id === 'ashfall' && p.id === 'great-dying'
        ? {
            ...e,
            id: 'volcanic-aftermath',
            title: 'After the eruptions',
            body: 'Volcanic warming has disrupted this ecosystem. Sparse vegetation offers little cover.',
            choices: [
              choice(
                'Shelter and conserve water',
                'You shelter from the heat and ration your water.',
                { shelter: 10, energy: 5, water: -6 },
              ),
              choice(
                'Survey the surviving vegetation',
                'You document surviving plants in a landscape recovering from volcanic disruption.',
                { knowledge: 15, health: -8, energy: -12 },
              ),
            ],
          }
        : e,
  );
}

/** A distinct discovery introduces the actual history of every checkpoint. */
export function historicalDiscovery(p: Period): Encounter {
  return {
    id: `history:${p.id}`,
    category: p.date,
    title: p.name,
    body: p.description,
    biomes: [p.biome],
    choices: [
      choice('Record this world', p.description, { knowledge: 12, energy: -3 }),
      choice(
        'Survey the landscape',
        `${p.date}: ${p.geology}. Continental setting: ${p.continents}.`,
        { knowledge: 8, safety: 6, energy: -5 },
      ),
    ],
  };
}

export function availableEvents(p: Period, r: Region, seen: readonly string[]) {
  return [historicalDiscovery(p), ...eligibleEvents(p, r)].filter(
    (e) => !seen.includes(e.id),
  );
}

/** An encounter is offered once per supplied expedition history. */
export function nextEncounter(
  p: Period,
  r: Region,
  seen: readonly string[],
  nearby = '',
  random = Math.random,
): Encounter | null {
  const available = availableEvents(p, r, seen);
  const history = available.find((e) => e.id.startsWith('history:'));
  if (history) return history;
  const species = p.species.find((s) => s.name === nearby);
  const wildlifeId = species ? `wildlife:${species.name}` : '';
  if (species && !seen.includes(wildlifeId)) {
    const hunter = species.behavior === 'hunt';
    const threat = wildlifeThreat(species);
    return {
      id: wildlifeId,
      category: 'Wildlife',
      title: species.name,
      body: hunter
        ? `A ${species.name} is hunting nearby. Keep your distance.`
        : `You spot a ${species.name}. ${threat ? 'Even a plant-eater can defend its space. Keep a clear escape route.' : 'Watch without disturbing it.'}`,
      biomes: [p.biome],
      choices: [
        choice(
          'Observe from a distance',
          `You record ${species.name} in ${p.name}, ${p.date.toLowerCase()}.`,
          { knowledge: 12, energy: -3, safety: 5 },
        ),
        choice(
          'Give it space',
          `You leave ${species.name} undisturbed and find a quieter route.`,
          { safety: 10, energy: -4 },
        ),
        choice(
          'Approach the animal',
          threat
            ? `The ${species.name} reacts to your approach. You escape with an injury and a closer observation.`
            : `The ${species.name} moves away. You record a brief close observation.`,
          threat
            ? { knowledge: 18, health: -14, safety: -18, energy: -10 }
            : { knowledge: 6, energy: -4 },
          threat
            ? {
                kind: 'wildlife',
                base: threat,
                fatal: hunter
                  ? `The ${species.name} attacks before you can retreat.`
                  : `The ${species.name} strikes as you enter its space. Your injuries are fatal.`,
              }
            : undefined,
        ),
      ],
    };
  }
  if (!available.length) return null;
  return available[
    Math.min(
      available.length - 1,
      Math.floor(Math.max(0, random()) * available.length),
    )
  ];
}
