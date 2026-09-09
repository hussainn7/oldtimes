import * as T from 'three';
import {
  mesh,
  taper,
  group,
  writeGlb,
  writeSidecar,
  countTris,
  mergeParts,
  tintGeometry,
  matVertex,
} from './lib.mjs';

const out = 'public/assets/vegetation/fern.glb';
const stemMat = matVertex('#3f5a34', 0.9);
const frondMat = matVertex('#4e7143', 0.85);
const root = group('fern');
const stems = [];
const fronds = [];

for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2 + (i % 2) * 0.12;
  const lean = 0.6 + (i % 3) * 0.07;
  stems.push(
    taper(
      [
        [0, 0.02, 0],
        [Math.cos(a) * 0.1, 0.28, Math.sin(a) * 0.1],
        [Math.cos(a) * lean * 0.5, 0.58, Math.sin(a) * lean * 0.5],
        [Math.cos(a) * lean * 0.9, 0.92, Math.sin(a) * lean * 0.9],
      ],
      [0.03, 0.025, 0.018, 0.01],
      4,
    ),
  );
  for (let j = 1; j <= 4; j++) {
    const t = j / 4;
    const px = Math.cos(a) * lean * t;
    const py = 0.2 + t * 0.75;
    const pz = Math.sin(a) * lean * t;
    const w = 0.2 * (1 - t * 0.3);
    fronds.push(
      new T.SphereGeometry(1, 5, 3)
        .scale(w, 0.035, w * 0.5)
        .rotateY(a)
        .rotateZ(-0.4 - t * 0.2)
        .translate(px, py, pz),
    );
  }
}

root.add(mesh(tintGeometry(mergeParts(stems), '#3f5a34'), stemMat, 'stems'));
root.add(
  mesh(tintGeometry(mergeParts(fronds), '#4e7143', 0.1), frondMat, 'fronds'),
);

await writeGlb(root, out);
writeSidecar(out, {
  scale: 1,
  offsetY: 0,
  rotationY: 0,
  triangles: countTris(root),
  textureSize: 0,
});
console.log('tris ~', countTris(root));
