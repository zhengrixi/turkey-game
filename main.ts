// Gobble Dash, a turkey-run-game-01 entry (Node 22, standard library
// only): the game is this directory's game/ folder, plain static files
// a desktop browser loads offline (game/index.html and its ES modules,
// no library and no network request), and the program hands it in. It
// clears the output directory first, so a re-run never leaves stale
// files behind, copies game/ and screenshots/ from beside this file to
// /output, and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library. It refuses to write an
// entry that is missing its game or its screenshots, instead of
// handing in a broken one.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The entry is not an entry without its game or its screenshots:
// fail loudly here, with the missing piece named, rather than
// writing an output the gate would refuse.
const indexHtml = join(here, 'game', 'index.html');
if (!existsSync(indexHtml) || !statSync(indexHtml).isFile()) {
  throw new Error(`missing game/index.html (looked at ${indexHtml})`);
}
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}

// Start from a clean output directory: a re-run into the same folder
// must write exactly what this commit holds, never a leftover file
// from an earlier run (a deleted screenshot, a renamed source).
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
