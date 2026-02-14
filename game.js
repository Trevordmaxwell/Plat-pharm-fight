
import { WORLD, GAME } from "./config.js";
import { clamp, rectsOverlap, lerp } from "./utils.js";
import { createStage } from "./stage.js";
import { getCharacter } from "./roster.js";
import { Fighter } from "./fighter.js";
import { CPUController } from "./ai.js";
import { spawnSparks, spawnSmoke, spawnHearts } from "./effects.js";

export class Game{
  constructor(opts){
    this.canvas = opts.canvas;
    this.ctx = opts.ctx;
    this.input = opts.input;
    this.audio = opts.audio;
    this.settings = opts.settings;

    this.stage = createStage(opts.stageId || "rooftop");
    this.damageScale = opts.damageScale ?? 1;

    this.bestOf = opts.bestOf ?? 3;
    this.roundsToWin = Math.ceil(this.bestOf / 2);
    this.roundIndex = 1;

    this.timerMax = opts.timer ?? 99;
    this.timer = this.timerMax;

    this.state = "playing";
    this.pause = false;

    this.projectiles = [];
    this.particles = [];
    this.beams = [];

    this.hitstop = 0;
    this.koFreeze = 0;

    this.camera = {
      x: 0, y: 0,
      shakeT: 0,
      shakeMag: 0,
    };

    this.events = {
      onHud: () => {},
      onAnnounce: () => {},
      onRoundOver: () => {},
      onMatchOver: () => {},
    };

    // Create fighters
    const p1Char = getCharacter(opts.p1.charId);
    const p2Char = getCharacter(opts.p2.charId);

    this.players = {
      1: { type: opts.p1.type, cpu: null },
      2: { type: opts.p2.type, cpu: null },
    };

    if (this.players[1].type === "cpu") this.players[1].cpu = new CPUController(1, this.settings.difficulty);
    if (this.players[2].type === "cpu") this.players[2].cpu = new CPUController(2, this.settings.difficulty);

    this.fighters = [
      new Fighter({ id: 1, character: p1Char, x: this.stage.spawn[0].x, y: this.stage.spawn[0].y }),
      new Fighter({ id: 2, character: p2Char, x: this.stage.spawn[1].x, y: this.stage.spawn[1].y }),
    ];

    this.announcer = { text:"", t:0 };
    this.roundBanner();
  }

  setDifficulty(diff){
    this.settings.difficulty = diff;
    for (const p of [1,2]){
      if (this.players[p].cpu) this.players[p].cpu.setDifficulty(diff);
    }
  }

  getFighter(id){ return this.fighters.find(f => f.id === id); }
  getOpponent(id){ return this.fighters.find(f => f.id !== id); }

  announce(text, duration=0.9){
    this.announcer.text = text;
    this.announcer.t = duration;
    this.events.onAnnounce(text, duration);
  }

  roundBanner(){
    const t = `Round ${this.roundIndex}`;
    this.announce(t, 1.0);
  }

  onHitImpact(x,y, attackerId){
    // Hitstop and shake make hits feel snappy.
    this.hitstop = Math.max(this.hitstop, GAME.hitstopBase);

    if (this.settings.screenShake){
      this.camera.shakeT = Math.max(this.camera.shakeT, 0.12);
      this.camera.shakeMag = Math.max(this.camera.shakeMag, 8);
    }
    this.spawnSpark(x, y, 12, "rgba(255,255,255,0.25)");
  }

  spawnSpark(x,y,count=10,color){
    this.particles.push(...spawnSparks(x,y,count,color));
  }
  spawnSmoke(x,y,count=12){
    this.particles.push(...spawnSmoke(x,y,count));
  }
  spawnHearts(x,y,count=10){
    this.particles.push(...spawnHearts(x,y,count));
  }

  onKO(loserId){
    if (this.state !== "playing") return;
    this.koFreeze = GAME.koFreeze;
    this.audio?.sfx("ko");
    this.announce("KO!", 1.2);

    const winnerId = (loserId === 1) ? 2 : 1;
    const winner = this.getFighter(winnerId);
    if (winner) winner.wins += 1;

    // Round ends after freeze; match may end.
    this.state = "roundOver";
  }

  onTimeOver(){
    if (this.state !== "playing") return;
    this.koFreeze = 0.7;
    this.announce("TIME!", 1.0);

    const f1 = this.getFighter(1);
    const f2 = this.getFighter(2);
    const winnerId = (f1.health === f2.health) ? 0 : (f1.health > f2.health ? 1 : 2);
    if (winnerId !== 0) this.getFighter(winnerId).wins += 1;

    this.state = "roundOver";
  }

  restartRound(){
    // Reset fighters but keep wins.
    const f1 = this.getFighter(1);
    const f2 = this.getFighter(2);
    const w1 = f1.wins, w2 = f2.wins;

    f1.resetForRound(this.stage.spawn[0]);
    f2.resetForRound(this.stage.spawn[1]);
    f1.wins = w1; f2.wins = w2;

    this.projectiles = [];
    this.beams = [];
    this.particles = [];

    this.timer = this.timerMax;
    this.hitstop = 0;
    this.koFreeze = 0;
    this.state = "playing";

    this.roundBanner();
  }

  nextRound(){
    this.roundIndex += 1;
    this.restartRound();
  }

  rematch(){
    const f1 = this.getFighter(1);
    const f2 = this.getFighter(2);
    f1.wins = 0; f2.wins = 0;
    this.roundIndex = 1;
    this.restartRound();
  }

  update(dt){
    // Announcer timer
    if (this.announcer.t > 0){
      this.announcer.t = Math.max(0, this.announcer.t - dt);
      if (this.announcer.t === 0){
        this.events.onAnnounce("", 0);
      }
    }

    if (this.pause) return;

    if (this.hitstop > 0){
      this.hitstop = Math.max(0, this.hitstop - dt);
      // Still update particles a little to keep life.
      for (const p of this.particles) p.update(dt * 0.35);
      this.particles = this.particles.filter(p => !p.dead);
      return;
    }

    if (this.state === "roundOver"){
      this.koFreeze = Math.max(0, this.koFreeze - dt);
      // Let particles drift.
      for (const p of this.particles) p.update(dt);
      this.particles = this.particles.filter(p => !p.dead);

      if (this.koFreeze <= 0){
        this.handleRoundEnd();
      }
      return;
    }

    if (this.state !== "playing") return;

    // Timer
    if (this.timerMax > 0){
      this.timer = Math.max(0, this.timer - dt);
      if (this.timer <= 0){
        this.onTimeOver();
        return;
      }
    }

    // Update inputs for each fighter (human or CPU)
    const inputs = {};
    for (const id of [1,2]){
      const p = this.players[id];
      const self = this.getFighter(id);
      const opp = this.getOpponent(id);

      if (p.type === "cpu" && p.cpu){
        inputs[id] = p.cpu.update(dt, self, opp, this);
      } else {
        inputs[id] = this.input.actions[id];
      }
    }

    // Update fighters
    for (const f of this.fighters){
      f.update(dt, inputs[f.id], this);
    }

    // Projectiles
    for (const pr of this.projectiles){
      pr.update(dt, this);
      const target = this.getFighter(pr.ownerId === 1 ? 2 : 1);
      pr.tryHit(target, this);
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);

    // Beams
    for (const b of this.beams){
      b.age += dt;
      if (b.age <= b.life){
        const target = this.getFighter(b.ownerId === 1 ? 2 : 1);
        if (target && !target.dead && target.iFrames <= 0){
          const hurt = target.getHurtbox();
          if (rectsOverlap({x:b.x,y:b.y,w:b.w,h:b.h}, hurt)){
            target.takeHit({
              damage: b.damage,
              knockback: b.knockback,
              hitstun: b.hitstun,
              fromX: b.ownerId === 1 ? b.x : b.x + b.w,
              source: "beam",
            }, this);
            this.onHitImpact(hurt.x + hurt.w*0.5, hurt.y + hurt.h*0.5, b.ownerId);
          }
        }
      }
    }
    this.beams = this.beams.filter(b => b.age < b.life);

    // Fighter push-out (keeps them from stacking)
    this.resolveFighterOverlap();

    // Particles
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.dead);

    // Camera shake
    if (this.camera.shakeT > 0){
      this.camera.shakeT = Math.max(0, this.camera.shakeT - dt);
      this.camera.shakeMag = lerp(this.camera.shakeMag, 0, 0.2);
    }

    // HUD event
    const f1 = this.getFighter(1);
    const f2 = this.getFighter(2);
    this.events.onHud({
      p1: { name: f1.character.name, health: f1.health / f1.maxHealth, focus: f1.focus / 100, wins: f1.wins },
      p2: { name: f2.character.name, health: f2.health / f2.maxHealth, focus: f2.focus / 100, wins: f2.wins },
      timer: this.timer,
      roundIndex: this.roundIndex,
      roundsToWin: this.roundsToWin,
      bestOf: this.bestOf,
    });
  }

  resolveFighterOverlap(){
    const a = this.getFighter(1);
    const b = this.getFighter(2);
    if (!a || !b) return;
    const ha = a.getHurtbox();
    const hb = b.getHurtbox();
    if (!rectsOverlap(ha, hb)) return;

    const overlapX = (ha.x < hb.x) ? (ha.x + ha.w - hb.x) : (hb.x + hb.w - ha.x);
    const push = overlapX * 0.5 * 0.8;

    if (ha.x < hb.x){
      a.x -= push;
      b.x += push;
    } else {
      a.x += push;
      b.x -= push;
    }
  }

  handleRoundEnd(){
    const f1 = this.getFighter(1);
    const f2 = this.getFighter(2);

    const someoneWonMatch = (f1.wins >= this.roundsToWin) || (f2.wins >= this.roundsToWin);

    if (someoneWonMatch){
      this.state = "matchOver";
      const winner = (f1.wins > f2.wins) ? f1 : f2;
      this.events.onMatchOver({
        winnerId: winner.id,
        winnerName: winner.character.name,
        score: `${f1.wins}-${f2.wins}`,
      });
      return;
    }

    // Next round
    this.events.onRoundOver({
      score: `${f1.wins}-${f2.wins}`,
    });

    this.nextRound();
  }

  render(){
    const ctx = this.ctx;
    const { w, h } = WORLD;
    ctx.save();

    // Camera shake
    let shakeX = 0, shakeY = 0;
    if (this.camera.shakeT > 0 && this.settings.screenShake){
      const m = this.camera.shakeMag;
      shakeX = (Math.random() - 0.5) * m;
      shakeY = (Math.random() - 0.5) * m * 0.6;
    }
    this.camera.x = shakeX;
    this.camera.y = shakeY;

    ctx.clearRect(0,0,w,h);

    // BG
    this.stage.renderBg(ctx, this.camera);

    // Beams behind projectiles (they're big)
    for (const b of this.beams){
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "rgba(251,113,133,0.35)";
      ctx.fillRect(b.x + this.camera.x, b.y + this.camera.y, b.w, b.h);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + this.camera.x, b.y + this.camera.y, b.w, b.h);
      ctx.restore();
    }

    // Projectiles
    for (const p of this.projectiles){
      p.render(ctx);
    }

    // Fighters
    // Draw the one that's higher first for nicer overlap
    const ordered = [...this.fighters].sort((a,b) => a.y - b.y);
    for (const f of ordered){
      f.render(ctx, this);
    }

    // Particles
    for (const p of this.particles){
      p.render(ctx);
    }

    ctx.restore();
  }
}
