import {
  union,
  bbox,
  rewind,
  simplify,
  featureCollection as turfFeatureCollection,
} from "@turf/turf";
import earcut from "earcut";
import { loadMatterJs } from "./convert-to-physics";
// import simplifyLeaflet from "simplify-js";

export async function createCanvasWithMesh(
  map,
  width = window.innerWidth,
  height = window.innerHeight,
  highQuality = false
) {
  // bounds
  const bounds = map.getBounds();
  const [minX, minY, maxX, maxY] = [
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast(),
    bounds.getSouth(),
  ];

  const mapBbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];

  const geoWidth = maxX - minX,
    geoHeight = maxY - minY;
  const ratioX = width / geoWidth;
  const ratioY = height / geoHeight;

  // canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  const mapFeatures = map.querySourceFeatures("public.data_building", {
    sourceLayer: "public.data_building",
  });

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

      // // remove holes
      // if (cur.geometry.type === "MultiPolygon") {
      //   cur.geometry.coordinates = cur.geometry.coordinates.map((items) => {
      //     return items.slice(0, 1);
      //   });
      // } else {
      //   cur.geometry.coordinates = [cur.geometry.coordinates[0]];
      // }

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

  console.time("simplify");

  // const collection = featureCollection.features.map((d) => {
  //   // const hull = simplify(convex(d), { tolerance: 0.0001, highQuality: false });
  //   const bb = bbox(d);
  //   // console.log("bb", bb, "hull", hull);
  //   let vertices = d.geometry.coordinates[0].map((p) => project(p[0], p[1]));
  //   // console.log(hull.geometry.coordinates[0]);
  //   // console.log(vertices);
  //   let bb1 = project(bb[0], bb[3]);
  //   let bb2 = project(bb[2], bb[1]);
  //   let w = bb2.x - bb1.x;
  //   let h = bb2.y - bb1.y;
  //   // const converter = new GeoJSON2SVG({
  //   //   coordinateConverter: function (e) {
  //   //     const a = map.project([e[1], e[0]]);
  //   //     return [a.x, a.y];
  //   //   },
  //   //   mapExtentFromGeojson: true,
  //   //   viewportSize: { width: w, height: h },
  //   // });
  //   // let svg =
  //   //   `<svg xmlns="http://www.w3.org/2000/svg">` +
  //   //   converter.convert(d).join("") +
  //   //   "</svg>";
  //   return { vertices };
  // });
  // console.timeEnd("simplify");
  // loadMatterJs(canvas, width, height, collection);
  // return canvas;

  console.time("simplify");
  const verticesCollection = featureCollection.features.flatMap((d) => {
    let items =
      d.geometry.type === "Polygon"
        ? [d.geometry.coordinates]
        : d.geometry.coordinates;
    // items = simplify(items);
    return items.map((coordinates) => {
      let vertices = coordinates[0].map((d) => {
        return {
          x: (d[0] - minX) * ratioX,
          y: (d[1] - minY) * ratioY,
        };
      });

      return { vertices };
      // return simplifyLeaflet(vertices, 3);
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

  // const verticesCollection = featureCollection.features.flatMap((d) => {
  //   // Make a MultiPolygon into a Polygon
  //   let geometryCoordinates =
  //     d.geometry.type === "Polygon"
  //       ? [d.geometry.coordinates]
  //       : d.geometry.coordinates;
  //   return geometryCoordinates.map((coordinates) => {
  //     const simple = coordinates.map((coords) => simplify(coords, 0.000001));
  //     console.log("simple", simple.flat().length, coordinates.flat().length);
  //     const data = earcut.flatten(simple);
  //     const result = earcut(data.vertices, data.holes, data.dimensions);

  //     let vertices = [];
  //     for (let i = 0; i < result.length; i += 3) {
  //       vertices.push([
  //         {
  //           x: (data.vertices[result[i] * data.dimensions] - minX) * ratioX,
  //           y: (data.vertices[result[i] * data.dimensions + 1] - minY) * ratioY,
  //         },
  //         {
  //           x: (data.vertices[result[i + 1] * data.dimensions] - minX) * ratioX,
  //           y:
  //             (data.vertices[result[i + 1] * data.dimensions + 1] - minY) *
  //             ratioY,
  //         },
  //         {
  //           x: (data.vertices[result[i + 2] * data.dimensions] - minX) * ratioX,
  //           y:
  //             (data.vertices[result[i + 2] * data.dimensions + 1] - minY) *
  //             ratioY,
  //         },
  //         {
  //           x: (data.vertices[result[i] * data.dimensions] - minX) * ratioX,
  //           y: (data.vertices[result[i] * data.dimensions + 1] - minY) * ratioY,
  //         },
  //       ]);
  //     }
  //     return vertices;
  //   });
  // });
  // loadMatterJs(canvas, width, height, verticesCollection);
  // return canvas;

  const pixelScale = window.devicePixelRatio;
  if (pixelScale > 1) {
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
    canvas.width *= pixelScale;
    canvas.height *= pixelScale;
    ctx.scale(pixelScale, pixelScale);
  }

  function drawPoly(rings, color, fill) {
    ctx.beginPath();

    ctx.strokeStyle = color;
    if (fill && fill !== true) ctx.fillStyle = fill;

    if (typeof rings[0][0] === "number") rings = [rings];

    for (var k = 0; k < rings.length; k++) {
      var points = rings[k];
      for (var i = 0; i < points.length; i++) {
        var x = (points[i][0] - minX) * ratioX,
          y = (points[i][1] - minY) * ratioY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (fill) ctx.closePath();
    }
    ctx.stroke();

    if (fill && fill !== true) ctx.fill("evenodd");
  }
  featureCollection.features.forEach((d) => {
    const simple = simplify(d.geometry.coordinates, 1);
    const data = earcut.flatten(simple);
    const result = earcut(data.vertices, data.holes, data.dimensions);
    const triangles = [];
    for (let i = 0; i < result.length; i++) {
      const index = result[i];
      triangles.push([
        data.vertices[index * data.dimensions],
        data.vertices[index * data.dimensions + 1],
      ]);
    }

    ctx.lineJoin = "round";
    for (let i = 0; triangles && i < triangles.length; i += 3) {
      drawPoly(
        triangles.slice(i, i + 3),
        "rgba(255,0,0,0.2)",
        "rgba(255,255,0,0.2)"
      );
    }
  });
  console.timeEnd("earcut");

  return canvas;
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
  // return (
  //   featureMinX >= mapMinX &&
  //   featureMinY >= mapMinY &&
  //   featureMaxX <= mapMaxX &&
  //   featureMaxY <= mapMaxY
  // );
}
