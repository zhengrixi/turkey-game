// Boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between four
// screens: title, play, paused and game over.
//
// ?seed=N fixes the run's hazards and corn. ?shot=start|play|kitchen|end
// (with &seed=N) stages that scene instead of running the loop, paints
// it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CORN, EVENT_ESCAPED, EVENT_GOLDEN, EVENT_HIDE, EVENT_OVER, EVENT_HIT, EVENT_SPOTTED } from './world.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_PAUSE, ACTION_RESTART, ACTION_SLIDE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
  });

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.gobble();
    announce('Running! Jump the fences, time the knife, reach the Freedom Gate.');
  }

  function endGame(escaped) {
    screen = SCREEN_OVER;
    const score = Math.floor(world.state.score);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    if (escaped) audio.escaped();
    else audio.caught();
    announce(
      escaped
        ? `Escaped! Score ${score}. Best ${best}.`
        : `Caught! Score ${score}. Best ${best}. Press R or click to run again.`,
    );
  }

  function handleEvents(events) {
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_CORN) audio.corn();
    if (events & EVENT_GOLDEN) audio.golden();
    if (events & EVENT_HIDE) audio.hide();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function handleActions(actions) {
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_TITLE)) startGame();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Running!');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      // The title screen's backdrop: the turkey trots through the
      // farmyard while hazards drift past, harmless.
      world.step(STEP, 0, false, false, true);
      return;
    }
    const events = world.step(
      STEP,
      input.pace(),
      Boolean(actions & ACTION_JUMP),
      Boolean(actions & ACTION_SLIDE),
      false,
    );
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, now / 1000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Dash. Press Space or click to run from the farmer.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
