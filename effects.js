
import { clamp, pick } from "./utils.js";

export class Particle{
  constructor(opts){
    Object.assign(this, opts);
    this.age = 0;
    this.dead = false;
  }

  update(dt){
    this.age += dt;
    if (this.age >= this.life) this.dead = true;
    if (this.dead) return;

    if (this.gravity) this.vy += this.gravity * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx *= this.drag ?? 0.98;
    this.vy *= this.drag ?? 0.98;
  }

  render(ctx){
    const t = clamp(this.age / this.life, 0, 1);
    ctx.save();
    ctx.globalAlpha = (1 - t) * (this.alpha ?? 1);
    ctx.fillStyle = this.color || "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, (this.r ?? 3) * (1 - t*0.15), 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnSparks(x,y,count=10,color="rgba(255,255,255,0.25)"){
  const parts = [];
  for (let i=0;i<count;i++){
    const a = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random()*320;
    parts.push(new Particle({
      x,y,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp,
      gravity: 420,
      drag: 0.92,
      life: 0.28 + Math.random()*0.18,
      r: 2 + Math.random()*2.5,
      color,
      alpha: 0.95,
    }));
  }
  return parts;
}

export function spawnSmoke(x,y,count=12){
  const parts = [];
  for (let i=0;i<count;i++){
    const a = (-Math.PI/2) + (Math.random()-0.5) * Math.PI;
    const sp = 60 + Math.random()*120;
    parts.push(new Particle({
      x,y,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp - 40,
      gravity: -40,
      drag: 0.95,
      life: 0.46 + Math.random()*0.22,
      r: 6 + Math.random()*10,
      color: "rgba(255,255,255,0.10)",
      alpha: 0.8,
    }));
  }
  return parts;
}

export function spawnHearts(x,y,count=10){
  const parts = [];
  const colors = ["rgba(251,113,133,0.40)", "rgba(244,114,182,0.35)", "rgba(96,165,250,0.25)"];
  for (let i=0;i<count;i++){
    const a = (-Math.PI/2) + (Math.random()-0.5)*1.4;
    const sp = 80 + Math.random()*160;
    parts.push(new Particle({
      x: x + (Math.random()-0.5)*18,
      y: y + (Math.random()-0.5)*10,
      vx: Math.cos(a)*sp,
      vy: Math.sin(a)*sp,
      gravity: 120,
      drag: 0.93,
      life: 0.62 + Math.random()*0.35,
      r: 4 + Math.random()*5,
      color: pick(colors),
      alpha: 0.9,
    }));
  }
  return parts;
}
