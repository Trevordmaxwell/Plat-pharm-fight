
import { WORLD, DEFAULT_SETTINGS } from "./config.js";
import { InputManager } from "./input.js";
import { AudioManager } from "./audio.js";
import { Game } from "./game.js";
import { listCharacters, getCharacter } from "./roster.js";
import { formatTime, clamp } from "./utils.js";

const clone = (v) => (globalThis.structuredClone ? globalThis.structuredClone(v) : JSON.parse(JSON.stringify(v)));

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const input = new InputManager();

const settings = loadSettings();
const audio = new AudioManager(settings);

// UI elements
const screens = {
  start: document.getElementById("screen-start"),
  select: document.getElementById("screen-select"),
  help: document.getElementById("screen-help"),
  settings: document.getElementById("screen-settings"),
  pause: document.getElementById("screen-pause"),
  matchover: document.getElementById("screen-matchover"),
};

const hud = document.getElementById("hud");
const announcerEl = document.getElementById("announcer");
const timerEl = document.getElementById("timer");
const roundsEl = document.getElementById("rounds");
const p1NameEl = document.getElementById("p1-name");
const p2NameEl = document.getElementById("p2-name");
const p1HealthEl = document.getElementById("p1-health");
const p2HealthEl = document.getElementById("p2-health");
const p1FocusEl = document.getElementById("p1-focus");
const p2FocusEl = document.getElementById("p2-focus");

const touchRoot = document.getElementById("touch-controls");
const touchP1 = touchRoot.querySelector('.touch-player[data-player="1"]');
const touchP2 = touchRoot.querySelector('.touch-player[data-player="2"]');

// Buttons
const btnPlay = document.getElementById("btn-play");
const btnTraining = document.getElementById("btn-training");
const btnHelp = document.getElementById("btn-help");
const btnSettings = document.getElementById("btn-settings");
const btnBackFromHelp = document.getElementById("btn-back-from-help");
const btnBackFromSettings = document.getElementById("btn-back-from-settings");
const btnGoSelect = document.getElementById("btn-go-select");
const btnBackFromSelect = document.getElementById("btn-back-from-select");
const btnStartMatch = document.getElementById("btn-start-match");
const btnPause = document.getElementById("btn-pause");

const btnResume = document.getElementById("btn-resume");
const btnRestart = document.getElementById("btn-restart");
const btnQuit = document.getElementById("btn-quit");

const btnRematch = document.getElementById("btn-rematch");
const btnMenu = document.getElementById("btn-menu");

const matchOverTitle = document.getElementById("matchover-title");
const matchOverSub = document.getElementById("matchover-sub");

// Select screen controls
const p1Type = document.getElementById("p1-type");
const p2Type = document.getElementById("p2-type");
const p1Char = document.getElementById("p1-char");
const p2Char = document.getElementById("p2-char");

const p1Info = document.getElementById("p1-info");
const p2Info = document.getElementById("p2-info");

const optRounds = document.getElementById("opt-rounds");
const optTimer = document.getElementById("opt-timer");
const optStage = document.getElementById("opt-stage");
const optDmg = document.getElementById("opt-dmg");
const optDmgVal = document.getElementById("opt-dmg-val");
const optTouch = document.getElementById("opt-touch");
const optTouchLayout = document.getElementById("opt-touch-layout");

// Settings controls
const setSfx = document.getElementById("set-sfx");
const setScreenShake = document.getElementById("set-screen-shake");
const setHitflash = document.getElementById("set-hitflash");
const setDebug = document.getElementById("set-debug");
const setDifficulty = document.getElementById("set-difficulty");

let game = null;
let inMatch = false;

// Populate roster
const roster = listCharacters();
for (const c of roster){
  const o1 = document.createElement("option");
  o1.value = c.id;
  o1.textContent = c.name;
  p1Char.appendChild(o1);

  const o2 = document.createElement("option");
  o2.value = c.id;
  o2.textContent = c.name;
  p2Char.appendChild(o2);
}
// Defaults
p1Char.value = "parry";
p2Char.value = "pillmore";

updateCharInfo(1);
updateCharInfo(2);

p1Char.addEventListener("change", () => updateCharInfo(1));
p2Char.addEventListener("change", () => updateCharInfo(2));


function updateCharInfo(player){
  const sel = (player === 1) ? p1Char : p2Char;
  const el = (player === 1) ? p1Info : p2Info;
  if (!el) return;

  const c = getCharacter(sel.value);
  const m = c.moves;
  el.innerHTML = `
    <div><b>${c.name}</b></div>
    <div class="muted">${c.tagline}</div>
    <div style="margin-top:6px;">
      <b>Light:</b> ${m.light.name}<br/>
      <b>Heavy:</b> ${m.heavy.name}<br/>
      <b>Special:</b> ${m.special.name} <span class="muted">(${m.special.specialCost ?? 0} Focus)</span><br/>
      <b>Ultimate:</b> ${m.ultimate.name} <span class="muted">(${m.ultimate.specialCost ?? 100} Focus)</span>
    </div>
    <div class="muted" style="margin-top:6px;">Ultimate: press <b>Special + Heavy</b>.</div>
  `;
}

// Bind settings UI
setSfx.checked = settings.sfx;
setScreenShake.checked = settings.screenShake;
setHitflash.checked = settings.hitflash;
setDebug.checked = settings.debug;
setDifficulty.value = settings.difficulty;

setSfx.addEventListener("change", () => { settings.sfx = setSfx.checked; audio.setEnabled(settings.sfx); saveSettings(); });
setScreenShake.addEventListener("change", () => { settings.screenShake = setScreenShake.checked; saveSettings(); });
setHitflash.addEventListener("change", () => { settings.hitflash = setHitflash.checked; saveSettings(); });
setDebug.addEventListener("change", () => { settings.debug = setDebug.checked; saveSettings(); });
setDifficulty.addEventListener("change", () => { settings.difficulty = setDifficulty.value; if (game) game.setDifficulty(settings.difficulty); saveSettings(); });

optDmg.addEventListener("input", () => {
  optDmgVal.textContent = `${Number(optDmg.value).toFixed(2)}×`;
});

// Screen navigation
btnPlay.addEventListener("click", () => { audio.unlock(); audio.sfx("menu"); showScreen("select"); });
btnTraining.addEventListener("click", () => { audio.unlock(); audio.sfx("menu"); startTraining(); });
btnHelp.addEventListener("click", () => { audio.unlock(); audio.sfx("menu"); showScreen("help"); });
btnSettings.addEventListener("click", () => { audio.unlock(); audio.sfx("menu"); showScreen("settings"); });
btnBackFromHelp.addEventListener("click", () => { audio.sfx("menu"); showScreen("start"); });
btnBackFromSettings.addEventListener("click", () => { audio.sfx("menu"); showScreen("start"); });
btnGoSelect.addEventListener("click", () => { audio.sfx("menu"); showScreen("select"); });
btnBackFromSelect.addEventListener("click", () => { audio.sfx("menu"); showScreen("start"); });

btnStartMatch.addEventListener("click", () => { audio.unlock(); startMatchFromUI(); });

btnPause.addEventListener("click", () => togglePause(true));
btnResume.addEventListener("click", () => togglePause(false));
btnRestart.addEventListener("click", () => { if (game) game.rematch(); togglePause(false); });
btnQuit.addEventListener("click", () => { quitToMenu(); });

btnRematch.addEventListener("click", () => { if (game) game.rematch(); hideScreen("matchover"); });
btnMenu.addEventListener("click", () => { quitToMenu(); });

// Touch controls wiring
wireTouchButtons();

// Canvas / rendering setup
function resizeCanvas(){
  const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  canvas.width = Math.floor(WORLD.w * dpr);
  canvas.height = Math.floor(WORLD.h * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Main loop (fixed timestep)
let last = performance.now();
let acc = 0;
const FIXED = 1/60;

function loop(t){
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  acc += dt;

  // Run a few steps max to avoid spiral of death.
  let steps = 0;
  while (acc >= FIXED && steps < 5){
    input.update();

    // Global shortcuts
    if (input.actions.system.pausePressed && inMatch){
      togglePause(!game.pause);
    }

    if (game && inMatch){
      game.update(FIXED);
    }

    acc -= FIXED;
    steps += 1;
  }

  // Render
  if (game && inMatch){
    game.render();
  } else {
    // Idle background
    renderIdle();
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Idle background so it doesn't look blank under menus
function renderIdle(){
  ctx.clearRect(0,0,WORLD.w,WORLD.h);
  const g = ctx.createLinearGradient(0,0,0,WORLD.h);
  g.addColorStop(0, "#0b2a4a");
  g.addColorStop(1, "#0b1020");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,WORLD.w,WORLD.h);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(70, 420, 820, 60);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.font = "bold 18px ui-sans-serif, system-ui";
  ctx.fillText("Tip: Special moves use Focus. Earn it by fighting!", 120, 120);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.font = "bold 14px ui-sans-serif, system-ui";
  ctx.fillText("Keyboard: P1 WASD+FGH • P2 Arrows+JKL • Guard: E / I", 120, 150);
}

function showScreen(name){
  for (const k of Object.keys(screens)){
    screens[k].classList.toggle("active", k === name);
  }
  // HUD and touch hidden unless in match
  if (!inMatch){
    hud.classList.add("hidden");
    hud.setAttribute("aria-hidden", "true");
    touchRoot.classList.add("hidden");
    touchRoot.setAttribute("aria-hidden", "true");
  }
}

function hideScreen(name){
  screens[name].classList.remove("active");
}

function togglePause(paused){
  if (!game) return;
  game.pause = paused;
  if (paused){
    screens.pause.classList.add("active");
  } else {
    screens.pause.classList.remove("active");
  }
}

function quitToMenu(){
  inMatch = false;
  game = null;
  screens.pause.classList.remove("active");
  screens.matchover.classList.remove("active");
  showScreen("start");
}

function startTraining(){
  // Training: infinite timer, P1 human vs CPU
  p1Type.value = "human";
  p2Type.value = "cpu";
  optTimer.value = "0";
  optRounds.value = "1";
  optDmg.value = "1";
  optDmgVal.textContent = "1.00×";
  optStage.value = "rooftop";
  startMatchFromUI(/*training*/true);
}

function startMatchFromUI(training=false){
  const bestOf = Number(optRounds.value);
  const timer = Number(optTimer.value);
  const stageId = optStage.value;
  const damageScale = Number(optDmg.value);

  const p1 = { type: p1Type.value, charId: p1Char.value };
  const p2 = { type: p2Type.value, charId: p2Char.value };

  game = new Game({
    canvas, ctx, input, audio, settings,
    stageId, bestOf, timer, damageScale,
    p1, p2,
  });

  game.events.onHud = (hudData) => {
    p1NameEl.textContent = hudData.p1.name + ` (${hudData.p1.wins})`;
    p2NameEl.textContent = hudData.p2.name + ` (${hudData.p2.wins})`;

    setBar(p1HealthEl, hudData.p1.health, "left");
    setBar(p2HealthEl, hudData.p2.health, "right");

    setBar(p1FocusEl, hudData.p1.focus, "left");
    setBar(p2FocusEl, hudData.p2.focus, "right");

    timerEl.textContent = (timer === 0) ? "∞" : formatTime(hudData.timer);
    roundsEl.textContent = `Best of ${hudData.bestOf} • First to ${hudData.roundsToWin}`;
  };

  game.events.onAnnounce = (text, duration) => {
    announcerEl.textContent = text || "";
  };

  game.events.onMatchOver = ({ winnerId, winnerName, score }) => {
    inMatch = true;
    showMatchOver(winnerId, winnerName, score);
  };

  inMatch = true;
  hud.classList.remove("hidden");
  hud.setAttribute("aria-hidden", "false");

  // Touch controls mode
  const touchMode = computeTouchMode();
  applyTouchMode(touchMode);

  // Hide screens
  for (const k of Object.keys(screens)){
    screens[k].classList.remove("active");
  }

  announcerEl.textContent = "";
}

function showMatchOver(winnerId, winnerName, score){
  matchOverTitle.textContent = "Match Over!";
  matchOverSub.textContent = `Winner: ${winnerName} • Score ${score}`;
  screens.matchover.classList.add("active");
}

function setBar(el, value, side){
  const v = clamp(value, 0, 1);
  if (side === "right"){
    el.style.transform = `scaleX(${v})`;
  } else {
    el.style.transform = `scaleX(${v})`;
  }
}

// Touch controls detection / toggles
function hasTouch(){
  return (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.("(pointer: coarse)").matches;
}

function computeTouchMode(){
  const pref = optTouch.value;
  if (pref === "on") return true;
  if (pref === "off") return false;
  return hasTouch();
}

function applyTouchMode(on){
  if (!on){
    touchRoot.classList.add("hidden");
    touchRoot.setAttribute("aria-hidden", "true");
    // Clear virtual buttons
    for (const p of [1,2]){
      for (const a of ["left","right","up","down","light","heavy","special","guard"]){
        input.setVirtual(p, a, false);
      }
    }
    return;
  }

  touchRoot.classList.remove("hidden");
  touchRoot.setAttribute("aria-hidden", "false");

  const layout = optTouchLayout.value;

  if (layout === "single"){
    // Only show P1 controls, unless P2 is human (then we fall back to dual).
    if (p2Type.value === "human"){
      touchP1.style.display = "";
      touchP2.style.display = "";
    } else {
      touchP1.style.display = "";
      touchP2.style.display = "none";
    }
  } else {
    touchP1.style.display = "";
    touchP2.style.display = "";
  }
}

function wireTouchButtons(){
  const btns = touchRoot.querySelectorAll(".tbtn");
  for (const b of btns){
    const playerEl = b.closest(".touch-player");
    const player = Number(playerEl?.dataset?.player || "1");
    const action = b.dataset.action;

    const setDown = (down) => {
      input.setVirtual(player, action, down);
      b.classList.toggle("active", down);
      if (down) audio.unlock();
    };

    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      setDown(true);
    });
    b.addEventListener("pointerup", (e) => {
      e.preventDefault();
      setDown(false);
    });
    b.addEventListener("pointercancel", (e) => {
      e.preventDefault();
      setDown(false);
    });
    b.addEventListener("pointerleave", (e) => {
      // If pointer isn't captured, treat leaving as up.
      setDown(false);
    });
  }
}

// Save settings locally
function loadSettings(){
  try{
    const raw = localStorage.getItem("pvp_settings_v1");
    if (!raw) return clone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return { ...clone(DEFAULT_SETTINGS), ...parsed };
  }catch(e){
    return clone(DEFAULT_SETTINGS);
  }
}

function saveSettings(){
  try{
    localStorage.setItem("pvp_settings_v1", JSON.stringify(settings));
  }catch(e){}
}

// On load, show start screen
showScreen("start");

// Unlock audio on first interaction anywhere
window.addEventListener("pointerdown", () => audio.unlock(), { passive:true });
window.addEventListener("keydown", () => audio.unlock(), { passive:true });
