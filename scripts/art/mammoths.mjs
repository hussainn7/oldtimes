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

function buildMammoth({
  name,
  out,
  shoulder,
  color,
  tuskCurve,
  backSlope,
  fringe,
  species,
  periodIds,
}) {
  const bodyMat = matVertex(color, 0.92);
  const tuskMat = mat('#e8dcc0', 0.55);
  const eyeMat = mat('#1a1814', 0.4);
  const root = group(name);
  const hip = group('hip');
  root.add(hip);

  const bodyH = shoulder * 0.55;
  hip.add(
    mesh(
      tintGeometry(
        mergeParts([
          ellipsoid(0.2, bodyH * 0.15, 0, 1.7, bodyH * 0.55, 1.15, 16, 12),
          ellipsoid(0.9, bodyH * 0.35 + backSlope, 0, 1.2, bodyH * 0.5, 1.05, 14, 11),
          ellipsoid(-1.1, bodyH * 0.05, 0, 1.1, bodyH * 0.45, 0.95, 14, 11),
        ]),
        color,
        0.1,
      ),
      bodyMat,
      'torso',
    ),
  );
  if (fringe) {
    hip.add(
      mesh(
        tintGeometry(
          ellipsoid(0.1, -0.15, 0, 1.6, 0.45, 1.2, 12, 8),
          '#5c4a36',
          0.12,
        ),
        matVertex('#5c4a36', 0.95),
        'fringe',
      ),
    );
  }

  const head = group('head');
  head.position.set(2.0, bodyH * 0.85, 0);
  hip.add(head);
  head.add(
    mesh(
      tintGeometry(
        mergeParts([
          ellipsoid(0.35, 0.15, 0, 0.7, 0.55, 0.55, 12, 10),
          ellipsoid(0.85, -0.05, 0, 0.45, 0.35, 0.4, 10, 8),
        ]),
        color,
      ),
      bodyMat,
      'skull',
    ),
  );
  // ears
  for (const s of [-1, 1]) {
    head.add(
      mesh(
        tintGeometry(
          ellipsoid(0.1, 0.15, s * 0.55, 0.2, 0.45, 0.08, 8, 6),
          color,
        ),
        bodyMat,
      ),
    );
    head.add(mesh(ellipsoid(0.55, 0.1, s * 0.35, 0.05, 0.05, 0.035, 6, 5), eyeMat));
  }

  const trunk = group('trunk');
  trunk.position.set(1.15, -0.15, 0);
  head.add(trunk);
  trunk.add(
    mesh(
      tintGeometry(
        taper(
          [
            [0, 0, 0],
            [0.15, -0.7, 0],
            [0.35, -1.4, 0],
            [0.55, -1.85, 0.05],
          ],
          [0.28, 0.22, 0.15, 0.08],
          9,
        ),
        color,
      ),
      bodyMat,
      'trunkMesh',
    ),
  );

  for (const s of [-1, 1]) {
    const tusk = group(s < 0 ? 'tuskL' : 'tuskR');
    tusk.position.set(0.7, -0.25, s * 0.28);
    head.add(tusk);
    tusk.add(
      mesh(
        taper(
          [
            [0, 0, 0],
            [0.55, -0.35, s * 0.15],
            [1.1, -0.15 * tuskCurve, s * 0.25],
            [1.35, 0.35 * tuskCurve, s * 0.2],
          ],
          [0.12, 0.1, 0.07, 0.03],
          7,
        ),
        tuskMat,
        tusk.name + 'Mesh',
      ),
    );
  }

  const tail = group('tail');
  tail.position.set(-2.0, bodyH * 0.3, 0);
  hip.add(tail);
  tail.add(
    mesh(
      tintGeometry(
        taper(
          [
            [0, 0, 0],
            [-0.4, -0.35, 0],
            [-0.55, -0.85, 0],
          ],
          [0.12, 0.07, 0.03],
          6,
        ),
        color,
      ),
      bodyMat,
    ),
  );

  function leg(n, x, z) {
    const p = group(n);
    p.position.set(x, 0.1, z);
    hip.add(p);
    p.add(
      mesh(
        tintGeometry(
          mergeParts([
            taper(
              [
                [0, 0, 0],
                [0.05, -shoulder * 0.35, 0],
                [0.02, -shoulder * 0.72, 0],
              ],
              [0.38, 0.3, 0.22],
              8,
            ),
            ellipsoid(0.05, -shoulder * 0.78, 0.05, 0.32, 0.16, 0.28, 8, 6),
          ]),
          color,
        ),
        bodyMat,
        n + 'Mesh',
      ),
    );
  }
  leg('legFL', 1.1, 0.7);
  leg('legFR', 1.1, -0.7);
  leg('legBL', -1.0, 0.65);
  leg('legBR', -1.0, -0.65);
  hip.position.y = shoulder * 0.82;

  const idle = new T.AnimationClip('Idle', 5, [
    breathe('hip', 0.02, 5),
    sway('trunk', 'x', 0.08, 5),
    sway('head', 'y', 0.04, 5),
    sway('tail', 'y', 0.1, 5),
  ]);
  const walk = new T.AnimationClip('Walk', 1.8, [
    gait('legFL', 0.28, 1.8, 0),
    gait('legFR', 0.28, 1.8, Math.PI),
    gait('legBL', 0.24, 1.8, Math.PI),
    gait('legBR', 0.24, 1.8, 0),
    sway('trunk', 'x', 0.06, 1.8),
    sway('head', 'z', 0.04, 1.8),
  ]);
  const graze = new T.AnimationClip('Graze', 5, [
    sway('head', 'z', 0.15, 5),
    sway('trunk', 'x', 0.2, 5),
    breathe('hip', 0.015, 5),
  ]);
  const alert = new T.AnimationClip('Alert', 3.5, [
    sway('head', 'y', 0.25, 3.5),
    sway('trunk', 'y', 0.1, 3.5),
    breathe('hip', 0.012, 3.5),
  ]);

  return {
    root,
    clips: [idle, walk, graze, alert],
    meta: {
      scale: 1,
      offsetY: 0,
      rotationY: 0,
      periodIds,
      species,
      triangles: countTris(root),
      textureSize: 0,
      clips: { idle: 'Idle', walk: 'Walk', graze: 'Graze', alert: 'Alert' },
    },
    out,
  };
}

const variants = [
  buildMammoth({
    name: 'early-mammoth',
    out: 'public/assets/animals/early-mammoth.glb',
    shoulder: 3.7,
    color: '#7a6a52',
    tuskCurve: 0.7,
    backSlope: 0.15,
    fringe: false,
    species: 'Early mammoth',
    periodIds: ['pleistocene'],
  }),
  buildMammoth({
    name: 'steppe-mammoth',
    out: 'public/assets/animals/steppe-mammoth.glb',
    shoulder: 4.2,
    color: '#6e614c',
    tuskCurve: 0.55,
    backSlope: 0.05,
    fringe: false,
    species: 'Steppe mammoth',
    periodIds: ['million'],
  }),
  buildMammoth({
    name: 'woolly-mammoth',
    out: 'public/assets/animals/woolly-mammoth.glb',
    shoulder: 3.2,
    color: '#5c4e3c',
    tuskCurve: 1.15,
    backSlope: 0.35,
    fringe: true,
    species: 'Woolly mammoth',
    periodIds: ['human-world'],
  }),
];

for (const v of variants) {
  await writeGlb(v.root, v.out, v.clips);
  writeSidecar(v.out, v.meta);
  console.log(v.name, 'tris', countTris(v.root));
}
