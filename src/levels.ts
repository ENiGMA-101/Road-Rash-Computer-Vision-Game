export type Theme = {
  name: string;
  skyTop: string;
  skyMid: string;
  skyBot: string;
  ground1: string;
  ground2: string;
  road1: string;
  road2: string;
  hills: string;
  sun: string;
  fog: string;
  night?: boolean;
  weather?: "rain" | "snow" | "sand" | "embers" | "fireflies";
};

export type Level = {
  id: number;
  name: string;
  subtitle: string;
  length: number;
  theme: Theme;
  rivals: number;
  rivalHp: number;
  traffic: number;
  copsAfter: number; // seconds before cops may appear
  curveAmp: number;
  hazards: number; // oil/ramp/boost pad frequency multiplier
};

export const LEVELS: Level[] = [
  {
    id: 1, name: "Sunset Ridge", subtitle: "Coastal warm-up run",
    length: 7000, rivals: 4, rivalHp: 3, traffic: 0.7, copsAfter: 25, curveAmp: 1.8, hazards: 0.5,
    theme: {
      name: "sunset", skyTop: "#10163f", skyMid: "#8b2f7a", skyBot: "#f97316",
      ground1: "#14532d", ground2: "#166534", road1: "#3f3f46", road2: "#37373e",
      hills: "#241b3d", sun: "#fde68a", fog: "#f9731655", weather: "fireflies",
    },
  },
  {
    id: 2, name: "Neon City", subtitle: "Night streets, heavy traffic",
    length: 9000, rivals: 5, rivalHp: 4, traffic: 1.4, copsAfter: 15, curveAmp: 2.4, hazards: 0.8,
    theme: {
      name: "city", skyTop: "#04040f", skyMid: "#151a4a", skyBot: "#3b1d6e",
      ground1: "#131327", ground2: "#1a1a33", road1: "#2b2b33", road2: "#24242b",
      hills: "#0b0b1c", sun: "#a5b4fc", fog: "#6366f155", night: true, weather: "rain",
    },
  },
  {
    id: 3, name: "Desert Storm", subtitle: "Dust, heat and hostile riders",
    length: 11000, rivals: 6, rivalHp: 5, traffic: 1.1, copsAfter: 12, curveAmp: 3.0, hazards: 1.1,
    theme: {
      name: "desert", skyTop: "#2a1a05", skyMid: "#b45309", skyBot: "#fcd34d",
      ground1: "#a16207", ground2: "#ca8a04", road1: "#494036", road2: "#413a30",
      hills: "#78350f", sun: "#fff7cc", fog: "#f59e0b55", weather: "sand",
    },
  },
  {
    id: 4, name: "Ice Pass", subtitle: "Slippery mountain highway",
    length: 12000, rivals: 6, rivalHp: 5, traffic: 1.3, copsAfter: 10, curveAmp: 3.4, hazards: 1.3,
    theme: {
      name: "ice", skyTop: "#071226", skyMid: "#1e3a8a", skyBot: "#93c5fd",
      ground1: "#cbd5e1", ground2: "#e2e8f0", road1: "#3b4453", road2: "#333b48",
      hills: "#1e293b", sun: "#ffffff", fog: "#bfdbfe55", weather: "snow",
    },
  },
  {
    id: 5, name: "Final Rush", subtitle: "Boss brawl at terminal velocity",
    length: 14000, rivals: 7, rivalHp: 6, traffic: 1.5, copsAfter: 8, curveAmp: 3.8, hazards: 1.6,
    theme: {
      name: "final", skyTop: "#0a0208", skyMid: "#7f1d1d", skyBot: "#ef4444",
      ground1: "#1c1917", ground2: "#292524", road1: "#2f2f36", road2: "#26262c",
      hills: "#180b0b", sun: "#fecaca", fog: "#ef444455", night: true, weather: "embers",
    },
  },
];

export type Difficulty = "easy" | "normal" | "hard" | "insane";

export const DIFF: Record<Difficulty, {
  label: string; dmg: number; hp: number; rivalSpeed: number; spawn: number;
  scoreMul: number; color: string; desc: string;
}> = {
  easy:   { label: "Easy",   dmg: 0.5, hp: 140, rivalSpeed: 0.85, spawn: 0.7, scoreMul: 0.8, color: "#4ade80", desc: "Forgiving damage, slower rivals" },
  normal: { label: "Normal", dmg: 1.0, hp: 100, rivalSpeed: 1.0,  spawn: 1.0, scoreMul: 1.0, color: "#facc15", desc: "The classic road rush" },
  hard:   { label: "Hard",   dmg: 1.6, hp: 85,  rivalSpeed: 1.15, spawn: 1.35, scoreMul: 1.6, color: "#fb923c", desc: "Aggressive gangs, quick cops" },
  insane: { label: "Insane", dmg: 2.3, hp: 70,  rivalSpeed: 1.3,  spawn: 1.7, scoreMul: 2.5, color: "#f43f5e", desc: "One mistake ends the run" },
};
