import union from "@turf/union";
import simplify from "simplify-js";
import { Vertices } from "matter-js";
import { loadMatterJs } from "./convert-to-physics";

// Turns the buildings currently on screen into matter-js bodies on a new canvas.
export function createCanvasWithMesh(map, width, height) {
  // Buildings crossing a tile border come back as several pieces with the same id.
  const buildings = new Map();
  for (const piece of map.queryRenderedFeatures({ layers: ["buildings-fill"] })) {
    const { id } = piece.properties;
    const prev = buildings.get(id);
    buildings.set(
      id,
      prev
        ? union({ type: "FeatureCollection", features: [prev, piece] }) ?? prev
        : piece
    );
  }

  // Rings ([outer, ...holes]) in screen pixels, simplified to 1px, dropping anything below 1px².
  const toPixels = (ring) => simplify(ring.slice(0, -1).map((c) => map.project(c)), 1);
  const isSolid = (v) => v.length > 2 && Vertices.area(v) > 1;
  const shapes = [...buildings.values()]
    .flatMap(({ geometry }) =>
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates
    )
    .map((polygon) => polygon.map(toPixels))
    .filter(([outer]) => isSolid(outer))
    .map(([outer, ...holes]) => [outer, ...holes.filter(isSolid)]);

  if (shapes.length === 0) return null;

  const canvas = document.createElement("canvas");
  // poly-decomp gets too slow for very dense views; those fall back to convex hulls.
  const destroy = loadMatterJs(canvas, width, height, shapes, shapes.length < 19_000);
  return { canvas, destroy };
}
