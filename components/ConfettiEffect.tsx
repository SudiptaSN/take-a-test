"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  decay: number;
  shape: "rect" | "circle";
}

const COLORS = [
  "#f97316", // orange-500
  "#ef4444", // red-500
  "#eab308", // yellow-500
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
];

export default function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particleCount = 150;
    const particles: Particle[] = [];

    // Create dual burst locations (left & right lower/center)
    const origins = [
      { x: width * 0.3, y: height * 0.5 },
      { x: width * 0.7, y: height * 0.5 },
      { x: width * 0.5, y: height * 0.4 },
    ];

    for (let i = 0; i < particleCount; i++) {
      const origin = origins[i % origins.length];
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 15 + 5;
      
      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 5, // initial upward force
        size: Math.random() * 8 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        decay: Math.random() * 0.008 + 0.004,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;

      for (let p of particles) {
        if (p.opacity <= 0) continue;

        activeParticles++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.98; // drag
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (activeParticles > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}
