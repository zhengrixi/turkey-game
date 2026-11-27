// Gobble Dash — tuning numbers and colours in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 600 };

export const STEP = 1 / 60;

/** The run: three stages from the farmyard to the farm gate. */
export const RUN = {
  escapeDistance: 1500, // metres to the farm gate: reach it and the turkey is free
  pxPerMetre: 22,
  startGap: 34, // metres the farmer starts behind the turkey
  catchGap: 1.5, // metres: any closer and the farmer grabs the turkey
  stages: [
    { name: 'FARMYARD', from: 0, to: 500 },
    { name: 'BARNYARD', from: 500, to: 1000 },
    { name: 'THE KITCHEN', from: 1000, to: 1500 },
  ],
};

export const TURKEY = {
  x: 300, // fixed screen position; the world scrolls past it
  width: 56,
  height: 64,
  runSpeed: 255, // px/s at a steady trot
  sprintSpeed: 335, // px/s holding Right
  slowSpeed: 165, // px/s holding Left
  jumpVelocity: 950, // px/s upward
  gravity: 1800, // px/s^2
  slideTime: 0.75, // seconds a slide lasts
  hideTime: 1.6, // seconds a haystack hide lasts
  stumbleSlow: 0.9, // seconds of wobble after a hit
  invulnerable: 1.6, // seconds of flashing after a hit
};

export const FARMER = {
  baseSpeed: 232, // px/s he pounces at when the turkey stumbles
  catchUp: 34, // extra px/s when the gap is wide (he hates losing you)
  giveUp: 26, // px/s slower when he is right on your tail (a narrow escape stays fair)
  stumbleGain: 5, // metres he gains when the turkey stumbles
  hideLoss: 14, // metres he loses when the turkey hides in a haystack
  searchEvery: 19, // seconds between his pauses to look around
  searchGain: 6, // metres the turkey gains while he searches
  closeGap: 18, // metres: past this he starts closing in
};

export const HAZARDS = {
  fence: { width: 42, height: 64, points: 10 }, // jump it
  knife: { width: 26, height: 96, points: 20 }, // a dropping carving knife: pass while the blade is up, jump it when it is down
  oven: { width: 64, height: 110, points: 30 }, // the kitchen oven: jump clean over it
  line: { width: 44, height: 46, points: 15 }, // a washing line hung low: slide under it
};

export const PICKUPS = {
  corn: { size: 30, points: 25 },
  goldenCorn: { size: 34, points: 100, chance: 0.16 },
};

export const SCORING = {
  perMetre: 10,
  heartBonus: 150, // per heart left, on escaping
  stumblePenalty: 0,
};

export const LIVES = 3;

export const PALETTE = {
  farmSkyTop: '#f7b733',
  farmSkyMid: '#fbd38d',
  farmSkyLow: '#fdeec7',
  barnSkyTop: '#e2703a',
  barnSkyMid: '#f2a65a',
  barnSkyLow: '#fbe3b0',
  kitchenWall: '#8d5a3b',
  kitchenWallLow: '#6e4429',
  kitchenFloor: '#a4713f',
  sun: '#ffd76a',
  cloud: '#fff7e6',
  hillFar: '#c98f4e',
  hillNear: '#8a6d3b',
  grass: '#7fae62',
  grassDry: '#b99b4e',
  dirt: '#9c6b3f',
  dirtDark: '#7d5230',
  barn: '#a63d2f',
  barnRoof: '#6e2a1e',
  barnTrim: '#f5e6c8',
  fenceWood: '#8a5a2b',
  hay: '#e8b64c',
  hayDark: '#c9932f',
  pumpkin: '#e8762b',
  pumpkinStem: '#4d7a35',
  tree: '#5d7a35',
  treeTrunk: '#6b4423',
  turkeyBody: '#8a5a2b',
  turkeyWing: '#6e4423',
  turkeyHead: '#c98a4b',
  turkeyBeak: '#e8a13c',
  turkeyWattle: '#c0392b',
  turkeyTail: '#b0713a',
  turkeyTailDark: '#7d4e24',
  turkeyLeg: '#e8a13c',
  farmerShirt: '#3e6fa3',
  farmerOveralls: '#2f4d6d',
  farmerHat: '#e8c96a',
  farmerSkin: '#e8b88a',
  farmerBeard: '#f0e6d2',
  ovenBody: '#4a4a52',
  ovenDoor: '#2b2b31',
  ovenFire: '#ff7b2f',
  ovenFireHot: '#ffd23c',
  knifeBlade: '#dfe6ee',
  knifeEdge: '#ffffff',
  knifeHandle: '#5a2d18',
  lineRope: '#f0e6d2',
  linePot: '#7a7a85',
  corn: '#ffd23c',
  cornHusk: '#5d9e4a',
  goldenCorn: '#ffb400',
  hudPanel: 'rgba(46, 26, 10, 0.72)',
  hudText: '#fff3d6',
  hudAmber: '#ffc93c',
  hudGreen: '#7be495',
  hudRed: '#ff6b5e',
  text: '#fff8e7',
  muted: '#e8d5b0',
  titleBrown: '#5a3418',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'gobble-dash.best';
