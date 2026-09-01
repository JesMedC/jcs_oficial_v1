import { useEffect, useRef, useState } from 'react';

const TARGET_FPS = 30;
const FRAME_BUDGET_MS = 1000 / TARGET_FPS;
const DPR_CAP = 1.5;
const PARTICLE_COUNT = 60;
const BLOB_COUNT = 3;

interface Blob {
  readonly baseX: number;
  readonly baseY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly phase: number;
  readonly speed: number;
}

interface Particle {
  readonly a: number;
  readonly b: number;
  readonly phaseX: number;
  readonly phaseY: number;
  readonly speedX: number;
  readonly speedY: number;
}

function buildBlobs(width: number, height: number): readonly Blob[] {
  const blobs: Blob[] = [];
  for (let i = 0; i < BLOB_COUNT; i += 1) {
    blobs.push({
      baseX: ((i + 1) / (BLOB_COUNT + 1)) * width,
      baseY: ((i + 2) / (BLOB_COUNT + 2)) * height,
      radiusX: width * 0.4,
      radiusY: height * 0.4,
      phase: (i * Math.PI * 2) / BLOB_COUNT,
      speed: 0.0004 + i * 0.00015,
    });
  }
  return blobs;
}

function buildParticles(): readonly Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const a = 0.18 + Math.random() * 0.22;
    const b = 0.18 + Math.random() * 0.22;
    particles.push({
      a,
      b,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: 0.0006 + Math.random() * 0.0008,
      speedY: 0.0005 + Math.random() * 0.0008,
    });
  }
  return particles;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shouldRender, setShouldRender] = useState<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    if (prefersReducedMotion()) {
      setShouldRender(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      setShouldRender(false);
      return;
    }

    let dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const blobs = buildBlobs(width, height);
    const particles = buildParticles();

    let rafHandle: number | null = null;
    let lastFrameTime = performance.now();
    let running = true;
    let inViewport = true;
    let tabVisible = document.visibilityState === 'visible';
    let startTs = performance.now();

    const sentinel = document.createElement('div');
    sentinel.setAttribute('data-aurora-sentinel', 'true');
    sentinel.style.cssText =
      'position:fixed;left:0;top:0;width:1px;height:1px;pointer-events:none;opacity:0;';
    document.body.appendChild(sentinel);

    const intersection = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        inViewport = entry !== undefined ? entry.isIntersecting : true;
      },
      { threshold: 0 },
    );
    intersection.observe(sentinel);

    const onVisibility = () => {
      tabVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onResize = () => {
      resize();
    };
    window.addEventListener('resize', onResize);

    const draw = (now: number) => {
      if (!running) return;

      const elapsed = now - lastFrameTime;
      if (elapsed < FRAME_BUDGET_MS) {
        rafHandle = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = now - (elapsed % FRAME_BUDGET_MS);

      if (!inViewport || !tabVisible) {
        rafHandle = requestAnimationFrame(draw);
        return;
      }

      const t = now - startTs;
      ctx.clearRect(0, 0, width, height);

      for (const blob of blobs) {
        const offsetX = Math.sin(t * blob.speed + blob.phase) * blob.radiusX * 0.18;
        const offsetY = Math.cos(t * blob.speed * 0.85 + blob.phase) * blob.radiusY * 0.18;
        const x = blob.baseX + offsetX;
        const y = blob.baseY + offsetY;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, blob.radiusX);
        gradient.addColorStop(0, 'rgba(0,255,255,0.18)');
        gradient.addColorStop(1, 'rgba(0,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, blob.radiusX, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(0,255,255,0.4)';
      for (const particle of particles) {
        const angleX = t * particle.speedX + particle.phaseX;
        const angleY = t * particle.speedY + particle.phaseY;
        const px = (0.5 + particle.a * Math.sin(3 * angleX)) * width;
        const py = (0.5 + particle.b * Math.sin(2 * angleY + Math.PI / 4)) * height;
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      rafHandle = requestAnimationFrame(draw);
    };

    rafHandle = requestAnimationFrame(draw);

    return () => {
      running = false;
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      intersection.disconnect();
      sentinel.remove();
    };
  }, []);

  if (!shouldRender) {
    return (
      <div
        className="fixed inset-0 -z-10 pointer-events-none bg-aurora-static"
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}
