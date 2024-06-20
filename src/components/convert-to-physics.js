import {
  Bodies,
  Body,
  Composite,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Render,
  Runner,
  Vertices,
  World,
  Common,
} from "matter-js";
import { centroid } from "@turf/turf";
import decomp from "poly-decomp";

Common.setDecomp(decomp);
Common.setDecomp(null);

let engine;

export async function loadMatterJs(
  canvas,
  width,
  height,
  collection,
  doDecomp
) {
  if (doDecomp) {
    Common.setDecomp(decomp);
  } else {
    Common.setDecomp(null);
  }

  engine = Engine.create({
    gravity: { x: 0, y: 0 },
  });
  const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: width,
      height: height,
      pixelRatio: "auto",
      wireframes: false,
      background: "white", // Set the canvas background to white
    },
  });

  Render.run(render);
  Runner.run(Runner.create(), engine);

  // Create borders
  const borderThickness = 50;
  const createBorders = () => {
    return [
      Bodies.rectangle(
        width / 2,
        -borderThickness / 2,
        width,
        borderThickness,
        {
          isStatic: true,
          label: "border",
        }
      ), // Top
      Bodies.rectangle(
        width / 2,
        height + borderThickness / 2,
        width,
        borderThickness,
        { isStatic: true, label: "border" }
      ), // Bottom
      Bodies.rectangle(
        -borderThickness / 2,
        height / 2,
        borderThickness,
        height,
        { isStatic: true, label: "border" }
      ), // Left
      Bodies.rectangle(
        width + borderThickness / 2,
        height / 2,
        borderThickness,
        height,
        { isStatic: true, label: "border" }
      ), // Right
    ];
  };

  // Calculate centroid of vertices
  function calculateCentroid(vertices) {
    let centroid = { x: 0, y: 0 };
    vertices.flat().forEach((vertex) => {
      centroid.x += vertex.x;
      centroid.y += vertex.y;
    });
    centroid.x /= vertices.flat().length;
    centroid.y /= vertices.flat().length;
    return centroid;
  }
  const starSvgDataUri =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="gold" stroke="black" stroke-width="1"/>
    </svg>
`);
  function encodeSvg(svg) {
    console.log("svg", svg);
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }
  // Create js body from vertices
  function createBody(item) {
    const centroid = calculateCentroid(item.vertices);
    console.log(Vertices.isConvex(item.vertices));
    const body = Bodies.fromVertices(
      centroid.x,
      centroid.y,
      [item.vertices],
      {
        // isStatic: true,

        render: {
          fillStyle: "rgba(0,0,0,1)",
          // sprite: {
          //   texture: starSvgDataUri,
          // },
        },
      },
      false,
      0.0,
      0.0,
      0.0
    );
    if (!body) {
      console.log(body);
    } else {
      try {
        Composite.add(engine.world, body);
      } catch (error) {
        // console.error("Failed to create body from vertice", vertices, error);
      }
    }
  }

  World.clear(engine.world);
  Engine.clear(engine);
  let borders = createBorders();
  World.add(engine.world, borders);

  engine.positionIterations = 6; // Reduced iterations
  engine.velocityIterations = 4; // Reduced iterations
  Engine.update(engine, 1000 / 60);

  // Make shapes draggable
  const mouse = Mouse.create(canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false,
      },
    },
  });
  World.add(engine.world, mouseConstraint);
  // Process paths in batches
  for (let i = 0; i < collection.length; i += 50) {
    // Reduced batch size
    const batch = collection.slice(i, i + 50);
    batch.forEach((item) => {
      try {
        if (item.vertices.length > 2) {
          createBody(item);
        } else {
          console.warn("Insufficient vertices to form a body:", item);
        }
      } catch (error) {
        console.error("Error processing path:", item, error);
      }
    });
    await new Promise(requestAnimationFrame); // Yield to allow UI update
  }
  Events.on(engine, "afterUpdate", applyAttraction);
  return function destroy() {
    Events.off(engine, "afterUpdate");
    World.clear(engine.world);
    Engine.clear(engine);
    Render.stop(render);
    render.canvas.remove();
    render.canvas = null;
    render.context = null;
    render.textures = {};
    engine = null;
  };
}

function applyAttraction() {
  const bodies = Composite.allBodies(engine.world).filter(
    (body) => body.label !== "border"
  );

  // Calculate areas and sort bodies by area
  const bodyAreas = bodies
    .map((body) => ({
      body,
      area: Vertices.area(body.vertices),
    }))
    .sort((a, b) => b.area - a.area);

  // Get the five largest bodies
  const largestBodies = bodyAreas.slice(0, 5).map((entry) => entry.body);

  // Apply attraction from the five largest bodies to all other bodies
  for (const bodyA of largestBodies) {
    for (const bodyB of bodies) {
      if (bodyA !== bodyB) {
        const dx = bodyA.position.x - bodyB.position.x;
        const dy = bodyA.position.y - bodyB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const forceMagnitude = (0.000001 * bodyA.mass) / (distance * distance);
        const force = { x: dx * forceMagnitude, y: dy * forceMagnitude };
        Body.applyForce(bodyB, bodyB.position, force);
      }
    }
  }
}
