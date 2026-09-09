export type Biome =
  | 'volcanic'
  | 'ocean'
  | 'swamp'
  | 'desert'
  | 'jurassic'
  | 'flower'
  | 'ash'
  | 'savanna'
  | 'ice'
  | 'modern';
export type AnimalKind =
  | 'sauropod'
  | 'theropod'
  | 'stegosaur'
  | 'ceratopsian'
  | 'pterosaur'
  | 'mammoth'
  | 'deer'
  | 'cat'
  | 'fish'
  | 'trilobite'
  | 'insect'
  | 'amphibian'
  | 'bird';
export interface Species {
  name: string;
  kind: AnimalKind;
  behavior: 'graze' | 'hunt' | 'flee' | 'fly' | 'swim';
  size: number;
  color: string;
}
export interface Period {
  id: string;
  name: string;
  date: string;
  mya: number;
  era: string;
  biome: Biome;
  description: string;
  climate: string;
  temperature: number;
  oxygen: number;
  vegetation: string;
  geology: string;
  continents: string;
  water: number;
  food: number;
  danger: number;
  hazards: string[];
  species: Species[];
  sky: [string, string];
  land: string;
  accent: string;
}
export interface Stats {
  health: number;
  water: number;
  energy: number;
  safety: number;
  knowledge: number;
  shelter: number;
}
export interface Region {
  id: string;
  name: string;
  temperature: number;
  water: number;
  danger: number;
  x: number;
  y: number;
}
export interface WorldHandle {
  x: number;
  moving: boolean;
  distance: number;
  nearby: string;
}
