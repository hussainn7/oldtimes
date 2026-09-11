# Earth Through Time

A playable, illustrated expedition through 4.5 billion years of Earth history. Built for Hussain.

## Play

- **WASD** or **arrow keys**: explore in 3D. Hold the four touch arrows on a phone. **Shift** moves faster; drag to orbit, scroll to zoom, **R** recenters.
- **E**: investigate. Encounters also appear as you walk.
- **[ / ]**: previous / next world.
- Drag, scroll, click, or use the slider to travel through 28 checkpoints.
- Change your region beside the globe. Open field notes to understand the survival estimate.
- **Escape**: pause. Notes and encounters pause the survival clock automatically.
- Discover all 28 worlds to fill your atlas. Your journal stays on this device.

Travel starts a fresh expedition with restored supplies. Death preserves discoveries. Audio is optional and starts only when enabled.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open the local address printed by the server. For production validation:

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Architecture

React + TypeScript, Vite/Vinext, Three.js/WebGL2 with a Canvas compatibility view, SVG, Base UI primitives, Lucide icons. Fonts ship locally from `public/assets/fonts`. No external art or audio requests are needed.

| Module | Responsibility |
| --- | --- |
| `game/data.ts` | 28 historical snapshots, fauna, five regions, environmental profiles |
| `game/assets.ts` | Species/environment registries + paths for future `.glb` assets |
| `public/assets/` | Drop zone for animals, vegetation, environments, characters, maps, fonts |
| `game/World.tsx` | Lazy 3D loading and automatic Canvas compatibility view |
| `game/three/expedition.ts` | Camera, 3D movement, wildlife behavior, gameplay bridge and resource lifecycle |
| `game/three/environment.ts` | Instanced vegetation/rocks, terrain, water, lighting atmosphere |
| `game/three/assets.ts` | glTF loader, static instancing, skeleton cloning, animation crossfades |
| `game/three/models.ts` | Authored procedural 3D characters, species and plants |
| `scripts/asset-manifest.mjs` | Automatic asset indexing at startup/build |
| `game/vegetation.ts` | Cached procedural botanical artwork |
| `game/animals.ts` | Articulated species silhouettes |
| `game/useExpedition.ts` | State, time travel, encounters, progression, device-local saves |
| `game/events.ts` | 22 reusable encounters and choice consequences |
| `game/survival.ts` | Bounded stats and fictional survival model |
| `game/Timeline.tsx` | Dragging, scrolling, keyboard and checkpoint controls |
| `game/Map.tsx` | Schematic continental reconstructions |
| `game/Panels.tsx` | Field notes, journal, atlas, help, credits, decisions |
| `game/useWebMCP.ts` | Optional structured read and travel actions |

The 3D renderer uses one animation loop, instanced scenery, capped/adaptive pixel ratio and a single shadow map. It releases scene resources when changing habitats. The original renderer remains available for devices without WebGL2. Reduced-motion preferences suppress ambient movement. Inactive tabs pause stat depletion and audio. The data and survival logic have no React dependency.

See `ASTRA_3D_HANDOFF.md` for exact drop-in Blender filenames, scale/orientation, animation names, budgets and prioritized art requests. `npm run assets` refreshes the asset index after adding files.

## Science and interpretation

This is a stylized game, not a scientific simulation. Checkpoints represent selected ecosystems within broad eras, not exact geological boundaries. Organisms are regional representatives and are not claimed to coexist across every selectable region. Species shapes, temperatures and oxygen concentrations are simplified game parameters. The map communicates broad continental assembly and breakup; its shapes and location marker are schematic, especially in deep time.

The time-remaining readout forecasts active play time by replaying the same 1.5-second updates as the game until health reaches zero. It assumes no new choices, supplies, or travel; pausing, reading, and hidden tabs stop depletion. Air, regional temperature, resources, danger, condition, shelter, and knowledge affect the shared model. This is not a historical human life expectancy or a measured real-world survival prediction.

Each checkpoint introduces a distinct historical discovery. Encounter IDs are saved on this device and are not offered again, even after travel or a reload; wildlife observations are unique per species. Exhausted encounter pools do not restart. The Next world button visits an undiscovered checkpoint and stops once the atlas is complete; the timeline still allows intentional revisits.

References:

- [International Commission on Stratigraphy](https://stratigraphy.org/ICSchart/ChronostratChart2024-12.pdf)
- [Natural History Museum: Jurassic](https://www.nhm.ac.uk/discover/the-jurassic-period.html)
- [Natural History Museum: Cretaceous](https://www.nhm.ac.uk/discover/the-cretaceous-period.html)
- [Natural History Museum: origins of life](https://www.nhm.ac.uk/discover/origin-of-life-on-earth.html)

See `QA.md` for validation and known limits. All original source and procedural artwork are MIT licensed. Dependencies retain their respective licenses.
