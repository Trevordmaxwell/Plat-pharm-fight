
import { clamp } from "./utils.js";

export class AudioManager{
  constructor(settings){
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.unlocked = false;
  }

  ensure(){
    if (!this.settings.sfx) return;
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  }

  unlock(){
    if (!this.settings.sfx) return;
    this.ensure();
    if (!this.ctx || this.unlocked) return;
    // Play a near-silent blip to unlock audio on mobile.
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    o.frequency.value = 440;
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.02);
    this.unlocked = true;
  }

  setEnabled(enabled){
    this.settings.sfx = !!enabled;
    if (!enabled && this.ctx){
      // Keep context alive but mute.
      this.master.gain.value = 0.0;
    } else if (enabled && this.ctx){
      this.master.gain.value = 0.22;
    }
  }

  tone(freq, dur=0.08, type="square", vol=0.6){
    if (!this.settings.sfx) return;
    this.ensure();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(clamp(vol, 0.05, 1.0) * 0.25, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    o.connect(g);
    g.connect(this.master);

    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  noise(dur=0.06, vol=0.5){
    if (!this.settings.sfx) return;
    this.ensure();
    if (!this.ctx) return;

    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    for (let i=0;i<len;i++){
      // Simple white noise with slight decay.
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * (1 - t);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const g = this.ctx.createGain();
    g.gain.value = clamp(vol, 0.05, 1.0) * 0.18;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 500;

    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);

    src.start();
  }

  sfx(name){
    // A tiny palette of sounds to make the game feel alive.
    switch(name){
      case "jump": this.tone(440, 0.06, "square", 0.55); this.tone(660, 0.04, "square", 0.35); break;
      case "land": this.noise(0.05, 0.65); break;
      case "light": this.tone(520, 0.05, "square", 0.55); break;
      case "heavy": this.tone(220, 0.08, "sawtooth", 0.6); this.noise(0.04, 0.55); break;
      case "special": this.tone(330, 0.10, "triangle", 0.65); this.tone(880, 0.06, "square", 0.35); break;
      case "block": this.tone(180, 0.05, "triangle", 0.45); break;
      case "hit": this.noise(0.05, 0.8); this.tone(110, 0.05, "square", 0.5); break;
      case "ko": this.tone(90, 0.24, "sawtooth", 0.65); this.tone(70, 0.32, "square", 0.5); break;
      case "menu": this.tone(740, 0.06, "square", 0.25); break;
      default: break;
    }
  }
}
