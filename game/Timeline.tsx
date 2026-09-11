'use client';
import { useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { periods, shortDate } from './data';

const ERA_JUMPS: [string, number][] = [
  ['Origins', 0],
  ['Paleozoic', 6],
  ['Mesozoic', 11],
  ['Cenozoic', 16],
  ['Today', 27],
];

export default function Timeline({
  index,
  onChange,
}: {
  index: number;
  onChange: (i: number) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });

  useEffect(() => {
    const center = () => {
      const selected = strip.current?.children[index] as
        | HTMLElement
        | undefined;
      if (selected && strip.current)
        strip.current.scrollTo({
          left:
            selected.offsetLeft -
            strip.current.clientWidth / 2 +
            selected.clientWidth / 2,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        });
    };
    center();
    const observer = new ResizeObserver(center);
    if (strip.current) observer.observe(strip.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <nav className="timeline" aria-label="Travel through Earth's history">
      <div className="timeline-top">
        <div className="era-jumps">
          {ERA_JUMPS.map(([name, i]) => (
            <button
              key={name}
              type="button"
              aria-current={
                (name === 'Origins' && index < 6) ||
                (name === 'Paleozoic' && index >= 6 && index < 11) ||
                (name === 'Mesozoic' && index >= 11 && index < 16) ||
                (name === 'Cenozoic' && index >= 16 && index < 27) ||
                (name === 'Today' && index === 27)
                  ? 'true'
                  : undefined
              }
              onClick={() => onChange(i)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="timeline-rail" aria-hidden="true" />
      <div
        className="timeline-strip"
        ref={strip}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse')
            drag.current = {
              down: true,
              x: e.clientX,
              left: e.currentTarget.scrollLeft,
              moved: false,
            };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d.down && Math.abs(e.clientX - d.x) > 5) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.scrollLeft = d.left - (e.clientX - d.x);
          }
        }}
        onPointerUp={() => (drag.current.down = false)}
        onPointerCancel={() => (drag.current.down = false)}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
        onWheel={(e) => {
          if (
            Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
            Date.now() - last.current > 180
          ) {
            onChange(
              Math.max(
                0,
                Math.min(periods.length - 1, index + Math.sign(e.deltaY)),
              ),
            );
            last.current = Date.now();
          }
        }}
      >
        {periods.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(i)}
            aria-current={i === index ? 'step' : undefined}
            title={`${p.name} — ${p.date}`}
          >
            <span>{shortDate(p)}</span>
            <i />
            <small>{p.name}</small>
          </button>
        ))}
      </div>
      <Slider
        className="time-scrubber"
        aria-label="Historical checkpoint"
        min={0}
        max={periods.length - 1}
        step={1}
        value={[index]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </nav>
  );
}
