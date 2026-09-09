'use client';
import { useEffect, useRef } from 'react';
import { periods } from './data';
import type { useExpedition } from './useExpedition';
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
export function useWebMCP(game: ReturnType<typeof useExpedition>) {
  const latest = useRef(game);
  useEffect(() => {
    latest.current = game;
  }, [game]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const controller = new AbortController();
    const read = () => ({
      periodId: latest.current.period.id,
      period: latest.current.period.name,
      region: latest.current.region.name,
      started: latest.current.started,
      discovered: latest.current.visited.length,
      checkpoints: periods.map((p) => ({ id: p.id, date: p.date })),
    });
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {
        /* Optional enhancement; normal controls stay available. */
      }
    };
    register({
      name: 'read_expedition',
      title: 'Read expedition',
      description:
        'Read the current world, region, discovery count and available checkpoints.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: read,
    });
    register({
      name: 'travel_to_checkpoint',
      title: 'Travel through time',
      description:
        'Start the expedition if needed and travel to a historical checkpoint. Restores supplies and closes the current encounter.',
      inputSchema: {
        type: 'object',
        properties: { periodId: { type: 'string' } },
        required: ['periodId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        if (
          !input ||
          typeof input !== 'object' ||
          !('periodId' in input) ||
          typeof input.periodId !== 'string'
        )
          throw new Error('periodId must be a checkpoint ID.');
        const i = periods.findIndex((p) => p.id === input.periodId);
        if (i < 0) throw new Error('Unknown checkpoint ID.');
        if (!latest.current.started) latest.current.begin();
        latest.current.travel(i);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return read();
      },
    });
    return () => controller.abort();
  }, []);
}
