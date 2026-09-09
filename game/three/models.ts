import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Species } from '../types';

/** Small, authored silhouettes built once per habitat; no textures or network needed. */
export class ModelKit {
  materials = new Map<string, T.MeshStandardMaterial>();
  material(color: string) {
    if (!this.materials.has(color))
      this.materials.set(
        color,
        new T.MeshStandardMaterial({ color, roughness: 0.92 }),
      );
    return this.materials.get(color)!;
  }
  part(color: string, forms: T.BufferGeometry[]) {
    forms.forEach((g) => g.deleteAttribute('uv'));
    const geometry = mergeGeometries(forms);
    forms.forEach((g) => g.dispose());
    const mesh = new T.Mesh(geometry, this.material(color));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}
function ellipsoid(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  return new T.SphereGeometry(1, 12, 8).scale(sx, sy, sz).translate(x, y, z);
}
function taper(points: number[][], radii: number[], sides = 8) {
  const vertices: number[] = [],
    indices: number[] = [];
  points.forEach((p, i) => {
    const prev = new T.Vector3(
      ...(points[Math.max(0, i - 1)] as [number, number, number]),
    );
    const next = new T.Vector3(
      ...(points[Math.min(points.length - 1, i + 1)] as [
        number,
        number,
        number,
      ]),
    );
    const tangent = next.sub(prev).normalize();
    const side = new T.Vector3(0, 0, 1).cross(tangent).normalize();
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    const up = tangent.clone().cross(side).normalize();
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const v = side
        .clone()
        .multiplyScalar(Math.cos(a))
        .addScaledVector(up, Math.sin(a))
        .multiplyScalar(radii[i]);
      vertices.push(p[0] + v.x, p[1] + v.y, p[2] + v.z);
      if (i && j < sides) {
        const k = i * (sides + 1) + j;
        indices.push(k, k + 1, k - sides - 1, k + 1, k - sides, k - sides - 1);
      }
    }
  });
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
function wing(side: number) {
  const geo = new T.BufferGeometry();
  geo.setAttribute(
    'position',
    new T.Float32BufferAttribute(
      [
        0.5,
        0,
        0,
        -0.15,
        0.4,
        side * 1.5,
        -1.2,
        -0.05,
        side * 3.5,
        0.5,
        0,
        0,
        -1.2,
        -0.05,
        side * 3.5,
        -0.8,
        -0.1,
        side * 0.4,
      ],
      3,
    ),
  );
  geo.computeVertexNormals();
  return geo;
}
export function makeAnimal(s: Species, kit: ModelKit) {
  const root = new T.Group(),
    body = new T.Group(),
    legs: T.Group[] = [],
    wings: T.Group[] = [];
  root.add(body);
  let y = 1.25,
    length = 1.5,
    girth = 0.65,
    headX = 1.6,
    headY = 1.9;
  const shapes: T.BufferGeometry[] = [],
    details: T.BufferGeometry[] = [];
  const k = s.kind;
  const aquatic = ['fish', 'trilobite', 'amphibian', 'insect'].includes(k);
  const flying = k === 'bird' || k === 'pterosaur' || s.behavior === 'fly';
  if (k === 'sauropod') {
    y = 2.7;
    length = 2.5;
    girth = 1.15;
    headX = 3.1;
    headY = 6.4;
  }
  if (k === 'theropod') {
    y = 2;
    headY = 2.7;
    headX = 2;
  }
  if (k === 'mammoth') {
    y = 1.9;
    length = 1.9;
    girth = 1.2;
    headY = 2.5;
    headX = 1.65;
  }
  if (k === 'cat') {
    y = 0.85;
    length = 1.25;
    girth = 0.4;
    headY = 1.25;
    headX = 1.4;
  }
  if (aquatic) {
    y = 0.35;
    length = 1.15;
    girth = 0.35;
    headY = 0.45;
    headX = 1;
  }
  if (flying) {
    y = 0.4;
    length = 0.7;
    girth = 0.23;
    headY = 0.6;
    headX = 0.9;
  }
  shapes.push(ellipsoid(0, y, 0, length, girth, girth * 0.72));
  if (k === 'sauropod') {
    shapes.push(
      taper(
        [
          [1.2, y, 0],
          [2, 3.6, 0],
          [2.2, 5, 0],
          [headX, headY, 0],
        ],
        [0.7, 0.53, 0.32, 0.22],
      ),
    );
    shapes.push(ellipsoid(headX + 0.18, headY, 0, 0.5, 0.27, 0.25));
  } else {
    shapes.push(
      taper(
        [
          [length * 0.6, y, 0],
          [headX - 0.3, headY, 0],
        ],
        [girth * 0.7, girth * 0.4],
      ),
    );
    shapes.push(
      ellipsoid(
        headX,
        headY,
        0,
        k === 'theropod' ? 0.8 : 0.48,
        girth * 0.53,
        girth * 0.47,
      ),
    );
  }
  if (k !== 'mammoth' && !flying)
    shapes.push(
      taper(
        [
          [-length * 0.6, y, 0],
          [-length - (k === 'deer' ? 0.1 : 0.8), y * 0.9, 0],
          [
            -length - (k === 'sauropod' ? 3.4 : k === 'deer' ? 0.35 : 1.6),
            y * 0.5,
            0.25,
          ],
        ],
        [girth * 0.6, girth * 0.2, 0.015],
      ),
    );
  if (k === 'mammoth') {
    shapes.push(ellipsoid(0.55, y + 0.55, 0, 1.2, 0.85, 0.8));
    shapes.push(
      taper(
        [
          [2, 2.6, 0],
          [2.25, 1.4, 0],
          [2.5, 0.3, 0],
          [2.85, 0.6, 0],
        ],
        [0.3, 0.24, 0.15, 0.08],
      ),
    );
    for (const side of [-1, 1]) {
      shapes.push(ellipsoid(1.35, 2.55, side * 0.65, 0.4, 0.55, 0.15));
      details.push(
        taper(
          [
            [1.9, 1.9, side * 0.4],
            [2.7, 1.25, side * 0.6],
            [3.2, 1.55, side * 0.7],
            [3.3, 2.1, side * 0.65],
          ],
          [0.14, 0.12, 0.08, 0.008],
        ),
      );
    }
  }
  if (k === 'stegosaur')
    for (let i = 0; i < 9; i++) {
      const plate = new T.ConeGeometry(
        0.45,
        0.9 + Math.sin((i / 8) * Math.PI) * 0.7,
        4,
      )
        .scale(1, 1, 0.25)
        .translate(-1.7 + i * 0.43, y + girth + 0.25, 0);
      details.push(plate);
    }
  if (k === 'ceratopsian') {
    if (!s.name.toLowerCase().includes('rhino'))
      shapes.push(ellipsoid(1.1, 1.85, 0, 0.22, 0.85, 0.75));
    for (const side of [-1, 1])
      details.push(
        taper(
          [
            [1.5, 1.95, side * 0.25],
            [2.1, 2.6, side * 0.25],
          ],
          [0.14, 0.008],
        ),
      );
  }
  if (k === 'deer')
    for (const side of [-1, 1]) {
      shapes.push(
        ellipsoid(headX - 0.15, headY + 0.35, side * 0.25, 0.16, 0.3, 0.09),
      );
      if (/deer|reindeer|bovid/i.test(s.name)) {
        details.push(
          taper(
            [
              [headX - 0.15, headY + 0.2, side * 0.2],
              [headX - 0.5, headY + 1, side * 0.4],
              [headX - 0.1, headY + 1.3, side * 0.6],
            ],
            [0.075, 0.04, 0.008],
          ),
        );
        details.push(
          taper(
            [
              [headX - 0.4, headY + 0.75, side * 0.35],
              [headX + 0.2, headY + 1.05, side * 0.5],
            ],
            [0.035, 0.005],
          ),
        );
      }
    }
  if (k === 'trilobite' || k === 'insect')
    for (let i = 0; i < 9; i++) {
      shapes.push(ellipsoid(-0.95 + i * 0.23, 0.36, 0, 0.17, 0.28, 0.48));
      for (const side of [-1, 1])
        details.push(
          taper(
            [
              [-0.95 + i * 0.23, 0.3, side * 0.3],
              [-1.1 + i * 0.23, 0.08, side * 0.75],
            ],
            [0.04, 0.008],
          ),
        );
    }
  if (k === 'fish') {
    shapes.push(
      new T.ConeGeometry(0.5, 0.7, 3).scale(1, 1, 0.1).translate(-0.2, 0.8, 0),
    );
    shapes.push(ellipsoid(-1.55, 0.35, 0, 0.18, 0.65, 0.07));
  }
  if (!aquatic && !flying) {
    const biped = k === 'theropod';
    for (let i = 0; i < (biped ? 2 : 4); i++) {
      const pivot = new T.Group();
      const z = (i % 2 ? -1 : 1) * girth * 0.53;
      pivot.position.set(
        biped ? -0.25 : i < 2 ? length * 0.6 : -length * 0.65,
        y,
        z,
      );
      pivot.add(
        kit.part(s.color, [
          taper(
            [
              [0, 0, 0],
              [0.12, -y * 0.55, 0],
              [0, -y + 0.12, 0],
            ],
            [girth * 0.29, girth * 0.2, girth * 0.13],
          ),
          ellipsoid(0.12, -y + 0.1, 0, girth * 0.28, 0.14, girth * 0.21),
        ]),
      );
      root.add(pivot);
      legs.push(pivot);
    }
  }
  if (flying)
    for (const side of [-1, 1]) {
      const pivot = new T.Group();
      pivot.position.y = y;
      const mesh = kit.part(s.color, [wing(side)]);
      mesh.material = mesh.material.clone();
      mesh.material.side = T.DoubleSide;
      pivot.add(mesh);
      root.add(pivot);
      wings.push(pivot);
    }
  body.add(kit.part(s.color, shapes));
  if (details.length)
    body.add(kit.part(k === 'stegosaur' ? '#987955' : '#d4cbb0', details));
  const eyes = kit.part(
    '#182622',
    [-1, 1].map((side) =>
      ellipsoid(
        headX + 0.13,
        headY + 0.08,
        side * (k === 'sauropod' ? 0.235 : girth * 0.43),
        0.055,
        0.06,
        0.035,
      ),
    ),
  );
  body.add(eyes);
  root.scale.setScalar(s.size);
  return {
    root,
    animate(t: number, pace: number) {
      legs.forEach((leg, i) => {
        leg.rotation.z =
          Math.sin(t * 4 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.2 * pace;
      });
      wings.forEach((w, i) => {
        w.rotation.x = Math.sin(t * 3) * 0.4 * (i ? -1 : 1);
      });
      body.rotation.z = Math.sin(t * 0.7) * 0.012;
    },
  };
}
export function makeExplorer(kit: ModelKit) {
  const root = new T.Group(),
    legs: T.Group[] = [],
    arms: T.Group[] = [];
  root.add(kit.part('#c4b88b', [ellipsoid(0, 1.15, 0, 0.25, 0.4, 0.17)]));
  root.add(kit.part('#c19b76', [ellipsoid(0, 1.69, 0, 0.15, 0.19, 0.14)]));
  root.add(
    kit.part('#dfcea0', [
      new T.CylinderGeometry(0.3, 0.31, 0.05, 16).translate(0, 1.82, 0),
      new T.CylinderGeometry(0.15, 0.2, 0.16, 12).translate(0, 1.9, 0),
    ]),
  );
  root.add(
    kit.part('#3e5445', [
      new T.BoxGeometry(0.35, 0.46, 0.2).translate(0, 1.23, -0.23),
      new T.CylinderGeometry(0.09, 0.09, 0.41, 8)
        .rotateZ(Math.PI / 2)
        .translate(0, 1.52, -0.25),
    ]),
  );
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.12, 0.85, 0);
    leg.add(
      kit.part('#39483e', [
        new T.CapsuleGeometry(0.095, 0.48, 3, 8).translate(0, -0.34, 0),
      ]),
    );
    leg.add(kit.part('#3b3027', [ellipsoid(0, -0.76, 0.045, 0.11, 0.1, 0.19)]));
    root.add(leg);
    legs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * 0.29, 1.4, 0);
    arm.add(
      kit.part('#b8ae85', [
        new T.CapsuleGeometry(0.07, 0.36, 3, 8).translate(0, -0.23, 0),
      ]),
    );
    arm.add(kit.part('#c19b76', [ellipsoid(0, -0.5, 0, 0.065, 0.1, 0.065)]));
    root.add(arm);
    arms.push(arm);
  }
  return {
    root,
    animate(t: number, speed: number, reduced: boolean) {
      legs.forEach((l, i) => {
        l.rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.5 * speed;
      });
      arms.forEach((a, i) => {
        a.rotation.x = -Math.sin(t * 9 + i * Math.PI) * 0.35 * speed;
      });
      root.position.y = reduced ? 0 : Math.abs(Math.sin(t * 9)) * 0.045 * speed;
    },
  };
}
export function makeTree(kind: string, kit: ModelKit) {
  const root = new T.Group();
  if (kind === 'fern') {
    const leaves: T.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      for (let j = 0; j < 5; j++) {
        const g = new T.ConeGeometry(0.2 * (1 - j * 0.12), 0.6, 3)
          .scale(1, 1, 0.18)
          .rotateZ(-0.8)
          .translate(0.15 + j * 0.2, 0.9 - j * 0.12, 0)
          .rotateY(angle);
        leaves.push(g);
      }
    }
    root.add(kit.part('#4e7143', leaves));
    return root;
  }
  const trunk: T.BufferGeometry[] = [
    new T.CylinderGeometry(0.1, 0.37, 6, 7).translate(0, 3, 0),
  ];
  const leaves: T.BufferGeometry[] = [];
  if (kind === 'conifer')
    for (let i = 0; i < 7; i++) {
      const radius = 1.9 - i * 0.23;
      leaves.push(
        new T.ConeGeometry(radius * 0.85, 2.5, 7).translate(
          0,
          3.1 + i * 0.76,
          0,
        ),
      );
      for (let j = 0; j < 5; j++) {
        const angle = j * 1.256 + i * 1.7;
        const branch = new T.ConeGeometry(radius * 0.46, 1.4, 5)
          .rotateZ(0.35)
          .translate(radius * 0.56, 2.75 + i * 0.76, 0)
          .rotateY(angle);
        leaves.push(branch);
      }
    }
  else if (kind === 'dead') {
    for (let i = 0; i < 5; i++)
      trunk.push(
        taper(
          [
            [0, 2.5 + i * 0.6, 0],
            [Math.sin(i * 2) * 1.7, 3.5 + i * 0.6, Math.cos(i * 2)],
          ],
          [0.11, 0.015],
        ),
      );
  } else {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        x = Math.cos(a) * 1.7,
        z = Math.sin(a) * 1.7;
      trunk.push(
        taper(
          [
            [0, 3, 0],
            [x, 5.7, z],
          ],
          [0.17, 0.06],
        ),
      );
      leaves.push(
        ellipsoid(
          x,
          5.8 + Math.sin(i) * 0.4,
          z,
          1.9,
          kind === 'acacia' ? 0.55 : 1.3,
          1.7,
        ),
      );
    }
  }
  root.add(kit.part('#5c5540', trunk));
  if (leaves.length)
    root.add(
      kit.part(
        kind === 'acacia'
          ? '#687946'
          : kind === 'broadleaf'
            ? '#416b40'
            : '#335e43',
        leaves,
      ),
    );
  return root;
}
