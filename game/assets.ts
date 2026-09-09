import type { AnimalKind, Biome, Period, Species } from './types';

/**
 * Asset registry for Earth Through Time.
 * Tomorrow (Astra): drop .glb/.gltf into public/assets/* and set paths here.
 * Until then, canvas/procedural renderers are the fallback.
 */

export type AssetRef = {
  /** Public URL path, e.g. /assets/animals/brachiosaurus.glb */
  src?: string;
  scale?: number;
  /** Y-up offset after load */
  offsetY?: number;
  /** Animation clip names when available */
  clips?: string[];
};

export type SpeciesAsset = Species & {
  id: string;
  periodIds: string[];
  habitat: string;
  danger: number;
  model: AssetRef;
};

export type EnvironmentAsset = {
  id: string;
  periodId: string;
  biome: Biome;
  model: AssetRef;
  vegetation: AssetRef[];
  lighting: {
    sky: [string, string];
    sun: string;
    ambient: number;
  };
  atmosphere: string;
  weather: 'clear' | 'haze' | 'ash' | 'snow' | 'storm';
};

export type CharacterAsset = {
  id: string;
  model: AssetRef;
  walkClip?: string;
  idleClip?: string;
};

/** Folder map — keep in sync with public/assets/ */
export const ASSET_ROOTS = {
  animals: '/assets/animals',
  vegetation: '/assets/vegetation',
  environments: '/assets/environments',
  terrain: '/assets/terrain',
  characters: '/assets/characters',
  effects: '/assets/effects',
  maps: '/assets/maps',
  ui: '/assets/ui',
} as const;

const kindScale: Record<AnimalKind, number> = {
  sauropod: 2.4,
  theropod: 1.4,
  stegosaur: 1.3,
  ceratopsian: 1.35,
  pterosaur: 1.1,
  mammoth: 1.8,
  deer: 0.9,
  cat: 0.7,
  fish: 0.6,
  trilobite: 0.4,
  insect: 0.5,
  amphibian: 0.8,
  bird: 0.55,
};

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Build species registry from period data. Models optional until Astra ships. */
export function buildSpeciesRegistry(periods: Period[]): SpeciesAsset[] {
  const out: SpeciesAsset[] = [];
  const seen = new Map<string, SpeciesAsset>();
  for (const p of periods) {
    for (const s of p.species) {
      const id = slug(s.name);
      const existing = seen.get(id);
      if (existing) {
        if (!existing.periodIds.includes(p.id)) existing.periodIds.push(p.id);
        continue;
      }
      const entry: SpeciesAsset = {
        ...s,
        id,
        periodIds: [p.id],
        habitat: p.vegetation,
        danger: s.behavior === 'hunt' ? Math.min(100, p.danger + 15) : p.danger * 0.4,
        model: {
          src: undefined, // ponytail: procedural until Astra
          scale: kindScale[s.kind] * s.size,
          offsetY: 0,
          clips: ['idle', 'walk', s.behavior === 'flee' ? 'flee' : 'graze'],
        },
      };
      seen.set(id, entry);
      out.push(entry);
    }
  }
  return out;
}

export function buildEnvironmentRegistry(periods: Period[]): EnvironmentAsset[] {
  return periods.map((p) => ({
    id: p.id,
    periodId: p.id,
    biome: p.biome,
    model: {
      src: undefined,
      scale: 1,
    },
    vegetation: [],
    lighting: {
      sky: p.sky,
      sun: p.accent,
      ambient: p.biome === 'ash' || p.biome === 'volcanic' ? 0.35 : 0.55,
    },
    atmosphere: p.climate,
    weather:
      p.biome === 'ash'
        ? 'ash'
        : p.biome === 'ice'
          ? 'snow'
          : p.biome === 'volcanic'
            ? 'haze'
            : 'clear',
  }));
}

export const explorerAsset: CharacterAsset = {
  id: 'explorer',
  model: { src: undefined, scale: 1, offsetY: 0 },
  walkClip: 'walk',
  idleClip: 'idle',
};

/** Resolve model URL or null → use procedural fallback */
export function resolveModel(ref: AssetRef): string | null {
  return ref.src || null;
}

export function animalAssetPath(id: string, ext = 'glb') {
  return `${ASSET_ROOTS.animals}/${id}.${ext}`;
}

export function environmentAssetPath(id: string, ext = 'glb') {
  return `${ASSET_ROOTS.environments}/${id}.${ext}`;
}
