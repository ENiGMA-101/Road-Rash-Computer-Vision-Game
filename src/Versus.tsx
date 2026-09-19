import { useEffect, useRef, useState } from "react";
import { useDualHandControl } from "./useDualHandControl";
import { blip, noise, setMuted, startEngine } from "./sound";
import { drawBike, drawCar } from "./render";

const FINISH = 4200;

type Foe = { x: number; z: number; speed: number; hp: number; color: string; hit: number; dead: boolean; swing: number; wob: number; isCar: boolean; carColor?: string };

type PSim = {
  x: number; speed: number; dist: number; hp: number; score: number;
  foes: Foe[]; punch: number; punchDir: number; nitro: number; shake: number;
  finished: boolean; place: number; alive: boolean;
};

function newSim(): PSim {
  return { x: 0, speed: 0, dist: 0, hp: 100, score: 0, foes: [], punch: 0, punchDir: 0, nitro: 2, shake: 0, finished: false, place: 0, alive: true };
}

export default function Versus({ onHome }: { onHome: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { p1Ref, p2Ref, landmarksRef, status, err, start, stop } = useDualHandControl(videoRef);

  const [phase, setPhase] = useState<"lobby" | "countdown" | "racing" | "done">("lobby");
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [muted, setMutedState] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hud, setHud] = useState({ p1: newSim(), p2: newSim() });

  const keys = useRef<Record<string, boolean>>({});
  const game = useRef({ p1: newSim(), p2: newSim(), t: 0, running: false });

  const reset = () => {
    game.current = { p1: newSim(), p2: newSim(), t: 0, running: false };
    setCountdown(3);
    setPhase("countdown");
    startEngine();
  };

  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        game.current.running = true;
        setPhase("racing");
      } else setCountdown(n);
    }, 800);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (["arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen().catch(() => {});
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let raf = 0, prev = performance.now(), hudTick = 0;
    let p1Fist = false, p2Fist = false;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(320, r.width * dpr);
      canvas.height = Math.max(240, r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("fullscreenchange", resize);

    const stepSim = (sim: PSim, dt: number, steer: number, fist: boolean, prevFist: boolean, seedBase: number) => {
      if (sim.finished || !sim.alive) return;
      sim.x += steer * dt * 1.5;
      sim.x = Math.max(-1.05, Math.min(1.05, sim.x));
      const target = 260 + Math.min(160, game.current.t * 4);
      sim.speed += (target - sim.speed) * dt * 0.5;
      sim.dist += sim.speed * dt;
      sim.score += sim.speed * dt * 0.01;

      if (fist && !prevFist && sim.punch <= 0) {
        sim.punch = 0.22; sim.punchDir = steer >= 0 ? 1 : -1;
        blip(340, 0.06, "square", 0.05);
      }
      if (sim.punch > 0) sim.punch -= dt;

      if (sim.foes.length < 4 && Math.random() < dt * 1.3) {
        const isCar = Math.random() < 0.4;
        sim.foes.push({
          x: (Math.random() - 0.5) * 1.6, z: 900 + Math.random() * 500,
          speed: isCar ? 90 + Math.random() * 70 : 150 + Math.random() * 140,
          hp: isCar ? 999 : 2 + Math.floor(Math.random() * 2),
          color: ["#ef4444", "#f59e0b", "#a855f7", "#84cc16", "#ec4899"][(Math.random() * 5) | 0],
          hit: 0, dead: false, swing: 0, wob: seedBase + Math.random() * 5, isCar,
          carColor: ["#e2e8f0", "#0ea5e9", "#fbbf24", "#34d399"][(Math.random() * 4) | 0],
        });
      }

      for (const f of sim.foes) {
        f.z -= (sim.speed - f.speed) * dt;
        if (f.hit > 0) f.hit -= dt;
        if (f.swing > 0) f.swing -= dt;
        if (f.dead) { f.x += dt * 1.6 * (f.x >= 0 ? 1 : -1); f.z -= 80 * dt; continue; }
        if (!f.isCar) f.x += Math.sin((f.wob += dt) * 1.7) * dt * 0.3;
        f.x = Math.max(-1.05, Math.min(1.05, f.x));
        const dx = f.x - sim.x, adx = Math.abs(dx);
        const near = f.z < 65 && f.z > -40;
        if (!f.isCar && near && adx < 0.4 && Math.random() < dt * 0.8) {
          f.swing = 0.4; sim.hp -= 9; sim.shake = 0.3; noise(0.1, 0.1);
        }
        if (!f.isCar && near && sim.punch > 0 && adx < 0.6) {
          f.hit = 0.2; f.hp -= 1; sim.score += 30; sim.punch = 0;
          blip(500, 0.06, "square", 0.07);
          if (f.hp <= 0) { f.dead = true; sim.score += 150; sim.shake = 0.3; blip(700, 0.2, "triangle", 0.1); }
        } else if (near && adx < 0.24 && f.z < 26 && f.z > -10) {
          sim.hp -= (f.isCar ? 55 : 30) * dt; sim.speed *= 0.97; sim.shake = 0.4;
        }
      }
      sim.foes = sim.foes.filter((f) => f.z > -160 && f.z < 2000 && Math.abs(f.x) < 3);
      if (Math.abs(sim.x) > 1.0) { sim.hp -= 20 * dt; sim.speed *= 0.99; }
      if (sim.shake > 0) sim.shake -= dt;
      if (sim.hp <= 0) { sim.hp = 0; sim.alive = false; }
      if (sim.dist >= FINISH) sim.finished = true;
    };

    const drawHalf = (originX: number, W: number, H: number, sim: PSim, tint: string, label: string) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(originX, 0, W, H); ctx.clip();
      ctx.translate(originX, 0);

      const horizon = H * 0.42;
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#0a0f2c"); sky.addColorStop(0.6, tint); sky.addColorStop(1, "#f97316");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon);
      ctx.fillStyle = "#14532d"; ctx.fillRect(0, horizon, W, H - horizon);

      const project = (z: number) => {
        const p = 1 / (1 + Math.max(0, z) / 220);
        const y = horizon + (H - horizon) * p;
        const w = W * 0.86 * p;
        const cx = W / 2 - sim.x * w * 0.55;
        return { y, w, cx, p };
      };

      const SEG = 40;
      for (let i = SEG; i >= 1; i--) {
        const z1 = (i / SEG) ** 2 * 900, z0 = ((i - 1) / SEG) ** 2 * 900;
        const a = project(z1), b = project(z0);
        const alt = Math.floor((z1 + sim.dist) / 22) % 2 === 0;
        ctx.fillStyle = alt ? "#3f3f46" : "#37373e";
        ctx.beginPath();
        ctx.moveTo(a.cx - a.w, a.y); ctx.lineTo(a.cx + a.w, a.y);
        ctx.lineTo(b.cx + b.w, b.y); ctx.lineTo(b.cx - b.w, b.y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = alt ? "#14532d" : "#166534";
        ctx.fillRect(0, a.y, Math.max(0, a.cx - a.w), b.y - a.y + 1);
        ctx.fillRect(a.cx + a.w, a.y, W, b.y - a.y + 1);
        ctx.fillStyle = alt ? "#f8fafc" : "#dc2626";
        ctx.fillRect(a.cx - a.w, a.y, Math.max(1, a.w * 0.035), b.y - a.y + 1);
        ctx.fillRect(a.cx + a.w - a.w * 0.035, a.y, Math.max(1, a.w * 0.035), b.y - a.y + 1);
      }

      const items: { z: number; fn: () => void }[] = [];
      for (const f of sim.foes) if (f.z < 900 && f.z > -150) items.push({ z: f.z, fn: () => {
        const pr = project(f.z), cx = pr.cx + f.x * pr.w * 0.55;
        if (f.isCar) { drawCar(ctx, cx, pr.y, pr.p * 220, f.carColor || "#ccc", false); return; }
        ctx.save(); ctx.translate(cx, pr.y);
        if (f.dead) ctx.rotate(1.3);
        drawBike(ctx, pr.p * 190, f.hit > 0 ? "#fff" : f.color, { swing: f.swing > 0.15 ? (f.x > sim.x ? -1 : 1) : 0 });
        ctx.restore();
      }});
      items.sort((a, b) => b.z - a.z).forEach((i) => i.fn());

      ctx.save();
      ctx.translate(W / 2, H * 0.87);
      drawBike(ctx, 140, tint === "#0891b2" ? "#22d3ee" : "#f472b6", { player: true, swing: sim.punch > 0 ? sim.punchDir : 0 });
      ctx.restore();

      // finish flash
      if (sim.finished) {
        ctx.fillStyle = "rgba(250,204,21,0.15)"; ctx.fillRect(0, 0, W, H);
      }
      if (!sim.alive) { ctx.fillStyle = "rgba(239,68,68,0.25)"; ctx.fillRect(0, 0, W, H); }

      // HUD per half
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 10, W * 0.5, 46);
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "left";
      ctx.fillText(label, 18, 26);
      ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(18, 32, W * 0.44, 8);
      ctx.fillStyle = sim.hp > 40 ? "#4ade80" : "#f87171";
      ctx.fillRect(18, 32, W * 0.44 * Math.max(0, sim.hp / 100), 8);
      ctx.fillStyle = "#fbbf24"; ctx.font = "bold 12px system-ui";
      ctx.fillText(`${Math.min(100, Math.round((sim.dist / FINISH) * 100))}%  ·  ${Math.round(sim.speed)} km/h`, 18, 50);

      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - prev) / 1000);
      prev = now;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      const gs = game.current;

      if (phase === "racing" && gs.running) {
        gs.t += dt;
        let s1 = 0, s2 = 0;
        if (p1Ref.current.present) s1 = p1Ref.current.steer;
        else if (keys.current["a"]) s1 = -1; else if (keys.current["d"]) s1 = 1;
        if (p2Ref.current.present) s2 = p2Ref.current.steer;
        else if (keys.current["arrowleft"]) s2 = -1; else if (keys.current["arrowright"]) s2 = 1;

        const f1 = (p1Ref.current.present && p1Ref.current.fist) || keys.current["f"] || keys.current[" "];
        const f2 = (p2Ref.current.present && p2Ref.current.fist) || keys.current["l"];

        stepSim(gs.p1, dt, s1, f1, p1Fist, 0);
        stepSim(gs.p2, dt, s2, f2, p2Fist, 10);
        p1Fist = !!f1; p2Fist = !!f2;

        if ((gs.p1.finished || !gs.p1.alive || gs.p2.finished || !gs.p2.alive) && phase === "racing") {
          gs.running = false;
          let w: 0 | 1 | 2 = 0;
          if (gs.p1.finished && !gs.p2.finished) w = 1;
          else if (gs.p2.finished && !gs.p1.finished) w = 2;
          else if (!gs.p1.alive && gs.p2.alive) w = 2;
          else if (!gs.p2.alive && gs.p1.alive) w = 1;
          else w = gs.p1.score >= gs.p2.score ? 1 : 2;
          setWinner(w);
          setPhase("done");
          blip(660, 0.4, "triangle", 0.12);
        }

        hudTick += dt;
        if (hudTick > 0.08) {
          hudTick = 0;
          setHud({ p1: { ...gs.p1 }, p2: { ...gs.p2 } });
        }
      }

      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      drawHalf(0, W / 2, H, gs.p1, "#0891b2", "P1 · ✋ RIGHT HAND");
      drawHalf(W / 2, W / 2, H, gs.p2, "#a21caf", "P2 · ✋ LEFT HAND");

      ctx.fillStyle = "#fff"; ctx.fillRect(W / 2 - 1.5, 0, 3, H);

      if (phase === "countdown") {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fbbf24"; ctx.font = "900 90px system-ui"; ctx.textAlign = "center";
        ctx.fillText(String(countdown || "GO!"), W / 2, H / 2 + 30);
      }

      // hand overlay
      const cc = camCanvasRef.current;
      if (cc) {
        const c2 = cc.getContext("2d")!;
        c2.clearRect(0, 0, cc.width, cc.height);
        c2.save(); c2.translate(cc.width, 0); c2.scale(-1, 1);
        const links = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
        for (const hand of landmarksRef.current) {
          c2.strokeStyle = hand.label === "Right" ? "#22d3ee" : "#f472b6";
          c2.fillStyle = c2.strokeStyle;
          c2.lineWidth = 2.5;
          for (const [a, b] of links) {
            c2.beginPath();
            c2.moveTo(hand.pts[a].x * cc.width, hand.pts[a].y * cc.height);
            c2.lineTo(hand.pts[b].x * cc.width, hand.pts[b].y * cc.height);
            c2.stroke();
          }
          for (const p of hand.pts) { c2.beginPath(); c2.arc(p.x * cc.width, p.y * cc.height, 3, 0, Math.PI * 2); c2.fill(); }
        }
        c2.restore();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("fullscreenchange", resize);
    };
  }, [phase, countdown, p1Ref, p2Ref, landmarksRef]);

  const handOn = status === "on";

  return (
    <div ref={wrapRef} className="h-screen w-screen flex flex-col bg-[#05060f] text-white overflow-hidden">
      {!fullscreen && (
        <header className="flex flex-wrap items-center justify-between gap-3 p-3 shrink-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter">
              ROAD<span className="text-orange-500">RUSH</span> <span className="text-fuchsia-400">2P</span>
            </h1>
            <p className="text-xs text-white/50">Split-screen · P1 uses right hand, P2 uses left hand</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setMuted(!muted); setMutedState(!muted); }} className="px-3 py-2 rounded-lg bg-white/10 text-sm">{muted ? "🔇" : "🔊"}</button>
            <button onClick={handOn ? stop : start} className={`px-4 py-2 rounded-lg font-semibold text-sm ${handOn ? "bg-red-500/90" : "bg-cyan-500 text-black"}`}>
              {status === "loading" ? "Loading…" : handOn ? "Stop Camera" : "✋ Enable Both Hands"}
            </button>
            <button onClick={toggleFullscreen} className="px-3 py-2 rounded-lg bg-white/10 text-sm">⛶</button>
            <button onClick={onHome} className="px-4 py-2 rounded-lg bg-white/10 text-sm">Home</button>
          </div>
        </header>
      )}

      <div className="relative flex-1 min-h-0 mx-3 mb-3 rounded-2xl overflow-hidden border border-white/10">
        <canvas ref={canvasRef} className="w-full h-full block bg-black" />

        {fullscreen && (
          <button onClick={toggleFullscreen} className="absolute top-2 right-2 z-20 px-3 py-1.5 rounded-lg bg-black/60 text-xs">⛶ Exit</button>
        )}

        <div className="absolute bottom-3 right-3 w-40 rounded-xl overflow-hidden border border-white/20 bg-black/70">
          <div className="relative">
            <video ref={videoRef} playsInline muted className="w-full block scale-x-[-1]" />
            <canvas ref={camCanvasRef} width={640} height={480} className="absolute inset-0 w-full h-full" />
          </div>
          <div className="text-[10px] px-2 py-1 text-center text-white/70">
            {status === "on" ? "Tracking both hands" : status === "error" ? "Camera error" : "Camera off"}
          </div>
        </div>

        {phase === "lobby" && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
            <h2 className="text-4xl font-black italic mb-2">PLAY WITH FRIENDS</h2>
            <p className="text-white/60 max-w-lg text-sm mb-5">
              Two players share one camera. Stand side by side facing the screen.
              <br />
              <b className="text-cyan-300">Player 1 (left screen):</b> steer with your <b>RIGHT hand</b>, make a fist to punch.
              <br />
              <b className="text-fuchsia-300">Player 2 (right screen):</b> steer with your <b>LEFT hand</b>, make a fist to punch.
              <br />
              First to the finish line — or last rider standing — wins!
            </p>
            <div className="flex gap-3 mb-3">
              <button onClick={reset} className="px-8 py-3 rounded-xl bg-orange-500 text-black font-black text-lg">START RACE</button>
              {!handOn && <button onClick={start} className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-black">✋ ENABLE CAMERA</button>}
            </div>
            <p className="text-white/40 text-[11px]">
              Keyboard fallback — P1: A/D steer, F punch · P2: ←/→ steer, L punch
            </p>
            {status === "error" && <p className="text-red-400 text-xs mt-2">{err}</p>}
          </div>
        )}

        {phase === "done" && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
            <h2 className="text-5xl font-black italic mb-3">
              {winner === 1 ? <span className="text-cyan-300">PLAYER 1 WINS!</span> : <span className="text-fuchsia-300">PLAYER 2 WINS!</span>}
            </h2>
            <div className="flex gap-8 mb-5 text-sm">
              <div><div className="text-cyan-300 text-[10px] uppercase">P1 Score</div><div className="text-2xl font-black">{Math.round(hud.p1.score)}</div></div>
              <div><div className="text-fuchsia-300 text-[10px] uppercase">P2 Score</div><div className="text-2xl font-black">{Math.round(hud.p2.score)}</div></div>
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="px-6 py-3 rounded-xl bg-orange-500 text-black font-black">RACE AGAIN</button>
              <button onClick={onHome} className="px-6 py-3 rounded-xl bg-white/15 font-black">HOME</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
