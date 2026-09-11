import type { Period, Region, Biome, Species, AnimalKind } from './types';
import { buildEnvironmentRegistry, buildSpeciesRegistry } from './assets';
export { explorerAsset, ASSET_ROOTS } from './assets';
export const regions: Region[] = [
  {
    id: 'coast',
    name: 'Coastal lowlands',
    temperature: 0,
    water: 20,
    danger: 0,
    x: 126,
    y: 83,
  },
  {
    id: 'interior',
    name: 'Continental interior',
    temperature: 8,
    water: -25,
    danger: 8,
    x: 106,
    y: 70,
  },
  {
    id: 'tropics',
    name: 'Tropical belt',
    temperature: 5,
    water: 10,
    danger: 15,
    x: 139,
    y: 96,
  },
  {
    id: 'north',
    name: 'Northern highlands',
    temperature: -12,
    water: -5,
    danger: 4,
    x: 112,
    y: 47,
  },
  {
    id: 'south',
    name: 'Southern latitudes',
    temperature: -8,
    water: 0,
    danger: 5,
    x: 131,
    y: 127,
  },
];
const animal = (
  name: string,
  kind: AnimalKind,
  size = 1,
  behavior: Species['behavior'] = 'graze',
  color?: string,
): Species => ({
  name,
  kind,
  size,
  behavior,
  color:
    color ||
    (kind === 'mammoth'
      ? '#816d52'
      : kind === 'deer'
        ? '#9b8867'
        : kind === 'cat'
          ? '#918465'
          : kind === 'fish'
            ? '#72a29a'
            : '#617b5b'),
});
export const fauna = {
  cambrian: [
    animal('Trilobite', 'trilobite', 0.8, 'swim'),
    animal('Radiodont', 'fish', 1.2, 'hunt'),
    animal('Early chordate', 'fish', 0.5, 'swim'),
  ],
  ordovician: [
    animal('Trilobite', 'trilobite', 1, 'swim'),
    animal('Orthoconic nautiloid', 'fish', 1.5, 'hunt'),
    animal('Jawless fish', 'fish', 0.7, 'swim'),
  ],
  devonian: [
    animal('Lobe-finned fish', 'fish', 1.2, 'swim'),
    animal('Early tetrapod', 'amphibian', 0.8),
    animal('Arthropod', 'insect', 0.6, 'flee'),
  ],
  carbon: [
    animal('Meganeura', 'insect', 1.5, 'fly'),
    animal('Arthropleura', 'trilobite', 1.2),
    animal('Temnospondyl', 'amphibian', 1.1),
    animal('Early amniote', 'amphibian', 0.6, 'flee'),
  ],
  permian: [
    animal('Sail-backed synapsid', 'amphibian', 1.6, 'hunt'),
    animal('Pareiasaur', 'amphibian', 1.5),
    animal('Therapsid', 'cat', 0.8),
  ],
  triassic: [
    animal('Early sauropodomorph', 'sauropod', 0.5),
    animal('Coelophysis-like theropod', 'theropod', 0.65, 'hunt'),
    animal('Pterosaur', 'pterosaur', 0.7, 'fly'),
    animal('Cynodont', 'cat', 0.35, 'flee'),
  ],
  jurassic: [
    animal('Brachiosaurus', 'sauropod', 1.35),
    animal('Diplodocus', 'sauropod', 1, 'graze', '#75826b'),
    animal('Stegosaurus', 'stegosaur', 0.9),
    animal('Allosaurus', 'theropod', 1, 'hunt', '#7c7656'),
    animal('Rhamphorhynchus', 'pterosaur', 0.7, 'fly'),
    animal('Small mammaliaform', 'cat', 0.3, 'flee'),
  ],
  cretaceous: [
    animal('Titanosaur', 'sauropod', 1.2),
    animal('Iguanodontian', 'theropod', 0.8, 'graze'),
    animal('Ankylosaur', 'stegosaur', 0.7),
    animal('Pterosaur', 'pterosaur', 1, 'fly'),
    animal('Small feathered theropod', 'bird', 0.6, 'flee'),
  ],
  latecret: [
    animal('Triceratops', 'ceratopsian', 1),
    animal('Tyrannosaurus', 'theropod', 1.2, 'hunt'),
    animal('Edmontosaurus', 'theropod', 0.9, 'graze'),
    animal('Quetzalcoatlus', 'pterosaur', 1.3, 'fly'),
    animal('Ankylosaurus', 'stegosaur', 0.8),
  ],
  eocene: [
    animal('Early horse', 'deer', 0.55),
    animal('Early primate', 'cat', 0.35, 'flee'),
    animal('Large flightless bird', 'bird', 1),
    animal('Crocodilian', 'amphibian', 1.1, 'hunt'),
    animal('Small browsing mammal', 'deer', 0.6),
  ],
  miocene: [
    animal('Early elephant', 'mammoth', 0.85),
    animal('Three-toed horse', 'deer', 0.9),
    animal('Antelope', 'deer', 0.8, 'flee'),
    animal('Large cat', 'cat', 0.8, 'hunt'),
    animal('Ground bird', 'bird', 0.7),
  ],
  ice: [
    animal('Woolly mammoth', 'mammoth', 1.2),
    animal('Steppe bison', 'deer', 1.2),
    animal('Reindeer', 'deer', 0.85),
    animal('Cave lion', 'cat', 1, 'hunt'),
    animal('Woolly rhinoceros', 'ceratopsian', 0.8),
  ],
  modern: [
    animal('Red deer', 'deer', 1),
    animal('Red fox', 'cat', 0.45, 'flee'),
    animal('Grey wolf', 'cat', 0.75, 'hunt'),
    animal('Heron', 'bird', 0.7, 'fly'),
    animal('Wild boar', 'deer', 0.65),
  ],
};
type Profile = Pick<
  Period,
  | 'sky'
  | 'land'
  | 'accent'
  | 'climate'
  | 'temperature'
  | 'oxygen'
  | 'vegetation'
  | 'water'
  | 'food'
  | 'danger'
  | 'hazards'
>;
const profiles: Record<Biome, Profile> = {
  volcanic: {
    sky: ['#221f32', '#b16b48'],
    land: '#302b2c',
    accent: '#e89961',
    climate: 'Extreme heat',
    temperature: 90,
    oxygen: 0,
    vegetation: 'No land plants',
    water: 0,
    food: 0,
    danger: 100,
    hazards: ['Unbreathable air', 'Volcanism', 'Extreme heat'],
  },
  ocean: {
    sky: ['#254755', '#a2b8af'],
    land: '#335958',
    accent: '#86cbd3',
    climate: 'Marine world',
    temperature: 27,
    oxygen: 5,
    vegetation: 'Microbial mats & algae',
    water: 35,
    food: 5,
    danger: 70,
    hazards: ['Low oxygen', 'No edible land plants'],
  },
  swamp: {
    sky: ['#173a3c', '#9eb590'],
    land: '#214c3b',
    accent: '#c4ce83',
    climate: 'Warm & humid',
    temperature: 26,
    oxygen: 30,
    vegetation: 'Lycopsids, horsetails & ferns',
    water: 90,
    food: 25,
    danger: 50,
    hazards: ['Flooding', 'Wildfire', 'Unfamiliar food'],
  },
  desert: {
    sky: ['#5d6663', '#d9bd89'],
    land: '#756545',
    accent: '#e2c792',
    climate: 'Hot & seasonal',
    temperature: 32,
    oxygen: 20,
    vegetation: 'Seed ferns & conifers',
    water: 25,
    food: 20,
    danger: 65,
    hazards: ['Drought', 'Heat stress'],
  },
  jurassic: {
    sky: ['#213e46', '#bdc9a8'],
    land: '#294e40',
    accent: '#d9bd82',
    climate: 'Warm & seasonal',
    temperature: 24,
    oxygen: 23,
    vegetation: 'Conifers, cycads & ferns',
    water: 70,
    food: 30,
    danger: 65,
    hazards: ['Large predators', 'Unfamiliar food'],
  },
  flower: {
    sky: ['#294951', '#cbd1a4'],
    land: '#365846',
    accent: '#e0c186',
    climate: 'Greenhouse warmth',
    temperature: 28,
    oxygen: 25,
    vegetation: 'Conifers & flowering plants',
    water: 70,
    food: 40,
    danger: 75,
    hazards: ['Large predators', 'Heat stress'],
  },
  ash: {
    sky: ['#24292e', '#928777'],
    land: '#3a4038',
    accent: '#c4ac8f',
    climate: 'Impact winter',
    temperature: 5,
    oxygen: 21,
    vegetation: 'Damaged forests & fern recovery',
    water: 25,
    food: 5,
    danger: 95,
    hazards: ['Darkness', 'Food-chain collapse', 'Ash'],
  },
  savanna: {
    sky: ['#476769', '#dfd2a5'],
    land: '#6e7850',
    accent: '#ead296',
    climate: 'Seasonal grasslands',
    temperature: 22,
    oxygen: 21,
    vegetation: 'Grasslands & scattered woodland',
    water: 50,
    food: 60,
    danger: 55,
    hazards: ['Predators', 'Seasonal drought'],
  },
  ice: {
    sky: ['#425d70', '#d6e2da'],
    land: '#b5c9c5',
    accent: '#c9e3e9',
    climate: 'Cold & dry',
    temperature: -8,
    oxygen: 21,
    vegetation: 'Tundra, grasses & sparse woodland',
    water: 40,
    food: 40,
    danger: 70,
    hazards: ['Exposure', 'Large predators', 'Frozen water'],
  },
  modern: {
    sky: ['#335b64', '#d0dabc'],
    land: '#355643',
    accent: '#c6d7a6',
    climate: 'Temperate',
    temperature: 15,
    oxygen: 21,
    vegetation: 'Mixed forest & cultivated land',
    water: 85,
    food: 85,
    danger: 15,
    hazards: ['Exposure', 'Unsafe water'],
  },
};
// Checkpoints are representative snapshots, not exact period boundaries.
const rows: [
  string,
  string,
  number,
  string,
  Biome,
  string,
  string,
  keyof typeof fauna | null,
][] = [
  [
    'formation',
    'Earth takes shape',
    4500,
    'Hadean',
    'volcanic',
    'A young planet assembles from collisions. Its surface is repeatedly melted; there are no plants, animals, or breathable air.',
    'Unstable proto-crust',
    null,
  ],
  [
    'first-oceans',
    'The first oceans',
    4000,
    'Hadean',
    'ocean',
    'The cooling crust supports water. The timing of the first stable oceans and the origin of life remain uncertain.',
    'Small early crustal fragments',
    null,
  ],
  [
    'microbial',
    'A microbial planet',
    3500,
    'Archean',
    'ocean',
    'Microbial communities inhabit shallow water. Stromatolites preserve evidence of ancient microbial ecosystems.',
    'Growing cratons',
    null,
  ],
  [
    'oxygen',
    'Before the oxygen rise',
    2500,
    'Proterozoic',
    'ocean',
    'Photosynthetic microbes produce oxygen. Its major atmospheric rise follows around 2.4 billion years ago.',
    'Early continental blocks',
    null,
  ],
  [
    'complex-cells',
    'Complex cells',
    1800,
    'Proterozoic',
    'ocean',
    'Eukaryotic life diversifies in the oceans. The atmosphere remains very different from the one we breathe.',
    'Nuna assembling',
    null,
  ],
  [
    'rodinia',
    'The Rodinia world',
    1000,
    'Proterozoic',
    'ocean',
    'A supercontinent gathers. Simple multicellular life exists in the seas; land has no forests or animals.',
    'Rodinia',
    null,
  ],
  [
    'cambrian',
    'Cambrian seas',
    520,
    'Paleozoic',
    'ocean',
    'Marine animals diversify into remarkable forms. Trilobites and radiodonts inhabit shallow seas, while the land is largely barren.',
    'Gondwana & scattered continents',
    'cambrian',
  ],
  [
    'ordovician',
    'Ordovician oceans',
    470,
    'Paleozoic',
    'ocean',
    'Marine communities expand. Nautiloids and jawless fish share the seas; complex terrestrial ecosystems are still absent.',
    'Gondwana in the south',
    'ordovician',
  ],
  [
    'devonian',
    'The first forests',
    380,
    'Paleozoic',
    'swamp',
    'Early forests transform the land. Fishes diversify and early tetrapods inhabit water margins.',
    'Euramerica & Gondwana',
    'devonian',
  ],
  [
    'carboniferous',
    'The coal forests',
    310,
    'Paleozoic',
    'swamp',
    'Wet tropical forests build deposits that will become coal. High oxygen supports unusually large arthropods.',
    'Pangaea assembling',
    'carbon',
  ],
  [
    'permian',
    'Pangaea interior',
    270,
    'Paleozoic',
    'desert',
    'A vast supercontinent has a dry interior. Synapsids and reptiles flourish before the end-Permian crisis.',
    'Pangaea',
    'permian',
  ],
  [
    'great-dying',
    'The Great Dying',
    251.9,
    'Mesozoic',
    'ash',
    'After the end-Permian extinction, ecosystems recover from immense volcanic disruption, warming and ocean oxygen loss.',
    'Pangaea',
    null,
  ],
  [
    'triassic',
    'The dinosaur dawn',
    220,
    'Mesozoic',
    'desert',
    'Early dinosaurs share the landscape with other reptile groups. Pterosaurs take to the skies.',
    'Pangaea',
    'triassic',
  ],
  [
    'jurassic',
    'Late Jurassic',
    150,
    'Mesozoic',
    'jurassic',
    'Conifer forests open onto braided rivers. Giant sauropods browse the canopy, while smaller animals keep to the undergrowth.',
    'Pangaea breaking apart',
    'jurassic',
  ],
  [
    'cretaceous',
    'A flowering world',
    100,
    'Mesozoic',
    'flower',
    'Flowering plants spread through diverse dinosaur ecosystems. Warm seas divide land masses as continents separate.',
    'Opening Atlantic',
    'cretaceous',
  ],
  [
    'last-dinosaurs',
    'The last dinosaur worlds',
    67,
    'Mesozoic',
    'flower',
    'In western North America, horned dinosaurs and hadrosaurs share their world with Tyrannosaurus.',
    'Separated northern continents',
    'latecret',
  ],
  [
    'impact',
    'The world after impact',
    66,
    'Cenozoic',
    'ash',
    'The Chicxulub impact ends the age of non-avian dinosaurs. Darkness and disrupted food webs reshape life.',
    'Widening Atlantic',
    null,
  ],
  [
    'eocene',
    'Mammals inherit Earth',
    50,
    'Cenozoic',
    'flower',
    'Warm forests extend toward high latitudes. Early horses, primates and many other mammals diversify.',
    'Continents drifting apart',
    'eocene',
  ],
  [
    'miocene',
    'The grassland shift',
    23,
    'Cenozoic',
    'savanna',
    'Open habitats expand in many regions. Mammalian communities change as climates and vegetation evolve.',
    'Near-modern continental pattern',
    'miocene',
  ],
  [
    'pliocene',
    'An expanding horizon',
    5,
    'Cenozoic',
    'savanna',
    'Woodlands and grasslands form a changing mosaic. Early hominins inhabit parts of Africa.',
    'Near-modern continents',
    'miocene',
  ],
  [
    'pleistocene',
    'An age of ice begins',
    2.6,
    'Cenozoic',
    'ice',
    'Repeated glacial cycles begin to define the Quaternary. Ice cover advances and retreats rather than covering the entire planet.',
    'Modern continents; changing ice sheets',
    'ice',
  ],
  [
    'million',
    'The long ice age',
    1,
    'Cenozoic',
    'ice',
    'Glacial cycles reshape northern landscapes. Human relatives occupy parts of Africa and Eurasia.',
    'Lower seas during glacials',
    'ice',
  ],
  [
    'sapiens',
    'Our species emerges',
    0.3,
    'Cenozoic',
    'savanna',
    'Early Homo sapiens appear in Africa. Human evolution unfolds across interconnected populations.',
    'Modern continents',
    'miocene',
  ],
  [
    'human-world',
    'A human world',
    0.1,
    'Cenozoic',
    'ice',
    'Multiple human groups inhabit a changing world. Cold regions support mammoths, reindeer and large predators.',
    'Glacial sea-level changes',
    'ice',
  ],
  [
    'holocene',
    'The great thaw',
    0.012,
    'Cenozoic',
    'modern',
    'The last glacial period ends. Warming landscapes and changing human societies lead toward agriculture.',
    'Rising seas',
    'modern',
  ],
  [
    'civilization',
    'Cities take root',
    0.005,
    'Cenozoic',
    'modern',
    'Cities and agricultural societies develop in several regions. Humans increasingly shape local ecosystems.',
    'Modern continents',
    'modern',
  ],
  [
    'industrial',
    'The industrial world',
    0.0002,
    'Cenozoic',
    'modern',
    'Industry transforms landscapes and energy use. Human activity increasingly alters the atmosphere.',
    'Modern continents',
    'modern',
  ],
  [
    'today',
    'Our living planet',
    0,
    'Cenozoic',
    'modern',
    'One planet, shaped by billions of years. Its future biodiversity and climate also depend on choices made now.',
    'Modern continents',
    'modern',
  ],
];
export const periods: Period[] = rows.map(
  ([id, name, mya, era, biome, description, continents, animals]) => ({
    id,
    name,
    mya,
    era,
    biome,
    description,
    continents,
    ...profiles[biome],
    date:
      mya >= 1000
        ? `${mya / 1000} billion years ago`
        : mya >= 1
          ? `${mya} million years ago`
          : mya
            ? `${Math.round(mya * 1e6).toLocaleString('en-US')} years ago`
            : 'Today',
    geology:
      biome === 'ocean'
        ? 'Shallow marine shelves and rocky shores'
        : biome === 'ice'
          ? 'Glacial valleys, tundra and exposed plains'
          : biome === 'volcanic'
            ? 'Lava fields and unstable cooling crust'
            : biome === 'ash'
              ? 'Disrupted terrain and damaged ecosystems'
              : biome === 'desert'
                ? 'Dry basins and seasonal rivers'
                : 'River floodplains and wooded uplands',
    species: animals ? fauna[animals] : [],
    ...(mya > 1000 ? { oxygen: 0.5 } : {}),
    ...(id === 'great-dying'
      ? {
          climate: 'Volcanic greenhouse',
          temperature: 38,
          hazards: ['Extreme warming', 'Volcanic gases', 'Ecosystem collapse'],
          vegetation: 'Sparse surviving vegetation',
        }
      : {}),
    ...(id === 'devonian'
      ? { oxygen: 18, vegetation: 'Early trees & primitive ferns' }
      : {}),
    ...(id === 'eocene'
      ? { vegetation: 'Broadleaf forests & palms', danger: 40 }
      : {}),
    ...(id === 'sapiens'
      ? { species: fauna.miocene.filter((s) => s.name !== 'Three-toed horse') }
      : {}),
    ...(['pleistocene', 'million'].includes(id)
      ? {
          species: [
            animal(
              id === 'pleistocene' ? 'Early mammoth' : 'Steppe mammoth',
              'mammoth',
              1.1,
            ),
            animal('Large bovid', 'deer', 1.1),
            animal('Deer', 'deer', 0.9),
            animal('Large cat', 'cat', 1, 'hunt'),
            animal('Early rhinoceros', 'ceratopsian', 0.8),
          ],
        }
      : {}),
    ...(id === 'first-oceans'
      ? { vegetation: 'No confirmed life at this checkpoint' }
      : {}),
  }),
);
export const shortDate = (p: Period) =>
  p.mya >= 1000
    ? `${p.mya / 1000} BYA`
    : p.mya >= 1
      ? `${p.mya} MYA`
      : p.mya >= 0.001
        ? `${Math.round(p.mya * 1000)} KYA`
        : p.mya
          ? `${Math.round(p.mya * 1e6)} YA`
          : 'TODAY';

/** Registries for Astra / 3D loaders — procedural fallback when model.src is unset. */
export const speciesAssets = buildSpeciesRegistry(periods);
export const environmentAssets = buildEnvironmentRegistry(periods);
