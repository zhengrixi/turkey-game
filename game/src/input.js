// Keyboard and pointer input. Held keys give a pace (sprint / slow) and
// one-shot presses (jump, slide, start, restart, pause) are queued as
// bit flags and taken once by the loop, so a press between two frames
// is never lost and never counted twice.

export const ACTION_JUMP = 1;
export const ACTION_SLIDE = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_PAUSE = 8;
export const ACTION_RESTART = 16;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const SLIDE = new Set(['ArrowDown', 'KeyS']);
const SPRINT = new Set(['ArrowRight', 'KeyD']);
const SLOW = new Set(['ArrowLeft', 'KeyA']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  let sprint = false;
  let slow = false;
  let actions = 0;

  function press(code, event) {
    if (JUMP.has(code)) {
      if (!event.repeat) actions |= ACTION_JUMP | ACTION_CONFIRM;
    } else if (SLIDE.has(code)) {
      if (!event.repeat) actions |= ACTION_SLIDE;
    } else if (SPRINT.has(code)) {
      sprint = true;
    } else if (SLOW.has(code)) {
      slow = true;
    } else if (CONFIRM.has(code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else {
      return false;
    }
    return true;
  }

  window.addEventListener('keydown', (event) => {
    if (press(event.code, event)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (SPRINT.has(event.code)) sprint = false;
    else if (SLOW.has(event.code)) slow = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of
  // everything on blur.
  window.addEventListener('blur', () => {
    sprint = false;
    slow = false;
  });
  // Mouse: click (or tap) jumps on the run, and starts / restarts on the
  // menus. A right-click slides instead, for mouse-only players.
  target.addEventListener('pointerdown', (event) => {
    if (event.button === 2) actions |= ACTION_SLIDE;
    else actions |= ACTION_JUMP | ACTION_CONFIRM;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** 1 while sprint is held, -1 while slow is held, 0 otherwise. */
    pace() {
      return (sprint ? 1 : 0) - (slow ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
