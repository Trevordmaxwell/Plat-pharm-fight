
import { GAME, PHYS } from "./config.js";
import { clamp } from "./utils.js";

export const ROSTER = [
  makeParry(),
  makePillmore(),
  makeFinneas(),
  makeFerbald(),
  makeIzzy(),
  makeAgentAardvark(),
];

export function getCharacter(id){
  return ROSTER.find(c => c.id === id) || ROSTER[0];
}

export function listCharacters(){
  return ROSTER.map(c => ({ id: c.id, name: c.name, tagline: c.tagline }));
}

function baseMoves(){
  return {
    light: {
      id: "light",
      name: "Light",
      kind: "melee",
      startup: 0.07,
      active: 0.10,
      recovery: 0.18,
      damage: 42,
      hitstun: 0.18,
      knockback: { x: 360, y: -220 },
      hitbox: { x: 34, y: 18, w: 40, h: 26 },
      sfx: "light",
    },
    heavy: {
      id: "heavy",
      name: "Heavy",
      kind: "melee",
      startup: 0.13,
      active: 0.12,
      recovery: 0.30,
      damage: 86,
      hitstun: 0.28,
      knockback: { x: 520, y: -360 },
      hitbox: { x: 36, y: 8, w: 54, h: 34 },
      sfx: "heavy",
    },
    special: {
      id: "special",
      name: "Special",
      kind: "melee",
      startup: 0.14,
      active: 0.16,
      recovery: 0.34,
      damage: 90,
      hitstun: 0.32,
      knockback: { x: 560, y: -320 },
      hitbox: { x: 40, y: 14, w: 56, h: 34 },
      specialCost: GAME.specialCost,
      sfx: "special",
    },
    ultimate: {
      id: "ultimate",
      name: "Ultimate",
      kind: "melee",
      startup: 0.22,
      active: 0.24,
      recovery: 0.44,
      damage: 160,
      hitstun: 0.40,
      knockback: { x: 760, y: -520 },
      hitbox: { x: 42, y: 6, w: 70, h: 44 },
      specialCost: GAME.ultimateCost,
      sfx: "special",
    }
  };
}

function makeParry(){
  const moves = baseMoves();
  moves.light.name = "Tail Tap";
  moves.heavy.name = "Tail Slam";
  moves.heavy.knockback = { x: 560, y: -420 };
  moves.special = {
    id: "special",
    name: "Tail Tornado",
    kind: "dash",
    startup: 0.10,
    active: 0.22,
    recovery: 0.22,
    damage: 96,
    hitstun: 0.30,
    knockback: { x: 640, y: -260 },
    hitbox: { x: 28, y: 10, w: 64, h: 46 },
    dash: { speed: 740, lockY: true },
    specialCost: GAME.specialCost,
    sfx: "special",
  };
  moves.ultimate = {
    id: "ultimate",
    name: "Agent Spin‑Cycle",
    kind: "dash",
    startup: 0.12,
    active: 0.42,
    recovery: 0.36,
    damage: 180,
    hitstun: 0.46,
    knockback: { x: 860, y: -420 },
    hitbox: { x: 22, y: 6, w: 74, h: 54 },
    dash: { speed: 900, lockY: false },
    specialCost: GAME.ultimateCost,
    sfx: "special",
  };

  return {
    id: "parry",
    name: "Parry the Platypus",
    tagline: "Silent. Slightly damp. Very committed.",
    archetype: "platypus",
    palette: { main: "#3b82f6", accent: "#f59e0b", trim:"#0ea5e9" },
    stats: {
      speed: 1.08,
      weight: 0.92,
      jumpBoost: 1.06,
    },
    moves,
  };
}

function makePillmore(){
  const moves = baseMoves();
  moves.light.name = "Receipt Slap";
  moves.heavy.name = "Syringe Uppercut";
  moves.heavy.hitbox = { x: 28, y: -2, w: 56, h: 56 };
  moves.heavy.knockback = { x: 520, y: -520 };

  moves.special = {
    id: "special",
    name: "Capsule Toss",
    kind: "projectile",
    startup: 0.18,
    active: 0.02,
    recovery: 0.26,
    damage: 74,
    hitstun: 0.24,
    knockback: { x: 520, y: -240 },
    projectile: { type:"capsule", speed: 820, radius: 12, gravity: 0, bounces: 0, life: 1.6 },
    specialCost: GAME.specialCost,
    sfx: "special",
  };

  moves.ultimate = {
    id: "ultimate",
    name: "Side‑Effects Storm",
    kind: "projectile",
    startup: 0.22,
    active: 0.06,
    recovery: 0.40,
    damage: 120,
    hitstun: 0.36,
    knockback: { x: 660, y: -320 },
    projectile: { type:"storm", speed: 760, radius: 16, gravity: 380, bounces: 1, life: 2.3, multi: 3, spread: 0.22 },
    specialCost: GAME.ultimateCost,
    sfx: "special",
  };

  return {
    id: "pillmore",
    name: "Dr. Pillmore",
    tagline: "Licensed to refill… chaos.",
    archetype: "pharmacist",
    palette: { main: "#22c55e", accent: "#e5e7eb", trim:"#10b981" },
    stats: {
      speed: 0.92,
      weight: 1.18,
      jumpBoost: 0.94,
    },
    moves,
  };
}

function makeFinneas(){
  const moves = baseMoves();
  moves.light.name = "Blueprint Bonk";
  moves.heavy.name = "Idea Hammer";
  moves.special = {
    id: "special",
    name: "Boomer‑Plan",
    kind: "boomerang",
    startup: 0.14,
    active: 0.02,
    recovery: 0.18,
    damage: 68,
    hitstun: 0.22,
    knockback: { x: 460, y: -240 },
    projectile: { type:"boomerplan", speed: 720, radius: 10, gravity: 0, bounces: 0, life: 2.2, returnAfter: 0.8 },
    specialCost: GAME.specialCost,
    sfx: "special",
  };
  moves.ultimate = {
    id: "ultimate",
    name: "Weekend Montage",
    kind: "melee",
    startup: 0.16,
    active: 0.30,
    recovery: 0.36,
    damage: 170,
    hitstun: 0.42,
    knockback: { x: 740, y: -420 },
    hitbox: { x: 22, y: 0, w: 82, h: 54 },
    dash: { speed: 540, lockY: false },
    specialCost: GAME.ultimateCost,
    sfx: "special",
  };
  return {
    id: "finneas",
    name: "Finneas the Planner",
    tagline: "Has a plan for your plan’s plan.",
    archetype: "inventor",
    palette: { main: "#f97316", accent: "#eab308", trim:"#fb7185" },
    stats: {
      speed: 1.00,
      weight: 1.00,
      jumpBoost: 1.00,
    },
    moves,
  };
}

function makeFerbald(){
  const moves = baseMoves();
  moves.light.name = "Quiet Elbow";
  moves.heavy.name = "Wrench Whack";
  moves.special = {
    id: "special",
    name: "Rocket Boots",
    kind: "dash",
    startup: 0.12,
    active: 0.26,
    recovery: 0.24,
    damage: 102,
    hitstun: 0.30,
    knockback: { x: 680, y: -280 },
    hitbox: { x: 30, y: 12, w: 64, h: 44 },
    dash: { speed: 820, lockY: false, upBoost: -180 },
    specialCost: GAME.specialCost,
    sfx: "special",
  };
  moves.ultimate = {
    id: "ultimate",
    name: "Silent Megadrill",
    kind: "melee",
    startup: 0.18,
    active: 0.22,
    recovery: 0.34,
    damage: 190,
    hitstun: 0.44,
    knockback: { x: 820, y: -520 },
    hitbox: { x: 36, y: 0, w: 70, h: 56 },
    specialCost: GAME.ultimateCost,
    sfx: "heavy",
  };
  return {
    id: "ferbald",
    name: "Ferbald the Quiet",
    tagline: "Says nothing. Hits loudly.",
    archetype: "quiet",
    palette: { main: "#a78bfa", accent: "#22c55e", trim:"#60a5fa" },
    stats: {
      speed: 0.98,
      weight: 1.08,
      jumpBoost: 0.98,
    },
    moves,
  };
}

function makeIzzy(){
  const moves = baseMoves();
  moves.light.name = "Cheer Chop";
  moves.heavy.name = "Friendship Forearm";
  moves.special = {
    id: "special",
    name: "Heart‑String",
    kind: "projectile",
    startup: 0.16,
    active: 0.02,
    recovery: 0.22,
    damage: 60,
    hitstun: 0.32,
    knockback: { x: 320, y: -160 },
    projectile: { type:"heart", speed: 640, radius: 12, gravity: 0, bounces: 0, life: 2.0, onHitEffect: "charm" },
    specialCost: GAME.specialCost,
    sfx: "special",
  };
  moves.ultimate = {
    id: "ultimate",
    name: "Friendship Beam",
    kind: "beam",
    startup: 0.24,
    active: 0.16,
    recovery: 0.46,
    damage: 200,
    hitstun: 0.42,
    knockback: { x: 860, y: -260 },
    beam: { length: 520, thickness: 44, life: 0.16 },
    specialCost: GAME.ultimateCost,
    sfx: "special",
  };
  return {
    id: "izzy",
    name: "Izzy Bella‑Ring",
    tagline: "Weaponized enthusiasm.",
    archetype: "cheer",
    palette: { main: "#fb7185", accent: "#60a5fa", trim:"#f472b6" },
    stats: {
      speed: 1.04,
      weight: 0.96,
      jumpBoost: 1.06,
    },
    moves,
  };
}

function makeAgentAardvark(){
  const moves = baseMoves();
  moves.light.name = "Notebook Jab";
  moves.heavy.name = "Grapple Pop";
  moves.special = {
    id: "special",
    name: "Smoke Poof",
    kind: "teleport",
    startup: 0.12,
    active: 0.02,
    recovery: 0.22,
    damage: 0,
    hitstun: 0,
    knockback: { x: 0, y: 0 },
    teleport: { distance: 220 },
    specialCost: GAME.specialCost,
    sfx: "special",
  };
  moves.ultimate = {
    id: "ultimate",
    name: "Top‑Secret Pounce",
    kind: "dash",
    startup: 0.14,
    active: 0.34,
    recovery: 0.40,
    damage: 170,
    hitstun: 0.44,
    knockback: { x: 820, y: -420 },
    hitbox: { x: 26, y: 6, w: 74, h: 50 },
    dash: { speed: 880, lockY: false },
    specialCost: GAME.ultimateCost,
    sfx: "heavy",
  };

  return {
    id: "aardvark",
    name: "Agent Aardvark",
    tagline: "This message will self‑destruct into confetti.",
    archetype: "agent",
    palette: { main: "#facc15", accent: "#0ea5e9", trim:"#22c55e" },
    stats: {
      speed: 1.02,
      weight: 0.98,
      jumpBoost: 1.02,
    },
    moves,
  };
}
