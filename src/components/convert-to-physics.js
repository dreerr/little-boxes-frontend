import {
  Bodies,
  Common,
  Composite,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Runner,
  Vertices,
} from "matter-js";
import decomp from "poly-decomp";

const BORDER = 50;
const FRAME_BUDGET_MS = 8;
const PULL = 0.000001 * (1000 / 60) ** 2; // same strength as the former applyForce

// Starts the simulation on `canvas` and returns a function that stops it and removes the canvas.
export function loadMatterJs(canvas, width, height, shapes, doDecomp) {
  Common.setDecomp(doDecomp ? decomp : null);

  const engine = Engine.create({
    gravity: { x: 0, y: 0 },
    positionIterations: 6,
    velocityIterations: 4,
    // Resting buildings sleep and cost (almost) nothing; a drag wakes only the ones it touches.
    enableSleeping: true,
  });
  const runner = Runner.create();
  Runner.run(runner, engine);

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  const mouse = Mouse.create(canvas);
  mouse.pixelRatio = dpr;

  Composite.add(engine.world, [
    Bodies.rectangle(width / 2, -BORDER / 2, width, BORDER, { isStatic: true }),
    Bodies.rectangle(width / 2, height + BORDER / 2, width, BORDER, { isStatic: true }),
    Bodies.rectangle(-BORDER / 2, height / 2, BORDER, height, { isStatic: true }),
    Bodies.rectangle(width + BORDER / 2, height / 2, BORDER, height, { isStatic: true }),
    MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2 } }),
  ]);

  const bodies = [];
  let attractors = [];
  let stopped = false;
  let frame;

  // All buildings in one path with one fill: about half the cost of Matter's per-part Render.
  (function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.beginPath();
    for (const { parts } of bodies) {
      // A compound body's first part is its hull; draw only the real pieces.
      for (let i = parts.length > 1 ? 1 : 0; i < parts.length; i++) {
        const v = parts[i].vertices;
        ctx.moveTo(v[0].x, v[0].y);
        for (let j = 1; j < v.length; j++) ctx.lineTo(v[j].x, v[j].y);
      }
    }
    ctx.fillStyle = "black";
    ctx.fill();
    frame = requestAnimationFrame(draw);
  })();

  // The five largest buildings pull all awake buildings towards them.
  function attract() {
    for (const b of bodies) {
      if (b.isSleeping) continue;
      for (const a of attractors) {
        if (a === b) continue;
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const f = (PULL * a.mass) / (b.mass * (dx * dx + dy * dy));
        // Nudge velocity via positionPrev: a Body.applyForce would keep the body awake forever.
        b.positionPrev.x -= dx * f;
        b.positionPrev.y -= dy * f;
      }
    }
  }

  // Add bodies in time-sliced batches so the page stays responsive while they pop in.
  (async () => {
    let batch = [];
    let deadline = performance.now() + FRAME_BUDGET_MS;
    for (const shape of shapes) {
      if (stopped) return;
      const { x, y } = Vertices.centre(shape);
      // Start asleep: the city holds still (and costs nothing) until something touches it.
      const body = Bodies.fromVertices(x, y, [shape], { isSleeping: true }, false, 0, 0, 0);
      if (body) batch.push(body);
      if (performance.now() > deadline) {
        Composite.add(engine.world, batch);
        bodies.push(...batch);
        batch = [];
        await new Promise(requestAnimationFrame);
        deadline = performance.now() + FRAME_BUDGET_MS;
      }
    }
    if (stopped) return;
    Composite.add(engine.world, batch);
    bodies.push(...batch);
    // Areas never change, so pick the attractors once instead of every frame.
    attractors = [...bodies].sort((a, b) => b.area - a.area).slice(0, 5);
    Events.on(engine, "afterUpdate", attract);
  })();

  return function destroy() {
    stopped = true;
    cancelAnimationFrame(frame);
    Events.off(engine);
    Runner.stop(runner);
    Composite.clear(engine.world);
    Engine.clear(engine);
    canvas.remove();
  };
}
