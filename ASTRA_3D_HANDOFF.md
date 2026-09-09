# ASTRA 3D handoff

## What is implemented

The existing game was upgraded in place. `World.tsx` is a lazy-loaded Three.js adapter around the original `WorldHandle`, with the original canvas world retained in `World2D.tsx` for unavailable/lost WebGL contexts. Timeline, 28 checkpoints, five regions, survival model, event choices, maps, journal, local saves, and optional WebMCP actions remain in their existing modules.

The compact playable valley is 120 × 22 rendering metres, with terrain extending beyond it to create a horizon. WASD/arrow keys and four touch buttons move relative to the camera. Shift accelerates, dragging orbits, the wheel zooms, and R recenters. Movement accelerates/decelerates, turns smoothly, follows terrain, and slides around trunks/boulders. Wildlife grazes, wanders, becomes alert, retreats, flies, or swims according to the existing species records. Proximity feeds the original encounter system. Era changes rebuild vegetation, geology, wildlife, lighting and weather beneath the existing travel transition.

The old expedition distance scale is deliberately retained: `WorldHandle.x` and distance use legacy route units (50 per rendering metre), while optional `WorldHandle.z` uses rendering metres. This preserves encounter frequency, timeline resets, progression, and saved journals. The distance display is expedition progress, not a physically surveyed valley length.

No downloaded models or generated raster artwork are required. Hero assets for the priority list below are authored in Blender (`art/build_assets.py`, sources in `art/source/*.blend`) and exported as drop-in `.glb` files under `public/assets/`. Rebuild with `blender -b --python art/build_assets.py -- brachiosaurus conifer explorer …`. Unlisted species keep lightweight procedural forms from `game/three/models.ts`. The assets below replace them directly.

## Drop-in contract

1. Export a self-contained **glTF 2.0 `.glb`** into the exact path in the table. Plain `.gltf` with local `.bin`/image dependencies is also supported. Use lowercase kebab-case names. Do not ship both formats with the same basename.
2. Use metres, apply rotation/scale, and place the origin at ground contact. Final glTF is **Y up**. Explorer faces **+Z**; animals face **+X**. Verify exported orientation rather than relying on Blender's viewport axes. Sidecar `rotationY` is in radians.
3. Export `MeshStandardMaterial`-compatible metallic/roughness PBR. Most organic surfaces should have metalness 0, roughness 0.65–1. Use baked AO, restrained normals, and opaque foliage geometry when possible. Avoid transmission, subdivision, particle systems, runtime modifiers, excessive material slots, and multi-layer transparency.
4. Use 1K textures for hero animals/player, 512px for repeated plants/rocks; reserve 2K for one exceptional close-up asset. Prefer shared atlases, packed ORM, embedded PNG/JPEG. Current runtime supports **Meshopt** compression locally; **Draco and KTX2 require additional decoders and are not enabled**. Do not export those formats into this pipeline yet.
5. Add an optional `<basename>.asset.json` next to the model. Run `npm run assets` and refresh the preview, or restart `npm run dev`. Both development startup and production build regenerate `public/assets/manifest.json`. Geometry automatically remains visible until its replacement is ready. Unlisted assets trigger no model requests. Missing, corrupt, or unsupported models retain their built-in form; late loads cannot attach to an era that has been left.
6. Static vegetation and boulders are instanced from the model's mesh/material parts. Keep them unskinned and animation-free, with 1–2 materials. Per-instance animated vegetation is intentionally unsupported; keep wind subtle in baked silhouettes. Character and animal animation clips are handled with crossfades and independent skeletons.

Example `public/assets/animals/brachiosaurus.asset.json`:

```json
{
  "scale": 1,
  "offsetY": 0,
  "rotationY": 0,
  "periodIds": ["jurassic"],
  "biomes": ["jurassic"],
  "species": "Brachiosaurus",
  "triangles": 12000,
  "textureSize": 1024,
  "clips": { "idle": "Idle", "walk": "Walk", "graze": "Browse", "alert": "Look" }
}
```

Scale, vertical offset, forward correction, and clip aliases are runtime settings. Era/biome/species and budget fields are descriptive metadata; gameplay's period/species registry remains authoritative. Missing requested animation states fall back to idle, then the first available clip. Clips are **in-place**, with no root translation. Default state names are `idle`, `walk`, `run`, `graze`, `alert`, `flee`, `fly`, and `swim` (case-insensitive). An unanimated model remains valid.

## Highest-impact Blender assets, in order

Triangle budgets below are per asset, before instancing. These are production targets, not automatic limits. Keep the active habitat's downloaded model/textures under approximately 8 MB; aim for <2 MB per hero and <250 KB per repeated plant. Model detail should read from the game's 12–32 m desktop camera distance (portrait framing pulls back farther).

| Priority | Exact public path | Era / biome and use | Recommended scale and complexity | Animation clips |
|---|---|---|---|---|
| 1 | `public/assets/animals/brachiosaurus.glb` | `jurassic`; opening hero, river clearing | 8–10 m head height, 18–22 m length; 10–16k triangles; 1 × 1K atlas; 1–2 materials; 35–50 bones. Emphasize shoulder mass, forelimbs, neck taper and small head. | Idle/breathe, slow walk, canopy browse, look/alert; 3–8 s seamless loops |
| 2 | `public/assets/vegetation/conifer.glb` | Jurassic, Cretaceous, Triassic, ice, early-forest visual fallback; most frequent silhouette | 7–9 m high, radius ≤2.2 m, trunk radius ≤0.4 m; 900–1,600 triangles; shared 512px atlas; ≤2 materials. Asymmetric branching, layered needle masses. | None; rigid instancing |
| 3 | `public/assets/characters/explorer.glb` | Every era; player | 1.85–1.95 m including hat, footprint radius ≤0.3 m; 5–8k triangles; 1K atlas; 20–35 bones. Readable hat, backpack, rolled blanket, boots. | Idle, walk (3.6 m/s), run (5.4 m/s); in-place loops |
| 4 | `public/assets/vegetation/fern.glb` | Jurassic, swamp, flowering woodland, modern undergrowth | 0.9–1.2 m high, radius ≤1.0 m; 250–600 triangles; one 512px atlas/material. Curved stems and broad fronds, avoid spike-like leaves. | None |
| 5 | `public/assets/terrain/river-boulder.glb` | All habitats; repeated river rocks and route obstacles | Base unit radius 1 m; 120–350 triangles; 512px tiling/shared atlas; one material. Runtime scales the shape; preserve the origin and footprint. | None |
| 6 | `public/assets/animals/early-mammoth.glb` | `pleistocene`, ice | 3.4–4.0 m shoulder height; 8–12k triangles; 1K atlas; 30–45 bones. Hair through silhouette/normal map, no fur cards. | Idle, walk, graze, alert; trunk secondary motion |
| 7 | `public/assets/animals/steppe-mammoth.glb` | `million`, ice | 3.8–4.5 m shoulder height; same budget and rig as early mammoth; different skull/tusks. | Idle, walk, graze, alert |
| 8 | `public/assets/animals/woolly-mammoth.glb` | `human-world`, ice | 3.0–3.4 m shoulder height; reuse mammoth atlas/rig; distinct sloped back, fur fringe, curved tusks. | Idle, walk, graze, alert |
| 9 | `public/assets/animals/allosaurus.glb` | `jurassic`; predator | 3–3.5 m hip height; 8–12k triangles; 1K atlas. Balanced tail, correctly proportioned jaw and forelimbs. | Idle, walk, alert; restrained head turn, no attack required |
| 10 | `public/assets/vegetation/acacia.glb` | `miocene`, `pliocene`, `sapiens`; savanna | 5–6.5 m high, canopy radius ~3 m, trunk radius ≤0.4 m; 700–1,300 triangles; 512px atlas. Flat asymmetric crown. | None |
| 11 | `public/assets/vegetation/broadleaf.glb` | `eocene`, `holocene`, `civilization`, `industrial`, `today` | 6–8 m high, radius ~3 m; 1–2k triangles; 512px atlas; two materials maximum. | None |
| 12 | `public/assets/animals/trilobite.glb` | `cambrian`, `ordovician`; marine shallows | 0.5–0.7 m long stylized visible representative; 1–2k triangles; 512px atlas; articulated axis/legs. | Idle, swim (or shallow crawling loop) |
| 13 | `public/assets/animals/radiodont.glb` | `cambrian`; swimming predator | ~1 m long; 2–4k triangles; 512px atlas; lateral flaps, frontal appendages. | Swim, alert; no terrestrial gait |
| 14 | `public/assets/animals/stegosaurus.glb` | `jurassic`; grazing herbivore | 2.5–3 m back height, 7–9 m long; 6–9k triangles; 1K atlas; emphasize plates and tail spikes. | Idle, walk, graze, alert |
| 15 | `public/assets/vegetation/dead.glb` | `great-dying`, `impact`; ash | 5–7 m high; 250–500 triangles; 512px atlas; broken branch silhouettes. | None |

Verify exact species spelling against `game/data.ts` / `speciesAssets`: filenames come from lowercase species names with non-alphanumeric runs replaced by hyphens. The runtime uses all existing species memberships, including shared species across checkpoints. Do not rename gameplay species to accommodate a model filename.

## Shipped hero art (priority 1–9)

Blender vertex-painted PBR meshes with in-place animation clips where listed. Rebuild anytime via `art/build_assets.py`. Approximate shipped budgets:

| Asset | Path | Tris (approx) | Notes |
|---|---|---|---|
| Brachiosaurus | `animals/brachiosaurus.glb` | ~13k | Skinned; Idle/Walk/Browse/Look |
| Conifer | `vegetation/conifer.glb` | ~1.3k | Instanced; asymmetric layers |
| Explorer | `characters/explorer.glb` | ~2.7k | Skinned; Idle/Walk/Run |
| Fern | `vegetation/fern.glb` | ~1.1k | Instanced undergrowth |
| River boulder | `terrain/river-boulder.glb` | ~280 | Instanced; runtime-scaled |
| Early / steppe / woolly mammoth | `animals/*-mammoth.glb` | ~10k each | Skinned; Idle/Walk/Graze/Alert |
| Allosaurus | `animals/allosaurus.glb` | ~10k | Skinned; Idle/Walk/Alert |

Physical mobile-device profiling and further anatomical sculpt detail remain follow-up art work; the game runs without additional models beyond these.

## Environment landmarks after the hero pass

Environment exports are **additive scenery**; they do not replace collision/terrain geometry. Each is placed at the world origin, metre-scaled. Author visible features in X=0…125 and Z=-35…-100, keeping the playable corridor X=2…122 / Z=-9…13 empty. Terrain and water remain procedural. Environment collision meshes are not imported. Use no cameras or lights in these exports.

| Exact path | Contents / era | Budget | Animation |
|---|---|---|---|
| `public/assets/environments/formation.glb` | Hadean basalt escarpment and crater beyond the lava channel, strongest feature around (45, 0, -85) | 5–10k triangles; 1K atlas; emissive lava mask | Optional slow emissive animation; no physics |
| `public/assets/environments/carboniferous.glb` | Recognizable scale-tree trunks, horsetails and lycopsid grove; replace generic visual impression of conifers with an additive distant grove | 8–14k triangles total; one shared 1K atlas | None |
| `public/assets/environments/pleistocene.glb` | Layered glacial face with blue fissures and lateral moraine | 4–8k triangles; one 1K atlas | None |
| `public/assets/environments/cambrian.glb` | Stromatolite/reef shelf visible through shallow water; no modern coral or terrestrial vegetation | 3–5k triangles; 512px atlas | None |
| `public/assets/environments/today.glb` | Distant contemporary settlement integrated into hills beyond the forest | 3–6k triangles; 512px atlas | None |

For new vegetation *classes* beyond the existing keys, add the class selection once in `game/three/environment.ts`; this is visual configuration only. Animal, explorer, existing vegetation, rock, and period landmark replacements require no gameplay edits.

## Performance and ownership

- One animation loop, no React updates per frame; gameplay/proximity UI reports four times per second.
- Terrain/vegetation generated once per era/region, static plants/rocks/grass instanced.
- One directional shadow map at 1024px, one hemisphere light, fog/sky/waves/particles; no postprocessing stack.
- Pixel ratio starts capped at 1.5 desktop / 1.25 narrow screens, steps down to 0.85 after sustained slow frames.
- Hidden pages freeze simulation; dialogs and pause freeze movement and wildlife. Reduced motion disables ambient geometry movement and smoothing/bobbing.
- GPU resources and animation mixers are disposed on era changes/unmount/context loss. Async models are cached only within the current habitat.
- Production 3D code loads separately from the game UI. The 2D compatibility renderer loads only if needed.

## Verification

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. With the existing preview running at localhost:3000, run `node scripts/qa-3d-full.mjs` for every checkpoint, regions, interactions, responsive sizes, persistence, reduced motion, repeated transitions and context loss. Run `node scripts/qa-3d-assets.mjs` for valid glTF/GLB geometry and animations, missing/corrupt imports, static instancing and late-load disposal. Screenshots and the integration report are under `.qa-shots/`.

See `QA.md` for the measured result and remaining limits. Priority hero meshes (brachiosaurus through allosaurus) now ship from the Blender art pipeline; remaining species and landmarks still use procedural forms until authored.
