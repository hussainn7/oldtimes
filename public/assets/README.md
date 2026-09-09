# Assets — Earth Through Time

Drop Astra / custom art here. The game falls back to procedural canvas art when a file is missing.

```
animals/        species .glb/.gltf  (id = species slug, see game/assets.ts)
vegetation/     plants, ferns, trees
environments/   period scene shells (id = period.id from game/data.ts)
terrain/        ground / rock kits
characters/     explorer
effects/        particles, weather
maps/           optional map overlays
ui/             icons, journal art
fonts/          bundled type (already present)
```

## Wire-up

1. Export model → `public/assets/animals/brachiosaurus.glb`
2. In `game/assets.ts`, set `model.src` on that species (or rely on `animalAssetPath(id)`).
3. Use `resolveExistingModel` from `game/loadAsset.ts` — `null` means keep procedural silhouette.
4. Prefer Y-up, meters, origin at feet. Scale via `model.scale`.
5. Clip names: `idle`, `walk`, `graze`, `flee`, `hunt`, `fly`, `swim`.

Period IDs and fauna live in `game/data.ts`. Registries: `buildSpeciesRegistry`, `buildEnvironmentRegistry`.
