import type { Biome, Region } from '../types';

export const WORLD_WIDTH = 6200;
export const WORLD_SCALE = 50;
export const bounds = { minX: 2, maxX: 122, minZ: -9, maxZ: 13 };
export const noise = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export const riverZ = (x: number) => -19 + Math.sin(x * 0.045) * 4;
export function heightAt(
  x: number,
  z: number,
  biome: Biome,
  region: Region,
): number {
  const hills = Math.sin(x * 0.065) * 1.1 + Math.cos(z * 0.11 + x * 0.03) * 0.8;
  if (biome === 'ocean') {
    const shore = Math.max(0, Math.min(1, (riverZ(x) + 12 - z) / 10));
    return hills * (1 - shore) + (-3.5 + Math.sin(x * 0.06) * 0.3) * shore;
  }
  const bank = Math.max(0, 1 - Math.abs(z - riverZ(x)) / 7);
  const distance = Math.max(0, Math.abs(z) - 16);
  return (
    hills * (region.id === 'north' ? 1.35 : 1) +
    distance * 0.05 -
    bank * 3.2 +
    (biome === 'volcanic' ? Math.sin(x * 0.2) * 0.25 : 0)
  );
}
export function stepPosition(
  x: number,
  z: number,
  dx: number,
  dz: number,
  obstacles: { x: number; z: number; radius: number }[],
) {
  let nx = Math.max(bounds.minX, Math.min(bounds.maxX, x + dx));
  let nz = Math.max(bounds.minZ, Math.min(bounds.maxZ, z + dz));
  for (const o of obstacles) {
    const ox = nx - o.x,
      oz = nz - o.z,
      d = Math.hypot(ox, oz),
      radius = o.radius + 0.32;
    if (d < radius) {
      nx = o.x + (d ? ox / d : 1) * radius;
      nz = o.z + (d ? oz / d : 0) * radius;
    }
  }
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, nx)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, nz)),
  };
}
