'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { Biome } from './types';
export default function Audio({
  biome,
  paused,
}: {
  biome: Biome;
  paused: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const context = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!enabled || paused) return;
    const ac = new AudioContext();
    context.current = ac;
    const buffer = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + Math.random() * 0.04 - 0.02) / 1.02;
      data[i] = brown * 3;
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value =
      biome === 'ice'
        ? 900
        : biome === 'ocean'
          ? 450
          : biome === 'volcanic'
            ? 150
            : 650;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, ac.currentTime + 1);
    source.connect(filter).connect(gain).connect(ac.destination);
    source.start();
    const onVisibility = () => {
      if (document.hidden) void ac.suspend();
      else void ac.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      source.stop();
      void ac.close();
      context.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, biome, paused]);
  return (
    <button
      className="icon-button"
      onClick={() => setEnabled((v) => !v)}
      aria-label={enabled ? 'Mute ambience' : 'Enable ambience'}
      title={enabled ? 'Mute ambience' : 'Enable ambience'}
    >
      {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
    </button>
  );
}
