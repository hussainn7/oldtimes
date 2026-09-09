import * as T from 'three';
import {
  mat,
  mesh,
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

const out = 'public/assets/characters/explorer.glb';
const cloth = matVertex('#c4b88b', 0.88);
const skin = matVertex('#c19b76', 0.7);
const hatMat = matVertex('#dfcea0', 0.85);
const packMat = matVertex('#3e5445', 0.9);
const pants = matVertex('#39483e', 0.9);
const boot = matVertex('#3b3027', 0.92);

const root = group('explorer');
// faces +Z; ~1.9 m with hat
const hips = group('hips');
hips.position.y = 0.95;
root.add(hips);

hips.add(
  mesh(
    tintGeometry(ellipsoid(0, 0.2, 0, 0.26, 0.42, 0.18, 12, 10), '#c4b88b'),
    cloth,
    'torso',
  ),
);
const head = group('head');
head.position.set(0, 0.72, 0);
hips.add(head);
head.add(
  mesh(
    tintGeometry(ellipsoid(0, 0, 0.02, 0.15, 0.18, 0.14, 10, 8), '#c19b76'),
    skin,
    'skull',
  ),
);
head.add(
  mesh(
    tintGeometry(
      mergeParts([
        new T.CylinderGeometry(0.3, 0.31, 0.04, 16).translate(0, 0.14, 0),
        new T.CylinderGeometry(0.15, 0.19, 0.16, 12).translate(0, 0.24, 0),
      ]),
      '#dfcea0',
    ),
    hatMat,
    'hat',
  ),
);

hips.add(
  mesh(
    tintGeometry(
      mergeParts([
        new T.BoxGeometry(0.34, 0.44, 0.18).translate(0, 0.15, -0.22),
        new T.CylinderGeometry(0.08, 0.08, 0.38, 8)
          .rotateZ(Math.PI / 2)
          .translate(0, 0.42, -0.24),
      ]),
      '#3e5445',
    ),
    packMat,
    'pack',
  ),
);
// rolled blanket
hips.add(
  mesh(
    tintGeometry(
      new T.CylinderGeometry(0.09, 0.09, 0.4, 8)
        .rotateZ(Math.PI / 2)
        .translate(0, 0.48, -0.24),
      '#6b5a40',
    ),
    matVertex('#6b5a40', 0.9),
    'blanket',
  ),
);

function limb(name, x, y, mats) {
  const pivot = group(name);
  pivot.position.set(x, y, 0);
  return pivot;
}

const legL = limb('legL', 0.11, 0);
const legR = limb('legR', -0.11, 0);
root.add(legL, legR);
for (const [leg, side] of [
  [legL, 1],
  [legR, -1],
]) {
  leg.add(
    mesh(
      tintGeometry(
        mergeParts([
          new T.CapsuleGeometry(0.09, 0.5, 4, 8).translate(0, -0.35, 0),
          ellipsoid(0, -0.78, 0.05, 0.11, 0.09, 0.18, 8, 6),
        ]),
        side > 0 ? '#39483e' : '#3a4a40',
      ),
      pants,
      leg.name + 'Mesh',
    ),
  );
  // boot color tip
  leg.add(mesh(ellipsoid(0, -0.78, 0.05, 0.11, 0.09, 0.18, 8, 6), boot));
}

const armL = group('armL');
const armR = group('armR');
armL.position.set(0.28, 0.4, 0);
armR.position.set(-0.28, 0.4, 0);
hips.add(armL, armR);
for (const arm of [armL, armR]) {
  arm.add(
    mesh(
      tintGeometry(
        mergeParts([
          new T.CapsuleGeometry(0.065, 0.38, 4, 8).translate(0, -0.25, 0),
          ellipsoid(0, -0.52, 0, 0.06, 0.09, 0.06, 6, 5),
        ]),
        '#b8ae85',
      ),
      cloth,
      arm.name + 'Mesh',
    ),
  );
}

const idle = new T.AnimationClip('Idle', 4, [
  breathe('hips', 0.02, 4),
  sway('head', 'y', 0.04, 4),
]);
const walk = new T.AnimationClip('Walk', 0.9, [
  gait('legL', 0.55, 0.9, 0),
  gait('legR', 0.55, 0.9, Math.PI),
  sway('armL', 'x', 0.4, 0.9, Math.PI),
  sway('armR', 'x', 0.4, 0.9, 0),
  breathe('hips', 0.01, 0.9),
]);
// gait uses Z rotation; for biped walk need X. override with custom:
const walkFixed = new T.AnimationClip('Walk', 0.9, [
  sway('legL', 'x', 0.55, 0.9, 0),
  sway('legR', 'x', 0.55, 0.9, Math.PI),
  sway('armL', 'x', 0.4, 0.9, Math.PI),
  sway('armR', 'x', 0.4, 0.9, 0),
  breathe('hips', 0.01, 0.9),
]);
const run = new T.AnimationClip('Run', 0.55, [
  sway('legL', 'x', 0.75, 0.55, 0),
  sway('legR', 'x', 0.75, 0.55, Math.PI),
  sway('armL', 'x', 0.55, 0.55, Math.PI),
  sway('armR', 'x', 0.55, 0.55, 0),
  breathe('hips', 0.015, 0.55),
]);

await writeGlb(root, out, [idle, walkFixed, run]);
writeSidecar(out, {
  scale: 1,
  offsetY: 0,
  rotationY: 0,
  triangles: countTris(root),
  textureSize: 0,
  clips: { idle: 'Idle', walk: 'Walk', run: 'Run' },
});
console.log('tris ~', countTris(root));
