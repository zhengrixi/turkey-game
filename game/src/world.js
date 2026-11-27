// The game's rules and state, with no drawing and no browser in it:
// the turkey's run, the farmer chasing behind, the fences, swinging
// carving knives, kitchen ovens and washing lines, the haystacks to
// hide in, the corn to grab, and the farm gate 1500 m ahead. step()
// advances one fixed step and returns what happened as bit flags, so
// the caller can react without the world knowing about screens or
// sound. Nothing here allocates after createWorld returns.
import {
  FARMER,
  FIELD,
  HAZARDS,
  LIVES,
  PICKUPS,
  RUN,
  SCORING,
  TURKEY,
} from './config.js';

export const KIND_FENCE = 0;
export const KIND_KNIFE = 1;
export const KIND_OVEN = 2;
export const KIND_LINE = 3;
export const KIND_HAY = 4;
export const KIND_CORN = 5;
export const KIND_GOLDEN = 6;

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_GOLDEN = 4;
export const EVENT_HIDE = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_OVER = 32;
export const EVENT_ESCAPED = 64;

const POOL_OBSTACLES = 14;
const POOL_PICKUPS = 24;

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function stageAt(distance) {
  for (const stage of RUN.stages) {
    if (distance < stage.to) return stage;
  }
  return RUN.stages[RUN.stages.length - 1];
}

export function createWorld(random) {
  const turkey = {
    y: 0, // height above the ground, px
    vy: 0,
    slide: 0,
    hide: 0,
    invulnerable: 0,
    stumble: 0,
    runCycle: 0,
  };
  const obstacles = [];
  for (let i = 0; i < POOL_OBSTACLES; i += 1) {
    obstacles.push({ active: false, kind: KIND_FENCE, x: 0, swing: 0, swingSpeed: 0, phase: 0 });
  }
  const pickups = [];
  for (let i = 0; i < POOL_PICKUPS; i += 1) {
    pickups.push({ active: false, kind: KIND_CORN, x: 0, y: 0, bob: 0 });
  }
  const state = {
    turkey,
    obstacles,
    pickups,
    distance: 0,
    score: 0,
    cornScore: 0,
    hearts: LIVES,
    gap: RUN.startGap, // metres the farmer trails behind
    farmerSpeed: FARMER.baseSpeed,
    searching: 0, // seconds the farmer spends looking around
    searchTimer: FARMER.searchEvery,
    phase: 'running', // 'running' | 'caught' | 'escaped'
    elapsed: 0,
    spawnIn: 420, // px until the next hazard spawns
    hayIn: 380, // px until the next haystack
    cornIn: 260, // px until the next corn row
    toast: '',
    toastTime: 0,
    stage: RUN.stages[0],
  };

  function reset() {
    turkey.y = 0;
    turkey.vy = 0;
    turkey.slide = 0;
    turkey.hide = 0;
    turkey.invulnerable = 0;
    turkey.stumble = 0;
    turkey.runCycle = 0;
    for (const o of obstacles) o.active = false;
    for (const p of pickups) p.active = false;
    state.distance = 0;
    state.score = 0;
    state.cornScore = 0;
    state.hearts = LIVES;
    state.gap = RUN.startGap;
    state.farmerSpeed = FARMER.baseSpeed;
    state.searching = 0;
    state.searchTimer = FARMER.searchEvery;
    state.phase = 'running';
    state.elapsed = 0;
    state.spawnIn = 420;
    state.hayIn = 380;
    state.cornIn = 260;
    state.toast = '';
    state.toastTime = 0;
    state.stage = RUN.stages[0];
  }

  function freeObstacle() {
    for (const o of obstacles) if (!o.active) return o;
    return null;
  }

  function freePickup() {
    for (const p of pickups) if (!p.active) return p;
    return null;
  }

  function hazardSize(kind) {
    if (kind === KIND_FENCE) return HAZARDS.fence;
    if (kind === KIND_KNIFE) return HAZARDS.knife;
    if (kind === KIND_OVEN) return HAZARDS.oven;
    return HAZARDS.line;
  }

  function pickHazardKind() {
    const d = state.distance;
    const roll = random();
    if (d >= 1000) {
      // The kitchen: ovens join the knives and lines.
      if (roll < 0.3) return KIND_OVEN;
      if (roll < 0.58) return KIND_KNIFE;
      if (roll < 0.82) return KIND_LINE;
      return KIND_FENCE;
    }
    if (d >= 500) {
      // The barnyard: the carving knife starts swinging.
      if (roll < 0.38) return KIND_KNIFE;
      if (roll < 0.66) return KIND_LINE;
      return KIND_FENCE;
    }
    if (roll < 0.55) return KIND_FENCE;
    return KIND_LINE;
  }

  function spawnHazard() {
    const o = freeObstacle();
    if (!o) return;
    o.active = true;
    o.kind = pickHazardKind();
    o.x = FIELD.width + 80;
    o.phase = random() * Math.PI * 2;
    o.swingSpeed = 2.6 + random() * 0.4; // rad/s of the knife's drop and rise
    o.swing = 0;
  }

  function spawnHaystack() {
    const o = freeObstacle();
    if (!o) return;
    o.active = true;
    o.kind = KIND_HAY;
    o.x = FIELD.width + 80;
    o.phase = 0;
    o.swing = 0;
    o.swingSpeed = 0;
  }

  function spawnCornRow() {
    const golden = random() < PICKUPS.goldenCorn.chance;
    const high = random() < 0.45; // an arc of corn to jump for, or a ground row
    const count = 3;
    for (let i = 0; i < count; i += 1) {
      const p = freePickup();
      if (!p) return;
      p.active = true;
      p.kind = golden && i === 1 ? KIND_GOLDEN : KIND_CORN;
      p.x = FIELD.width + 80 + i * 46;
      p.y = high ? 150 + Math.sin((i / (count - 1)) * Math.PI) * -40 : 26;
      p.bob = random() * Math.PI * 2;
    }
  }

  function turkeyBox() {
    const sliding = turkey.slide > 0;
    const height = sliding ? TURKEY.height * 0.48 : TURKEY.height;
    return {
      x: TURKEY.x,
      y: FIELD.groundY - turkey.y - height,
      width: TURKEY.width,
      height,
    };
  }

  /** The dropping blade's box: the carving knife hangs from a branch
   * and drops to the ground and back. Up (tip near 470) the lane is
   * clear; down (tip at 600) it blocks the lane — jump over it. */
  function knifeBox(o) {
    const drop = (1 - Math.cos(o.swing)) / 2; // 0 up, 1 down
    const tipY = 470 + drop * 130;
    return { x: o.x - 13, y: tipY - 90, width: 26, height: 90, tipY, drop };
  }

  function setToast(text, seconds) {
    state.toast = text;
    state.toastTime = seconds;
  }

  /**
   * One fixed step. `pace` is -1 (slow), 0 (trot) or 1 (sprint).
   * With `harmless` set (the title screen's backdrop) things move but
   * nothing touches the turkey and nothing scores.
   */
  function step(dt, pace, jump, slide, harmless) {
    if (state.phase !== 'running') return 0;
    let events = 0;
    state.elapsed += dt;
    if (state.toastTime > 0) state.toastTime = Math.max(0, state.toastTime - dt);

    // --- the turkey's pace ---
    let speed = pace > 0 ? TURKEY.sprintSpeed : pace < 0 ? TURKEY.slowSpeed : TURKEY.runSpeed;
    if (turkey.stumble > 0) {
      turkey.stumble = Math.max(0, turkey.stumble - dt);
      speed = Math.min(speed, 130);
    }
    if (turkey.hide > 0) {
      // Hidden in the haystack: the turkey stays put while the farmer
      // runs past and loses the trail. The world keeps scrolling by.
      turkey.hide = Math.max(0, turkey.hide - dt);
      speed = 0;
      state.gap = Math.min(60, state.gap + (FARMER.hideLoss / TURKEY.hideTime) * dt);
      if (turkey.hide === 0) setToast('Back on the run!', 1.2);
    } else {
      state.distance += (speed * dt) / RUN.pxPerMetre;
      // The title screen's backdrop runs the distance up but scores
      // nothing: nobody has started playing yet.
      if (!harmless) state.score += (speed * dt * SCORING.perMetre) / RUN.pxPerMetre;
    }
    const scroll = turkey.hide > 0 ? TURKEY.runSpeed : speed;
    turkey.runCycle += (speed * dt) / 26;

    // --- jumping and sliding ---
    const onGround = turkey.y === 0;
    if (jump && onGround && turkey.hide === 0) {
      turkey.vy = TURKEY.jumpVelocity;
    }
    if (slide && onGround && turkey.hide === 0 && turkey.slide === 0) {
      turkey.slide = TURKEY.slideTime;
      // Sliding into a haystack hides the turkey.
      for (const o of obstacles) {
        if (o.active && o.kind === KIND_HAY && Math.abs(o.x - TURKEY.x) < 90) {
          turkey.hide = TURKEY.hideTime;
          o.active = false;
          events |= EVENT_HIDE;
          setToast('Hidden in the haystack!', 1.6);
          break;
        }
      }
    }
    if (turkey.slide > 0) turkey.slide = Math.max(0, turkey.slide - dt);
    if (turkey.y > 0 || turkey.vy !== 0) {
      turkey.vy -= TURKEY.gravity * dt;
      turkey.y = Math.max(0, turkey.y + turkey.vy * dt);
      if (turkey.y === 0) turkey.vy = 0;
    }
    if (turkey.invulnerable > 0) turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);

    // --- the farmer ---
    // He tracks the turkey's pace, a touch slower, so slowing down to
    // time a knife costs almost nothing — but he pounces on a stumble,
    // and he closes in whenever the gap gets wide.
    if (state.searching > 0) {
      state.searching = Math.max(0, state.searching - dt);
      state.gap = Math.min(60, state.gap + (FARMER.searchGain / 1.5) * dt);
    } else if (turkey.hide === 0) {
      state.searchTimer -= dt;
      if (state.searchTimer <= 0) {
        state.searching = 1.5;
        state.searchTimer = FARMER.searchEvery + random() * 6;
        if (!harmless) {
          events |= EVENT_SPOTTED;
          setToast('The farmer stops to look around…', 1.5);
        }
      }
      let farmerSpeed = speed * 0.92 + 8;
      if (turkey.stumble > 0) farmerSpeed = FARMER.baseSpeed;
      if (state.gap > FARMER.closeGap) farmerSpeed += FARMER.catchUp;
      else if (state.gap < 8) farmerSpeed -= FARMER.giveUp;
      state.farmerSpeed = farmerSpeed;
      state.gap = Math.min(60, state.gap + ((speed - farmerSpeed) * dt) / RUN.pxPerMetre);
    }
    if (state.gap <= RUN.catchGap) {
      state.phase = 'caught';
      return events | EVENT_OVER;
    }

    // --- spawning ---
    state.spawnIn -= scroll * dt;
    if (state.spawnIn <= 0) {
      spawnHazard();
      const difficulty = Math.min(1, state.distance / 1200);
      state.spawnIn = 380 - difficulty * 90 + random() * 130;
    }
    state.hayIn -= scroll * dt;
    if (state.hayIn <= 0) {
      spawnHaystack();
      state.hayIn = 9000 + random() * 4000; // one haystack every ~400-600 m
    }
    state.cornIn -= scroll * dt;
    if (state.cornIn <= 0) {
      spawnCornRow();
      state.cornIn = 1800 + random() * 1400;
    }

    // --- move and collide ---
    const box = turkeyBox();
    for (const o of obstacles) {
      if (!o.active) continue;
      o.x -= scroll * dt;
      o.swing += o.swingSpeed * dt;
      if (o.x < -160) {
        o.active = false;
        continue;
      }
      if (harmless || turkey.hide > 0) continue;
      if (o.kind === KIND_HAY) continue;
      const size = hazardSize(o.kind);
      let hit = false;
      if (o.kind === KIND_KNIFE) {
        const kb = knifeBox(o);
        hit = overlaps(box.x, box.y, box.width, box.height, kb.x, kb.y, kb.width, kb.height);
      } else if (o.kind === KIND_LINE) {
        // The rope and its washing hang at head height: only the top
        // of the lane is blocked, so a slide passes underneath.
        hit = overlaps(box.x, box.y, box.width, box.height, o.x, FIELD.groundY - 88, size.width, 44);
      } else {
        const oy = FIELD.groundY - size.height;
        hit = overlaps(box.x, box.y, box.width, box.height, o.x, oy, size.width, size.height);
      }
      if (!hit) continue;
      if (turkey.invulnerable > 0) continue;
      o.active = false;
      state.hearts -= 1;
      turkey.invulnerable = TURKEY.invulnerable;
      turkey.stumble = TURKEY.stumbleSlow;
      state.gap = Math.max(RUN.catchGap + 0.5, state.gap - FARMER.stumbleGain);
      events |= EVENT_HIT;
      setToast(o.kind === KIND_OVEN ? 'Ouch! The oven is hot!' : o.kind === KIND_KNIFE ? 'The knife nicked you!' : 'Tripped!', 1.2);
      if (state.hearts <= 0) {
        state.phase = 'caught';
        return events | EVENT_OVER;
      }
    }
    for (const p of pickups) {
      if (!p.active) continue;
      p.x -= scroll * dt;
      p.bob += dt * 4;
      if (p.x < -60) {
        p.active = false;
        continue;
      }
      if (harmless || turkey.hide > 0) continue;
      const size = p.kind === KIND_GOLDEN ? PICKUPS.goldenCorn.size : PICKUPS.corn.size;
      const py = FIELD.groundY - p.y - size / 2;
      if (overlaps(box.x, box.y, box.width, box.height, p.x - size / 2, py, size, size)) {
        p.active = false;
        const points = p.kind === KIND_GOLDEN ? PICKUPS.goldenCorn.points : PICKUPS.corn.points;
        state.score += points;
        state.cornScore += points;
        events |= p.kind === KIND_GOLDEN ? EVENT_GOLDEN : EVENT_CORN;
      }
    }

    // --- the stage and the gate ---
    state.stage = stageAt(state.distance);
    if (state.distance >= RUN.escapeDistance) {
      state.phase = 'escaped';
      state.score += state.hearts * SCORING.heartBonus;
      return events | EVENT_ESCAPED;
    }
    return events;
  }

  reset();
  return { state, reset, step, knifeBox, turkeyBox };
}
