
export const WORLD = {
  w: 960,
  h: 540,
  gravity: 2400,
};

export const PHYS = {
  moveSpeed: 420,
  airMoveSpeed: 340,
  jumpVel: -940,
  doubleJumpVel: -860,
  maxFall: 1200,
  groundFriction: 0.86,
  airDrag: 0.985,
  pushOutStrength: 0.8,
};

export const GAME = {
  maxHealth: 1000,
  focusMax: 100,
  focusFromDamageDealt: 0.035,
  focusFromDamageTaken: 0.055,
  focusGuardDrainPerSec: 8,
  focusRegenPerSec: 3.2,
  specialCost: 30,
  ultimateCost: 100,
  hitstopBase: 0.055,
  hitflashBase: 0.11,
  iFramesOnHit: 0.22,
  minKnockback: 120,
  koFreeze: 1.0,
};

export const COLORS = {
  uiBg: "#111827",
  uiText: "#e5e7eb",
};

export const DEFAULT_SETTINGS = {
  sfx: true,
  screenShake: true,
  hitflash: true,
  debug: false,
  difficulty: "normal", // easy, normal, spicy
};
