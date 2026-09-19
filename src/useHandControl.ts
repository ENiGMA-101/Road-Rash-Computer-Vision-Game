import { useCallback, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export type Gesture = "none" | "open" | "fist" | "pinch" | "point" | "two" | "thumb";

export type HandState = {
  active: boolean;
  present: boolean;
  x: number;        // 0..1 mirrored palm x (steer)
  y: number;        // 0..1 palm y
  tilt: number;     // -1..1 hand roll, extra steering
  steer: number;    // -1..1 combined, predicted
  gesture: Gesture;
  fist: boolean;    // punch (edge handled by game)
  pinch: boolean;   // brake
  thumb: boolean;   // nitro (thumbs up)
  point: boolean;   // wheelie / jump
  two: boolean;     // kick (peace sign)
  openness: number; // 0..1
  fps: number;
};

const EMPTY: HandState = {
  active: false, present: false, x: 0.5, y: 0.5, tilt: 0, steer: 0,
  gesture: "none", fist: false, pinch: false, thumb: false, point: false,
  two: false, openness: 1, fps: 0,
};

export function useHandControl(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const stateRef = useRef<HandState>({ ...EMPTY });
  const landmarksRef = useRef<{ x: number; y: number }[] | null>(null);
  const [status, setStatus] = useState<"off" | "loading" | "on" | "error">("off");
  const [err, setErr] = useState("");
  const rafRef = useRef<number | null>(null);
  const lmRef = useRef<HandLandmarker | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    Object.assign(stateRef.current, EMPTY);
    landmarksRef.current = null;
    setStatus("off");
  }, [videoRef]);

  const start = useCallback(async () => {
    try {
      setStatus("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 }, facingMode: "user" },
      });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();

      if (!lmRef.current) {
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        lmRef.current = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      }

      setStatus("on");
      stateRef.current.active = true;

      let lastTs = -1;
      let lastX = 0.5;
      let lastTime = performance.now();
      let vel = 0;
      let fpsAvg = 0;
      let lostFrames = 0;

      // gesture debounce buffers (majority vote over last 3 frames)
      const hist: Gesture[] = [];

      const loop = () => {
        const vid = videoRef.current;
        const lm = lmRef.current;
        const s = stateRef.current;
        if (vid && lm && vid.readyState >= 2) {
          const t = performance.now();
          if (t !== lastTs) {
            lastTs = t;
            const res = lm.detectForVideo(vid, t);
            const dt = Math.max(0.008, (t - lastTime) / 1000);
            lastTime = t;
            fpsAvg = fpsAvg * 0.9 + (1 / dt) * 0.1;
            s.fps = Math.round(fpsAvg);

            if (res.landmarks?.length) {
              lostFrames = 0;
              const pts = res.landmarks[0].map((p) => ({ x: p.x, y: p.y }));
              landmarksRef.current = pts;

              const palmX = 1 - pts[9].x;
              const palmY = pts[9].y;
              // low-latency: light smoothing + velocity prediction
              vel = vel * 0.5 + ((palmX - lastX) / dt) * 0.5;
              lastX = palmX;
              const predicted = palmX + Math.max(-0.12, Math.min(0.12, vel * 0.055));
              s.x = s.x * 0.25 + predicted * 0.75;
              s.y = s.y * 0.4 + palmY * 0.6;

              // roll of the hand (index knuckle vs pinky knuckle)
              const dxk = (1 - pts[5].x) - (1 - pts[17].x);
              const dyk = pts[5].y - pts[17].y;
              const roll = Math.atan2(dyk, dxk);
              s.tilt = Math.max(-1, Math.min(1, roll / 1.1));

              // scale reference
              const span = Math.hypot(pts[5].x - pts[17].x, pts[5].y - pts[17].y) || 0.1;
              const wrist = pts[0];
              const dTip = (i: number) => Math.hypot(pts[i].x - wrist.x, pts[i].y - wrist.y) / span;
              const extended = (tip: number, pip: number) => dTip(tip) > dTip(pip) * 1.12;

              const idx = extended(8, 6);
              const mid = extended(12, 10);
              const ring = extended(16, 14);
              const pinky = extended(20, 18);
              const thumbOut = Math.hypot(pts[4].x - pts[17].x, pts[4].y - pts[17].y) / span > 1.5;
              const pinchDist = Math.hypot(pts[4].x - pts[8].x, pts[4].y - pts[8].y) / span;
              const count = [idx, mid, ring, pinky].filter(Boolean).length;
              s.openness = count / 4;

              let gz: Gesture = "none";
              if (pinchDist < 0.42 && (mid || ring)) gz = "pinch";
              else if (count === 0) gz = thumbOut && pts[4].y < pts[0].y - span * 0.9 ? "thumb" : "fist";
              else if (count === 1 && idx) gz = "point";
              else if (count === 2 && idx && mid) gz = "two";
              else if (count >= 3) gz = "open";

              hist.push(gz);
              if (hist.length > 3) hist.shift();
              const votes: Record<string, number> = {};
              hist.forEach((h) => (votes[h] = (votes[h] || 0) + 1));
              const winner = (Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || "none") as Gesture;

              s.gesture = winner;
              s.fist = winner === "fist";
              s.pinch = winner === "pinch";
              s.thumb = winner === "thumb";
              s.point = winner === "point";
              s.two = winner === "two";
              s.present = true;

              const raw = (s.x - 0.5) * 3.1 + s.tilt * 0.75;
              s.steer = Math.max(-1, Math.min(1, raw));
            } else {
              lostFrames++;
              if (lostFrames > 4) {
                landmarksRef.current = null;
                s.present = false;
                s.gesture = "none";
                s.fist = s.pinch = s.thumb = s.point = s.two = false;
                s.steer *= 0.9;
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setStatus("error");
    }
  }, [videoRef]);

  return { stateRef, landmarksRef, status, err, start, stop };
}
