# Astra assets

The game runs immediately with built-in 3D terrain, characters, wildlife and plants. Blender models can replace the visual forms without changing gameplay.

- Use glTF 2.0 `.glb` (preferred) or `.gltf` with local dependencies.
- Place models in these folders with lowercase kebab-case names.
- Run `npm run assets` after adding files and refresh the page. Startup/build also runs this automatically.
- Optional `name.asset.json` sidecars supply `scale`, `offsetY`, `rotationY`, clip aliases and era/biome/species metadata.
- Missing/unlisted/corrupt models retain the built-in form; no speculative requests are made for unlisted files.
- See `ASTRA_3D_HANDOFF.md` at the repository root for exact names, modelling specifications, export conventions and runtime limitations.

Examples: `characters/explorer.glb`, `animals/brachiosaurus.glb`, `vegetation/conifer.glb`, `terrain/river-boulder.glb`, `environments/jurassic.glb`.

The generated `manifest.json` indexes real files only. Do not manually add model entries to it.
