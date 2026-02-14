
import { clamp, pick } from "./utils.js";

export class CPUController{
  constructor(id, difficulty="normal"){
    this.id = id;
    this.difficulty = difficulty;
    this.t = 0;
    this.nextThink = 0;
    this.mem = {
      desired: { left:false,right:false,up:false,down:false,light:false,heavy:false,special:false,guard:false },
      burst: { light:false, heavy:false, special:false, up:false },
    };
  }

  setDifficulty(diff){
    this.difficulty = diff;
  }

  empty(){
    return { left:false,right:false,up:false,down:false,light:false,heavy:false,special:false,guard:false,
      jumpPressed:false, lightPressed:false, heavyPressed:false, specialPressed:false, guardPressed:false };
  }

  update(dt, self, opp, game){
    this.t += dt;

    const diff = this.difficulty;
    const thinkEvery = (diff === "easy") ? 0.20 : (diff === "spicy") ? 0.08 : 0.13;

    // Pulse thinking rather than every frame: feels more human.
    if (this.t >= this.nextThink){
      this.nextThink = this.t + thinkEvery + (Math.random()*0.04);
      this.think(self, opp, game);
    }

    const st = this.empty();
    const d = this.mem.desired;

    st.left = d.left;
    st.right = d.right;
    st.down = d.down;
    st.guard = d.guard;

    // Burst buttons only for one frame
    st.up = d.up || false;
    st.jumpPressed = this.mem.burst.up;
    st.lightPressed = this.mem.burst.light;
    st.heavyPressed = this.mem.burst.heavy;
    st.specialPressed = this.mem.burst.special;

    // Clear bursts
    this.mem.burst = { light:false, heavy:false, special:false, up:false };

    return st;
  }

  think(self, opp, game){
    if (!self || !opp) return;

    const dx = (opp.x + opp.w*0.5) - (self.x + self.w*0.5);
    const adx = Math.abs(dx);
    const dy = (opp.y - self.y);

    const diff = this.difficulty;
    const aggression = (diff === "easy") ? 0.55 : (diff === "spicy") ? 0.92 : 0.75;
    const guardiness = (diff === "easy") ? 0.25 : (diff === "spicy") ? 0.40 : 0.32;

    // Default: stop
    const d = this.mem.desired;
    d.left = false; d.right = false; d.up = false; d.down = false; d.guard = false;

    // If low focus, play safer
    const hasFocus = self.focus >= 30;

    // Guard when opponent is actively attacking and in range
    const oppThreat = !!opp.attack && (opp.attackTime >= opp.attack.startup) && (opp.attackTime <= opp.attack.startup + opp.attack.active);
    if (oppThreat && adx < 150 && Math.random() < guardiness){
      d.guard = true;
      // Occasionally step back
      if (Math.random() < 0.4){
        if (dx > 0) d.left = true; else d.right = true;
      }
      return;
    }

    // Avoid incoming projectiles: jump sometimes
    const incoming = game.projectiles.some(p => p.ownerId !== self.id && Math.abs(p.x - (self.x+self.w*0.5)) < 160 && Math.abs(p.y - (self.y+self.h*0.5)) < 120);
    if (incoming && Math.random() < 0.65){
      this.mem.burst.up = true;
      return;
    }

    // Distance management
    if (adx > 240){
      // Approach
      if (dx > 0) d.right = true; else d.left = true;
      // Small hop onto platforms sometimes
      if (Math.random() < 0.18 && self.onGround){
        this.mem.burst.up = true;
      }
      return;
    }

    if (adx < 70 && Math.random() < (1 - aggression) * 0.6){
      // Too close? back up a bit sometimes
      if (dx > 0) d.left = true; else d.right = true;
    } else if (adx > 110 && Math.random() < aggression){
      // Move in to fight
      if (dx > 0) d.right = true; else d.left = true;
    }

    // Attack choices
    const canAct = !self.attack && self.hitstun <= 0;

    if (!canAct) return;

    // If opponent is in the air above us, anti-air heavy
    if (!opp.onGround && dy > 20 && adx < 140 && Math.random() < 0.5){
      this.mem.burst.heavy = true;
      return;
    }

    // Close range: light a lot
    if (adx < 95){
      if (Math.random() < 0.7){
        this.mem.burst.light = true;
      } else {
        this.mem.burst.heavy = true;
      }
      return;
    }

    // Mid range: heavy or special
    if (adx < 180){
      if (hasFocus && Math.random() < 0.45){
        this.mem.burst.special = true;
      } else {
        this.mem.burst.heavy = true;
      }
      return;
    }

    // Far: special occasionally
    if (hasFocus && Math.random() < 0.35){
      this.mem.burst.special = true;
    }
  }
}
