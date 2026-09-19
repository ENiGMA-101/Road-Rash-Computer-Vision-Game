import type { Theme } from "./levels";

export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, night: boolean) {
  const u = s / 240;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(0, 6, 84, 16, 0, 0, Math.PI * 2); ctx.fill();
  const body = ctx.createLinearGradient(0, -110, 0, 0);
  body.addColorStop(0, color); body.addColorStop(1, shade(color, -45));
  ctx.fillStyle = body;
  ctx.beginPath(); (ctx as any).roundRect(-74, -74, 148, 74, 14); ctx.fill();
  ctx.fillStyle = "rgba(10,12,20,0.75)";
  ctx.beginPath(); (ctx as any).roundRect(-54, -112, 108, 46, 12); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); (ctx as any).roundRect(-50, -108, 100, 16, 8); ctx.fill();
  // tail lights
  ctx.fillStyle = "#ef4444";
  ctx.shadowColor = "#ef4444"; ctx.shadowBlur = night ? 25 : 6;
  ctx.fillRect(-68, -34, 26, 15); ctx.fillRect(42, -34, 26, 15);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#0b0f19";
  ctx.fillRect(-80, -24, 18, 24); ctx.fillRect(62, -24, 18, 24);
  ctx.restore();
}

export function drawBike(
  ctx: CanvasRenderingContext2D,
  s: number,
  color: string,
  opts: {
    player?: boolean; swing?: number; kick?: number; cop?: boolean; chain?: boolean;
    boost?: boolean; wheelie?: number; flash?: boolean; night?: boolean;
  } = {}
) {
  const { player, swing = 0, kick = 0, cop, chain, boost, wheelie = 0, flash, night } = opts;
  const u = s / 150;
  ctx.save();
  ctx.scale(u, u);
  if (wheelie) ctx.rotate(-wheelie * 0.35);

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath(); ctx.ellipse(0, 6, 46, 12, 0, 0, Math.PI * 2); ctx.fill();

  if (boost) {
    const fl = ctx.createRadialGradient(0, -14, 2, 0, -14, 60);
    fl.addColorStop(0, "rgba(125,211,252,0.95)");
    fl.addColorStop(0.5, "rgba(56,189,248,0.45)");
    fl.addColorStop(1, "rgba(56,189,248,0)");
    ctx.fillStyle = fl;
    ctx.beginPath(); ctx.ellipse(0, -14, 40, 52, 0, 0, Math.PI * 2); ctx.fill();
  }

  // rear wheel
  ctx.fillStyle = "#0a0d16";
  ctx.beginPath(); ctx.ellipse(0, -18, 18, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, -18, 9, 14, 0, 0, Math.PI * 2); ctx.stroke();

  // frame
  const grad = ctx.createLinearGradient(-24, -66, 24, -26);
  grad.addColorStop(0, flash ? "#ffffff" : color);
  grad.addColorStop(0.55, flash ? "#fde68a" : shade(color, -20));
  grad.addColorStop(1, "#0f172a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-24, -26); ctx.lineTo(24, -26); ctx.lineTo(16, -66); ctx.lineTo(-16, -66);
  ctx.closePath(); ctx.fill();
  // tank highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath(); ctx.ellipse(-6, -56, 7, 12, 0.3, 0, Math.PI * 2); ctx.fill();

  // exhaust
  ctx.fillStyle = "rgba(251,146,60,0.85)";
  ctx.beginPath(); ctx.ellipse(0, -22, 11, 5, 0, 0, Math.PI * 2); ctx.fill();

  // legs
  ctx.strokeStyle = "#0b1120"; ctx.lineWidth = 11; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-12, -60); ctx.lineTo(-26 - kick * 30, -34 - kick * 14);
  ctx.moveTo(12, -60); ctx.lineTo(26 + kick * 30, -34 - kick * 14); ctx.stroke();

  // torso
  const torso = ctx.createLinearGradient(0, -100, 0, -54);
  torso.addColorStop(0, cop ? "#1e40af" : player ? "#1f2937" : "#111827");
  torso.addColorStop(1, cop ? "#172554" : "#0b1120");
  ctx.fillStyle = torso;
  ctx.beginPath(); ctx.ellipse(0, -78, 22, 26, 0, 0, Math.PI * 2); ctx.fill();

  // arms
  ctx.strokeStyle = cop ? "#1e40af" : "#0f172a"; ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-18, -82); ctx.lineTo(swing < 0 ? -60 : -32, swing < 0 ? -96 : -60);
  ctx.moveTo(18, -82); ctx.lineTo(swing > 0 ? 60 : 32, swing > 0 ? -96 : -60);
  ctx.stroke();

  if (swing !== 0) {
    const hx = swing > 0 ? 64 : -64;
    if (chain) {
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 6; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(hx, -96); ctx.lineTo(hx + swing * 28, -66); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "#fff7ed";
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(hx, -98, 13, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // helmet
  ctx.fillStyle = cop ? "#e0e7ff" : color;
  ctx.beginPath(); ctx.arc(0, -105, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(6,8,18,0.8)";
  ctx.beginPath(); ctx.arc(0, -107, 12, Math.PI * 0.1, Math.PI * 0.9); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.ellipse(-5, -112, 5, 3, -0.4, 0, Math.PI * 2); ctx.fill();

  if (cop) {
    const on = (Date.now() / 180) % 2 < 1;
    ctx.fillStyle = on ? "#ef4444" : "#3b82f6";
    ctx.shadowColor = ctx.fillStyle as string; ctx.shadowBlur = 24;
    ctx.fillRect(-16, -132, 32, 8);
    ctx.shadowBlur = 0;
  }

  if (night && player) {
    const hl = ctx.createRadialGradient(0, -40, 4, 0, -40, 90);
    hl.addColorStop(0, "rgba(255,247,214,0.5)");
    hl.addColorStop(1, "rgba(255,247,214,0)");
    ctx.fillStyle = hl;
    ctx.beginPath(); ctx.arc(0, -40, 90, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawScenery(
  ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, p: number, seed: number
) {
  const s = p * 260;
  ctx.save();
  ctx.translate(x, y);
  if (theme.name === "city") {
    const h = s * (0.8 + (seed % 5) * 0.28);
    const w = s * 0.5;
    ctx.fillStyle = "#12142c";
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = (seed % 2 ? "#fbbf24" : "#67e8f9") + "";
    for (let i = 0; i < Math.floor(h / (s * 0.16)); i++)
      for (let j = 0; j < 3; j++)
        if ((i * 3 + j + seed) % 3 === 0)
          ctx.fillRect(-w / 2 + j * (w / 3) + w * 0.06, -h + i * s * 0.16 + s * 0.04, w * 0.18, s * 0.07);
  } else if (theme.name === "desert") {
    ctx.fillStyle = "#166534";
    const h = s * 0.55;
    ctx.fillRect(-s * 0.05, -h, s * 0.1, h);
    ctx.fillRect(-s * 0.22, -h * 0.75, s * 0.17, s * 0.08);
    ctx.fillRect(-s * 0.22, -h * 0.75, s * 0.06, h * 0.4);
    ctx.fillRect(s * 0.05, -h * 0.6, s * 0.17, s * 0.08);
    ctx.fillRect(s * 0.16, -h * 0.6, s * 0.06, h * 0.3);
  } else if (theme.name === "ice") {
    ctx.fillStyle = "#0f766e";
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.22, 0); ctx.lineTo(-s * 0.22, 0); ctx.fill();
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.09, -s * 0.45); ctx.lineTo(-s * 0.09, -s * 0.45); ctx.fill();
  } else {
    // trees / palms
    ctx.fillStyle = "#3f2d16";
    ctx.fillRect(-s * 0.03, -s * 0.6, s * 0.06, s * 0.6);
    ctx.fillStyle = theme.name === "final" ? "#3f1d1d" : "#14532d";
    ctx.beginPath(); ctx.arc(0, -s * 0.66, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * 0.13, -s * 0.52, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.13, -s * 0.52, s * 0.14, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function shade(hex: string, amt: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
