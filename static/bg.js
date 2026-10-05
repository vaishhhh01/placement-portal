const COUNT = 85;
const MIN_SIZE = 2;
const MAX_SIZE = 9;
const MOTION_STRENGTH = 1;
const SEED = 42;
const HOME_CLEAR_BAND = 0.3;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createDots(seed, count, minSize, maxSize, clearCenter = false) {
  const safeCount = Math.max(1, Math.floor(count));
  const sizeRangeBias = clamp(Math.abs(maxSize - minSize) / 10, 0, 1);
  const approxAngles = clamp(Math.round(Math.sqrt(safeCount * (5.5 + sizeRangeBias))), 12, 48);
  const rows = clearCenter ? 6 : clamp(Math.round(safeCount / approxAngles), 6, 24);
  const angles = Math.max(8, Math.round(safeCount / rows));
  const phase = (((seed || 1) * 0.61803398875) % 1) * Math.PI * 2;
  const output = [];

  for (let row = 0; row < rows; row++) {
    let y;
    if (clearCenter) {
      // Keep complete, evenly spaced rows above and below the hero copy.
      const rowsPerSide = rows / 2;
      const sideRow = row % rowsPerSide;
      const distance = 0.5 - HOME_CLEAR_BAND;
      const offset = rowsPerSide === 1 ? 0 : (sideRow / (rowsPerSide - 1)) * distance;
      y = row < rowsPerSide ? -0.5 + offset : HOME_CLEAR_BAND + offset;
    } else {
      y = rows === 1 ? 0 : row / (rows - 1) - 0.5;
    }
    for (let col = 0; col < angles; col++) {
      const theta = (col / angles) * Math.PI * 2 + phase;
      output.push({ theta, y });
    }
  }

  return output.slice(0, safeCount);
}

function projectLatticeDot(dot, angle, width, height, minSize, maxSize) {
  const radius = Math.min(width, height) * 0.37;
  const yScale = height * 0.82;
  const perspectiveDistance = Math.min(width, height) * 1.25;

  const x3d = Math.sin(dot.theta + angle) * radius;
  const z3d = Math.cos(dot.theta + angle) * radius;
  const y3d = dot.y * yScale;
  const perspective = perspectiveDistance / (perspectiveDistance - z3d);
  const x = width * 0.5 + x3d * perspective;
  const y = height * 0.5 + y3d * perspective;
  const depth = clamp((z3d / radius + 1) * 0.5, 0, 1);
  const dotSize = minSize + (maxSize - minSize) * depth;
  const r = dotSize * (0.45 + depth * 0.8);
  const opacity = 0.18 + depth * 0.82;

  return { x, y, r, opacity, z: z3d };
}

(function startScrollDotField() {
  const canvas = document.getElementById("bg");
  if (!canvas) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const allowTrail = Boolean(canvas.dataset.trail);
  const isHome = canvas.dataset.trail === "home";
  const dots = createDots(SEED, COUNT, MIN_SIZE, MAX_SIZE, isHome);
  const seedAngle = (((SEED || 1) * 0.61803398875) % 1) * Math.PI * 2;

  let rafId = null;
  let angle = 0;
  let spinImpulse = 0;
  let spinImpulseTarget = 0;
  let lastTick = 0;
  let touchY = null;
  let lastPointerSample = 0;
  const cursorTrail = [];

  function context2d() {
    return canvas.getContext("2d");
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(window.innerWidth));
    const height = Math.max(1, Math.floor(window.innerHeight));
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = context2d();
    if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reducedMotion) drawFrame(0, false);
  }

  function drawFrame(time, animate) {
    const context = context2d();
    if (!context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const safeMin = Math.max(0.25, Math.min(MIN_SIZE, MAX_SIZE));
    const safeMax = Math.max(safeMin, Math.max(MIN_SIZE, MAX_SIZE));
    const drawAngle = animate ? angle : seedAngle;
    const projected = dots
      .map((dot) => projectLatticeDot(dot, drawAngle, width, height, safeMin, safeMax))
      .sort((a, b) => a.z - b.z);

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#FFFFFF";

    for (let i = 0; i < projected.length; i++) {
      const dot = projected[i];
      context.globalAlpha = dot.opacity;
      context.beginPath();
      context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      context.fill();
    }

    if (animate && !reducedMotion && allowTrail) {
      const nextTrail = [];
      for (let i = 0; i < cursorTrail.length; i++) {
        const point = cursorTrail[i];
        const age = time - point.time;
        if (age > 520) continue;
        const life = 1 - age / 520;
        context.globalAlpha = point.alpha * life * 0.8;
        context.beginPath();
        context.arc(point.x, point.y, point.size * (0.75 + life * 0.45), 0, Math.PI * 2);
        context.fill();
        nextTrail.push(point);
      }
      cursorTrail.length = 0;
      cursorTrail.push(...nextTrail);
    }

    context.globalAlpha = 1;
  }

  function pushImpulse(deltaY) {
    const scaled = clamp((-deltaY / 320) * MOTION_STRENGTH, -1.5, 1.5);
    spinImpulseTarget = clamp(spinImpulseTarget + scaled, -2.2, 2.2);
  }

  function handleWheel(event) {
    pushImpulse(event.deltaY);
  }

  function handleTouchStart(event) {
    touchY = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event) {
    const currentY = event.touches[0]?.clientY;
    if (typeof currentY !== "number" || touchY === null) return;
    const delta = currentY - touchY;
    touchY = currentY;
    pushImpulse(delta);
  }

  function handleTouchEnd() {
    touchY = null;
  }

  function handlePointerMove(event) {
    if (!allowTrail || event.pointerType === "touch") return;
    const now = performance.now();
    if (now - lastPointerSample < 16) return;
    lastPointerSample = now;
    const x = event.clientX;
    const y = event.clientY;
    const sizePulse = 2.2 + ((x + y) % 11) / 4;
    const alpha = 0.25 + ((x * 0.37 + y * 0.19) % 100) / 250;
    cursorTrail.push({ x, y, time: now, size: sizePulse, alpha: clamp(alpha, 0.2, 0.7) });
    if (cursorTrail.length > 24) cursorTrail.splice(0, cursorTrail.length - 24);
  }

  function tick(time) {
    const lastTime = lastTick || time;
    const deltaSec = clamp((time - lastTime) / 1000, 0.001, 0.05);
    lastTick = time;

    const baseSpin = 0.18 * MOTION_STRENGTH;
    spinImpulseTarget *= 0.94;
    spinImpulse += (spinImpulseTarget - spinImpulse) * 0.12;
    spinImpulse *= 0.985;
    const angularVelocity = baseSpin + spinImpulse;
    angle = (angle + angularVelocity * deltaSec) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;

    drawFrame(time, true);
    rafId = requestAnimationFrame(tick);
  }

  function cleanup() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("resize", resize);
    window.removeEventListener("wheel", handleWheel);
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    window.removeEventListener("touchcancel", handleTouchEnd);
    window.removeEventListener("pointermove", handlePointerMove);
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("wheel", handleWheel, { passive: true });
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: true });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pagehide", cleanup, { once: true });

  if (reducedMotion) {
    drawFrame(0, false);
    return;
  }

  rafId = requestAnimationFrame(tick);
})();
