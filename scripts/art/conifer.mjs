import * as T from 'three';
import {
  mat,
  mesh,
  taper,
  ellipsoid,
  group,
  writeGlb,
  writeSidecar,
  countTris,
  mergeParts,
  tintGeometry,
  matVertex,
} from './lib.mjs';

const out = 'public/assets/vegetation/conifer.glb';
const barkMat = matVertex('#5a4e3c', 0.95);
const needleMat = matVertex('#335e43', 0.88);

const root = group('conifer');
const trunk = tintGeometry(
  taper(
    [
      [0, 0, 0],
      [0.02, 1.8, 0.01],
      [-0.03, 4.2, -0.02],
      [0.01, 6.6, 0],
      [0, 8.2, 0],
    ],
    [0.28, 0.22, 0.16, 0.1, 0.04],
    7,
  ),
  '#5a4e3c',
  0.12,
);
root.add(mesh(trunk, barkMat, 'trunk'));

// Asymmetric layered needle masses — readable at 12–32 m
const needles = [];
const layers = [
  { y: 2.4, r: 1.85, h: 1.9, lean: 0.12 },
  { y: 3.5, r: 1.65, h: 1.7, lean: -0.08 },
  { y: 4.5, r: 1.4, h: 1.55, lean: 0.1 },
  { y: 5.4, r: 1.15, h: 1.4, lean: -0.06 },
  { y: 6.2, r: 0.9, h: 1.25, lean: 0.05 },
  { y: 6.9, r: 0.62, h: 1.1, lean: -0.04 },
  { y: 7.5, r: 0.38, h: 0.95, lean: 0.02 },
];

for (let i = 0; i < layers.length; i++) {
  const L = layers[i];
  const cone = new T.ConeGeometry(L.r * 0.92, L.h, 7, 1, true)
    .translate(L.lean, L.y + L.h * 0.35, L.lean * 0.4);
  needles.push(cone);
  for (let j = 0; j < 7; j++) {
    const a = j * 0.95 + i * 0.55 + (i % 2) * 0.35;
    const br = L.r * (0.5 + (j % 3) * 0.12);
    const tuft = new T.ConeGeometry(br * 0.5, L.h * 0.5, 6, 1, true)
      .rotateZ(0.5 + (j % 3) * 0.1)
      .translate(br * 0.8, 0, 0)
      .rotateY(a)
      .translate(L.lean * 0.5, L.y + L.h * 0.12 + (j % 2) * 0.08, 0);
    needles.push(tuft);
    if (j % 2 === 0 && i < 5) {
      const twig = new T.ConeGeometry(br * 0.28, L.h * 0.35, 5, 1, true)
        .rotateZ(0.75)
        .translate(br * 1.05, 0, 0)
        .rotateY(a + 0.35)
        .translate(0, L.y + L.h * 0.2, 0);
      needles.push(twig);
    }
  }
}
// crown tip
needles.push(new T.ConeGeometry(0.22, 0.7, 6).translate(0, 8.15, 0));

root.add(
  mesh(tintGeometry(mergeParts(needles), '#335e43', 0.1), needleMat, 'needles'),
);

// low branch snag for silhouette interest
root.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0.05, 2.1, 0],
          [0.7, 2.35, 0.35],
          [1.15, 2.2, 0.55],
        ],
        [0.07, 0.045, 0.02],
        5,
      ),
      '#5a4e3c',
    ),
    barkMat,
    'snag',
  ),
);

await writeGlb(root, out);
writeSidecar(out, {
  scale: 1,
  offsetY: 0,
  rotationY: 0,
  periodIds: ['jurassic', 'cretaceous', 'triassic'],
  biomes: ['jurassic', 'ice', 'early-forest'],
  triangles: countTris(root),
  textureSize: 0,
});
console.log('tris ~', countTris(root));
