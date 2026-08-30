import { prefersReducedMotion } from "./motion";

const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"];
const PARTICLES = 60;

let canvas: HTMLCanvasElement | null = null;
let frame: number | null = null;

function ensureCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
  }
  if (!canvas.isConnected) document.body.appendChild(canvas);
  return canvas;
}

/**
 * Lluvia de confeti al acertar. Reutiliza un único canvas y cancela la
 * animación anterior, en vez de crear un canvas y un bucle de
 * requestAnimationFrame por cada respuesta correcta (con respuestas rápidas
 * se acumulaban varios bucles dibujando a la vez).
 *
 * No se dibuja nada si el sistema pide reducir movimiento (WCAG 2.3.3).
 */
export function triggerConfetti() {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion()) return;

  const el = ensureCanvas();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  el.width = Math.floor(width * dpr);
  el.height = Math.floor(height * dpr);
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;

  const ctx = el.getContext("2d");
  if (!ctx) {
    el.remove();
    return;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const particles = Array.from({ length: PARTICLES }, () => ({
    x: width / 2,
    y: height / 2,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.8) * 12,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    life: 100,
  }));

  if (frame !== null) cancelAnimationFrame(frame);

  function step() {
    ctx!.clearRect(0, 0, width, height);
    let alive = false;
    for (const p of particles) {
      if (p.life > 0) {
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
    }
    if (alive) {
      frame = requestAnimationFrame(step);
    } else {
      frame = null;
      el.remove();
    }
  }
  frame = requestAnimationFrame(step);
}
