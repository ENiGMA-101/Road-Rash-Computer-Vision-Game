import { useEffect, useRef, useState } from "react";
import { useHandControl } from "./useHandControl";
import { blip, engineRev, noise, setMuted, startEngine } from "./sound";
import { DIFF, LEVELS, type Difficulty, type Level } from "./levels";
import { drawBike, drawCar, drawScenery } from "./render";

type Rider = {
  kind: "rival" | "cop" | "boss";
  x: number; z: number; speed: number; hp: number; maxHp: number;
  color: string; name: string; hit: number; dead: boolean; swing: number;
  wob: number; aggro: number; cd: number;
};
type Car = { x: number; z: number; speed: number; color: string };
type Pickup = { x: number; z: number; type: "chain" | "nitro" | "repair" | "shield"; spin: number };
type Hazard = { x: number; z: number; type: "oil" | "boost" | "ramp"; spin: number };
type FX = { x: number; y: number; t: number; text: string; color: string; size: number };
type Particle = { x: number; y: number; vx: number; vy: number; t: number; c: string; r: number };
type Weather = { x: number; y: number; vx: number; vy: number; len: number };

const NAMES = ["Viper", "Axel", "Ruby", "Tank", "Nitro", "Fang", "Slick", "Blaze", "Wrench", "Ghost"];
const ROAD_W = 0.92;

export default function Game({ onHome }: { onHome?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { stateRef, landmarksRef, status, err, start, stop } = useHandControl(videoRef);

  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [diff, setDiff] = useState<Difficulty>("normal");
  const [levelId, setLevelId] = useState(1);
  const [unlocked, setUnlocked] = useState<number>(() => Number(localStorage.getItem("rr_unlocked") || 1));
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("rr_best") || 0));
  const [muted, setMutedState] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [result, setResult] = useState({ won: false, score: 0, takedowns: 0, time: 0, stars: 0 });

  const [hud, setHud] = useState({
    speed: 0, score: 0, hp: 100, maxHp: 100, progress: 0, place: 8,
    nitro: 2, chain: 0, shield: 0, combo: 0, takedowns: 0, gesture: "none", fps: 0, time: 0,
  });

  const keys = useRef<Record<string, boolean>>({});
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const g = useRef<any>({});

  const startRun = (lv: number, d: Difficulty) => {
    const level = LEVELS.find((l) => l.id === lv)!;
    const D = DIFF[d];
    const weatherParts: Weather[] = [];
    if (level.theme.weather) {
      const n = level.theme.weather === "fireflies" ? 22 : 70;
      for (let i = 0; i < n; i++) {
        weatherParts.push({
          x: Math.random(), y: Math.random(),
          vx: level.theme.weather === "sand" ? 0.35 + Math.random() * 0.3 : (Math.random() - 0.5) * 0.05,
          vy: level.theme.weather === "embers" || level.theme.weather === "fireflies" ? -(0.05 + Math.random() * 0.1) : 0.25 + Math.random() * 0.5,
          len: 5 + Math.random() * 18,
        });
      }
    }
    g.current = {
      level, D, x: 0, speed: 0, dist: 0, curve: 0, targetCurve: 0, hill: 0,
      hp: D.hp, maxHp: D.hp, score: 0, nitro: 2, chain: 0, shield: 0,
      riders: [] as Rider[], cars: [] as Car[], pickups: [] as Pickup[], hazards: [] as Hazard[],
      fx: [] as FX[], parts: [] as Particle[], weather: weatherParts,
      punch: 0, punchDir: 0, kick: 0, wheelie: 0, invuln: 0, boost: 0, slick: 0,
      shake: 0, over: false, won: false, running: true, t: 0, copTimer: level.copsAfter,
      place: 8, combo: 0, comboT: 0, takedowns: 0, bossSpawned: false, flash: 0, airBonus: 0,
    };
    startEngine();
    setLevelId(lv);
    setDiff(d);
    setScreen("play");
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
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
    let prevFist = false, prevTwo = false, prevPoint = false;

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

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - prev) / 1000);
      prev = now;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      const s = g.current;
      const hand = stateRef.current;
      const playing = screenRef.current === "play" && s.running;

      if (!s.level) {
        ctx.fillStyle = "#06081a";
        ctx.fillRect(0, 0, W, H);
        raf = requestAnimationFrame(loop);
        return;
      }
      const level: Level = s.level;
      const th = level.theme;
      const D = s.D;

      if (playing && !s.over) {
        s.t += dt;
        // ---------- INPUT (low latency) ----------
        let steer = 0;
        if (hand.active && hand.present) steer = hand.steer;
        if (keys.current["arrowleft"] || keys.current["a"]) steer = -1;
        if (keys.current["arrowright"] || keys.current["d"]) steer = 1;
        steer = Math.max(-1, Math.min(1, steer));
        let grip = th.name === "ice" ? 1.05 : th.weather === "rain" ? 1.3 : 1.55;
        if (s.slick > 0) { grip *= 0.4; steer += Math.sin(s.t * 22) * 0.35; s.slick -= dt; }
        s.x += steer * dt * grip * (1 + s.speed / 900);
        s.x = Math.max(-1.3, Math.min(1.3, s.x));

        const brake = keys.current["arrowdown"] || keys.current["s"] || (hand.active && hand.pinch);
        const wantBoost = keys.current["shift"] || keys.current["arrowup"] || (hand.active && hand.thumb);
        if (wantBoost && s.nitro > 0) { s.nitro = Math.max(0, s.nitro - dt * 0.8); s.boost = 0.25; }
        if (s.boost > 0) s.boost -= dt;
        const base = 240 + Math.min(150, s.t * 3.2) + level.id * 16;
        const target = brake ? 45 : s.boost > 0 ? base + 190 : base;
        s.speed += (target - s.speed) * dt * (brake ? 3.2 : s.boost > 0 ? 2.0 : 0.55);
        engineRev(s.speed);

        // attacks (edge-triggered, snappy)
        const fistNow = (hand.active && hand.fist) || keys.current[" "];
        if (fistNow && !prevFist && s.punch <= 0) {
          s.punch = 0.22; s.punchDir = steer >= 0 ? 1 : -1;
          blip(s.chain > 0 ? 180 : 340, 0.07, "square", 0.07);
        }
        prevFist = !!fistNow;
        if (s.punch > 0) s.punch -= dt;

        const twoNow = (hand.active && hand.two) || keys.current["k"];
        if (twoNow && !prevTwo && s.kick <= 0) { s.kick = 0.3; blip(240, 0.1, "sawtooth", 0.07); }
        prevTwo = !!twoNow;
        if (s.kick > 0) s.kick -= dt;

        const pointNow = (hand.active && hand.point) || keys.current["w"];
        if (pointNow && !prevPoint && s.wheelie <= 0) {
          s.wheelie = 0.8; s.invuln = 0.75; blip(520, 0.12, "triangle", 0.07);
          if (s.airBonus > 0) { s.score += 300; pushFX(s, W, H, "TRICK! +300", "#f472b6", 26); }
        }
        prevPoint = !!pointNow;
        if (s.wheelie > 0) s.wheelie -= dt;
        if (s.invuln > 0) s.invuln -= dt;
        if (s.shield > 0) s.shield -= dt;
        if (s.flash > 0) s.flash -= dt;
        if (s.airBonus > 0) s.airBonus -= dt;

        // ---------- ROAD ----------
        if (Math.random() < dt * 0.5) s.targetCurve = (Math.random() - 0.5) * level.curveAmp;
        s.curve += (s.targetCurve - s.curve) * dt * 0.9;
        s.hill = Math.sin(s.dist * 0.0014) * 0.55;
        s.x -= s.curve * dt * (s.speed / 430);
        s.dist += s.speed * dt;
        s.score += (s.speed * dt) / 10 * D.scoreMul;

        // ---------- SPAWNS ----------
        if (s.riders.length < level.rivals && Math.random() < dt * 1.1 * D.spawn) {
          s.riders.push(mkRider("rival", level, D));
        }
        if (s.cars.length < 5 && Math.random() < dt * 0.8 * level.traffic) {
          s.cars.push({
            x: (Math.random() < 0.5 ? -1 : 1) * (0.32 + Math.random() * 0.55),
            z: 1100 + Math.random() * 500,
            speed: 70 + Math.random() * 90,
            color: ["#e2e8f0", "#0ea5e9", "#fbbf24", "#94a3b8", "#fb7185", "#34d399"][(Math.random() * 6) | 0],
          });
        }
        if (s.pickups.length < 3 && Math.random() < dt * 0.5) {
          const r = Math.random();
          s.pickups.push({
            x: (Math.random() - 0.5) * 1.6, z: 1050 + Math.random() * 400, spin: 0,
            type: r < 0.3 ? "chain" : r < 0.58 ? "nitro" : r < 0.85 ? "repair" : "shield",
          });
        }
        if (s.hazards.length < 3 && Math.random() < dt * 0.42 * level.hazards) {
          const r = Math.random();
          s.hazards.push({
            x: (Math.random() - 0.5) * 1.7, z: 1050 + Math.random() * 450, spin: 0,
            type: r < 0.4 ? "oil" : r < 0.72 ? "boost" : "ramp",
          });
        }
        s.copTimer -= dt;
        if (s.copTimer <= 0 && s.speed > 320 && s.riders.filter((r: Rider) => r.kind === "cop").length < 2) {
          s.copTimer = 16 + Math.random() * 10;
          s.riders.push(mkRider("cop", level, D));
          pushFX(s, W, H, "🚓 COPS!", "#60a5fa", 30);
          blip(900, 0.5, "sine", 0.09);
        }
        if (!s.bossSpawned && s.dist > level.length * 0.72) {
          s.bossSpawned = true;
          s.riders.push(mkRider("boss", level, D));
          pushFX(s, W, H, `BOSS: ${level.name.toUpperCase()}`, "#f43f5e", 34);
          blip(120, 0.6, "sawtooth", 0.12);
        }

        // ---------- RIDERS ----------
        for (const r of s.riders as Rider[]) {
          r.z -= (s.speed - r.speed) * dt;
          if (r.hit > 0) r.hit -= dt;
          if (r.swing > 0) r.swing -= dt;
          if (r.cd > 0) r.cd -= dt;
          if (r.dead) { r.x += dt * 1.8 * (r.x >= 0 ? 1 : -1); r.z -= 90 * dt; continue; }

          const chase = r.kind === "rival" ? 0.55 * r.aggro : r.kind === "cop" ? 1.0 : 1.3;
          r.x += (s.x - r.x) * dt * chase + Math.sin((r.wob += dt) * 1.7) * dt * 0.28;
          r.x = Math.max(-1.1, Math.min(1.1, r.x));
          if (r.kind === "boss") r.speed = s.speed * (0.95 + Math.sin(s.t * 0.7) * 0.06);

          const dx = r.x - s.x, adx = Math.abs(dx);
          const near = r.z < 70 && r.z > -45;

          if (near && adx < 0.45 && r.cd <= 0 && Math.random() < dt * (r.kind === "boss" ? 1.6 : 0.9)) {
            r.swing = 0.45; r.cd = r.kind === "boss" ? 0.8 : 1.5;
            if (s.invuln <= 0 && s.shield <= 0) {
              const dmg = (r.kind === "boss" ? 14 : r.kind === "cop" ? 11 : 8) * D.dmg;
              s.hp -= dmg; s.shake = 0.35; s.flash = 0.2; s.combo = 0;
              sparks(s, W * 0.5, H * 0.75, "#f87171", 14);
              pushFX(s, W, H, r.kind === "cop" ? "BATON!" : "HIT!", "#f87171", 24);
              noise(0.13, 0.13);
            } else {
              pushFX(s, W, H, "BLOCKED", "#67e8f9", 20);
            }
          }

          const reach = s.chain > 0 ? 0.9 : 0.62;
          const hitting = (s.punch > 0 && adx < reach) || (s.kick > 0 && adx < 0.7);
          if (near && hitting) {
            r.hit = 0.22;
            const dmg = (s.chain > 0 ? 2 : 1) + (s.kick > 0 ? 1 : 0);
            r.hp -= dmg;
            s.combo++; s.comboT = 2.2;
            s.score += 45 * dmg * (1 + s.combo * 0.1) * D.scoreMul;
            if (s.chain > 0 && s.punch > 0) s.chain = Math.max(0, s.chain - 1);
            s.punch = 0; s.kick = 0;
            sparks(s, W * 0.5 + dx * 160, H * 0.68, "#fbbf24", 12);
            blip(480, 0.06, "square", 0.08);
            if (r.hp <= 0) {
              r.dead = true; s.takedowns++;
              s.score += (r.kind === "boss" ? 1500 : r.kind === "cop" ? 350 : 220) * D.scoreMul;
              s.shake = 0.4;
              pushFX(s, W, H, r.kind === "boss" ? "BOSS DOWN! +1500" : "TAKEDOWN!", "#fbbf24", 32);
              blip(700, 0.25, "triangle", 0.11);
              noise(0.25, 0.14);
            } else {
              pushFX(s, W, H, s.combo > 2 ? `COMBO x${s.combo}` : s.chain > 0 ? "CHAIN!" : "POW!", "#ffffff", 22);
            }
          } else if (near && adx < 0.24 && r.z < 28 && r.z > -12) {
            if (s.invuln <= 0 && s.shield <= 0) s.hp -= 34 * dt * D.dmg;
            s.speed *= 0.988; s.shake = 0.24; r.x += dx * dt * 3.5;
          }
        }
        s.riders = s.riders.filter((r: Rider) => r.z > -170 && r.z < 2300 && Math.abs(r.x) < 3);

        // ---------- CARS ----------
        for (const c of s.cars as Car[]) {
          c.z -= (s.speed - c.speed) * dt;
          if (c.z < 42 && c.z > -22 && Math.abs(c.x - s.x) < 0.34 && s.wheelie <= 0) {
            if (s.invuln <= 0 && s.shield <= 0) { s.hp -= 66 * dt * D.dmg; s.flash = 0.15; }
            s.speed *= 0.95; s.shake = 0.55; s.combo = 0;
            sparks(s, W * 0.5, H * 0.8, "#fb923c", 6);
          }
        }
        s.cars = s.cars.filter((c: Car) => c.z > -150 && c.z < 2300);

        // ---------- PICKUPS ----------
        for (const p of s.pickups as Pickup[]) {
          p.z -= s.speed * dt; p.spin += dt * 4;
          if (p.z < 32 && p.z > -26 && Math.abs(p.x - s.x) < 0.32) {
            p.z = -999;
            if (p.type === "chain") { s.chain += 8; pushFX(s, W, H, "⛓ CHAIN x8", "#fbbf24", 26); }
            if (p.type === "nitro") { s.nitro = Math.min(6, s.nitro + 2); pushFX(s, W, H, "NITRO!", "#22d3ee", 26); }
            if (p.type === "repair") { s.hp = Math.min(s.maxHp, s.hp + 30); pushFX(s, W, H, "+30 HP", "#4ade80", 26); }
            if (p.type === "shield") { s.shield = 6; pushFX(s, W, H, "SHIELD 6s", "#a78bfa", 26); }
            blip(880, 0.12, "sine", 0.1);
          }
        }
        s.pickups = s.pickups.filter((p: Pickup) => p.z > -100);

        // ---------- HAZARDS ----------
        for (const hz of s.hazards as Hazard[]) {
          hz.z -= s.speed * dt; hz.spin += dt * 2;
          if (hz.z < 34 && hz.z > -26 && Math.abs(hz.x - s.x) < 0.3) {
            hz.z = -999;
            if (hz.type === "oil") {
              if (s.shield <= 0) { s.slick = 1.1; s.shake = 0.3; pushFX(s, W, H, "OIL SLICK!", "#78716c", 24); }
            } else if (hz.type === "boost") {
              s.nitro = Math.min(6, s.nitro + 1); s.boost = 0.4;
              pushFX(s, W, H, "BOOST PAD!", "#facc15", 24); blip(700, 0.15, "sawtooth", 0.1);
            } else if (hz.type === "ramp") {
              s.wheelie = 0.9; s.invuln = 0.9; s.airBonus = 0.9; s.score += 80;
              pushFX(s, W, H, "AIR! +80", "#38bdf8", 26); blip(600, 0.2, "triangle", 0.1);
            }
          }
        }
        s.hazards = s.hazards.filter((h: Hazard) => h.z > -100);

        // combo decay
        if (s.comboT > 0) { s.comboT -= dt; if (s.comboT <= 0) s.combo = 0; }

        // off-road
        if (Math.abs(s.x) > 1.0) {
          if (s.shield <= 0) s.hp -= 22 * dt * D.dmg;
          s.speed *= 0.99; s.shake = 0.2;
          dust(s, W, H, th.name === "ice" ? "#e0f2fe" : "#a16207");
        }
        if (s.shake > 0) s.shake -= dt;

        // weather motion (screen-space wrap)
        for (const wp of s.weather as Weather[]) {
          wp.x += wp.vx * dt; wp.y += wp.vy * dt;
          if (wp.y > 1) { wp.y = -0.05; wp.x = Math.random(); }
          if (wp.x > 1.05) wp.x = -0.05;
          if (wp.x < -0.05) wp.x = 1.05;
        }

        // particles
        for (const p of s.parts as Particle[]) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.t -= dt; }
        s.parts = s.parts.filter((p: Particle) => p.t > 0);
        for (const f of s.fx as FX[]) f.t -= dt;
        s.fx = s.fx.filter((f: FX) => f.t > 0);

        s.place = Math.max(1, Math.min(8, 1 + s.riders.filter((r: Rider) => !r.dead && r.z > 60).length));

        // end conditions
        if (s.hp <= 0) {
          s.hp = 0; s.over = true; s.running = false; noise(0.7, 0.24);
          finish(false);
        } else if (s.dist >= level.length) {
          s.over = true; s.running = false; s.won = true;
          s.score += 1200 * D.scoreMul;
          blip(660, 0.35, "triangle", 0.13);
          finish(true);
        }

        hudTick += dt;
        if (hudTick > 0.08) {
          hudTick = 0;
          setHud({
            speed: Math.round(s.speed), score: Math.floor(s.score), hp: Math.max(0, Math.round(s.hp)),
            maxHp: s.maxHp, progress: Math.min(1, s.dist / level.length), place: s.place,
            nitro: s.nitro, chain: s.chain, shield: Math.max(0, s.shield), combo: s.combo,
            takedowns: s.takedowns, gesture: hand.present ? hand.gesture : "none", fps: hand.fps,
            time: s.t,
          });
        }
      }

      // ================= RENDER =================
      const horizon = H * (0.44 + s.hill * 0.05);
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * s.shake, (Math.random() - 0.5) * 14 * s.shake);

      const sky = ctx.createLinearGradient(0, -40, 0, horizon);
      sky.addColorStop(0, th.skyTop); sky.addColorStop(0.55, th.skyMid); sky.addColorStop(1, th.skyBot);
      ctx.fillStyle = sky; ctx.fillRect(-40, -40, W + 80, horizon + 40);

      if (th.night) {
        for (let i = 0; i < 60; i++) {
          const sx = ((i * 137.5) % W), sy = (i * 61) % (horizon * 0.8);
          ctx.fillStyle = `rgba(255,255,255,${0.2 + ((i * 17) % 60) / 150})`;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
      // sun/moon with bloom
      const sunX = W * 0.5 - s.curve * 150, sunY = horizon - 52;
      const bloom = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
      bloom.addColorStop(0, th.sun); bloom.addColorStop(0.25, th.fog); bloom.addColorStop(1, "transparent");
      ctx.fillStyle = bloom;
      ctx.beginPath(); ctx.arc(sunX, sunY, 150, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.sun;
      ctx.beginPath(); ctx.arc(sunX, sunY, 46, 0, Math.PI * 2); ctx.fill();

      // parallax hills
      ctx.fillStyle = th.hills;
      ctx.beginPath(); ctx.moveTo(0, horizon);
      for (let i = 0; i <= W; i += 24)
        ctx.lineTo(i, horizon - 42 - Math.sin((i + s.dist * 0.12) * 0.0075) * 34 - Math.cos(i * 0.021) * 18);
      ctx.lineTo(W, horizon); ctx.fill();
      ctx.fillStyle = th.ground1; ctx.fillRect(0, horizon, W, H - horizon);

      const project = (z: number) => {
        const p = 1 / (1 + Math.max(0, z) / 235);
        const y = horizon + (H - horizon) * p;
        const w = W * ROAD_W * p;
        const cx = W / 2 + s.curve * (1 - p) * W * 0.95 - s.x * w * 0.55;
        return { y, w, cx, p };
      };

      const SEG = 60;
      for (let i = SEG; i >= 1; i--) {
        const z1 = (i / SEG) ** 2 * 1000, z0 = ((i - 1) / SEG) ** 2 * 1000;
        const a = project(z1), b = project(z0);
        const alt = Math.floor((z1 + s.dist) / 22) % 2 === 0;
        ctx.fillStyle = alt ? th.road1 : th.road2;
        ctx.beginPath();
        ctx.moveTo(a.cx - a.w, a.y); ctx.lineTo(a.cx + a.w, a.y);
        ctx.lineTo(b.cx + b.w, b.y); ctx.lineTo(b.cx - b.w, b.y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = alt ? th.ground1 : th.ground2;
        ctx.fillRect(0, a.y, Math.max(0, a.cx - a.w), b.y - a.y + 1);
        ctx.fillRect(a.cx + a.w, a.y, W, b.y - a.y + 1);
        if (alt) { ctx.fillStyle = "#fbbf24"; ctx.fillRect(a.cx - a.w * 0.02, a.y, Math.max(1, a.w * 0.04), b.y - a.y + 1); }
        ctx.fillStyle = alt ? "#f8fafc" : "#dc2626";
        ctx.fillRect(a.cx - a.w, a.y, Math.max(1, a.w * 0.035), b.y - a.y + 1);
        ctx.fillRect(a.cx + a.w - a.w * 0.035, a.y, Math.max(1, a.w * 0.035), b.y - a.y + 1);
      }

      // scenery
      for (let i = 0; i < 12; i++) {
        const z = ((i * 90 - (s.dist % 90)) + 90) % 1000;
        const pr = project(z);
        if (pr.p < 0.07) continue;
        drawScenery(ctx, th, pr.cx - pr.w * 1.45, pr.y, pr.p, i);
        drawScenery(ctx, th, pr.cx + pr.w * 1.45, pr.y, pr.p, i + 3);
      }

      // depth fog
      const fog = ctx.createLinearGradient(0, horizon, 0, horizon + (H - horizon) * 0.4);
      fog.addColorStop(0, th.fog); fog.addColorStop(1, "transparent");
      ctx.fillStyle = fog; ctx.fillRect(0, horizon, W, (H - horizon) * 0.4);

      // sorted objects
      const items: { z: number; fn: () => void }[] = [];
      for (const hz of s.hazards as Hazard[]) if (hz.z < 1000) items.push({ z: hz.z, fn: () => {
        const pr = project(hz.z), cx = pr.cx + hz.x * pr.w * 0.55;
        if (hz.type === "oil") {
          ctx.fillStyle = "rgba(20,20,25,0.85)";
          ctx.beginPath(); ctx.ellipse(cx, pr.y, pr.w * 0.22, pr.w * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        } else if (hz.type === "boost") {
          ctx.save(); ctx.globalAlpha = 0.85;
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          const w2 = pr.w * 0.24, h2 = pr.p * 26;
          ctx.moveTo(cx - w2, pr.y); ctx.lineTo(cx, pr.y - h2); ctx.lineTo(cx + w2, pr.y);
          ctx.lineTo(cx + w2 * 0.4, pr.y); ctx.lineTo(cx, pr.y - h2 * 0.5); ctx.lineTo(cx - w2 * 0.4, pr.y);
          ctx.closePath(); ctx.fill(); ctx.restore();
        } else {
          ctx.fillStyle = "#94a3b8";
          const w2 = pr.w * 0.5, h2 = pr.p * 40;
          ctx.beginPath(); ctx.moveTo(cx - w2, pr.y); ctx.lineTo(cx + w2, pr.y);
          ctx.lineTo(cx + w2 * 0.7, pr.y - h2); ctx.lineTo(cx - w2 * 0.7, pr.y - h2); ctx.closePath(); ctx.fill();
        }
      }});
      for (const p of s.pickups as Pickup[]) if (p.z < 1000) items.push({ z: p.z, fn: () => {
        const pr = project(p.z), cx = pr.cx + p.x * pr.w * 0.55, sc = pr.p * 70;
        ctx.save(); ctx.translate(cx, pr.y - sc * 0.9); ctx.rotate(Math.sin(p.spin) * 0.5);
        const col = p.type === "chain" ? "#fbbf24" : p.type === "nitro" ? "#22d3ee" : p.type === "repair" ? "#4ade80" : "#a78bfa";
        ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(0, 0, sc * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#0b1120"; ctx.font = `bold ${Math.max(7, sc * 0.45)}px system-ui`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.type === "chain" ? "⛓" : p.type === "nitro" ? "N" : p.type === "repair" ? "+" : "S", 0, 1);
        ctx.restore();
      }});
      for (const c of s.cars as Car[]) if (c.z < 1000) items.push({ z: c.z, fn: () => {
        const pr = project(c.z);
        drawCar(ctx, pr.cx + c.x * pr.w * 0.55, pr.y, pr.p * 250, c.color, !!th.night);
      }});
      for (const r of s.riders as Rider[]) if (r.z < 1000 && r.z > -160) items.push({ z: r.z, fn: () => {
        const pr = project(r.z), cx = pr.cx + r.x * pr.w * 0.55, sc = pr.p * (r.kind === "boss" ? 240 : 205);
        ctx.save(); ctx.translate(cx, pr.y);
        if (r.dead) ctx.rotate(1.35);
        drawBike(ctx, sc, r.color, {
          swing: r.swing > 0.2 ? (r.x > s.x ? -1 : 1) : 0, cop: r.kind === "cop",
          flash: r.hit > 0, night: !!th.night,
        });
        ctx.restore();
        if (pr.p > 0.22 && !r.dead) {
          const bw = r.kind === "boss" ? 70 : 46;
          ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(cx - bw / 2, pr.y - sc * 1.0, bw, 6);
          ctx.fillStyle = r.kind === "boss" ? "#f43f5e" : r.kind === "cop" ? "#60a5fa" : "#f87171";
          ctx.fillRect(cx - bw / 2, pr.y - sc * 1.0, bw * Math.max(0, r.hp / r.maxHp), 6);
          if (pr.p > 0.4) {
            ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "center";
            ctx.fillText(r.name, cx, pr.y - sc * 1.0 - 6);
          }
        }
      }});
      items.sort((a, b) => b.z - a.z).forEach((i) => i.fn());

      // player
      ctx.save();
      ctx.translate(W / 2, H * 0.88);
      const lean = hand.active && hand.present ? hand.steer : (keys.current["arrowleft"] ? -1 : keys.current["arrowright"] ? 1 : 0);
      ctx.rotate(Math.max(-1, Math.min(1, lean)) * 0.16);
      if (s.shield > 0) {
        ctx.strokeStyle = `rgba(167,139,250,${0.4 + Math.sin(s.t * 12) * 0.2})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, -60, 78, 92, 0, 0, Math.PI * 2); ctx.stroke();
      }
      drawBike(ctx, 158, "#22d3ee", {
        player: true, swing: s.punch > 0 ? s.punchDir : 0, kick: Math.max(0, s.kick * 3),
        chain: s.chain > 0, boost: s.boost > 0, wheelie: Math.max(0, s.wheelie), night: !!th.night,
      });
      ctx.restore();

      // particles
      for (const p of s.parts as Particle[]) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.t * 2));
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // speed streaks
      if (s.speed > 330) {
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.22, (s.speed - 330) / 500)})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + s.t * 3;
          ctx.beginPath();
          ctx.moveTo(W / 2 + Math.cos(a) * 150, horizon + Math.sin(a) * 95);
          ctx.lineTo(W / 2 + Math.cos(a) * 620, horizon + Math.sin(a) * 400);
          ctx.stroke();
        }
      }

      // weather overlay (screen space)
      if (th.weather) {
        const wcol = th.weather === "rain" ? "rgba(191,219,254,0.55)"
          : th.weather === "snow" ? "rgba(255,255,255,0.9)"
          : th.weather === "sand" ? "rgba(252,211,77,0.35)"
          : th.weather === "embers" ? "rgba(251,146,60,0.85)"
          : "rgba(253,230,138,0.9)";
        ctx.strokeStyle = wcol; ctx.fillStyle = wcol;
        for (const wp of s.weather as Weather[]) {
          const px = wp.x * W, py = wp.y * H;
          if (th.weather === "rain") {
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3, py + wp.len); ctx.stroke();
          } else if (th.weather === "sand") {
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + wp.len, py); ctx.stroke();
          } else {
            const r = th.weather === "snow" ? 2 : th.weather === "fireflies" ? (1.5 + Math.sin(s.t * 4 + px) * 1) : 1.6;
            ctx.beginPath(); ctx.arc(px, py, Math.max(0.6, r), 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      for (const f of s.fx as FX[]) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.t));
        ctx.fillStyle = f.color;
        ctx.font = `900 ${f.size}px system-ui`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 4;
        ctx.strokeText(f.text, f.x, f.y - (1 - f.t) * 70);
        ctx.fillText(f.text, f.x, f.y - (1 - f.t) * 70);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // damage flash + vignette
      if (s.flash > 0) { ctx.fillStyle = `rgba(239,68,68,${s.flash * 0.6})`; ctx.fillRect(0, 0, W, H); }
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      vig.addColorStop(0, "transparent"); vig.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      // hand skeleton overlay
      const cc = camCanvasRef.current;
      if (cc) {
        const c2 = cc.getContext("2d")!;
        c2.clearRect(0, 0, cc.width, cc.height);
        const pts = landmarksRef.current;
        if (pts) {
          c2.save(); c2.translate(cc.width, 0); c2.scale(-1, 1);
          const col = hand.fist ? "#fbbf24" : hand.pinch ? "#f87171" : hand.thumb ? "#22d3ee" : hand.two ? "#a78bfa" : "#4ade80";
          c2.strokeStyle = col; c2.fillStyle = col; c2.lineWidth = 2.5;
          const links = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
          for (const [a, b] of links) {
            c2.beginPath();
            c2.moveTo(pts[a].x * cc.width, pts[a].y * cc.height);
            c2.lineTo(pts[b].x * cc.width, pts[b].y * cc.height);
            c2.stroke();
          }
          for (const p of pts) { c2.beginPath(); c2.arc(p.x * cc.width, p.y * cc.height, 3.5, 0, Math.PI * 2); c2.fill(); }
          c2.restore();
        }
      }

      raf = requestAnimationFrame(loop);
    };

    const finish = (won: boolean) => {
      const s = g.current;
      const sc = Math.floor(s.score);
      let stars = 0;
      if (won) {
        stars = 1;
        if (s.hp / s.maxHp > 0.5) stars++;
        if (s.takedowns >= Math.ceil(s.level.rivals * 0.6)) stars++;
      }
      setResult({ won, score: sc, takedowns: s.takedowns, time: s.t, stars });
      setScreen("over");
      setBest((b) => { const n = Math.max(b, sc); localStorage.setItem("rr_best", String(n)); return n; });
      if (won) setUnlocked((u) => {
        const n = Math.max(u, Math.min(LEVELS.length, s.level.id + 1));
        localStorage.setItem("rr_unlocked", String(n));
        return n;
      });
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("fullscreenchange", resize);
    };
  }, [stateRef, landmarksRef]);

  const handOn = status === "on";
  const level = LEVELS.find((l) => l.id === levelId)!;
  const gestureLabel: Record<string, string> = {
    open: "✋ Steering", fist: "✊ Punch", pinch: "🤏 Brake", thumb: "👍 Nitro",
    point: "☝️ Wheelie", two: "✌️ Kick", none: "— no hand —",
  };

  return (
    <div ref={wrapRef} className="h-screen w-screen bg-[#05060f] text-white flex flex-col overflow-hidden">
      {!fullscreen && (
        <header className="flex flex-wrap items-center justify-between gap-3 p-3 shrink-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter">
              ROAD<span className="text-orange-500">RUSH</span>
              <span className="ml-2 text-[10px] align-top bg-cyan-500 text-black px-2 py-0.5 rounded not-italic">HAND CONTROL</span>
            </h1>
            <p className="text-xs text-white/50">Gesture-driven motorbike brawl racing · best {best}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setMuted(!muted); setMutedState(!muted); }} className="px-3 py-2 rounded-lg bg-white/10 text-sm">{muted ? "🔇" : "🔊"}</button>
            <button onClick={handOn ? stop : start}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${handOn ? "bg-red-500/90" : "bg-cyan-500 text-black"}`}>
              {status === "loading" ? "Loading…" : handOn ? "Stop Camera" : "✋ Hand Control"}
            </button>
            <button onClick={toggleFullscreen} className="px-3 py-2 rounded-lg bg-white/10 text-sm">⛶</button>
            {screen === "play" && (
              <button onClick={() => setScreen("menu")} className="px-4 py-2 rounded-lg bg-white/10 text-sm">Menu</button>
            )}
            {onHome && <button onClick={onHome} className="px-4 py-2 rounded-lg bg-white/10 text-sm">Home</button>}
          </div>
        </header>
      )}

        <div className="relative flex-1 min-h-0 mx-3 mb-3 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_80px_-20px_rgba(249,115,22,0.6)]">
          <canvas ref={canvasRef} className="w-full h-full block bg-black" />

          {fullscreen && (
            <button onClick={toggleFullscreen} className="absolute top-2 right-2 z-20 px-3 py-1.5 rounded-lg bg-black/60 text-xs">⛶ Exit</button>
          )}

          {screen === "play" && (
            <>
              <div className="absolute top-3 left-3 space-y-2">
                <div className="bg-black/55 backdrop-blur px-3 py-2 rounded-xl">
                  <div className="text-[10px] uppercase text-white/50 tracking-widest">Score</div>
                  <div className="text-2xl font-black tabular-nums">{hud.score}</div>
                  {hud.combo > 1 && <div className="text-xs font-bold text-amber-400">COMBO x{hud.combo}</div>}
                </div>
                <div className="bg-black/55 backdrop-blur px-3 py-2 rounded-xl w-48">
                  <div className="flex justify-between text-[10px] uppercase text-white/50"><span>Health</span><span>{hud.hp}</span></div>
                  <div className="h-2.5 bg-white/15 rounded mt-1 overflow-hidden">
                    <div className="h-2.5 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] uppercase text-white/50 mt-2"><span>Nitro</span><span>⛓ {hud.chain}</span></div>
                  <div className="h-2 bg-white/15 rounded mt-1 overflow-hidden">
                    <div className="h-2 bg-cyan-400" style={{ width: `${(hud.nitro / 6) * 100}%` }} />
                  </div>
                  {hud.shield > 0 && <div className="text-[10px] mt-1 text-violet-300 font-bold">🛡 SHIELD {hud.shield.toFixed(1)}s</div>}
                </div>
              </div>

              <div className="absolute top-3 right-3 text-right space-y-2">
                <div className="bg-black/55 backdrop-blur px-3 py-2 rounded-xl">
                  <div className="text-[10px] uppercase text-white/50 tracking-widest">Speed</div>
                  <div className="text-3xl font-black tabular-nums text-orange-400">{hud.speed}</div>
                  <div className="text-[10px] text-white/40">km/h</div>
                </div>
                <div className="bg-black/55 backdrop-blur px-3 py-2 rounded-xl">
                  <div className="text-[10px] uppercase text-white/50">Place</div>
                  <div className="text-xl font-black">{hud.place}<span className="text-xs">/8</span></div>
                  <div className="text-[10px] text-white/50">KO {hud.takedowns}</div>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 right-52">
                <div className="flex items-center gap-2 text-[10px] uppercase text-white/60 mb-1">
                  <span className="font-bold text-white">Lvl {level.id} · {level.name}</span>
                  <span className="px-1.5 rounded" style={{ background: DIFF[diff].color, color: "#000" }}>{DIFF[diff].label}</span>
                  <span className="flex-1" />
                  <span>{Math.round(hud.progress * 100)}%</span>
                </div>
                <div className="h-2.5 bg-black/60 rounded overflow-hidden relative">
                  <div className="h-2.5 bg-gradient-to-r from-orange-500 to-yellow-300" style={{ width: `${hud.progress * 100}%` }} />
                  <div className="absolute top-0 h-2.5 w-0.5 bg-white/70" style={{ left: "72%" }} title="Boss" />
                </div>
              </div>
            </>
          )}

          {/* camera pip */}
          <div className="absolute bottom-3 right-3 w-40 sm:w-44 rounded-xl overflow-hidden border border-cyan-400/40 bg-black/70">
            <div className="relative">
              <video ref={videoRef} playsInline muted className="w-full block scale-x-[-1]" />
              <canvas ref={camCanvasRef} width={480} height={360} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="text-[10px] px-2 py-1 text-center text-white/70 font-semibold">
              {status === "on" ? `${gestureLabel[hud.gesture] ?? "—"} · ${hud.fps}fps` : status === "error" ? "Camera error" : "Camera off"}
            </div>
          </div>

          {/* MENU */}
          {screen === "menu" && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md overflow-auto p-5">
              <h2 className="text-3xl font-black italic text-center mb-1">CHOOSE YOUR RIDE</h2>
              <p className="text-center text-white/50 text-xs mb-4">Unlock levels by finishing the previous stage</p>

              <div className="grid sm:grid-cols-5 gap-2 mb-4">
                {LEVELS.map((l) => {
                  const lock = l.id > unlocked;
                  return (
                    <button key={l.id} disabled={lock} onClick={() => setLevelId(l.id)}
                      className={`text-left p-3 rounded-xl border transition ${
                        levelId === l.id ? "border-orange-400 bg-orange-500/20" : "border-white/10 bg-white/5"
                      } ${lock ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"}`}>
                      <div className="h-10 rounded mb-2" style={{ background: `linear-gradient(180deg, ${l.theme.skyTop}, ${l.theme.skyMid}, ${l.theme.skyBot})` }} />
                      <div className="text-xs font-black">{lock ? "🔒 " : ""}LVL {l.id}</div>
                      <div className="text-sm font-bold leading-tight">{l.name}</div>
                      <div className="text-[10px] text-white/50">{l.subtitle}</div>
                      <div className="text-[10px] text-white/40 mt-1">{(l.length / 1000).toFixed(0)} km · {l.rivals} rivals</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-4 gap-2 mb-4">
                {(Object.keys(DIFF) as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setDiff(d)}
                    className={`p-3 rounded-xl border text-left ${diff === d ? "border-white bg-white/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <div className="font-black" style={{ color: DIFF[d].color }}>{DIFF[d].label}</div>
                    <div className="text-[10px] text-white/50">{DIFF[d].desc}</div>
                    <div className="text-[10px] text-white/40 mt-1">score x{DIFF[d].scoreMul}</div>
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-xs mb-4">
                {[
                  ["✋ Open palm", "Move left/right to steer (tilt adds lean)"],
                  ["✊ Fist", "Punch / swing the chain"],
                  ["✌️ Two fingers", "Flying kick — big damage"],
                  ["👍 Thumbs up", "Nitro boost"],
                  ["🤏 Pinch", "Brake hard"],
                  ["☝️ Point", "Wheelie — jump & dodge, brief invincibility"],
                ].map(([a, b]) => (
                  <div key={a} className="bg-white/5 border border-white/10 rounded-lg p-2">
                    <div className="font-bold">{a}</div><div className="text-white/50">{b}</div>
                  </div>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-xs mb-4">
                {[
                  ["🛢️ Oil slick", "Lose grip and slide — steer through it carefully"],
                  ["⚡ Boost pad", "Free nitro burst, no fuel cost"],
                  ["🛫 Ramp", "Launch airborne — dodge traffic + wheelie trick bonus"],
                ].map(([a, b]) => (
                  <div key={a} className="bg-white/5 border border-white/10 rounded-lg p-2">
                    <div className="font-bold">{a}</div><div className="text-white/50">{b}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => startRun(levelId, diff)} className="px-8 py-3 rounded-xl bg-orange-500 text-black font-black text-lg">
                  START LEVEL {levelId}
                </button>
                {!handOn && <button onClick={start} className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-black">✋ ENABLE HAND</button>}
              </div>
              <p className="text-center text-white/40 text-[11px] mt-3">
                Keyboard: ←/→ steer · ↑/Shift nitro · ↓ brake · Space punch · K kick · W wheelie
              </p>
              {status === "error" && <p className="text-center text-red-400 text-xs mt-2">{err}</p>}
            </div>
          )}

          {/* RESULTS */}
          {screen === "over" && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
              <h2 className="text-5xl font-black italic mb-2">{result.won ? "STAGE CLEAR!" : "WRECKED!"}</h2>
              {result.won && (
                <div className="text-3xl mb-2">
                  {"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}
                </div>
              )}
              <div className="flex gap-6 mb-5 text-sm">
                <div><div className="text-white/50 text-[10px] uppercase">Score</div><div className="text-2xl font-black text-orange-400">{result.score}</div></div>
                <div><div className="text-white/50 text-[10px] uppercase">Takedowns</div><div className="text-2xl font-black">{result.takedowns}</div></div>
                <div><div className="text-white/50 text-[10px] uppercase">Time</div><div className="text-2xl font-black">{result.time.toFixed(1)}s</div></div>
                <div><div className="text-white/50 text-[10px] uppercase">Best</div><div className="text-2xl font-black text-amber-300">{best}</div></div>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={() => startRun(levelId, diff)} className="px-6 py-3 rounded-xl bg-white/15 font-black">RETRY</button>
                {result.won && levelId < LEVELS.length && (
                  <button onClick={() => startRun(levelId + 1, diff)} className="px-6 py-3 rounded-xl bg-orange-500 text-black font-black">
                    NEXT LEVEL →
                  </button>
                )}
                <button onClick={() => setScreen("menu")} className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-black">MENU</button>
              </div>
            </div>
          )}
        </div>

      {!fullscreen && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 px-3 pb-3 shrink-0 text-[11px]">
          {[["✋","Steer"],["✊","Punch"],["✌️","Kick"],["👍","Nitro"],["🤏","Brake"],["☝️","Wheelie"]].map(([e, t]) => (
            <div key={t} className={`rounded-lg p-2 text-center border ${hud.gesture && gestureLabel[hud.gesture]?.includes(e) ? "border-cyan-400 bg-cyan-400/15" : "border-white/10 bg-white/5"}`}>
              <div className="text-lg">{e}</div><div className="text-white/60">{t}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function mkRider(kind: "rival" | "cop" | "boss", level: Level, D: any): Rider {
  const hp = kind === "boss" ? level.rivalHp * 3 : kind === "cop" ? level.rivalHp + 1 : 1 + Math.floor(Math.random() * level.rivalHp);
  return {
    kind,
    x: (Math.random() - 0.5) * 1.6,
    z: kind === "cop" ? -90 : 900 + Math.random() * 500,
    speed: (kind === "boss" ? 300 : kind === "cop" ? 340 : 170 + Math.random() * 150) * D.rivalSpeed + level.id * 8,
    hp, maxHp: hp,
    color: kind === "boss" ? "#f43f5e" : kind === "cop" ? "#1d4ed8" : ["#ef4444", "#f59e0b", "#22d3ee", "#a855f7", "#84cc16", "#ec4899"][(Math.random() * 6) | 0],
    name: kind === "boss" ? "BOSS " + NAMES[(Math.random() * NAMES.length) | 0] : kind === "cop" ? "COP" : NAMES[(Math.random() * NAMES.length) | 0],
    hit: 0, dead: false, swing: 0, wob: Math.random() * 6,
    aggro: 0.5 + Math.random(), cd: 1,
  };
}

function pushFX(s: any, W: number, H: number, text: string, color: string, size: number) {
  s.fx.push({ x: W / 2 + (Math.random() - 0.5) * 140, y: H * 0.58, t: 1, text, color, size });
}
function sparks(s: any, x: number, y: number, c: string, n: number) {
  for (let i = 0; i < n; i++)
    s.parts.push({ x, y, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 320, t: 0.4 + Math.random() * 0.4, c, r: 1 + Math.random() * 3 });
}
function dust(s: any, W: number, H: number, c: string) {
  if (Math.random() < 0.5)
    s.parts.push({ x: W / 2 + (Math.random() - 0.5) * 120, y: H * 0.9, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 180, t: 0.5, c, r: 2 + Math.random() * 4 });
}
