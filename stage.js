
import { WORLD } from "./config.js";
import { clamp } from "./utils.js";

export function createStage(id){
  switch(id){
    case "pharmacy": return pharmacyStage();
    case "lab": return labStage();
    case "rooftop":
    default: return rooftopStage();
  }
}

function basePlatforms(){
  // Ground platform.
  return [
    { x: 80, y: 430, w: 800, h: 40, oneWay:false, kind:"ground" },
  ];
}

function rooftopStage(){
  const platforms = basePlatforms().concat([
    { x: 240, y: 330, w: 220, h: 16, oneWay:true, kind:"platform" },
    { x: 520, y: 300, w: 200, h: 16, oneWay:true, kind:"platform" },
  ]);
  return {
    id: "rooftop",
    name: "Tri‑State Rooftop",
    spawn: [{ x: 260, y: 200 }, { x: 640, y: 200 }],
    platforms,
    renderBg(ctx, camera){
      const { w, h } = WORLD;
      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // Sky
      const g = ctx.createLinearGradient(0,0,0,h);
      g.addColorStop(0, "#0b2a4a");
      g.addColorStop(1, "#0b1020");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);

      // City silhouette
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      for (let i=0;i<18;i++){
        const bw = 30 + (i%4)*12;
        const bh = 90 + (i%6)*18;
        const x = i * 56 + 10;
        ctx.fillRect(x, h-120-bh, bw, bh);
      }

      // Roof floor
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(70, 420, 820, 60);

      // Antenna / goofy details
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(140, 300);
      ctx.lineTo(140, 420);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(140, 290, 12, 0, Math.PI*2);
      ctx.stroke();

      // Platforms
      drawPlatforms(ctx, platforms);

      ctx.restore();
    }
  };
}

function pharmacyStage(){
  const platforms = basePlatforms().concat([
    { x: 190, y: 320, w: 200, h: 16, oneWay:true, kind:"shelf" },
    { x: 570, y: 350, w: 190, h: 16, oneWay:true, kind:"shelf" },
  ]);
  return {
    id: "pharmacy",
    name: "Back Alley Pharmacy",
    spawn: [{ x: 250, y: 200 }, { x: 650, y: 200 }],
    platforms,
    renderBg(ctx, camera){
      const { w, h } = WORLD;
      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // Alley wall
      const g = ctx.createLinearGradient(0,0,0,h);
      g.addColorStop(0, "#2b1f2f");
      g.addColorStop(1, "#0b1020");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);

      // Neon sign
      ctx.fillStyle = "rgba(96,165,250,0.12)";
      ctx.fillRect(580, 80, 250, 70);
      ctx.strokeStyle = "rgba(96,165,250,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeRect(580, 80, 250, 70);
      ctx.fillStyle = "rgba(96,165,250,0.65)";
      ctx.font = "bold 20px ui-sans-serif, system-ui";
      ctx.fillText("OPEN-ish", 645, 125);

      // Brick texture-ish
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      for (let y=180;y<h-100;y+=22){
        for (let x=20;x<w-20;x+=72){
          ctx.fillRect(x + ((y/22)%2)*20, y, 60, 10);
        }
      }

      // Floor
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(60, 420, 840, 70);

      // Dumpster cameo
      ctx.fillStyle = "rgba(34,197,94,0.18)";
      ctx.fillRect(90, 360, 140, 60);
      ctx.strokeStyle = "rgba(34,197,94,0.45)";
      ctx.strokeRect(90, 360, 140, 60);

      drawPlatforms(ctx, platforms);

      ctx.restore();
    }
  };
}

function labStage(){
  const platforms = basePlatforms().concat([
    { x: 260, y: 340, w: 180, h: 16, oneWay:true, kind:"catwalk" },
    { x: 520, y: 340, w: 180, h: 16, oneWay:true, kind:"catwalk" },
    { x: 410, y: 270, w: 140, h: 16, oneWay:true, kind:"catwalk" },
  ]);
  return {
    id: "lab",
    name: "Not‑So‑Evil Lab",
    spawn: [{ x: 230, y: 200 }, { x: 690, y: 200 }],
    platforms,
    renderBg(ctx, camera){
      const { w, h } = WORLD;
      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // Lab gradient
      const g = ctx.createLinearGradient(0,0,0,h);
      g.addColorStop(0, "#14213d");
      g.addColorStop(1, "#0b1020");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);

      // Big glass tube
      ctx.fillStyle = "rgba(96,165,250,0.10)";
      ctx.fillRect(110, 90, 160, 280);
      ctx.strokeStyle = "rgba(96,165,250,0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(110, 90, 160, 280);

      // Bubbles
      ctx.fillStyle = "rgba(96,165,250,0.22)";
      for (let i=0;i<16;i++){
        const x = 130 + (i%4)*30 + (i%2)*6;
        const y = 120 + i*14;
        ctx.beginPath();
        ctx.arc(x, y, 6 + (i%3), 0, Math.PI*2);
        ctx.fill();
      }

      // Consoles
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(620, 140, 220, 90);
      ctx.fillRect(600, 250, 250, 70);

      // Floor
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(60, 420, 840, 70);

      drawPlatforms(ctx, platforms);

      ctx.restore();
    }
  };
}

function drawPlatforms(ctx, platforms){
  for (const p of platforms){
    ctx.save();
    if (p.oneWay){
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
    }else{
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
    }
    ctx.lineWidth = 2;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.restore();
  }
}
