import { useCallback, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export type SlotState = {
  present: boolean;
  x: number;
  steer: number;
  fist: boolean;
};

const EMPTY_SLOT: SlotState = { present: false, x: 0.5, steer: 0, fist: false };

// p1 = person's RIGHT hand (assigned to left-side player)
// p2 = person's LEFT hand (assigned to right-side player)
export function useDualHandControl(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const p1Ref = useRef<SlotState>({ ...EMPTY_SLOT });
  const p2Ref = useRef<SlotState>({ ...EMPTY_SLOT });
  const landmarksRef = useRef<{ label: "Left" | "Right"; pts: { x: number; y: number }[] }[]>([]);
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
    Object.assign(p1Ref.current, EMPTY_SLOT);
    Object.assign(p2Ref.current, EMPTY_SLOT);
    landmarksRef.current = [];
    setStatus("off");
  }, [videoRef]);

  const start = useCallback(async () => {
    try {
      setStatus("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 60 }, facingMode: "user" },
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
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      }

      setStatus("on");
      let lastTs = -1;
      let lostP1 = 0, lostP2 = 0;

      const loop = () => {
        const vid = videoRef.current;
        const lm = lmRef.current;
        if (vid && lm && vid.readyState >= 2) {
          const t = performance.now();
          if (t !== lastTs) {
            lastTs = t;
            const res = lm.detectForVideo(vid, t);
            const drawn: { label: "Left" | "Right"; pts: { x: number; y: number }[] }[] = [];
            let sawP1 = false, sawP2 = false;

            if (res.landmarks?.length) {
              for (let i = 0; i < res.landmarks.length; i++) {
                const pts = res.landmarks[i].map((p) => ({ x: p.x, y: p.y }));
                const label = (res.handedness?.[i]?.[0]?.categoryName as "Left" | "Right") || "Right";
                drawn.push({ label, pts });

                const palmX = 1 - pts[9].x; // mirrored, matches display
                const wrist = pts[0];
                const span = Math.hypot(pts[5].x - pts[17].x, pts[5].y - pts[17].y) || 0.1;
                const tips = [8, 12, 16, 20];
                const avg = tips.reduce((a, idx) => a + Math.hypot(pts[idx].x - wrist.x, pts[idx].y - wrist.y), 0) / tips.length;
                const fist = avg / span < 1.6;

                const slot = label === "Right" ? p1Ref.current : p2Ref.current;
                slot.x = slot.x * 0.3 + palmX * 0.7;
                slot.steer = Math.max(-1, Math.min(1, (slot.x - 0.5) * 3));
                slot.fist = fist;
                slot.present = true;
                if (label === "Right") sawP1 = true; else sawP2 = true;
              }
            }
            landmarksRef.current = drawn;

            if (!sawP1) { lostP1++; if (lostP1 > 5) p1Ref.current.present = false; } else lostP1 = 0;
            if (!sawP2) { lostP2++; if (lostP2 > 5) p2Ref.current.present = false; } else lostP2 = 0;
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

  return { p1Ref, p2Ref, landmarksRef, status, err, start, stop };
}
