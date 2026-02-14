
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const nowMs = () => performance.now();

export function mapRange(v, inMin, inMax, outMin, outMax){
  const t = (v - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * t;
}

export function pick(list){
  return list[Math.floor(Math.random() * list.length)];
}

export function seededRng(seed){
  // Mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatTime(seconds){
  if (seconds <= 0) return "0";
  return String(Math.ceil(seconds));
}
