import {
  union,
  bbox,
  rewind,
  simplify,
  featureCollection as turfFeatureCollection,
} from "@turf/turf";

import { loadMatterJs } from "./convert-to-physics";
import { remap } from "@anselan/maprange";

export async function createCanvasWithMesh(
  map,
  width = window.innerWidth,
  height = window.innerHeight
) {
  const mapFeatures = map.querySourceFeatures("public.data_building", {
    sourceLayer: "public.data_building",
  });

  const highQuality = mapFeatures.length < 19_000;
  console.log("high quality", highQuality, mapFeatures.length);

  // canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // bounds
  const bounds = map.getBounds();
  const [minX, minY, maxX, maxY] = [
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast(),
    bounds.getSouth(),
  ];

  const mapBbox = [minX, maxY, maxX, minY];
  const geoWidth = maxX - minX,
    geoHeight = maxY - minY;
  const ratioX = width / geoWidth;
  const ratioY = height / geoHeight;

  // create feature collection
  const featureCollection = {
    type: "FeatureCollection",
    features: mapFeatures,
  };

  // unionize overlapping polygons with the same id
  console.time("unionize");
  featureCollection.features = featureCollection.features
    .sort((a, b) => a.properties.id.localeCompare(b.properties.id))
    .reduce((acc, cur) => {
      // check if cur is in bound of map
      if (!isBboxWithinMapBounds(bbox(cur), mapBbox)) {
        return acc;
      }
      if (acc.length === 0) {
        acc.push(cur);
      } else {
        const last = acc[acc.length - 1];
        if (last.properties.id === cur.properties.id) {
          const unionized = union(turfFeatureCollection([last, cur]));
          last.geometry = rewind(unionized.geometry);
        } else {
          acc.push(rewind(cur));
        }
      }
      return acc;
    }, []);
  console.timeEnd("unionize");

  if (featureCollection.features.length === 0) {
    return [null, null];
  }

  console.time("simplify");
  const tolerance = remap(map.getZoom(), [13, 18], [0.00001, 0.0000001]);
  console.log("simplify tolerance", tolerance);
  const verticesCollection = simplify(featureCollection, {
    tolerance,
    highQuality: false,
  }).features.flatMap((d) => {
    let items =
      d.geometry.type === "Polygon"
        ? [d.geometry.coordinates]
        : d.geometry.coordinates;
    return items.map((coordinates) => {
      let vertices = coordinates[0].map((d) => {
        return {
          x: (d[0] - minX) * ratioX,
          y: (d[1] - minY) * ratioY,
        };
      });

      return { vertices };
    });
  });
  console.timeEnd("simplify");

  console.time("matter-js");
  const destroyPromise = loadMatterJs(
    canvas,
    width,
    height,
    verticesCollection,
    highQuality
  );
  console.timeEnd("matter-js");
  return [canvas, destroyPromise];
}
function isBboxWithinMapBounds(featureBbox, mapBbox) {
  const [featureMinX, featureMinY, featureMaxX, featureMaxY] = featureBbox;
  const [mapMinX, mapMinY, mapMaxX, mapMaxY] = mapBbox;
  return !(
    featureMaxX < mapMinX ||
    featureMinX > mapMaxX ||
    featureMaxY < mapMinY ||
    featureMinY > mapMaxY
  );
}
