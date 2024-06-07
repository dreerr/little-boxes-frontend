import { geoMercator, geoPath, buffer } from "d3";
import { tile } from "d3-tile";
import { VectorTile } from "@mapbox/vector-tile";
import rewind from "@mapbox/geojson-rewind";
import Pbf from "pbf";
import { union, toMercator } from "@turf/turf";
import earcut from "earcut";

export async function createCanvasWithMesh(
  map,
  width = window.innerWidth,
  height = window.innerHeight
) {
  const bounds = map.getBounds();
  const canvas = document.createElement("canvas");

  const zoom = Math.floor(map.getZoom());
  const scale = (1 << zoom) * 512;

  const center = map.getCenter();
  const projection = geoMercator()
    .center([center.lng, center.lat])
    .scale(scale / (2 * Math.PI))
    .translate([width / 2, height / 2]);

  const tileGenerator = tile()
    .tileSize(1024)
    .scale(scale)
    .size([width, height])
    .translate(projection([0, 0]));

  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;
  const pixelScale = window.devicePixelRatio;
  if (pixelScale > 1) {
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
    canvas.width *= pixelScale;
    canvas.height *= pixelScale;
    ctx.scale(pixelScale, pixelScale);
  }

  // get vector tiles from eubucco tiles server
  console.time("tiles");
  let tiles = await Promise.all(
    tileGenerator().map(async (d) => {
      d.layers = new VectorTile(
        new Pbf(
          await buffer(
            `https://tiles.eubucco.com/public.data_building/${d[2]}/${d[0]}/${d[1]}.pbf?properties=id,id_source,type,type_source,height,age`
          )
        )
      ).layers;
      console.log(d.layers);
      return d;
    })
  );
  console.log("number of tiles", tiles.length);
  console.timeEnd("tiles");

  // create a function to convert vector tiles to geojson
  function geojson([x, y, z], layer, filter = () => true) {
    if (!layer) return;
    const features = [];
    for (let i = 0; i < layer.length; ++i) {
      const f = layer.feature(i).toGeoJSON(x, y, z);
      if (filter.call(null, f, i, features)) features.push(f);
    }
    return { type: "FeatureCollection", features };
  }

  // create feature collection
  const featureCollection = {
    type: "FeatureCollection",
    features: tiles.flatMap(
      (d) => geojson(d, d.layers["public.data_building"]).features
    ),
  };

  // unionize overlapping polygons with the same id
  console.time("unionize");
  featureCollection.features = featureCollection.features
    .sort((a, b) => a.properties.id.localeCompare(b.properties.id))
    .reduce((acc, cur) => {
      if (acc.length === 0) {
        acc.push(cur);
      } else {
        const last = acc[acc.length - 1];
        if (last.properties.id === cur.properties.id) {
          // unionize overlapping polygons with the same id
          // alter the last feature in the accumulator, don't push the current feature
          const unionized = union(last, cur);

          /* rewinding is necessary to ensure that the polygons are in correct order.
             d3.geoPath: Spherical polygons also require a winding order convention
             to determine which side of the polygon is the inside: the exterior ring
             for polygons smaller than a hemisphere must be clockwise, while the
             exterior ring for polygons larger than a hemisphere must be anticlockwise */
          last.geometry = rewind(unionized.geometry, true);
        } else {
          acc.push(cur);
        }
      }
      return acc;
    }, []);
  console.timeEnd("unionize");

  console.time("earcut");

  const [minX, minY, maxX, maxY] = [
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast(),
    bounds.getSouth(),
  ];

  const geoWidth = maxX - minX,
    geoHeight = maxY - minY;
  const ratioX = width / geoWidth;
  const ratioY = height / geoHeight;

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
    const dMercator = toMercator(d);
    const data = earcut.flatten(d.geometry.coordinates);
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
