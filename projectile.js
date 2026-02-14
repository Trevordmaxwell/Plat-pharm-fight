
import { rectsOverlap, clamp } from "./utils.js";

export class Projectile{
  constructor(opts){
    Object.assign(this, opts);
    this.age = 0;
    this.dead = false;
    this.hasHit = false;
    this.returning = false;
  }

  getAABB(){
    return { x: this.x - this.radius, y: this.y - this.radius, w: this.radius*2, h: this.radius*2 };
  }

  update(dt, game){
    this.age += dt;
    if (this.age >= this.life) this.dead = true;
    if (this.dead) return;

    // Boomerang: return to owner after a bit.
    if (this.returnAfter != null && !this.returning && this.age >= this.returnAfter){
      this.returning = true;
    }

    if (this.returning && this.owner){
      const cx = this.x;
      const cy = this.y;
      const tx = this.owner.x + this.owner.w * 0.5;
      const ty = this.owner.y + this.owner.h * 0.35;
      const dx = tx - cx;
      const dy = ty - cy;
      const len = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(this.vx, this.vy) || 700;
      this.vx = (dx / len) * speed;
      this.vy = (dy / len) * speed;
      // If we return close to owner, vanish.
      if (len < 26) this.dead = true;
    }

    // Gravity
    if (this.gravity){
      this.vy += this.gravity * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounce off ground once or twice if enabled.
    if (this.bounces && this.bounces > 0){
      // Very simple: treat stage ground as the lowest platform "ground".
      const ground = game.stage.platforms.find(p => !p.oneWay && p.kind === "ground");
      if (ground && this.y + this.radius > ground.y){
        this.y = ground.y - this.radius;
        this.vy = -Math.abs(this.vy) * 0.6;
        this.vx *= 0.85;
        this.bounces -= 1;
        game.spawnSpark(this.x, this.y + this.radius, 8, "rgba(255,255,255,0.25)");
      }
    }
  }

  tryHit(target, game){
    if (this.dead || this.hasHit) return false;
    if (!target || target.dead) return false;
    if (target.id === this.ownerId) return false;

    const a = this.getAABB();
    const b = target.getHurtbox();
    if (!rectsOverlap(a, b)) return false;

    // Some projectiles are allowed to pass through once (storm multi), but we keep it simple.
    this.hasHit = true;
    this.dead = true;

    target.takeHit({
      damage: this.damage,
      knockback: this.knockback,
      hitstun: this.hitstun,
      fromX: this.x,
      source: "projectile",
      onHitEffect: this.onHitEffect || null,
    }, game);

    game.onHitImpact(this.x, this.y, this.ownerId);
    return true;
  }

  render(ctx){
    ctx.save();
    // A little wobble for life.
    const wob = Math.sin(this.age * 18) * 1.5;

    switch(this.type){
      case "capsule":
        drawCapsule(ctx, this.x, this.y, this.radius, wob);
        break;
      case "boomerplan":
        drawBoomerplan(ctx, this.x, this.y, this.radius, this.age);
        break;
      case "heart":
        drawHeart(ctx, this.x, this.y, this.radius + 2, this.age);
        break;
      case "storm":
        drawStorm(ctx, this.x, this.y, this.radius + 3, this.age);
        break;
      default:
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}

function drawCapsule(ctx, x, y, r, wob){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(0.2, 1) + wob*0.02);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(ctx, -r*1.8, -r*0.8, r*3.6, r*1.6, r*0.8);
  ctx.fill();
  ctx.fillStyle = "rgba(239,68,68,0.85)";
  roundRect(ctx, -r*1.8, -r*0.8, r*1.8, r*1.6, r*0.8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawBoomerplan(ctx, x, y, r, t){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 10);
  ctx.fillStyle = "rgba(96,165,250,0.85)";
  ctx.beginPath();
  ctx.moveTo(-r*1.6, -r*0.6);
  ctx.lineTo(r*1.6, 0);
  ctx.lineTo(-r*1.6, r*0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(-r*0.6, -r*0.5, r*0.9, r);
  ctx.restore();
}

function drawHeart(ctx, x, y, r, t){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t*6) * 0.2);
  ctx.fillStyle = "rgba(251,113,133,0.88)";
  ctx.beginPath();
  const s = r/10;
  ctx.moveTo(0, 3*s);
  ctx.bezierCurveTo(0, -2*s, -5*s, -2*s, -5*s, 1*s);
  ctx.bezierCurveTo(-5*s, 4*s, -1*s, 6*s, 0, 8*s);
  ctx.bezierCurveTo(1*s, 6*s, 5*s, 4*s, 5*s, 1*s);
  ctx.bezierCurveTo(5*s, -2*s, 0, -2*s, 0, 3*s);
  ctx.fill();
  ctx.restore();
}

function drawStorm(ctx, x, y, r, t){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 7);
  ctx.fillStyle = "rgba(245,158,11,0.85)";
  ctx.beginPath();
  ctx.arc(0, 0, r*0.8, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r*1.2, 0);
  ctx.lineTo(r*1.2, 0);
  ctx.stroke();
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
