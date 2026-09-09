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

const out = 'public/assets/animals/allosaurus.glb';
const bodyMat = matVertex('#7c7656', 0.9);
const bellyMat = matVertex('#9a9478', 0.92);
const eyeMat = mat('#1c1810', 0.35);
const clawMat = mat('#2a2620', 0.7);

const root = group('allosaurus');
const hip = group('hip');
root.add(hip);

// bipedal theropod, hip height ~3.2m, faces +X
hip.add(
  mesh(
    tintGeometry(
      mergeParts([
        ellipsoid(0.2, 0.35, 0, 1.5, 0.7, 0.55, 14, 11),
        ellipsoid(-0.6, 0.25, 0, 1.0, 0.55, 0.45, 12, 10),
      ]),
      '#7c7656',
    ),
    bodyMat,
    'torso',
  ),
);
hip.add(
  mesh(
    tintGeometry(ellipsoid(0.15, -0.05, 0, 1.1, 0.35, 0.4, 12, 8), '#9a9478'),
    bellyMat,
    'belly',
  ),
);

const chest = group('chest');
chest.position.set(1.2, 0.45, 0);
hip.add(chest);
chest.add(
  mesh(
    tintGeometry(ellipsoid(0.3, 0.1, 0, 0.85, 0.55, 0.45, 12, 10), '#7c7656'),
    bodyMat,
    'chestMesh',
  ),
);

const neck = group('neck');
neck.position.set(0.85, 0.35, 0);
chest.add(neck);
neck.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [0.35, 0.35, 0],
          [0.55, 0.7, 0],
        ],
        [0.32, 0.26, 0.2],
        9,
      ),
      '#7c7656',
    ),
    bodyMat,
    'neckMesh',
  ),
);

const head = group('head');
head.position.set(0.6, 0.75, 0);
neck.add(head);
head.add(
  mesh(
    tintGeometry(
      mergeParts([
        ellipsoid(0.45, 0.05, 0, 0.7, 0.32, 0.28, 12, 9),
        ellipsoid(0.95, -0.02, 0, 0.4, 0.22, 0.2, 10, 7),
        // crest ridges
        ellipsoid(0.35, 0.28, 0.12, 0.2, 0.12, 0.06, 6, 5),
        ellipsoid(0.35, 0.28, -0.12, 0.2, 0.12, 0.06, 6, 5),
      ]),
      '#847e5e',
    ),
    bodyMat,
    'skull',
  ),
);
for (const s of [-1, 1]) {
  head.add(mesh(ellipsoid(0.55, 0.12, s * 0.22, 0.05, 0.055, 0.035, 6, 5), eyeMat));
}

const jaw = group('jaw');
jaw.position.set(0.55, -0.12, 0);
head.add(jaw);
jaw.add(
  mesh(
    tintGeometry(ellipsoid(0.4, 0, 0, 0.45, 0.12, 0.18, 10, 6), '#6e684c'),
    bodyMat,
    'jawMesh',
  ),
);

const tail1 = group('tail1');
tail1.position.set(-1.4, 0.25, 0);
hip.add(tail1);
tail1.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [-1.4, -0.05, 0],
          [-2.6, -0.2, 0],
        ],
        [0.4, 0.28, 0.16],
        10,
      ),
      '#7c7656',
    ),
    bodyMat,
  ),
);
const tail2 = group('tail2');
tail2.position.set(-2.6, -0.2, 0);
tail1.add(tail2);
tail2.add(
  mesh(
    tintGeometry(
      taper(
        [
          [0, 0, 0],
          [-1.5, -0.15, 0],
          [-2.8, 0.05, 0.1],
        ],
        [0.16, 0.08, 0.03],
        8,
      ),
      '#706a4e',
    ),
    bodyMat,
  ),
);

function arm(n, z) {
  const p = group(n);
  p.position.set(0.4, -0.15, z);
  chest.add(p);
  p.add(
    mesh(
      tintGeometry(
        mergeParts([
          taper(
            [
              [0, 0, 0],
              [0.15, -0.35, 0],
              [0.25, -0.55, 0],
            ],
            [0.1, 0.08, 0.05],
            6,
          ),
          ellipsoid(0.28, -0.6, 0, 0.08, 0.06, 0.05, 5, 4),
        ]),
        '#7c7656',
      ),
      bodyMat,
    ),
  );
}
arm('armL', 0.35);
arm('armR', -0.35);

function leg(n, z) {
  const p = group(n);
  p.position.set(-0.15, 0.1, z);
  hip.add(p);
  p.add(
    mesh(
      tintGeometry(
        mergeParts([
          taper(
            [
              [0, 0, 0],
              [0.1, -0.9, 0],
              [0.2, -1.7, 0],
              [0.15, -2.4, 0],
            ],
            [0.35, 0.28, 0.2, 0.14],
            9,
          ),
          ellipsoid(0.25, -2.55, 0.1, 0.35, 0.12, 0.22, 8, 6),
        ]),
        '#7c7656',
      ),
      bodyMat,
      n + 'Mesh',
    ),
  );
  p.add(mesh(ellipsoid(0.4, -2.55, 0.15, 0.08, 0.05, 0.12, 5, 4), clawMat));
}
leg('legL', 0.4);
leg('legR', -0.4);
hip.position.y = 2.7;

const idle = new T.AnimationClip('Idle', 4, [
  breathe('hip', 0.02, 4),
  sway('tail1', 'y', 0.06, 4),
  sway('head', 'y', 0.05, 4),
  sway('jaw', 'z', 0.03, 4),
]);
const walk = new T.AnimationClip('Walk', 1.2, [
  sway('legL', 'z', 0.35, 1.2, 0),
  sway('legR', 'z', 0.35, 1.2, Math.PI),
  sway('tail1', 'y', 0.12, 1.2),
  sway('chest', 'y', 0.04, 1.2),
  breathe('hip', 0.01, 1.2),
]);
const alert = new T.AnimationClip('Alert', 3, [
  sway('head', 'y', 0.28, 3),
  sway('neck', 'y', 0.15, 3, 0.2),
  sway('tail1', 'y', 0.08, 3),
  breathe('hip', 0.015, 3),
]);

await writeGlb(root, out, [idle, walk, alert]);
writeSidecar(out, {
  scale: 1,
  offsetY: 0,
  rotationY: 0,
  periodIds: ['jurassic'],
  species: 'Allosaurus',
  triangles: countTris(root),
  textureSize: 0,
  clips: { idle: 'Idle', walk: 'Walk', alert: 'Alert' },
});
console.log('tris ~', countTris(root));
