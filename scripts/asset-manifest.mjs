import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('public/assets');
const models = {};
async function scan(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, file.name);
    if (file.isDirectory()) await scan(full);
    else if (/\.(glb|gltf)$/i.test(file.name)) {
      const rel = path.relative(root, full).replaceAll(path.sep, '/');
      const id = rel.replace(/\.(glb|gltf)$/i, '');
      if (!/^[a-z0-9/-]+$/.test(id))
        throw new Error(`Use lowercase hyphenated asset names: ${rel}`);
      let metadata = {};
      try {
        metadata = JSON.parse(
          await readFile(full.replace(/\.(glb|gltf)$/i, '.asset.json'), 'utf8'),
        );
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      for (const key of ['scale', 'offsetY', 'rotationY']) {
        if (
          metadata[key] !== undefined &&
          (!Number.isFinite(metadata[key]) ||
            (key === 'scale' && metadata[key] <= 0))
        )
          throw new Error(`Invalid ${key}: ${rel}`);
      }
      if (models[id]) throw new Error(`Duplicate asset ID: ${id}`);
      models[id] = { ...metadata, src: `/assets/${rel}` };
    }
  }
}
await scan(root);
await writeFile(
  path.join(root, 'manifest.json'),
  JSON.stringify({ version: 1, models }, null, 2) + '\n',
);
console.log(
  `Asset index: ${Object.keys(models).length} models. Unlisted models use built-in 3D forms.`,
);
