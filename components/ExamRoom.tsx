"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MarkdownRenderer from "./MarkdownRenderer";

type Q = { id: string; type: "mcq_single" | "mcq_multi" | "long_text"; prompt: string; section_title?: string | null; options: { id: string; text: string; image_url?: string | null }[] | null; points: number; image_url?: string | null };

const SNAPSHOT_INTERVAL_MS = 15000;
const MAX_VIOLATIONS = 3;
// Progressive warning: how many consecutive minor flags before it becomes a real violation
const MINOR_STRIKE_THRESHOLD = 3;
// Head pose: yaw ratio beyond this = "looking away"
const HEAD_YAW_THRESHOLD = 0.38;

export default function ExamRoom({ test, questions, attempt }: { test: any; questions: Q[]; attempt: any }) {
  const supabase = createClient();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"prep" | "onboarding" | "active" | "submitted">("prep");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [violations, setViolations] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState<number>(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isPaused, setIsPaused] = useState(!!attempt.paused_at);
  const [dndChecked, setDndChecked] = useState(false);
  const extraMinutesRef = useRef<number>(attempt.extra_minutes || 0);
  const endAt = useRef<number>(new Date(attempt.started_at).getTime() + (test.duration_minutes + (attempt.extra_minutes || 0)) * 60_000);

  // Mobile / fullscreen detection
  const fullscreenSupported = useRef(typeof document !== "undefined" && !!document.documentElement?.requestFullscreen);
  const isMobileRef = useRef(typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

  // AI Refs
  const cocoModelRef = useRef<any>(null);
  const faceapiRef = useRef<any>(null);
  const referenceDescriptorRef = useRef<Float32Array | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Progressive warning state (persisted across renders via ref so the interval callback sees latest)
  const minorStrikesRef = useRef(0);
  const [warningText, setWarningText] = useState<string | null>(null);

  const spriteCounter = useRef(0);
  const spriteCanvas = useRef<HTMLCanvasElement | null>(null);

  // Load ML Models
  useEffect(() => {
    let active = true;
    const initModels = async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.ready();
        const faceapi = await import("@vladmandic/face-api");
        const cocoSsd = await import("@tensorflow-models/coco-ssd");

        // Load models directly from CDN
        await faceapi.nets.ssdMobilenetv1.loadFromUri('https://vladmandic.github.io/face-api/model/');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://vladmandic.github.io/face-api/model/');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://vladmandic.github.io/face-api/model/');
        
        const objDetector = await cocoSsd.load();
        
        if (active) {
           cocoModelRef.current = objDetector;
           faceapiRef.current = faceapi;
           setModelsLoaded(true);
        }
      } catch (err) {
        console.error("AI Models failed to load", err);
        setBanner("Failed to initialize AI Proctoring engine. Please check your connection.");
      }
    };
    initModels();
    return () => { active = false; };
  }, []);

  // Ensure Video Stream re-attaches if component unmounts/remounts between phases
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  // Shuffle MCQ options once on mount so they stay stable during the test
  const shuffledQuestions = useMemo(() => {
    return questions.map((q) => {
      if (!q.options) return q;
      return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) };
    });
  }, [questions]);

  const logEvent = useCallback(async (kind: string, detail?: any) => {
    await supabase.from("proctor_events").insert({ attempt_id: attempt.id, kind, detail });
  }, [attempt.id, supabase]);

  const saveAnswer = useCallback(async (q: Q, response: any) => {
    setAnswers((a) => ({ ...a, [q.id]: response }));
    await supabase.from("answers").upsert(
      { attempt_id: attempt.id, question_id: q.id, response, updated_at: new Date().toISOString() },
      { onConflict: "attempt_id,question_id" }
    );
  }, [attempt.id, supabase]);

  const submit = useCallback(async (terminated = false) => {
    // Flush any remaining buffered snapshots in the sprite sheet
    if (spriteCounter.current % 4 !== 0 && spriteCanvas.current) {
       const blob: Blob | null = await new Promise((res) => spriteCanvas.current!.toBlob(res, "image/jpeg", 0.6));
       if (blob) {
         const path = `${attempt.id}/sprite_${Date.now()}_partial.jpg`;
         // Fire and forget so we don't delay submission
         supabase.storage.from("snapshots").upload(path, blob, { contentType: "image/jpeg" }).then(up => {
            if (!up.error) logEvent("snapshot_sprite", { path });
         });
       }
    }

    // All grading happens server-side; client never sees correct answers.
    await fetch(`/api/test/${test.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminated }),
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    setPhase("submitted");
    router.push("/dashboard");
    router.refresh();
  }, [test.id, router, attempt.id, supabase, logEvent]);

  const addViolation = useCallback((kind: string, detail?: any) => {
    logEvent(kind, detail);
    setViolations((v) => {
      const next = v + 1;
      setBanner(`⚠️ VIOLATION ${next}/${MAX_VIOLATIONS}: ${kind.replace(/_/g, " ").toUpperCase()}`);
      if (next >= MAX_VIOLATIONS) {
        logEvent("terminated", { reason: "max_violations" });
        submit(true);
      }
      return next;
    });
  }, [logEvent, submit]);

  // Progressive warning for minor infractions (no face / looking away).
  // Increments a strike counter; only escalates to a real violation after MINOR_STRIKE_THRESHOLD consecutive strikes.
  // Resets when the candidate is back in frame and looking at the screen.
  const addMinorStrike = useCallback((reason: string, detail?: any) => {
    minorStrikesRef.current += 1;
    const strikes = minorStrikesRef.current;
    logEvent(`warning_${reason}`, { strikes, ...detail });

    if (strikes >= MINOR_STRIKE_THRESHOLD) {
      // Escalate: this becomes a real violation
      minorStrikesRef.current = 0;
      setWarningText(null);
      addViolation(reason, { ...detail, escalated_after_strikes: MINOR_STRIKE_THRESHOLD });
    } else {
      // Show a scary warning banner but don't count it as a violation yet
      const remaining = MINOR_STRIKE_THRESHOLD - strikes;
      setWarningText(
        `🚨 WARNING: ${reason.replace(/_/g, " ").toUpperCase()} — Look at your screen NOW! (${remaining} more warning${remaining > 1 ? "s" : ""} before violation)`
      );
    }
  }, [addViolation, logEvent]);

  const clearMinorStrikes = useCallback(() => {
    if (minorStrikesRef.current > 0) {
      minorStrikesRef.current = 0;
      setWarningText(null);
    }
  }, []);

  // Head pose estimation using the 68-point face landmarks from face-api.js.
  // We compute the horizontal yaw by comparing the nose tip position relative to the face width.
  // A perfectly centered face has a ratio of ~0.5. Extreme values indicate looking far left/right.
  const estimateHeadYaw = useCallback((landmarks: any): number => {
    const points = landmarks.positions || landmarks._positions;
    if (!points || points.length < 17) return 0;

    // Jawline endpoints: points 0 (right jaw) and 16 (left jaw)
    // Nose tip: point 30
    const jawLeft = points[0];
    const jawRight = points[16];
    const noseTip = points[30];

    if (!jawLeft || !jawRight || !noseTip) return 0;

    const faceWidth = Math.abs(jawRight.x - jawLeft.x);
    if (faceWidth < 10) return 0; // face too small / unreliable

    // Ratio: where the nose sits between the jaw edges (0 = far left, 1 = far right)
    const noseRatio = (noseTip.x - jawLeft.x) / faceWidth;
    // Deviation from center (0.5). Positive = looking left, negative = looking right.
    return Math.abs(noseRatio - 0.5);
  }, []);

  // Start: request camera + fullscreen (gracefully handles mobile where fullscreen isn't supported)
  const startExam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e: any) {
      setBanner("Camera is required. Allow camera access and reload.");
      return;
    }

    // Attempt fullscreen — on mobile this may fail silently or throw, which is fine
    if (fullscreenSupported.current) {
      try { await containerRef.current?.requestFullscreen(); }
      catch {
        // Fullscreen not available (mobile browser, iframe restriction, etc.)
        // Proceed in monitored mode instead of blocking the exam
        fullscreenSupported.current = false;
        logEvent("fullscreen_unavailable", { mobile: isMobileRef.current, ua: navigator.userAgent });
      }
    }

    // On mobile, try to lock orientation to portrait to limit multitasking
    try { await (screen.orientation as any)?.lock?.("portrait"); } catch {}

    setPhase("onboarding");
  };

  const captureIdentity = async () => {
    const v = videoRef.current;
    if (!v || !faceapiRef.current) return;
    
    setBanner("Analyzing face... Please stay still.");
    try {
      const detections = await faceapiRef.current.detectSingleFace(v).withFaceLandmarks().withFaceDescriptor();
      if (!detections) {
        setBanner("No face detected. Please ensure your face is clearly visible and centered.");
        return;
      }
      
      const descriptorArray = Array.from(detections.descriptor);
      await logEvent("reference_face", { descriptor: descriptorArray });
      referenceDescriptorRef.current = detections.descriptor;
      
      // Upload reference snapshot
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth || 320; canvas.height = v.videoHeight || 240;
      canvas.getContext("2d")?.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));
      if (blob) {
        await supabase.storage.from("snapshots").upload(`${attempt.id}/reference.jpg`, blob, { contentType: "image/jpeg" });
      }
      
      setBanner(null);
      setPhase("active");
      logEvent("exam_started");
    } catch (e) {
      console.error(e);
      setBanner("Error capturing identity. Please try again.");
    }
  };

  // Wire proctoring listeners
  useEffect(() => {
    if (phase !== "active") return;

    // Fullscreen exit — only wire if fullscreen is actually supported & active
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        addViolation("fullscreen_exit");
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    };
    // Visibility change — works on ALL platforms including mobile
    const onVis = () => { if (document.hidden) addViolation("tab_switch"); };
    // Window blur — debounced to avoid false positives from clicking URL bar / OS chrome
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    const onBlur = () => {
      blurTimer = setTimeout(() => {
        if (document.hidden) addViolation("window_blur");
      }, 1000);
    };
    const onFocus = () => { if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; } };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); addViolation("copy_blocked"); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); addViolation("paste_blocked"); };
    const onCut = (e: ClipboardEvent) => { e.preventDefault(); addViolation("cut_blocked"); };
    const onContext = (e: MouseEvent) => { e.preventDefault(); };
    // Touch-based text selection prevention on mobile
    const onSelectStart = (e: Event) => { e.preventDefault(); };
    // Block drag (prevents dragging text/images to other apps)
    const onDragStart = (e: DragEvent) => { e.preventDefault(); };

    // Block long-press (Google Circle to Search, context menus, text selection on mobile).
    // If a touch lasts longer than 300ms without moving, we cancel it.
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    const onTouchStart = () => {
      longPressTimer = setTimeout(() => {
        // Long press detected — likely Google Circle to Search or text selection attempt.
        // This is a VIOLATION, not just a warning.
        addViolation("long_press_search", { device: "mobile" });
      }, 500);
    };
    const onTouchEnd = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
    const onTouchMove = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "s", "u"].includes(k)) { e.preventDefault(); addViolation("shortcut_blocked", { key: k }); }
      if (k === "printscreen") { e.preventDefault(); addViolation("printscreen_blocked"); }
      if (k === "f12") e.preventDefault();
    };

    // Only listen for fullscreen changes if the API is supported
    if (fullscreenSupported.current) {
      document.addEventListener("fullscreenchange", onFsChange);
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKey);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });

    // Mobile-specific: periodic focus check every 2s.
    // On mobile, blur/visibilitychange sometimes don't fire when swiping to another app
    // or pulling down the notification shade. This polling catches those gaps.
    let mobileCheckInterval: ReturnType<typeof setInterval> | null = null;
    if (isMobileRef.current) {
      mobileCheckInterval = setInterval(() => {
        if (document.hidden) {
          addViolation("mobile_app_switch");
        }
      }, 2000);
    }

    return () => {
      if (fullscreenSupported.current) {
        document.removeEventListener("fullscreenchange", onFsChange);
      }
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchmove", onTouchMove);
      if (mobileCheckInterval) clearInterval(mobileCheckInterval);
    };
  }, [phase, addViolation]);

  // Listen for admin controls: disqualification, extra time, pause/resume
  useEffect(() => {
    if (phase !== "active") return;
    const sub = supabase.channel(`attempt_${attempt.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "attempts", filter: `id=eq.${attempt.id}` }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === "terminated") {
          submit(true); // Terminate locally
          return;
        }
        // Admin added/removed time
        if (typeof updated.extra_minutes === "number" && updated.extra_minutes !== extraMinutesRef.current) {
          const diff = updated.extra_minutes - extraMinutesRef.current;
          extraMinutesRef.current = updated.extra_minutes;
          endAt.current += diff * 60_000;
          setBanner(diff > 0 ? `⏱️ Admin added ${diff} minute(s) to your exam.` : `⏱️ Admin removed ${Math.abs(diff)} minute(s) from your exam.`);
          setTimeout(() => setBanner(null), 5000);
        }
        // Admin paused/resumed
        if (updated.paused_at && !isPaused) {
          setIsPaused(true);
        } else if (!updated.paused_at && isPaused) {
          setIsPaused(false);
          // Timer end was already adjusted via extra_minutes by the resume API
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [phase, attempt.id, submit, supabase, isPaused]);

  // Webcam liveness check + AI inference + periodic snapshots
  useEffect(() => {
    if (phase !== "active") return;
    const i = setInterval(async () => {
      const track = streamRef.current?.getVideoTracks?.()?.[0];
      if (!track || track.readyState !== "live") { addViolation("camera_off"); return; }
      const canvas = document.createElement("canvas");
      const v = videoRef.current; if (!v) return;
      canvas.width = v.videoWidth || 320; canvas.height = v.videoHeight || 240;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      
      // Check for camera covered (very dark frame = dummy camera or covered lens)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let j = 0; j < data.length; j += 40) {
        rSum += data[j]; gSum += data[j+1]; bSum += data[j+2]; count++;
      }
      const avgLuminance = (0.299 * (rSum / count)) + (0.587 * (gSum / count)) + (0.114 * (bSum / count));
      if (avgLuminance < 10) {
        addViolation("camera_covered"); // Immediate — this is deliberate cheating
      }

      // AI Inference — face detection, identity verification, head pose
      if (faceapiRef.current) {
         try {
           const detections = await faceapiRef.current.detectAllFaces(v).withFaceLandmarks().withFaceDescriptors();

           if (detections.length === 0) {
              // MINOR: no face detected — use progressive warning
              addMinorStrike("no_face_detected");
           } else if (detections.length > 1) {
              // SEVERE: multiple people — immediate violation
              addViolation("multiple_faces_detected", { count: detections.length });
           } else {
              // Exactly one face detected
              const detection = detections[0];

              // Identity check — SEVERE if mismatch
              if (referenceDescriptorRef.current) {
                 const dist = faceapiRef.current.euclideanDistance(detection.descriptor, referenceDescriptorRef.current);
                 if (dist > 0.55) { 
                    addViolation("impersonation_detected", { distance: dist.toFixed(3) });
                 }
              }

              // Head pose estimation — MINOR if looking away
              const yawDeviation = estimateHeadYaw(detection.landmarks);
              if (yawDeviation > HEAD_YAW_THRESHOLD) {
                addMinorStrike("looking_away", { yaw: yawDeviation.toFixed(3) });
              } else {
                // Face visible and looking at screen — clear any accumulated minor strikes
                clearMinorStrikes();
              }
           }
         } catch (e) { console.error("Face-api err", e); }
      }

      // Object detection — SEVERE for electronics
      if (cocoModelRef.current) {
         try {
           const predictions = await cocoModelRef.current.detect(v);
           const hasElectronics = predictions.filter((p: any) => p.class === "cell phone" || p.class === "laptop" || p.class === "tv");
           if (hasElectronics.length > 0) {
              addViolation("electronics_detected", { objects: hasElectronics.map((p: any) => p.class).join(",") });
           }
         } catch (e) { console.error("Coco-ssd err", e); }
      }

      // Buffer into 2x2 Sprite Sheet
      if (!spriteCanvas.current) {
        spriteCanvas.current = document.createElement("canvas");
        spriteCanvas.current.width = 640;
        spriteCanvas.current.height = 480;
      }
      
      const sCtx = spriteCanvas.current.getContext("2d");
      if (sCtx) {
        const index = spriteCounter.current % 4;
        const x = (index % 2) * 320;
        const y = Math.floor(index / 2) * 240;
        
        // Draw the frame
        sCtx.drawImage(canvas, x, y, 320, 240);
        
        // Add timestamp overlay at the bottom of the frame
        sCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
        sCtx.fillRect(x, y + 220, 320, 20);
        sCtx.fillStyle = "white";
        sCtx.font = "12px monospace";
        sCtx.fillText(new Date().toLocaleTimeString(), x + 5, y + 234);
        
        spriteCounter.current += 1;
        
        // When grid is full (4 snapshots = 1 minute), upload it
        if (spriteCounter.current % 4 === 0) {
          const blob: Blob | null = await new Promise((res) => spriteCanvas.current!.toBlob(res, "image/jpeg", 0.6));
          if (blob) {
            const path = `${attempt.id}/sprite_${Date.now()}.jpg`;
            const up = await supabase.storage.from("snapshots").upload(path, blob, { contentType: "image/jpeg" });
            if (!up.error) logEvent("snapshot_sprite", { path });
          }
        }
      }
    }, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(i);
  }, [phase, addViolation, addMinorStrike, clearMinorStrikes, estimateHeadYaw, attempt.id, logEvent, supabase]);

  // Timer — freezes when paused
  useEffect(() => {
    if (phase !== "active") return;
    const i = setInterval(() => {
      if (isPaused) return; // Don't count down while paused
      const t = Date.now(); setNow(t);
      if (t >= endAt.current) { clearInterval(i); submit(false); }
    }, 1000);
    return () => clearInterval(i);
  }, [phase, submit, isPaused]);

  if (phase === "prep" || phase === "onboarding") {
    return (
      <main className="max-w-2xl mx-auto p-4 sm:p-10" ref={containerRef}>
        {phase === "prep" ? (
           <>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            <p className="text-slate-600 mt-2">{test.description}</p>
            <div className="card mt-6 space-y-2 text-sm border-red-900/50 bg-red-950/20">
              <p className="text-red-500 font-bold text-base uppercase tracking-wider">⚠️ Strict AI Proctoring Active</p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-300 mt-3">
                <li><b className="text-zinc-100">Absolute Fullscreen Lockdown:</b> Any attempt to exit fullscreen will trigger an immediate violation.</li>
                <li><b className="text-zinc-100">AI Vision Surveillance:</b> Your webcam must remain active. We use AI to detect multiple people, electronic devices (cell phones), and verify your identity in real-time.</li>
                <li><b className="text-zinc-100">Head Pose Tracking:</b> Our AI monitors the direction you are facing. Persistently looking away from the screen will trigger warnings, and repeated offenses will be escalated to violations.</li>
                <li><b className="text-zinc-100">Environment Integrity:</b> Right-clicking, copying, pasting, and all keyboard shortcuts are strictly prohibited and actively blocked.</li>
                <li><b className="text-zinc-100">Focus Tracking:</b> Looking away from the window or switching tabs will be instantly flagged.</li>
                <li><b className="text-red-400">Zero Tolerance:</b> {MAX_VIOLATIONS} violations will result in the immediate and permanent termination of your exam.</li>
                {test.is_hardcore_mode && (
                  <li className="text-orange-500 font-bold">Hardcore Mode: You cannot return to previous questions. Once you click next, your answer is locked permanently.</li>
                )}
                <li><b className="text-zinc-100">Duration:</b> {test.duration_minutes} minutes.</li>
              </ul>
            </div>
            {isMobileRef.current && (
              <div className="card mt-4 border-amber-900/50 bg-amber-950/20">
                <p className="text-amber-400 font-bold text-sm uppercase tracking-wider mb-2">📱 Mobile Device Detected</p>
                <p className="text-zinc-300 text-sm">You <b>MUST</b> enable <b>Do Not Disturb (DND)</b> mode before starting. Incoming calls, notifications, and any app switching will be treated as <b className="text-red-400">immediate violations</b>.</p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={dndChecked} onChange={(e) => setDndChecked(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                  <span className="text-sm text-zinc-200 font-medium">I have enabled Do Not Disturb mode on my device</span>
                </label>
              </div>
            )}
            {banner && <p className="text-red-100 text-sm mt-4 bg-red-900/80 p-3 rounded">{banner}</p>}
            <button className="btn mt-6 w-full py-3" onClick={startExam} disabled={!modelsLoaded || (isMobileRef.current && !dndChecked)}>
               {modelsLoaded ? (isMobileRef.current && !dndChecked ? "Enable DND first" : "Acknowledge & Continue") : "Loading AI Proctoring Engine..."}
            </button>
           </>
        ) : (
           <div className="text-center mt-10">
              <h2 className="text-2xl font-bold mb-4">Identity Verification</h2>
              <p className="text-zinc-400 mb-6">Please look directly at the camera. This reference photo will be used by our AI to verify your identity throughout the exam.</p>
              <div className="relative mx-auto w-80 h-60 bg-black rounded-lg overflow-hidden border-2 border-zinc-700 shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted playsInline />
                <div className="absolute inset-0 border-[3px] border-dashed border-orange-500/50 m-6 rounded-lg pointer-events-none" />
              </div>
              {banner && <p className="text-red-400 font-bold mt-6">{banner}</p>}
              <button className="btn mt-8" onClick={captureIdentity}>Capture & Start Exam</button>
           </div>
        )}
      </main>
    );
  }

  const q = shuffledQuestions[idx];
  const remaining = Math.max(0, Math.floor((endAt.current - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-zinc-950"
      style={{ userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Violation banner (red, permanent until next event) */}
      {banner && <div className="bg-red-600 text-white text-center py-2 text-sm font-bold animate-pulse">{banner}</div>}
      {/* Progressive warning banner (amber, shows during minor strikes) */}
      {warningText && !banner && (
        <div className="bg-amber-600 text-white text-center py-2 text-sm font-bold animate-pulse">{warningText}</div>
      )}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 gap-4">
        <div className="text-zinc-200 select-none w-full sm:w-auto">
          <b className="block sm:inline truncate">{test.title}</b> <span className="text-zinc-500 text-sm">· Q{idx + 1}/{shuffledQuestions.length}</span>
          {test.is_hardcore_mode && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded bg-red-500/10 animate-pulse">🔒 HARDCORE</span>}
        </div>
        <div className="flex flex-wrap items-center gap-4 select-none w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative border border-zinc-800 rounded bg-black">
            <video ref={videoRef} className="w-24 h-16 object-cover scale-x-[-1]" muted playsInline />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="AI Monitored" />
          </div>
          <div className="flex items-center gap-4">
            <div className="font-mono text-lg">{mm}:{ss}</div>
            <button className="btn" onClick={() => submit(false)}>Submit</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        {isPaused ? (
          <div className="card text-center py-20">
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="text-3xl font-bold text-amber-400 mb-4">Exam Paused</h2>
            <p className="text-zinc-300 max-w-md mx-auto">Your exam has been paused by the administrator. The timer is frozen. Please wait — it will resume automatically.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Waiting for admin to resume...
            </div>
          </div>
        ) : !isFullscreen && fullscreenSupported.current ? (
          <div className="card text-center py-16">
            <h2 className="text-3xl font-bold text-red-500 mb-4">Fullscreen Exited</h2>
            <p className="text-zinc-300 mb-8 max-w-md mx-auto">You have left fullscreen mode. This is a violation of the exam rules. You must return to fullscreen to continue the exam.</p>
            <button 
              className="btn bg-red-600 hover:bg-red-700"
              onClick={async () => {
                try { await containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
                catch { setBanner("Fullscreen is required."); }
              }}
            >
              Return to Fullscreen
            </button>
          </div>
        ) : q && (
          <div className="card">
            {q.section_title && (
              <div className="mb-4 pb-2 border-b border-zinc-800">
                <h3 className="text-xl font-bold text-orange-500 uppercase tracking-wider">{q.section_title}</h3>
              </div>
            )}
            <div className="text-sm text-zinc-400 select-none">{q.type} · {q.points} pts</div>
            <div className="mt-1 select-none pointer-events-none">
              <MarkdownRenderer content={q.prompt} className="text-lg font-semibold whitespace-pre-wrap" />
            </div>
            {q.image_url && <img src={q.image_url} alt="" className="mt-3 max-h-80 rounded border select-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />}
            <div className="mt-4 space-y-2">
              {q.type === "long_text" && (
                <textarea
                  className="input min-h-[200px] font-mono"
                  value={answers[q.id]?.text || ""}
                  onPaste={(e) => e.preventDefault()}
                  onChange={(e) => saveAnswer(q, { text: e.target.value })}
                />
              )}
              {q.type !== "long_text" && q.options?.map((opt) => {
                const sel: string[] = answers[q.id]?.selected || [];
                const checked = sel.includes(opt.id);
                return (
                  <label key={opt.id} className={`flex gap-2 items-center p-3 rounded-lg border ${checked ? "border-orange-500 bg-orange-500/10" : "border-zinc-800 hover:border-zinc-700"}`}>
                    <input
                      type={q.type === "mcq_single" ? "radio" : "checkbox"}
                      name={`q-${q.id}`}
                      checked={checked}
                      onChange={(e) => {
                         let next = sel.slice();
                         if (q.type === "mcq_single") next = e.target.checked ? [opt.id] : [];
                         else next = e.target.checked ? [...next, opt.id] : next.filter((x) => x !== opt.id);
                         saveAnswer(q, { selected: next });
                      }}
                    />
                    <div className="flex-1 pointer-events-none">
                      <MarkdownRenderer content={opt.text} />
                      {opt.image_url && <img src={opt.image_url} alt="" className="mt-1 max-h-32 rounded border" onContextMenu={(e) => e.preventDefault()} draggable={false} />}
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="mt-6 flex justify-between select-none">
              {!test.is_hardcore_mode ? (
                <button className="btn-secondary" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>← Previous</button>
              ) : (
                <div className="text-xs text-red-400/60 flex items-center gap-1"><span>🔒</span> No going back</div>
              )}
              {idx < shuffledQuestions.length - 1 ? (
                <button className="btn" onClick={() => setIdx((i) => i + 1)}>Next →</button>
              ) : (
                <button className="btn" onClick={() => submit(false)}>Finish & submit</button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
