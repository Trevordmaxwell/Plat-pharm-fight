
import { WORLD, PHYS, GAME } from "./config.js";
import { clamp, rectsOverlap, sign, lerp } from "./utils.js";
import { Projectile } from "./projectile.js";

export class Fighter{
  constructor(opts){
    Object.assign(this, opts);
    this.w = 54;
    this.h = 78;

    this.vx = 0;
    this.vy = 0;
    this.facing = (this.id === 1) ? 1 : -1;

    this.maxHealth = GAME.maxHealth;
    this.health = this.maxHealth;

    this.focus = 0;

    this.onGround = false;
    this.jumpUsed = 0;
    this.dropThrough = 0;

    this.state = "idle";
    this.stateTime = 0;

    this.attack = null;
    this.attackTime = 0;
    this.attackHasHit = false;
    this.attackSpawned = false;

    this.iFrames = 0;
    this.hitstun = 0;
    this.hitflash = 0;

    this.guardDrainAccum = 0;

    this.status = {
      confused: 0, // movement reversed
      chilled: 0,
    };

    this.dead = false;
    this.wins = 0;

    // For silly animation
    this.squash = 1.0;
    this.bob = 0;
  }

  resetForRound(spawn){
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumpUsed = 0;
    this.dropThrough = 0;

    this.health = this.maxHealth;
    this.focus = 0;

    this.state = "idle";
    this.stateTime = 0;
    this.attack = null;
    this.attackTime = 0;
    this.attackHasHit = false;
    this.attackSpawned = false;

    this.iFrames = 0;
    this.hitstun = 0;
    this.hitflash = 0;

    this.status.confused = 0;
    this.status.chilled = 0;

    this.dead = false;
  }

  getHurtbox(){
    // Slightly inset for nicer hits.
    return { x: this.x + 6, y: this.y + 6, w: this.w - 12, h: this.h - 10 };
  }

  getFeet(){
    return { x: this.x + this.w * 0.5, y: this.y + this.h };
  }

  isBlocking(oppX, input){
    if (!input.guard) return false;
    if (this.focus <= 0.5) return false;

    // If holding "back" also helps, but guard button is enough.
    // We keep nuance: guarding in the wrong direction is less effective.
    const facingToOpp = (oppX > this.x) ? 1 : -1;
    const isFacingOpp = this.facing === facingToOpp;

    // If you're facing away from the opponent while guarding, it still works,
    // but not as well.
    return true;
  }

  update(dt, input, game){
    if (this.dead) return;

    this.stateTime += dt;

    if (this.iFrames > 0) this.iFrames = Math.max(0, this.iFrames - dt);
    if (this.hitstun > 0) this.hitstun = Math.max(0, this.hitstun - dt);
    if (this.hitflash > 0) this.hitflash = Math.max(0, this.hitflash - dt);

    for (const k of Object.keys(this.status)){
      if (this.status[k] > 0) this.status[k] = Math.max(0, this.status[k] - dt);
    }

    // Passive focus regen when not guarding.
    if (!input.guard){
      this.focus = clamp(this.focus + GAME.focusRegenPerSec * dt, 0, GAME.focusMax);
    } else {
      // Guard drains focus, so turtling isn't free.
      this.guardDrainAccum += dt;
      const drain = GAME.focusGuardDrainPerSec * dt;
      this.focus = clamp(this.focus - drain, 0, GAME.focusMax);
    }

    // Face the opponent when possible (feels better).
    const opp = game.getOpponent(this.id);
    if (opp && !this.isLocked()){
      this.facing = (opp.x > this.x) ? 1 : -1;
    }

    // Handle hitstun: can't act, but still moves/lands.
    if (this.hitstun > 0){
      this.state = "hitstun";
      this.updatePhysics(dt, input, game, /*canControl*/false);
      return;
    }

    // Attacking locks you until move is over.
    if (this.attack){
      this.state = "attack";
      this.attackTime += dt;
      this.handleAttack(dt, input, game);
      this.updatePhysics(dt, input, game, /*canControl*/false);
      return;
    }

    // Otherwise: movement & actions.
    this.updatePhysics(dt, input, game, /*canControl*/true);

    // Actions after physics (so jump is responsive)
    const wantsUltimate = input.specialPressed && (input.heavy || input.light);
    if (wantsUltimate && this.focus >= (this.character.moves.ultimate?.specialCost ?? GAME.ultimateCost)){
      this.startAttack("ultimate", game);
      return;
    }

    if (input.lightPressed){
      this.startAttack("light", game);
      return;
    }
    if (input.heavyPressed){
      this.startAttack("heavy", game);
      return;
    }
    if (input.specialPressed){
      const cost = this.character.moves.special?.specialCost ?? GAME.specialCost;
      if (this.focus >= cost){
        this.startAttack("special", game);
      } else {
        game.announce(`${this.id === 1 ? "P1" : "P2"} needs Focus!`, 0.6);
        game.audio?.sfx("block");
      }
      return;
    }

    // State label
    if (!this.onGround){
      this.state = (this.vy < 0) ? "jump" : "fall";
    } else {
      if (input.down) this.state = "crouch";
      else if (Math.abs(this.vx) > 12) this.state = "run";
      else this.state = "idle";
    }
  }

  isLocked(){
    return this.attack != null || this.hitstun > 0;
  }

  startAttack(kind, game){
    const def = this.character.moves[kind];
    if (!def) return;

    const cost = def.specialCost ?? 0;
    if (cost > 0){
      this.focus = clamp(this.focus - cost, 0, GAME.focusMax);
    }

    this.attack = def;
    this.attackTime = 0;
    this.attackHasHit = false;
    this.attackSpawned = false;

    // Tiny wind-up squash
    this.squash = 0.92;
    game.audio?.sfx(def.sfx || "light");

    if (def.kind === "teleport"){
      // Teleport is instant-ish: after startup, relocate.
      // We'll do it in handleAttack based on timing.
    }
  }

  handleAttack(dt, input, game){
    const a = this.attack;
    if (!a) return;

    // During dash moves, apply a controlled burst.
    if (a.dash){
      const t = this.attackTime;
      if (t >= a.startup && t <= a.startup + a.active){
        const spd = a.dash.speed;
        this.vx = spd * this.facing;
        if (a.dash.lockY) this.vy = Math.min(this.vy, 0); // keep it mostly grounded
        if (a.dash.upBoost != null){
          this.vy = Math.min(this.vy, a.dash.upBoost);
        }
      }
    }

    // Spawn projectile/beam/teleport once at the start of active window.
    if (!this.attackSpawned && this.attackTime >= a.startup){
      this.attackSpawned = true;

      if (a.kind === "projectile" || a.kind === "boomerang"){
        this.spawnProjectile(a, game);
      } else if (a.kind === "beam"){
        this.spawnBeam(a, game);
      } else if (a.kind === "teleport"){
        this.doTeleport(a, game);
      }
    }

    // Melee hit check in active frames.
    const inActive = this.attackTime >= a.startup && this.attackTime <= a.startup + a.active;
    if (inActive && !this.attackHasHit && a.damage > 0 && a.hitbox){
      const hb = this.getHitbox(a.hitbox);
      const opp = game.getOpponent(this.id);
      if (opp && !opp.dead){
        const hurt = opp.getHurtbox();
        if (rectsOverlap(hb, hurt)){
          this.attackHasHit = true;
          opp.takeHit({
            damage: a.damage,
            knockback: a.knockback,
            hitstun: a.hitstun,
            fromX: this.x + this.w*0.5,
            source: a.id,
          }, game);
          game.onHitImpact(hb.x + hb.w*0.5, hb.y + hb.h*0.5, this.id);
          // Gain focus for connecting.
          this.focus = clamp(this.focus + a.damage * GAME.focusFromDamageDealt, 0, GAME.focusMax);
        }
      }
    }

    // End attack after total duration.
    const total = a.startup + a.active + a.recovery;
    if (this.attackTime >= total){
      this.attack = null;
    }
  }

  getHitbox(box){
    // box: {x,y,w,h} for facing right; mirror if facing left.
    let x = this.x + box.x;
    if (this.facing < 0){
      x = this.x + (this.w - box.x - box.w);
    }
    return { x, y: this.y + box.y, w: box.w, h: box.h };
  }

  spawnProjectile(move, game){
    const opp = game.getOpponent(this.id);
    const dir = this.facing;
    const p = move.projectile;
    if (!p) return;

    const spawnX = this.x + this.w*0.5 + dir * 34;
    const spawnY = this.y + this.h*0.35;

    const multi = p.multi ?? 1;
    const spread = p.spread ?? 0;

    for (let i=0;i<multi;i++){
      const angle = (i - (multi-1)/2) * spread;
      const vx = Math.cos(angle) * p.speed * dir;
      const vy = Math.sin(angle) * p.speed * (p.gravity ? -0.35 : 0);

      const proj = new Projectile({
        ownerId: this.id,
        owner: this,
        type: p.type,
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        radius: p.radius,
        life: p.life,
        gravity: p.gravity || 0,
        bounces: p.bounces || 0,
        returnAfter: p.returnAfter,
        damage: move.damage,
        hitstun: move.hitstun,
        knockback: move.knockback,
        onHitEffect: p.onHitEffect || null,
      });

      game.projectiles.push(proj);
    }

    // Slight recoil
    this.vx -= dir * 60;
    if (opp) game.spawnSpark(spawnX, spawnY, 10, "rgba(96,165,250,0.35)");
  }

  spawnBeam(move, game){
    const b = move.beam;
    if (!b) return;
    const dir = this.facing;
    const x0 = this.x + this.w*0.5 + dir * 24;
    const y0 = this.y + this.h*0.28;

    game.beams.push({
      ownerId: this.id,
      x: (dir > 0) ? x0 : x0 - b.length,
      y: y0 - b.thickness/2,
      w: b.length,
      h: b.thickness,
      life: b.life,
      age: 0,
      damage: move.damage,
      hitstun: move.hitstun,
      knockback: move.knockback,
    });

    game.spawnSpark(x0 + dir * 40, y0, 16, "rgba(251,113,133,0.35)");
  }

  doTeleport(move, game){
    const t = move.teleport;
    if (!t) return;
    const dir = this.facing;

    // Pick a safe landing: forward by distance, with clamp and slight height.
    const tx = clamp(this.x + dir * t.distance, 80, WORLD.w - 80 - this.w);
    const ty = this.y;

    // Puff effect
    game.spawnSmoke(this.x + this.w*0.5, this.y + this.h*0.6, 18);
    this.x = tx;
    this.y = ty;
    this.vx *= 0.25;
    this.vy *= 0.25;
    this.iFrames = Math.max(this.iFrames, 0.20);
    game.spawnSmoke(this.x + this.w*0.5, this.y + this.h*0.6, 18);
  }

  updatePhysics(dt, input, game, canControl){
    const stats = this.character.stats;
    const speedMul = stats.speed ?? 1;
    const weight = stats.weight ?? 1;
    const jumpMul = stats.jumpBoost ?? 1;

    // Inputs can be "confused" by certain effects.
    let left = input.left;
    let right = input.right;
    if (this.status.confused > 0){
      const tmp = left;
      left = right;
      right = tmp;
    }

    const wantsMove = canControl && !input.guard && !input.down;
    const wantsSlowMove = canControl && (input.guard || input.down);

    const moveSpeed = (this.onGround ? PHYS.moveSpeed : PHYS.airMoveSpeed) * speedMul;
    const controlSpeed = wantsSlowMove ? moveSpeed * 0.55 : moveSpeed;

    if (canControl){
      if (left && !right){
        this.vx = lerp(this.vx, -controlSpeed, this.onGround ? 0.35 : 0.22);
      } else if (right && !left){
        this.vx = lerp(this.vx, controlSpeed, this.onGround ? 0.35 : 0.22);
      } else {
        // Apply friction/drag toward 0
        if (this.onGround){
          this.vx *= PHYS.groundFriction;
        } else {
          this.vx *= PHYS.airDrag;
        }
        if (Math.abs(this.vx) < 8) this.vx = 0;
      }

      // Jumping
      if (input.jumpPressed){
        if (this.onGround){
          this.vy = PHYS.jumpVel * jumpMul;
          this.onGround = false;
          this.jumpUsed = 0;
          this.squash = 1.08;
          game.audio?.sfx("jump");
          game.spawnSmoke(this.x + this.w*0.5, this.y + this.h, 10);
        } else if (this.jumpUsed < 1){
          this.jumpUsed += 1;
          this.vy = PHYS.doubleJumpVel * jumpMul;
          this.squash = 1.06;
          game.audio?.sfx("jump");
          game.spawnSmoke(this.x + this.w*0.5, this.y + this.h*0.8, 10);
        }

        // Drop through one-way platforms if holding down
        if (input.down){
          this.dropThrough = 0.22;
        }
      }
    } else {
      // If you can't control, still apply damping.
      if (this.onGround) this.vx *= 0.93;
      else this.vx *= 0.985;
    }

    // Fast fall
    if (!this.onGround && canControl && input.down){
      this.vy += WORLD.gravity * 0.35 * dt;
    }

    // Gravity
    this.vy += WORLD.gravity * dt;
    this.vy = Math.min(this.vy, PHYS.maxFall);

    // Integrate
    const prevX = this.x;
    const prevY = this.y;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // World bounds (soft)
    this.x = clamp(this.x, 30, WORLD.w - 30 - this.w);

    // Collision with stage platforms
    this.resolveStageCollisions(prevX, prevY, game.stage.platforms);

    // Prevent sinking.
    if (this.onGround && this.vy > 0) this.vy = 0;

    if (this.dropThrough > 0) this.dropThrough = Math.max(0, this.dropThrough - dt);

    // Squash/bob animation decay
    this.squash = lerp(this.squash, 1.0, 0.18);
    this.bob += dt * (this.onGround ? Math.min(10, Math.abs(this.vx)/40) : 1.5);
  }

  resolveStageCollisions(prevX, prevY, platforms){
    const hb = this.getHurtbox();
    const prevBottom = prevY + this.h;
    const bottom = this.y + this.h;

    this.onGround = false;

    // Floor/platform landing only (simple, but good feel).
    for (const p of platforms){
      const withinX = (this.x + this.w > p.x) && (this.x < p.x + p.w);
      if (!withinX) continue;

      // One-way platforms: only collide when falling and coming from above,
      // and not intentionally dropping through.
      if (p.oneWay){
        if (this.dropThrough > 0) continue;
        if (this.vy <= 0) continue; // not falling
        if (prevBottom <= p.y && bottom >= p.y){
          this.y = p.y - this.h;
          this.onGround = true;
          this.jumpUsed = 0;
        }
      } else {
        // Solid ground
        if (prevBottom <= p.y && bottom >= p.y){
          this.y = p.y - this.h;
          this.onGround = true;
          this.jumpUsed = 0;
        }
      }
    }
  }

  takeHit(hit, game){
    if (this.dead) return;

    // iFrames prevent multi-hit spam.
    if (this.iFrames > 0) return;

    const opp = game.getOpponent(this.id);
    const oppX = opp ? opp.x : hit.fromX;

    const blocking = this.isBlocking(oppX, game.input.actions[this.id]);

    let dmg = hit.damage;
    let kb = hit.knockback;
    let stun = hit.hitstun;

    if (blocking){
      dmg *= 0.35;
      kb = { x: kb.x * 0.28, y: kb.y * 0.25 };
      stun *= 0.55;
      // Guard consumes extra focus on impact.
      this.focus = clamp(this.focus - dmg * 0.08, 0, GAME.focusMax);
      game.audio?.sfx("block");
      game.spawnSpark(this.x + this.w*0.5, this.y + this.h*0.45, 10, "rgba(96,165,250,0.28)");
    } else {
      game.audio?.sfx("hit");
    }

    // Apply damage
    this.health = Math.max(0, this.health - dmg * game.damageScale);

    // Focus on taking damage.
    this.focus = clamp(this.focus + dmg * GAME.focusFromDamageTaken, 0, GAME.focusMax);

    // Knockback direction: away from attacker
    const dir = (hit.fromX != null) ? sign((this.x + this.w*0.5) - hit.fromX) : -this.facing;
    const weight = this.character.stats.weight ?? 1;
    const kbx = (kb?.x ?? 0) * dir / weight;
    const kby = (kb?.y ?? 0) / weight;

    // Apply immediate velocity
    if (!blocking){
      this.vx = kbx;
      this.vy = Math.min(this.vy, kby);
    } else {
      this.vx += kbx * 0.15;
      this.vy += kby * 0.15;
    }

    // Stun
    this.hitstun = Math.max(this.hitstun, stun);
    this.iFrames = GAME.iFramesOnHit;

    // Hitflash
    this.hitflash = GAME.hitflashBase;

    // Status effects
    if (hit.onHitEffect === "charm"){
      this.status.confused = Math.max(this.status.confused, 0.9);
      game.spawnHearts(this.x + this.w*0.5, this.y + this.h*0.25, 12);
      game.announce("✨ Confused! ✨", 0.7);
    }

    // KO check
    if (this.health <= 0){
      this.dead = true;
      game.onKO(this.id);
    }
  }

  render(ctx, game){
    ctx.save();

    // Shadow
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "black";
    const foot = this.getFeet();
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y + 2, 26, 8, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body transform for squash
    const cx = this.x + this.w*0.5;
    const cy = this.y + this.h*0.6;
    ctx.translate(cx, cy);
    ctx.scale(1/this.squash, this.squash);
    ctx.translate(-cx, -cy);

    // Hitflash tint
    if (this.hitflash > 0 && game.settings.hitflash){
      ctx.globalCompositeOperation = "lighter";
    }

    drawFighter(ctx, this, game);

    ctx.globalCompositeOperation = "source-over";

    // Status text bubble
    if (this.status.confused > 0){
      ctx.fillStyle = "rgba(251,113,133,0.85)";
      ctx.font = "bold 12px ui-sans-serif, system-ui";
      ctx.fillText("CONFUSED", this.x + (this.facing>0?0: -6), this.y - 8);
    }

    // Debug boxes
    if (game.settings.debug){
      const hurt = this.getHurtbox();
      ctx.strokeStyle = "rgba(34,197,94,0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(hurt.x, hurt.y, hurt.w, hurt.h);

      if (this.attack && this.attack.hitbox){
        const inActive = this.attackTime >= this.attack.startup && this.attackTime <= this.attack.startup + this.attack.active;
        if (inActive){
          const hb = this.getHitbox(this.attack.hitbox);
          ctx.strokeStyle = "rgba(239,68,68,0.85)";
          ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
        }
      }
    }

    ctx.restore();
  }
}

function drawFighter(ctx, f, game){
  const pal = f.character.palette;
  const main = pal.main;
  const accent = pal.accent;
  const trim = pal.trim;

  // Facing flip by scaling around center
  const cx = f.x + f.w*0.5;
  const cy = f.y + f.h*0.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(f.facing, 1);
  ctx.translate(-cx, -cy);

  // Base body
  ctx.fillStyle = main;
  roundRect(ctx, f.x + 10, f.y + 16, f.w - 20, f.h - 18, 14);
  ctx.fill();

  // Belly
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, f.x + 16, f.y + 26, f.w - 32, f.h - 36, 12);
  ctx.fill();

  // Head
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.ellipse(f.x + f.w*0.52, f.y + 18, 18, 16, 0, 0, Math.PI*2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.arc(f.x + f.w*0.57, f.y + 16, 3, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(f.x + f.w*0.50, f.y + 17, 2.5, 0, Math.PI*2);
  ctx.fill();

  // Feet
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(f.x + 14, f.y + f.h - 8, 12, 8);
  ctx.fillRect(f.x + f.w - 26, f.y + f.h - 8, 12, 8);

  // Archetype accents
  switch(f.character.archetype){
    case "platypus":
      // Beak
      ctx.fillStyle = accent;
      roundRect(ctx, f.x + f.w*0.58, f.y + 18, 26, 12, 8);
      ctx.fill();
      // Tail
      ctx.fillStyle = accent;
      roundRect(ctx, f.x - 6, f.y + 44, 24, 18, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      for (let i=0;i<3;i++){
        ctx.fillRect(f.x - 2 + i*7, f.y + 48, 2, 12);
      }
      // Secret agent hat
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      roundRect(ctx, f.x + 18, f.y + 4, 30, 10, 6);
      ctx.fill();
      ctx.fillRect(f.x + 28, f.y - 2, 10, 10);
      break;

    case "pharmacist":
      // Coat lapels
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(f.x + 14, f.y + 30);
      ctx.lineTo(f.x + f.w*0.52, f.y + 52);
      ctx.lineTo(f.x + 14, f.y + 70);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x + f.w - 14, f.y + 30);
      ctx.lineTo(f.x + f.w*0.52, f.y + 52);
      ctx.lineTo(f.x + f.w - 14, f.y + 70);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // Glasses
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.strokeRect(f.x + f.w*0.52, f.y + 12, 10, 8);
      ctx.strokeRect(f.x + f.w*0.42, f.y + 12, 10, 8);
      ctx.beginPath();
      ctx.moveTo(f.x + f.w*0.52, f.y + 16);
      ctx.lineTo(f.x + f.w*0.52 - 1, f.y + 16);
      ctx.stroke();
      // Badge
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.arc(f.x + f.w*0.70, f.y + 50, 5, 0, Math.PI*2);
      ctx.fill();
      break;

    case "inventor":
      // Hair swoop
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(f.x + f.w*0.42, f.y + 4);
      ctx.quadraticCurveTo(f.x + f.w*0.74, f.y + 2, f.x + f.w*0.70, f.y + 18);
      ctx.quadraticCurveTo(f.x + f.w*0.55, f.y + 10, f.x + f.w*0.42, f.y + 4);
      ctx.fill();
      // Tool belt
      ctx.fillStyle = trim;
      ctx.globalAlpha = 0.55;
      roundRect(ctx, f.x + 12, f.y + 58, f.w - 24, 10, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;

    case "quiet":
      // Helmet-ish
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      roundRect(ctx, f.x + 16, f.y + 2, 28, 14, 8);
      ctx.fill();
      // Wrench icon
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x + f.w*0.40, f.y + 42);
      ctx.lineTo(f.x + f.w*0.62, f.y + 56);
      ctx.stroke();
      break;

    case "cheer":
      // Bow
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(f.x + f.w*0.48, f.y + 4);
      ctx.lineTo(f.x + f.w*0.34, f.y + 12);
      ctx.lineTo(f.x + f.w*0.48, f.y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x + f.w*0.56, f.y + 4);
      ctx.lineTo(f.x + f.w*0.70, f.y + 12);
      ctx.lineTo(f.x + f.w*0.56, f.y + 14);
      ctx.closePath();
      ctx.fill();
      // Heart badge
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.arc(f.x + f.w*0.30, f.y + 52, 5, 0, Math.PI*2);
      ctx.fill();
      break;

    case "agent":
      // Trench collar
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.25;
      roundRect(ctx, f.x + 14, f.y + 22, f.w - 28, 12, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Tiny earpiece
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(f.x + f.w*0.36, f.y + 18, 4, 8);
      ctx.fillStyle = trim;
      ctx.fillRect(f.x + f.w*0.34, f.y + 22, 6, 3);
      break;

    default:
      break;
  }

  // Guard glow
  if (game.input.actions[f.id]?.guard && f.focus > 0.5 && f.hitstun <= 0 && !f.attack){
    ctx.strokeStyle = "rgba(96,165,250,0.65)";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5;
    roundRect(ctx, f.x + 6, f.y + 8, f.w - 12, f.h - 10, 18);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}
