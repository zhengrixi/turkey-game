// Deterministic screenshot scenes behind ?shot=start|play|kitchen|end.
// Each one plays the real rules forward from a fresh world, steered by
// a simple autopilot (jump the fences and ovens, slide under the lines,
// time the dropping knife, hide when the farmer closes in), so the
// frame is what a real run looks like and the same seed always gives
// the same frame.
import { RUN, STEP, TURKEY } from './config.js';
import {
  EVENT_ESCAPED,
  EVENT_OVER,
  KIND_FENCE,
  KIND_HAY,
  KIND_KNIFE,
  KIND_LINE,
  KIND_OVEN,
} from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const KITCHEN_DISTANCE = 1060;
const END_LIMIT_SECONDS = 420;

/** The autopilot's move for this step: pace, jump and slide. */
export function autopilot(world) {
  const { state } = world;
  const turkey = state.turkey;
  // The nearest thing that can hurt the turkey (a haystack never can:
  // it only hides you, so it must never mask a fence behind it), and
  // the nearest haystack, tracked separately.
  let threat = null;
  let threatX = Infinity;
  let hay = null;
  for (const o of state.obstacles) {
    if (!o.active) continue;
    if (o.kind === KIND_HAY) {
      if (o.x + 130 >= TURKEY.x && (!hay || o.x < hay.x)) hay = o;
      continue;
    }
    const tx = o.kind === KIND_KNIFE ? world.knifeBox(o).x : o.x;
    if (tx + 60 < TURKEY.x) continue; // already passed the turkey
    if (tx < threatX) {
      threat = o;
      threatX = tx;
    }
  }
  let pace = 0;
  let jump = false;
  let slide = false;
  // Sprint when the farmer is closing in.
  if (state.gap < 14) pace = 1;
  if (threat && turkey.y === 0 && turkey.hide === 0) {
    const front = threatX - (TURKEY.x + TURKEY.width);
    const speed = pace > 0 ? TURKEY.sprintSpeed : pace < 0 ? TURKEY.slowSpeed : TURKEY.runSpeed;
    if (threat.kind === KIND_FENCE && front < 130 && front > -20) jump = true;
    else if (threat.kind === KIND_OVEN && front < 95 && front > -20) jump = true;
    else if (threat.kind === KIND_LINE && front < 70 && front > -20) slide = true;
    else if (threat.kind === KIND_KNIFE) {
      // The blade drops and rises on a ~2.3 s cycle. Predict whether
      // the ground pass or a jump is safe over the crossing window,
      // and slow down to shift the window when neither is.
      const pivotFront = threat.x - (TURKEY.x + TURKEY.width);
      const tipYAt = (dt) => 470 + ((1 - Math.cos(threat.swing + threat.swingSpeed * dt)) / 2) * 130;
      // The blade overlaps the turkey while the pivot is 13 px ahead
      // of the turkey's front to 69 px past it.
      const tIn = Math.max(0, (pivotFront - 13) / speed);
      const tOut = (pivotFront + 69) / speed;
      let groundSafe = true;
      let jumpSafe = true;
      for (let t = tIn; t <= tOut; t += 0.05) {
        const tipY = tipYAt(t);
        if (tipY >= 530) groundSafe = false; // the blade is down in the lane
        const y = 950 * t - 900 * t * t; // the jump's height if started now
        if (y < 690 - tipY + 20) jumpSafe = false; // the jump would clip the blade
      }
      if (groundSafe) {
        // Run through on the ground.
      } else if (jumpSafe) {
        jump = true;
      } else {
        pace = -1; // wait for a better window
      }
    }
  }
  // Hide in the nearest haystack when the farmer is close and nothing
  // needs jumping or sliding right now.
  if (!jump && !slide && hay && turkey.y === 0 && turkey.hide === 0 && state.gap < 16) {
    const hayFront = hay.x - (TURKEY.x + TURKEY.width);
    if (hayFront < 110 && hayFront > -20) slide = true;
  }
  return { pace, jump, slide };
}

/** Fly the world forward with the autopilot for up to `seconds`. */
function fly(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const { pace, jump, slide } = autopilot(world);
    const events = world.step(STEP, pace, jump, slide, false);
    if (events & (EVENT_OVER | EVENT_ESCAPED)) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it
 * and the best score to show. Unknown names stage the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    fly(world, PLAY_SECONDS);
    const over = world.state.phase !== 'running';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  if (name === 'kitchen') {
    // Run into the kitchen stage, then play a little further so an
    // oven and a dropping knife are on screen.
    const steps = Math.floor(END_LIMIT_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      const { pace, jump, slide } = autopilot(world);
      const events = world.step(STEP, pace, jump, slide, false);
      if (events & (EVENT_OVER | EVENT_ESCAPED)) break;
      if (world.state.distance >= KITCHEN_DISTANCE && world.state.distance < KITCHEN_DISTANCE + 60) break;
    }
    fly(world, 2.5);
    const over = world.state.phase !== 'running';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  if (name === 'end') {
    const events = fly(world, END_LIMIT_SECONDS);
    const over = world.state.phase !== 'running';
    void events;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, 0, false, false, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
