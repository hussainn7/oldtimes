# Interface and expedition updates — 2026-09-11

- Reduced landscape captions and duplicate control text; enlarged timeline, region, and status labels. Historical details remain in field notes and discoveries.
- Survival time is a static estimate in hours or days, not a running game clock or real-world lifespan. Regression checks cover all 28 checkpoints × 5 regions with fresh and depleted supplies, including lethal conditions and zero health.
- Historical discoveries are unique per checkpoint. Seen event IDs persist across travel and reload; exhausted pools stay exhausted. Next world selects an unvisited checkpoint and stops when all worlds are visited.
- Browser checks completed all 28 historical discoveries and verified the disabled Atlas complete state. A reload preserved the journal and offered a different encounter. Desktop (1440×900) and phone (390×844) bounds fit the viewport; movement controls retain 44px touch targets. No browser console errors were observed.
- Corrected timeline era jumps and differentiated volcanic extinction from asteroid aftermath. References remain accessible in Science & credits.

The earlier renderer validation below is retained as historical context; it is not a claim that every previous graphics benchmark was rerun for this update.

# Astra 3D validation — 2026-09-09

## Result

The existing expedition has been upgraded to a functional, stylized 3D world. Gameplay was preserved behind its original state interface. Validation was performed locally with Chromium/Playwright and a built production Worker preview.

| Check | Result |
|---|---|
| TypeScript | `npx tsc --noEmit` passes |
| Lint | `npm run lint` passes |
| Gameplay / terrain / collision / asset membership | `npm test`: 9 tests pass |
| Production build | `npm run build` passes |
| Every historical checkpoint | All 28 render, have matching species counts, and reset route position |
| Major visual habitats | Volcano, ocean, swamp, desert, Jurassic forest, flowering forest, ash, savanna, ice and modern world inspected |
| Regions | All five render and remain selectable; environmental/survival modifiers preserved |
| Movement | WASD changes both axes; acceleration and stopping; pointer-held touch controls; collision bounds tested |
| Camera | Drag orbit, zoom controls, recenter; portrait framing pulled back to keep nearby large wildlife in view |
| Encounters | E opens choices; choosing applies consequences; continuing resumes movement |
| Pause | Pause and dialogs stop movement; resume works |
| Journal | Entries and all 28 discoveries survive reload |
| Responsive layout | 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 320×740, 844×390; no horizontal overflow; controls remain in layout |
| Reduced motion | Supported; ambient motion, camera smoothing and character bobbing suppressed |
| Repeated era changes | GPU geometry counts remained `38, 38, 38, 38, 38, 38` across alternating ice/Jurassic passes |
| Imported assets | Valid glTF, binary GLB, animated character clips, static plant instancing, corrupt/missing files and late loads exercised |
| Graphics fallback | Initial lack of WebGL2 and forced context loss use the original Canvas renderer; movement and encounters remain available |
| Runtime / console | No unexpected errors or warnings in the full gameplay pass or production smoke test |

## Measured performance

The default Jurassic production scene measured approximately **59–60 fps**, **64 render calls**, **394k rendered triangles including shadow passes**, and **38 GPU geometries** in local Chromium. These are observations on this machine, not guarantees for phones. Most scenery is instanced. Pixel density adapts downward after sustained slow frames; hidden tabs stop simulation and rendering work.

The independently loaded 3D chunk is approximately **170 KB gzip** (669 KB minified), including Three.js, glTF loading and Meshopt support. The old 2D world is a separate ~6 KB gzip fallback chunk. No model or texture downloads occur with the default procedural assets. Existing fonts and UI dependencies are preserved.

Vite emits its standard advisory about the >500 KB minified 3D chunk. It is already loaded independently; this is a bundle-size advisory, not a build/runtime failure. Vinext also emits its existing static route-classification notice.

## Reproduction

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
# With the game preview already running at http://localhost:3000:
node scripts/qa-3d-full.mjs
node scripts/qa-3d-assets.mjs
# In another terminal, for the built production preview:
npm start -- --port 4173
node scripts/qa-3d-production.mjs
```

Screenshots and structured results are stored under `.qa-shots/`; the full run writes `3d-report.json`. The asset tests intercept requests with tiny valid models, so no fixture model is accidentally shipped in the real asset manifest.

## Art and hardware limits

Wildlife and plants are recognizable stylized forms, with simplified anatomy and behavior. The highest-impact replacements and precise export requirements are in `ASTRA_3D_HANDOFF.md`. Early forests still use a generalized tree silhouette; a period-specific Carboniferous grove is prioritized there. Marine creatures are presented in shallow water for observation. There is no swimming-player mechanic.

Imported environment models are additive distant scenery, not walkable terrain or collision meshes. Static instanced vegetation cannot use skeletal animation. Draco and KTX2 require future decoder configuration; plain glTF/GLB and Meshopt are supported now. Asset budgets are documented targets, not automatic optimization of arbitrary incoming files.

Responsive behavior was exercised in browser viewports; physical iOS/Android GPU, thermal and battery profiling was not performed. The existing local preview remains available. No live site publication or access changes were requested or performed.
