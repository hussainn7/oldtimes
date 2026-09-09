import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
// A tiny valid glTF tests the real loader, geometry replacement, and animation mixer.
const bytes = Buffer.alloc(68);
new Float32Array(bytes.buffer, bytes.byteOffset, 17).set([
  -0.5, 0, 0, 0.5, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0.1, 0,
]);
const gltf = {
  asset: { version: '2.0' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Fixture' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
  materials: [
    {
      pbrMetallicRoughness: {
        baseColorFactor: [0.7, 0.4, 0.1, 1],
        metallicFactor: 0,
        roughnessFactor: 1,
      },
    },
  ],
  buffers: [
    {
      uri: `data:application/octet-stream;base64,${bytes.toString('base64')}`,
      byteLength: bytes.length,
    },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: 36 },
    { buffer: 0, byteOffset: 36, byteLength: 8 },
    { buffer: 0, byteOffset: 44, byteLength: 24 },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 3,
      type: 'VEC3',
      min: [-0.5, 0, 0],
      max: [0.5, 1, 0],
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: 2,
      type: 'SCALAR',
      min: [0],
      max: [1],
    },
    { bufferView: 2, componentType: 5126, count: 2, type: 'VEC3' },
  ],
};
const animated = {
  ...gltf,
  animations: [
    {
      name: 'Idle',
      samplers: [{ input: 1, output: 2, interpolation: 'LINEAR' }],
      channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
    },
  ],
};
function asGlb(document) {
  const json = Buffer.from(
    JSON.stringify({ ...document, buffers: [{ byteLength: bytes.length }] }),
  );
  const padding = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(padding, 32)]);
  const out = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + bytes.length);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonChunk.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(out, 20);
  out.writeUInt32LE(bytes.length, 20 + jsonChunk.length);
  out.writeUInt32LE(0x004e4942, 24 + jsonChunk.length);
  bytes.copy(out, 28 + jsonChunk.length);
  return out;
}
for (const mode of ['valid', 'glb', 'broken', 'missing', 'late']) {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/assets/manifest.json', (route) =>
    route.fulfill({
      json: {
        version: 1,
        models:
          mode === 'late'
            ? {
                'animals/brachiosaurus': { src: '/assets/fixture-animal.gltf' },
              }
            : {
                'characters/explorer': {
                  src:
                    mode === 'glb'
                      ? '/assets/fixture-character.glb'
                      : '/assets/fixture-character.gltf',
                },
                'vegetation/conifer': {
                  src:
                    mode === 'glb'
                      ? '/assets/fixture-conifer.glb'
                      : '/assets/fixture-conifer.gltf',
                },
              },
      },
    }),
  );
  await page.route('**/assets/fixture-*', async (route) => {
    if (mode === 'late') await new Promise((r) => setTimeout(r, 2500));
    await route.fulfill({
      status: mode === 'missing' ? 404 : 200,
      contentType: mode === 'glb' ? 'model/gltf-binary' : 'model/gltf+json',
      body:
        mode === 'broken'
          ? 'broken glTF'
          : mode === 'glb'
            ? asGlb(route.request().url().includes('conifer') ? gltf : animated)
            : JSON.stringify(
                route.request().url().includes('conifer') ? gltf : animated,
              ),
    });
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      document.querySelector('canvas.world-3d')?.dataset.period === 'jurassic',
  );
  if (mode === 'late') {
    await page.getByRole('button', { name: 'Begin journey' }).click();
    await page.locator('.timeline-strip button').nth(20).click();
    await page.waitForTimeout(3000);
    assert.equal(
      await page.locator('canvas.world-3d').getAttribute('data-loaded-models'),
      '0',
    );
  } else {
    await page.waitForFunction(
      (mode) =>
        Number(
          document.querySelector('canvas.world-3d')?.dataset[
            mode === 'valid' || mode === 'glb' ? 'loadedModels' : 'failedModels'
          ],
        ) === 2,
      mode,
    );
    assert.equal(
      await page.locator('canvas.world-3d').getAttribute('data-period'),
      'jurassic',
    );
  }
  assert.deepEqual(errors, []);
  console.log('asset', mode, 'passed');
  await page.close();
}
await browser.close();
