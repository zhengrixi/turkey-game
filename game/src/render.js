// All the drawing: the turkey, the farmer, the farm and the kitchen,
// the hazards, the HUD and the screens. The world never draws; this
// file never changes the world. One logical playfield, 1280x720, scaled
// to the canvas.
import { FIELD, HAZARDS, PALETTE, PICKUPS, RUN, TURKEY } from './config.js';
import { KIND_CORN, KIND_FENCE, KIND_GOLDEN, KIND_HAY, KIND_KNIFE, KIND_LINE, KIND_OVEN } from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const W = FIELD.width;
const H = FIELD.height;
const GROUND = FIELD.groundY;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || window.innerWidth;
    const ch = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const scale = Math.min(canvas.width / W, canvas.height / H);
    const ox = (canvas.width - W * scale) / 2;
    const oy = (canvas.height - H * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function ellipse(x, y, rx, ry, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function text(str, x, y, size, fill, align = 'center', weight = '700') {
    ctx.fillStyle = fill;
    ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  // ---------- scenery ----------

  function drawSky(stageIndex, t) {
    let top, mid, low;
    if (stageIndex === 2) {
      top = PALETTE.kitchenWall;
      mid = PALETTE.kitchenWall;
      low = PALETTE.kitchenWallLow;
    } else if (stageIndex === 1) {
      top = PALETTE.barnSkyTop;
      mid = PALETTE.barnSkyMid;
      low = PALETTE.barnSkyLow;
    } else {
      top = PALETTE.farmSkyTop;
      mid = PALETTE.farmSkyMid;
      low = PALETTE.farmSkyLow;
    }
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, top);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, low);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND);
    if (stageIndex === 2) {
      // Kitchen tiles.
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 430); ctx.stroke();
      }
      for (let y = 0; y <= 430; y += 80) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      return;
    }
    // Sun and drifting clouds.
    ellipse(1050, 110, 52, 52, PALETTE.sun);
    ellipse(1050, 110, 66, 66, 'rgba(255, 215, 106, 0.25)');
    for (let i = 0; i < 3; i += 1) {
      const cx = ((i * 430 + t * 12) % (W + 300)) - 150;
      const cy = 70 + i * 46;
      ellipse(cx, cy, 70, 22, PALETTE.cloud);
      ellipse(cx + 44, cy + 8, 52, 18, PALETTE.cloud);
      ellipse(cx - 48, cy + 10, 46, 16, PALETTE.cloud);
    }
  }

  function drawHills(stageIndex, scrollX) {
    if (stageIndex === 2) {
      // Kitchen floor and a long wooden table along the back wall.
      ctx.fillStyle = PALETTE.kitchenFloor;
      ctx.fillRect(0, 430, W, GROUND - 430);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(0, 430, W, 14);
      ctx.fillStyle = '#7d5230';
      ctx.fillRect(0, 444, W, 170);
      ctx.fillStyle = '#6b4423';
      for (let x = 40; x < W; x += 120) ctx.fillRect(x, 444, 10, 170);
      return;
    }
    const far = stageIndex === 1 ? '#b0703a' : PALETTE.hillFar;
    const near = stageIndex === 1 ? '#8a5a2b' : PALETTE.hillNear;
    ctx.fillStyle = far;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 40) {
      ctx.lineTo(x, GROUND - 90 - Math.sin((x + scrollX * 0.3) / 260) * 42);
    }
    ctx.lineTo(W, GROUND);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = near;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 40) {
      ctx.lineTo(x, GROUND - 34 - Math.sin((x + scrollX * 0.6) / 190 + 2) * 24);
    }
    ctx.lineTo(W, GROUND);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(stageIndex, scrollX, distance) {
    const ground = stageIndex === 2 ? PALETTE.dirtDark : stageIndex === 1 ? PALETTE.grassDry : PALETTE.grass;
    ctx.fillStyle = ground;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = PALETTE.dirt;
    ctx.fillRect(0, GROUND, W, 10);
    // Scattered tufts and stones scrolling past.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let i = 0; i < 14; i += 1) {
      const x = ((i * 173 - scrollX) % (W + 80) + W + 80) % (W + 80) - 40;
      const y = GROUND + 26 + ((i * 53) % 76);
      ctx.fillRect(x, y, 14, 4);
    }
    if (stageIndex === 0) {
      // Pumpkin patch near the start of the farmyard.
      for (let i = 0; i < 4; i += 1) {
        const px = 900 + i * 70 - ((scrollX * 0.9) % 1400);
        if (px < -60 || px > W + 60) continue;
        drawPumpkin(px, GROUND + 88);
      }
    }
    if (stageIndex === 1) {
      // The red barn, far off in the barnyard.
      const bx = 980 - ((scrollX * 0.5) % 1600);
      if (bx > -220 && bx < W + 220) drawBarn(bx, GROUND);
    }
    // The farm gate: the finish line, drawn as the turkey nears it.
    const gateX = TURKEY.x + (RUN.escapeDistance - distance) * RUN.pxPerMetre;
    if (gateX > -40 && gateX < W + 200) {
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(gateX - 8, GROUND - 190, 16, 190);
      ctx.fillRect(gateX + 120, GROUND - 190, 16, 190);
      ctx.fillStyle = PALETTE.fenceWood;
      ctx.fillRect(gateX, GROUND - 180, 128, 14);
      ctx.fillRect(gateX, GROUND - 120, 128, 14);
      ctx.fillStyle = PALETTE.hudAmber;
      text('FREEDOM GATE', gateX + 64, GROUND - 208, 20, PALETTE.hudAmber);
    }
  }

  function drawPumpkin(x, y) {
    ellipse(x, y, 26, 20, PALETTE.pumpkin);
    ellipse(x - 9, y - 2, 12, 16, '#f08a3c');
    ellipse(x + 9, y - 2, 12, 16, '#d95f16');
    ctx.fillStyle = PALETTE.pumpkinStem;
    ctx.fillRect(x - 3, y - 26, 6, 10);
  }

  function drawBarn(x, groundY) {
    ctx.fillStyle = PALETTE.barn;
    ctx.fillRect(x, groundY - 150, 190, 150);
    ctx.fillStyle = PALETTE.barnRoof;
    ctx.beginPath();
    ctx.moveTo(x - 12, groundY - 150);
    ctx.lineTo(x + 95, groundY - 215);
    ctx.lineTo(x + 202, groundY - 150);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.barnTrim;
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 62, groundY - 96, 66, 96);
    ctx.beginPath();
    ctx.moveTo(x + 62, groundY - 96); ctx.lineTo(x + 128, groundY);
    ctx.moveTo(x + 128, groundY - 96); ctx.lineTo(x + 62, groundY);
    ctx.stroke();
    ellipse(x + 95, groundY - 168, 16, 16, PALETTE.barnTrim);
  }

  // ---------- characters ----------

  function drawTurkey(x, groundY, y, cycle, sliding, hidden, flash) {
    if (hidden) return; // tucked inside the haystack, only a tail feather shows
    ctx.save();
    // While invulnerable the turkey flashes — faint, never gone, so a
    // screenshot never catches an empty spot where it stands.
    if (flash && Math.floor(performance.now() / 90) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.translate(x, groundY - y);
    const bob = y === 0 ? Math.sin(cycle * 2) * 2 : 0;
    ctx.translate(0, -bob);
    if (sliding) {
      // Low and stretched, skidding under the line.
      ctx.scale(1.25, 0.62);
      ctx.translate(-6, 18);
    }
    // Tail feathers fanning behind.
    for (let i = -2; i <= 2; i += 1) {
      ctx.save();
      ctx.translate(-26, -34);
      ctx.rotate(i * 0.38 - 0.35);
      ellipse(0, -22, 9, 24, i % 2 === 0 ? PALETTE.turkeyTail : PALETTE.turkeyTailDark);
      ctx.restore();
    }
    // Body.
    ellipse(0, -30, 30, 26, PALETTE.turkeyBody);
    // Wing, flapping with the run.
    const flap = Math.sin(cycle * 2) * 6;
    ctx.save();
    ctx.translate(-4, -30);
    ctx.rotate(-0.3 + flap * 0.02);
    ellipse(0, 0, 20, 13, PALETTE.turkeyWing);
    ctx.restore();
    // Legs.
    const legSwing = y === 0 ? Math.sin(cycle * 2) * 12 : 8;
    ctx.strokeStyle = PALETTE.turkeyLeg;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -8); ctx.lineTo(-8 + legSwing, 0);
    ctx.moveTo(8, -8); ctx.lineTo(8 - legSwing, 0);
    ctx.stroke();
    // Neck and head.
    ctx.fillStyle = PALETTE.turkeyHead;
    ctx.beginPath();
    ctx.ellipse(20, -52, 9, 20, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ellipse(26, -70, 13, 12, PALETTE.turkeyHead);
    // Beak.
    ctx.fillStyle = PALETTE.turkeyBeak;
    ctx.beginPath();
    ctx.moveTo(36, -72); ctx.lineTo(52, -67); ctx.lineTo(36, -63);
    ctx.closePath();
    ctx.fill();
    // Wattle and eye.
    ellipse(33, -60, 4, 7, PALETTE.turkeyWattle);
    ellipse(29, -73, 2.5, 2.5, '#1c1c1c');
    ctx.restore();
  }

  function drawHiddenTurkey(x, groundY) {
    // Just the turkey's head peeking out of the haystack.
    ellipse(x + 6, groundY - 62, 13, 12, PALETTE.turkeyHead);
    ctx.fillStyle = PALETTE.turkeyBeak;
    ctx.beginPath();
    ctx.moveTo(x + 16, groundY - 64); ctx.lineTo(x + 30, groundY - 60); ctx.lineTo(x + 16, groundY - 56);
    ctx.closePath();
    ctx.fill();
    ellipse(x + 9, groundY - 65, 2.5, 2.5, '#1c1c1c');
  }

  function drawFarmer(x, groundY, cycle, searching, gap) {
    if (x < -140) return;
    ctx.save();
    ctx.translate(x, groundY);
    const bob = searching ? 0 : Math.sin(cycle * 2 + 1) * 2;
    ctx.translate(0, -bob);
    // Legs.
    const swing = searching ? 0 : Math.sin(cycle * 2) * 13;
    ctx.strokeStyle = PALETTE.farmerOveralls;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -52); ctx.lineTo(-6 + swing, 0);
    ctx.moveTo(6, -52); ctx.lineTo(6 - swing, 0);
    ctx.stroke();
    // Overalls and shirt.
    ctx.fillStyle = PALETTE.farmerOveralls;
    rr(-20, -96, 40, 48, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerShirt;
    rr(-22, -118, 44, 30, 8);
    ctx.fill();
    // Reaching arm, or a hand shading his eyes while he searches.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 9;
    ctx.beginPath();
    if (searching) {
      ctx.moveTo(14, -112); ctx.lineTo(30, -140);
    } else {
      ctx.moveTo(16, -110); ctx.lineTo(44, -96 + Math.sin(cycle * 2) * 5);
    }
    ctx.stroke();
    // Head, beard and straw hat.
    ellipse(6, -136, 15, 14, PALETTE.farmerSkin);
    ellipse(6, -126, 12, 7, PALETTE.farmerBeard);
    ctx.fillStyle = PALETTE.farmerHat;
    ellipse(6, -148, 24, 6, PALETTE.farmerHat);
    ctx.beginPath();
    ctx.ellipse(6, -152, 14, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ellipse(12, -138, 2.5, 2.5, '#1c1c1c');
    // Angry brow.
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -144); ctx.lineTo(17, -141);
    ctx.stroke();
    ctx.restore();
    if (gap < 10 && !searching) {
      text('!', x + 40, groundY - 170, 34, PALETTE.hudRed, 'center', '900');
    }
  }

  // ---------- hazards and pickups ----------

  function drawFence(x) {
    ctx.fillStyle = PALETTE.fenceWood;
    ctx.fillRect(x - 4, GROUND - HAZARDS.fence.height, 8, HAZARDS.fence.height);
    ctx.fillRect(x + HAZARDS.fence.width - 4, GROUND - HAZARDS.fence.height, 8, HAZARDS.fence.height);
    ctx.fillRect(x - 8, GROUND - 58, HAZARDS.fence.width + 16, 9);
    ctx.fillRect(x - 8, GROUND - 34, HAZARDS.fence.width + 16, 9);
  }

  function drawKnife(o, t) {
    const blade = { tipY: 470 + ((1 - Math.cos(o.swing)) / 2) * 130 };
    const tipY = blade.tipY;
    // Branch across the top and the rope the knife hangs from.
    ctx.strokeStyle = PALETTE.treeTrunk;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(o.x - 46, 0); ctx.lineTo(o.x + 36, 30);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.lineRope;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(o.x, 24); ctx.lineTo(o.x, tipY - 108);
    ctx.stroke();
    // The handle, then the blade, point down.
    ctx.fillStyle = PALETTE.knifeHandle;
    rr(o.x - 7, tipY - 114, 14, 26, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(o.x - 11, tipY - 90);
    ctx.lineTo(o.x + 11, tipY - 90);
    ctx.lineTo(o.x, tipY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.knifeEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x - 11, tipY - 90); ctx.lineTo(o.x, tipY);
    ctx.stroke();
    // Danger glint when the blade is down in the lane.
    if (tipY > 560) {
      text('!', o.x, tipY - 130, 30, PALETTE.hudRed, 'center', '900');
    }
    void t;
  }

  function drawOven(o, t) {
    const w = HAZARDS.oven.width;
    const h = HAZARDS.oven.height;
    const x = o.x;
    const y = GROUND - h;
    ctx.fillStyle = PALETTE.ovenBody;
    rr(x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.ovenDoor;
    rr(x + 12, y + 22, w - 24, h - 40, 6);
    ctx.fill();
    // Fire licking out of the open door.
    const flick = Math.sin(t * 9 + o.x) * 4;
    ctx.fillStyle = PALETTE.ovenFire;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + h - 20);
    ctx.quadraticCurveTo(x + 30, y + 60 + flick, x + 42, y + h - 20);
    ctx.quadraticCurveTo(x + 54, y + 52 - flick, x + 66, y + h - 20);
    ctx.quadraticCurveTo(x + 74, y + 66, x + w - 18, y + h - 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.ovenFireHot;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 24, 14, 8 + flick * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hob and knobs on top.
    ctx.fillStyle = '#33333a';
    ctx.fillRect(x + 8, y + 6, w - 16, 8);
    ctx.fillStyle = PALETTE.hudAmber;
    for (let i = 0; i < 3; i += 1) ellipse(x + 22 + i * 26, y + 14, 4, 4, PALETTE.hudAmber);
    text('HOT!', x + w / 2, y - 14, 18, PALETTE.ovenFire, 'center', '900');
  }

  function drawLine(o) {
    const w = HAZARDS.line.width;
    ctx.fillStyle = PALETTE.fenceWood;
    ctx.fillRect(o.x - 5, GROUND - 92, 8, 92);
    ctx.fillRect(o.x + w - 3, GROUND - 92, 8, 92);
    ctx.strokeStyle = PALETTE.lineRope;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(o.x, GROUND - 88);
    ctx.quadraticCurveTo(o.x + w / 2, GROUND - 72, o.x + w, GROUND - 88);
    ctx.stroke();
    // A pot and a shirt hanging low, right at turkey-head height.
    ctx.fillStyle = PALETTE.linePot;
    ellipse(o.x + w * 0.32, GROUND - 58, 12, 9, PALETTE.linePot);
    ctx.fillStyle = '#e8e0c8';
    ctx.fillRect(o.x + w * 0.55, GROUND - 78, 22, 34);
  }

  function drawHaystack(o) {
    ctx.fillStyle = PALETTE.hay;
    ctx.beginPath();
    ctx.moveTo(o.x - 8, GROUND);
    ctx.quadraticCurveTo(o.x + 30, GROUND - 108, o.x + 76, GROUND - 96);
    ctx.quadraticCurveTo(o.x + 118, GROUND - 70, o.x + 112, GROUND);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.hayDark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(o.x + 10 + i * 20, GROUND - 12);
      ctx.quadraticCurveTo(o.x + 16 + i * 20, GROUND - 55, o.x + 22 + i * 20, GROUND - 88);
      ctx.stroke();
    }
    text('HIDE!', o.x + 52, GROUND - 118, 18, PALETTE.hudAmber, 'center', '900');
  }

  function drawCorn(p, t) {
    const size = p.kind === KIND_GOLDEN ? PICKUPS.goldenCorn.size : PICKUPS.corn.size;
    const bobY = Math.sin(p.bob + t * 2) * 3;
    const y = GROUND - p.y - size / 2 + bobY;
    if (p.kind === KIND_GOLDEN) {
      ctx.fillStyle = 'rgba(255, 180, 0, 0.25)';
      ellipse(p.x, y, size, size, 'rgba(255, 180, 0, 0.25)');
    }
    ctx.fillStyle = p.kind === KIND_GOLDEN ? PALETTE.goldenCorn : PALETTE.corn;
    ctx.beginPath();
    ctx.ellipse(p.x, y, size / 2 - 4, size / 2 + 2, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 110, 0, 0.5)';
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(p.x + i * 7, y - size / 2 + 2);
      ctx.lineTo(p.x + i * 7 + 4, y + size / 2 - 2);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.cornHusk;
    ctx.beginPath();
    ctx.moveTo(p.x - 10, y + size / 2 - 4);
    ctx.lineTo(p.x - 2, y + size / 2 + 12);
    ctx.lineTo(p.x + 8, y + size / 2 - 4);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- HUD ----------

  function drawHud(state, screen) {
    ctx.fillStyle = PALETTE.hudPanel;
    rr(16, 14, W - 32, 64, 12);
    ctx.fill();
    text(`SCORE ${Math.floor(state.score)}`, 40, 46, 26, PALETTE.hudText, 'left');
    text(`CORN ${Math.floor(state.cornScore)}`, 250, 46, 22, PALETTE.hudAmber, 'left');
    // Distance to the gate.
    const progress = Math.min(1, state.distance / RUN.escapeDistance);
    const barX = 420;
    const barW = 440;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(barX, 30, barW, 16, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudGreen;
    rr(barX, 30, barW * progress, 16, 8);
    ctx.fill();
    text(`${Math.floor(state.distance)} m / ${RUN.escapeDistance} m  ·  ${state.stage.name}`, barX + barW / 2, 58, 16, PALETTE.muted);
    // Hearts, drawn as shapes so they never depend on a font.
    for (let i = 0; i < 3; i += 1) {
      const hx = 906 + i * 34;
      const hy = 46;
      ctx.fillStyle = i < state.hearts ? PALETTE.hudRed : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 8);
      ctx.bezierCurveTo(hx - 12, hy - 4, hx - 5, hy - 12, hx, hy - 4);
      ctx.bezierCurveTo(hx + 5, hy - 12, hx + 12, hy - 4, hx, hy + 8);
      ctx.fill();
    }
    // The farmer's gap: how close dinner is.
    const gapText = state.gap <= 6 ? 'FARMER RIGHT BEHIND YOU!' : `FARMER ${Math.floor(state.gap)}m BEHIND`;
    text(gapText, 1256, 46, 20, state.gap <= 6 ? PALETTE.hudRed : PALETTE.hudText, 'right', '800');
    if (state.toastTime > 0 && screen === SCREEN_PLAY) {
      text(state.toast, W / 2, 108, 24, PALETTE.hudAmber, 'center', '800');
    }
  }

  // ---------- screens ----------

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(30, 16, 4, 0.45)';
    ctx.fillRect(0, 0, W, H);
    text('GOBBLE DASH', W / 2, 170, 92, PALETTE.hudAmber, 'center', '900');
    text('The Great Turkey Escape', W / 2, 238, 34, PALETTE.text, 'center', '700');
    text('Thanksgiving is coming. The farmer is coming faster.', W / 2, 282, 22, PALETTE.muted, 'center', '600');
    text('Outrun the farmer · Jump the fences · Time the carving knife · Leap the oven', W / 2, 330, 20, PALETTE.text, 'center', '600');
    text('Hide in a haystack (↓) when he gets close · Grab the corn', W / 2, 362, 20, PALETTE.text, 'center', '600');
    ctx.fillStyle = 'rgba(46, 26, 10, 0.72)';
    rr(W / 2 - 330, 410, 660, 96, 14);
    ctx.fill();
    text('SPACE / ↑ / CLICK — jump      ↓ — slide / hide      → — sprint      ← — slow down', W / 2, 442, 19, PALETTE.hudText, 'center', '700');
    text('P — pause      R — restart      M — mute', W / 2, 476, 19, PALETTE.hudText, 'center', '700');
    text('▶  PRESS SPACE OR CLICK TO RUN  ◀', W / 2, 566, 30, PALETTE.hudGreen, 'center', '900');
    if (best > 0) text(`Best score: ${best}`, W / 2, 612, 20, PALETTE.muted, 'center', '600');
    text('Reach the Freedom Gate, 1500 m away, and you are no one\'s dinner.', W / 2, 650, 18, PALETTE.muted, 'center', '600');
  }

  function drawOver(state, best) {
    const escaped = state.phase === 'escaped';
    ctx.fillStyle = escaped ? 'rgba(12, 46, 20, 0.55)' : 'rgba(46, 8, 4, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(46, 26, 10, 0.85)';
    rr(W / 2 - 360, 130, 720, 420, 18);
    ctx.fill();
    if (escaped) {
      text('ESCAPED!', W / 2, 196, 64, PALETTE.hudGreen, 'center', '900');
      text('You made it past the Freedom Gate.', W / 2, 252, 24, PALETTE.text, 'center', '700');
      text('No Thanksgiving dinner tonight — you are free!', W / 2, 286, 22, PALETTE.muted, 'center', '600');
    } else {
      text('CAUGHT!', W / 2, 196, 64, PALETTE.hudRed, 'center', '900');
      text('The farmer got you. Thanksgiving dinner it is…', W / 2, 252, 24, PALETTE.text, 'center', '700');
      text('Next time, sprint sooner and hide in the haystacks.', W / 2, 286, 22, PALETTE.muted, 'center', '600');
    }
    text(`SCORE  ${Math.floor(state.score)}`, W / 2, 348, 30, PALETTE.hudText, 'center', '800');
    text(`Distance  ${Math.floor(state.distance)} m  ·  Corn  ${Math.floor(state.cornScore)}  ·  Best  ${best}`, W / 2, 392, 20, PALETTE.muted, 'center', '600');
    text('▶  PRESS R OR CLICK TO RUN AGAIN  ◀', W / 2, 470, 26, PALETTE.hudGreen, 'center', '900');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(20, 12, 4, 0.55)';
    ctx.fillRect(0, 0, W, H);
    text('PAUSED', W / 2, 320, 64, PALETTE.hudText, 'center', '900');
    text('Press P or SPACE to keep running', W / 2, 380, 24, PALETTE.muted, 'center', '600');
  }

  // ---------- the frame ----------

  function draw(world, screen, best, t) {
    fit();
    const state = world.state;
    const stageIndex = RUN.stages.indexOf(state.stage);
    const scrollX = state.distance * RUN.pxPerMetre;
    drawSky(stageIndex, state.elapsed);
    drawHills(stageIndex, scrollX);
    drawGround(stageIndex, scrollX, state.distance);

    // Hazards, haystacks and corn, back to front.
    for (const o of state.obstacles) {
      if (!o.active) continue;
      if (o.kind === KIND_FENCE) drawFence(o.x);
      else if (o.kind === KIND_KNIFE) drawKnife(o, state.elapsed);
      else if (o.kind === KIND_OVEN) drawOven(o, state.elapsed);
      else if (o.kind === KIND_LINE) drawLine(o);
      else if (o.kind === KIND_HAY) drawHaystack(o);
    }
    for (const p of state.pickups) {
      if (p.active) drawCorn(p, state.elapsed);
    }

    // The farmer trails behind by the gap, in metres — drawn on a
    // compressed scale so he stays in the frame while he is close.
    const farmerX = TURKEY.x - state.gap * 14 - 40;
    drawFarmer(farmerX, GROUND, state.turkey.runCycle, state.searching > 0, state.gap);

    // The turkey, or its head peeking from the haystack.
    if (state.turkey.hide > 0) drawHiddenTurkey(TURKEY.x, GROUND);
    else {
      drawTurkey(
        TURKEY.x,
        GROUND,
        state.turkey.y,
        state.turkey.runCycle,
        state.turkey.slide > 0,
        false,
        state.turkey.invulnerable > 0,
      );
    }

    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_OVER) {
      drawHud(state, screen);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    void t;
  }

  return { draw };
}
