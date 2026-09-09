import * as T from 'three';
import {
  mat,
  mesh,
  taper,
  ellipsoid,
  group,
  breathe,
  sway,
  gait,
  writeGlb,
  writeSidecar,
  countTris,
  mergeParts,
  tintGeometry,
  matVertex,
} from './lib.mjs';

const out = 'public/assets/animals/brachiosaurus.glb';
const bodyMat = matVertex('#6d7360', 0.9);
const bellyMat = matVertex('#8a8774', 0.92);
const hornMat = mat('#c9c0a8', 0.75);
const eyeMat = mat('#1a2218', 0.35);

const root = group('brachiosaurus');
const hip = group('hip');
root.add(hip);

const torsoGeo = tintGeometry(
  mergeParts([
    ellipsoid(0.5, 0.1, 0, 3.0, 1.65, 1.4, 18, 14),
    ellipsoid(2.4, 0.45, 0, 1.9, 1.55, 1.3, 16, 12),
    ellipsoid(1.6, 0.9, 0, 1.1, 0.7, 0.95, 12, 10),
    ellipsoid(-2.0, -0.1, 0, 1.8, 1.3, 1.15, 16, 12),
    ellipsoid(-0.2, -0.7, 0, 2.2, 0.85, 1.05, 14, 10),
  ]),
  '#6d7360',
  0.1,
);
hip.add(mesh(torsoGeo, bodyMat, 'torso'));
hip.add(
  mesh(
    tintGeometry(ellipsoid(0.3, -0.85, 0, 2.0, 0.55, 0.9, 14, 10), '#8a8774', 0.06),
    bellyMat,
    'belly',
  ),
);

const neck1 = group('neck1');
neck1.position.set(3.6, 1.0, 0);
hip.add(neck1);
neck1.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [0.8, 1.1, 0],
          [1.5, 2.4, 0],
          [2.1, 3.6, 0],
        ],
        [1.05, 0.85, 0.68, 0.55],
        12,
      ),
      '#6d7360',
    ),
    bodyMat,
    'neck1Mesh',
  ),
);

const neck2 = group('neck2');
neck2.position.set(2.1, 3.6, 0);
neck1.add(neck2);
neck2.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [0.45, 1.2, 0],
          [0.85, 2.5, 0],
          [1.15, 3.7, 0],
        ],
        [0.55, 0.46, 0.38, 0.3],
        12,
      ),
      '#707664',
    ),
    bodyMat,
    'neck2Mesh',
  ),
);

const neck3 = group('neck3');
neck3.position.set(1.15, 3.7, 0);
neck2.add(neck3);
neck3.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [0.25, 1.0, 0],
          [0.4, 2.0, 0],
          [0.5, 2.9, 0],
        ],
        [0.3, 0.25, 0.2, 0.16],
        11,
      ),
      '#747a68',
    ),
    bodyMat,
    'neck3Mesh',
  ),
);

const head = group('head');
head.position.set(0.55, 3.0, 0);
neck3.add(head);
head.add(
  mesh(
    tintGeometry(
      mergeParts([
        ellipsoid(0.4, 0.08, 0, 0.6, 0.35, 0.3, 12, 10),
        ellipsoid(0.85, 0.0, 0, 0.4, 0.24, 0.22, 10, 8),
        ellipsoid(0.2, 0.22, 0, 0.25, 0.18, 0.2, 8, 6),
      ]),
      '#7a806c',
    ),
    bodyMat,
    'skull',
  ),
);
head.add(mesh(ellipsoid(0.55, 0.32, 0, 0.14, 0.18, 0.11, 8, 6), hornMat, 'crest'));
for (const s of [-1, 1]) {
  head.add(
    mesh(ellipsoid(0.45, 0.14, s * 0.24, 0.055, 0.06, 0.04, 6, 5), eyeMat),
  );
}

const tail1 = group('tail1');
tail1.position.set(-3.4, 0.15, 0);
hip.add(tail1);
tail1.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [-1.4, -0.05, 0],
          [-2.8, -0.3, 0],
          [-4.3, -0.65, 0],
        ],
        [0.75, 0.55, 0.38, 0.22],
        11,
      ),
      '#6a705c',
    ),
    bodyMat,
    'tail1Mesh',
  ),
);
const tail2 = group('tail2');
tail2.position.set(-4.3, -0.65, 0);
tail1.add(tail2);
tail2.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [-1.6, -0.2, 0],
          [-3.2, -0.25, 0.1],
          [-4.8, -0.05, 0.15],
        ],
        [0.22, 0.14, 0.07, 0.025],
        10,
      ),
      '#656b57',
    ),
    bodyMat,
    'tail2Mesh',
  ),
);

function leg(name, x, z, fore) {
  const pivot = group(name);
  pivot.position.set(x, 0.2, z);
  hip.add(pivot);
  const upper = taper(
    [
      [0, 0, 0],
      [0.12, -0.9, 0],
      [0.18, -1.7, 0],
      [0.08, -2.55, 0],
    ],
    fore ? [0.48, 0.4, 0.32, 0.24] : [0.4, 0.34, 0.28, 0.2],
    10,
  );
  const foot = ellipsoid(0.14, -2.72, 0.06, 0.42, 0.2, 0.32, 10, 8);
  pivot.add(
    mesh(
      tintGeometry(mergeParts([upper, foot]), '#636956'),
      bodyMat,
      name + 'Mesh',
    ),
  );
  return pivot;
}

leg('legFL', 2.3, 0.9, true);
leg('legFR', 2.3, -0.9, true);
leg('legBL', -1.85, 0.8, false);
leg('legBR', -1.85, -0.8, false);
hip.position.y = 2.9;

const idle = new T.AnimationClip('Idle', 5, [
  breathe('hip', 0.018, 5),
  sway('neck1', 'z', 0.04, 5),
  sway('neck2', 'z', 0.05, 5, 0.4),
  sway('neck3', 'z', 0.035, 5, 0.8),
  sway('head', 'y', 0.05, 5, 1.2),
  sway('tail1', 'y', 0.06, 5, 0.2),
  sway('tail2', 'y', 0.08, 5, 0.6),
]);
const walk = new T.AnimationClip('Walk', 2.4, [
  gait('legFL', 0.28, 2.4, 0),
  gait('legFR', 0.28, 2.4, Math.PI),
  gait('legBL', 0.24, 2.4, Math.PI),
  gait('legBR', 0.24, 2.4, 0),
  sway('neck1', 'z', 0.05, 2.4),
  sway('tail1', 'y', 0.1, 2.4),
  breathe('hip', 0.01, 2.4),
]);
const browse = new T.AnimationClip('Browse', 6, [
  sway('neck1', 'z', 0.12, 6),
  sway('neck2', 'z', 0.14, 6, 0.3),
  sway('neck3', 'z', 0.1, 6, 0.6),
  sway('head', 'z', 0.08, 6, 1),
  breathe('hip', 0.015, 6),
]);
const look = new T.AnimationClip('Look', 4, [
  sway('neck2', 'y', 0.22, 4),
  sway('neck3', 'y', 0.18, 4, 0.2),
  sway('head', 'y', 0.25, 4, 0.4),
  breathe('hip', 0.012, 4),
]);

await writeGlb(root, out, [idle, walk, browse, look]);
writeSidecar(out, {
  scale: 1,
  offsetY: 0,
  rotationY: 0,
  periodIds: ['jurassic'],
  biomes: ['jurassic'],
  species: 'Brachiosaurus',
  triangles: countTris(root),
  textureSize: 0,
  clips: { idle: 'Idle', walk: 'Walk', graze: 'Browse', alert: 'Look' },
});
console.log('tris ~', countTris(root));
