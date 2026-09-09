import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
execFileSync(
  'node',
  [
    'node_modules/typescript/bin/tsc',
    'game/types.ts',
    'game/assets.ts',
    'game/data.ts',
    'game/events.ts',
    'game/survival.ts',
    '--outDir',
    '.test-build',
    '--module',
    'commonjs',
    '--target',
    'es2020',
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);
writeFileSync('.test-build/package.json', JSON.stringify({ type: 'commonjs' }));
execFileSync('node', ['--test', 'tests/game.test.mjs'], { stdio: 'inherit' });
