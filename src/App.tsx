import { useState } from "react";
import Game from "./Game";
import Versus from "./Versus";

export default function App() {
  const [mode, setMode] = useState<"select" | "solo" | "versus">("select");

  if (mode === "solo") return <Game onHome={() => setMode("select")} />;
  if (mode === "versus") return <Versus onHome={() => setMode("select")} />;

  return (
    <div className="min-h-screen bg-[#05060f] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, #f97316 0%, transparent 35%), radial-gradient(circle at 80% 30%, #22d3ee 0%, transparent 35%), radial-gradient(circle at 50% 90%, #a21caf 0%, transparent 40%)",
        }}
      />
      <div className="relative z-10 text-center max-w-3xl">
        <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter mb-2">
          ROAD<span className="text-orange-500">RUSH</span>
        </h1>
        <p className="text-white/60 mb-10 text-sm sm:text-base">
          Gesture-controlled motorbike brawl racer — steer, punch, kick and boost using your webcam.
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          <button
            onClick={() => setMode("solo")}
            className="group text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-400 rounded-2xl p-6 transition"
          >
            <div className="text-4xl mb-2">🏍️</div>
            <div className="text-2xl font-black mb-1">Solo Campaign</div>
            <div className="text-white/50 text-sm">
              5 themed levels, weather, road hazards, bosses, cops and 4 difficulties. Hand or keyboard control.
            </div>
            <div className="mt-4 inline-block px-4 py-2 rounded-lg bg-orange-500 text-black font-bold group-hover:scale-105 transition">
              Play Solo →
            </div>
          </button>

          <button
            onClick={() => setMode("versus")}
            className="group text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-fuchsia-400 rounded-2xl p-6 transition"
          >
            <div className="text-4xl mb-2">🤜🤛</div>
            <div className="text-2xl font-black mb-1">Play with Friends</div>
            <div className="text-white/50 text-sm">
              Local split-screen 2P on one camera. Left player steers with their <b>right hand</b>, right player
              steers with their <b>left hand</b>.
            </div>
            <div className="mt-4 inline-block px-4 py-2 rounded-lg bg-fuchsia-500 text-black font-bold group-hover:scale-105 transition">
              Play 2P →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
