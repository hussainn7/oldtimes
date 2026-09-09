/**
 * Optional async probe for future .glb assets.
 * Returns true if the public asset exists (HEAD). Fail closed → procedural.
 */
export async function assetExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Prefer registered src, else conventional path, else null. */
export async function resolveExistingModel(
  preferred: string | undefined,
  fallbackPath: string,
): Promise<string | null> {
  if (preferred && (await assetExists(preferred))) return preferred;
  if (await assetExists(fallbackPath)) return fallbackPath;
  return null;
}
