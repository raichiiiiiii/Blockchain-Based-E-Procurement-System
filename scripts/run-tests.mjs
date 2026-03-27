// scripts/run-tests.mjs
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const SEARCH_ROOT = join(ROOT, 'src');

async function collectTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(relative(ROOT, fullPath));
    }
  }

  return files;
}

const testFiles = (await collectTestFiles(SEARCH_ROOT)).sort();

if (testFiles.length === 0) {
  console.error('No .test.ts files were found under src/.');
  process.exit(1);
}

const child = spawn(
  process.execPath,
  ['--test', '--loader', 'ts-node/esm', ...testFiles],
  {
    stdio: 'inherit',
    env: process.env
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});