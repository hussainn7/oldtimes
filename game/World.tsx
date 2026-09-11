'use client';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Period, Region, WorldHandle } from './types';
export { WORLD_WIDTH } from './three/terrain';
const World2D = lazy(() => import('./World2D'));
export interface WorldProps {
  period: Period;
  region: Region;
  active: boolean;
  onExplore: (distance: number) => void;
  worldRef: React.RefObject<WorldHandle>;
  direction: React.RefObject<number>;
  depth: React.RefObject<number>;
  showLabels?: boolean;
}
export default function World(props: WorldProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>(
    'loading',
  );
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import('./three/expedition')
      .then(({ createExpedition }) => {
        if (cancelled) return;
        try {
          dispose = createExpedition(
            canvas.current!,
            label.current!,
            () => latest.current,
            () => setStatus('fallback'),
          );
          setStatus('ready');
        } catch {
          setStatus('fallback');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback');
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  if (status === 'fallback')
    return (
      <>
        <Suspense fallback={null}>
          <World2D {...props} />
        </Suspense>
      </>
    );
  return (
    <>
      <canvas
        ref={canvas}
        className="world world-3d"
        tabIndex={0}
        aria-label={`${props.period.name} 3D expedition. WASD or arrow keys to walk. Drag to look, scroll to zoom. E to investigate.`}
      />
      <div className="wildlife-label" ref={label} aria-hidden="true" />
      {status === 'loading' && (
        <output className="render-status">Preparing your expedition…</output>
      )}
    </>
  );
}
