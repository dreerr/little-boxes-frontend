<template>
  <div id="map">
    <div class="btm-nav">
      <button @click="process">Create mesh</button>
      <button id="switchChoroplethOff">
        <div class="text-xl">Off</div>
      </button>
      <button id="switchChoroplethHeight" class="active">
        <div class="text-xl">Height</div>
      </button>
      <button id="switchChoroplethAge">
        <div class="text-xl">Age</div>
      </button>
      <button id="switchChoroplethType">
        <div class="text-xl">Type</div>
      </button>
    </div>
  </div>

  <div id="legend"></div>

  <div id="toast" class="toast toast-center toast-top w-full flex pt-16">
    <div class="alert alert-info justify-center">
      <div class="justify-center">
        <p class="justify-center">
          Here you can explore the data. Depending on your Zoom level you will
          see the Countries, Region, Cities or Buildings!
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import maplibregl from "maplibre-gl";
import { createCanvasWithMesh } from "./convert-to-mesh.js";
import "maplibre-gl/dist/maplibre-gl.css";
let map;
let paints;
let mapcolor = "white";
var currentLayer = null;
let choroplethChoice = "height";
const tile_url = "https://tiles.eubucco.com/";

async function process() {
  const canvas = await createCanvasWithMesh(map);
  canvas.classList.add("absolute");
  document.body.appendChild(canvas);
}
setTimeout(function () {
  document.getElementById("toast").remove();
}, 10_000);

fetch(`${tile_url}public.data_building.json`)
  .then((response) => response.json())
  .then((layer) => {
    let mapConfig = {
      container: "map",

      bounds: layer["bounds"],
      hash: true,
      style: {
        version: 8,
        sources: {
          "open-street": {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
          },
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
          },
          "carto-light": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
            ],
          },
          wikimedia: {
            type: "raster",
            tiles: ["https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"],
          },
        },
        layers: [
          {
            id: "carto-layer",
            source: "carto-light",
            type: "raster",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
    };

    var painttypes = {
      Point: "circle",
      MultiPoint: "circle",
      LineString: "line",
      MultiLineString: "line",
      Polygon: "fill",
      MultiPolygon: "fill",
    };

    function layerSource(tileurl) {
      return {
        type: "vector",
        tiles: [tileurl],
        minzoom: layer["minzoom"],
        maxzoom: layer["maxzoom"],
      };
    }

    function layerId(id, gtype, paint) {
      return id + "." + gtype + "." + paint;
    }

    const heightChoropleth = {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "height"],
        0,
        "#5e4ea6",
        5,
        "#2f89be",
        10,
        "#62c3a5",
        15,
        "#e6f697",
        20,
        "#fce08c",
        25,
        "#f46d45",
        50,
        "#d3404a",
        1000,
        "#a00042",
      ],
      "fill-opacity": 0.75,
    };

    const ageChoropleth = {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "age"],
        0,
        "#5e4ea6",
        1900,
        "#2f89be",
        1945,
        "#62c3a5",
        1960,
        "#addda3",
        1970,
        "#e6f697",
        1980,
        "#ffffba",
        1990,
        "#fce08c",
        2000,
        "#f46d45",
        2010,
        "#d3404a",
        2030,
        "#a00042",
      ],
      "fill-opacity": 0.75,
    };

    const typeChoropleth = {
      "fill-color": [
        "match",
        ["get", "type"],
        "RE",
        "green",
        "NR",
        "red",
        "white",
      ],
      "fill-opacity": 0.75,
    };

    function layerConfig(id, gtype, paint) {
      let config = {
        id: layerId(id, gtype, paint),
        source: id,
        "source-layer": id,
        type: paint,
        filter: [
          "match",
          ["geometry-type"],
          [gtype, "Multi" + gtype],
          true,
          false,
        ],
      };
      if (
        id === "public.data_building" &&
        gtype === "Polygon" &&
        paint === "fill"
      ) {
        if (choroplethChoice === "height") {
          config["paint"] = heightChoropleth;
        } else if (choroplethChoice === "type") {
          config["paint"] = typeChoropleth;
        } else if (choroplethChoice === "age") {
          config["paint"] = ageChoropleth;
        } else {
          config["paint"] = paints[paint];
        }
      } else {
        config["paint"] = paints[paint];
      }
      return config;
    }

    function roundIfNeeded(value) {
      if (typeof value == "number") {
        return value.toFixed(2);
      }
      return value;
    }

    function removeTrailingZero(value) {
      if (typeof value === "string" || value instanceof String) {
        return value.split(".")[0];
      } else {
        return value;
      }
    }

    function typeEnumToString(value) {
      if (value === "RE") {
        return "Residential";
      } else if (value === "NR") {
        return "Non-residential";
      } else {
        return "Unknown";
      }
    }

    function updateLegend() {
      let value = 0;
      const legend = document.getElementById("legend");
      legend.replaceChildren();
      let choropleth;

      if (choroplethChoice === "height") {
        choropleth = heightChoropleth;
      } else if (choroplethChoice === "age") {
        choropleth = ageChoropleth;
      } else if (choroplethChoice === "type") {
        choropleth = typeChoropleth;
      } else {
        return;
      }

      choropleth["fill-color"].forEach(function (item, index) {
        if (choroplethChoice === "type") {
          index += 1;
        }
        if (index > 2) {
          if (index % 2 === 0) {
            const legendElement = document.createElement("div");
            legendElement.innerHTML = value;
            legendElement.style.backgroundColor = item;
            legendElement.classList.add("p-2");
            legendElement.classList.add("text-center");
            legendElement.classList.add("text-black");
            legend.appendChild(legendElement);
          } else {
            if (choroplethChoice === "type") {
              value = typeEnumToString(item);
            } else {
              value = item;
            }
          }
        }
      });
    }

    function resetLayers() {
      map.removeLayer("public.data_building.Point.circle");
      map.removeLayer("public.data_building.Polygon.fill");
      map.removeLayer("public.data_building.LineString.line");
      map.removeLayer("public.data_building.Polygon.line");
      addOneLayer("public.data_building", "Polygon");
      // updateLegend();
    }

    document.getElementById("switchChoroplethOff").onclick = function () {
      document.getElementById("switchChoroplethOff").classList.add("active");
      document
        .getElementById("switchChoroplethHeight")
        .classList.remove("active");
      document
        .getElementById("switchChoroplethType")
        .classList.remove("active");
      document.getElementById("switchChoroplethAge").classList.remove("active");
      choroplethChoice = "off";
      resetLayers();
    };

    document.getElementById("switchChoroplethHeight").onclick = function () {
      document.getElementById("switchChoroplethHeight").classList.add("active");
      document.getElementById("switchChoroplethOff").classList.remove("active");
      document
        .getElementById("switchChoroplethType")
        .classList.remove("active");
      document.getElementById("switchChoroplethAge").classList.remove("active");
      choroplethChoice = "height";
      resetLayers();
    };

    document.getElementById("switchChoroplethAge").onclick = function () {
      document.getElementById("switchChoroplethAge").classList.add("active");
      document.getElementById("switchChoroplethOff").classList.remove("active");
      document
        .getElementById("switchChoroplethType")
        .classList.remove("active");
      document
        .getElementById("switchChoroplethHeight")
        .classList.remove("active");
      choroplethChoice = "age";
      resetLayers();
    };

    document.getElementById("switchChoroplethType").onclick = function () {
      document.getElementById("switchChoroplethType").classList.add("active");
      document
        .getElementById("switchChoroplethHeight")
        .classList.remove("active");
      document.getElementById("switchChoroplethOff").classList.remove("active");
      document.getElementById("switchChoroplethAge").classList.remove("active");
      choroplethChoice = "type";
      resetLayers();
    };

    function featureHtml(f) {
      var p = f.properties;
      var h = "<p>";
      let value;
      for (var k in p) {
        if (k === "type") {
          value = typeEnumToString(p[k]);
        } else if (k === "id_source" || k === "age") {
          value = removeTrailingZero(p[k]);
        } else {
          value = roundIfNeeded(p[k]);
        }

        h += "<b>" + k + ":</b> " + value + "<br/>";
      }
      h += "</p>";
      return h;
    }

    function addLayerBehavior(id) {
      map.on("click", id, function (e) {
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(featureHtml(e.features[0]))
          .addTo(map);
      });

      map.on("mouseenter", id, function () {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", id, function () {
        map.getCanvas().style.cursor = "";
      });
    }

    function addOneLayer(id, gtypebasic) {
      map.addLayer(layerConfig(id, gtypebasic, painttypes[gtypebasic]));
      addLayerBehavior(layerId(id, gtypebasic, painttypes[gtypebasic]));
      if (gtypebasic == "Polygon") {
        map.addLayer(layerConfig(id, gtypebasic, "line"));
      }
    }

    function addLayers(id, gtype, url) {
      map.addSource(id, layerSource(url));
      var gtypebasic = gtype.replace("Multi", "");
      var gtypes = ["Point", "LineString", "Polygon"];

      if (gtypes.includes(gtypebasic)) {
        addOneLayer(id, gtypebasic);
      } else {
        gtypes.forEach((gt) => {
          addOneLayer(id, gt);
        });
      }
    }

    function mountMap(dark = true) {
      if (dark === true) {
        mapConfig["style"]["layers"][0]["source"] = "carto-dark";
      } else {
        mapConfig["style"]["layers"][0]["source"] = "carto-light";
      }
      map = new maplibregl.Map(mapConfig);
      map.addControl(new maplibregl.NavigationControl());
      map.on("load", function () {
        updateLegend();

        let queryParam = "properties=name";
        let queryParamBuildings =
          "properties=id,id_source,type,type_source,height,age";

        let tileUrl = layer["tileurl"] + "?" + queryParamBuildings;

        addLayers(layer["id"], layer["geometrytype"], tileUrl);
        onZoom(true);

        fetch(`${tile_url}public.data_city.json`)
          .then((response) => response.json())
          .then((cityLayer) => {
            let cityTileUrl = cityLayer["tileurl"] + "?" + queryParam;
            addLayers(cityLayer["id"], cityLayer["geometrytype"], cityTileUrl);
            onZoom(true);
          });
        fetch(`${tile_url}public.data_region.json`)
          .then((response) => response.json())
          .then((regionLayer) => {
            let cityTileUrl = regionLayer["tileurl"] + "?" + queryParam;
            addLayers(
              regionLayer["id"],
              regionLayer["geometrytype"],
              cityTileUrl
            );
            onZoom(true);
          });
        fetch(`${tile_url}public.data_country_view.json`)
          .then((response) => response.json())
          .then((countryLayer) => {
            let cityTileUrl = countryLayer["tileurl"] + "?" + queryParam;
            addLayers(
              countryLayer["id"],
              countryLayer["geometrytype"],
              cityTileUrl
            );
            onZoom(true);
          });
      });
    }

    const runColorMode = (fn) => {
      if (!window.matchMedia) {
        return;
      }

      const query = window.matchMedia("(prefers-color-scheme: dark)");

      fn(query.matches);

      query.addEventListener("change", (event) => fn(event.matches));
    };

    runColorMode((isDarkMode) => {
      let dark;
      if (isDarkMode) {
        mapcolor = "white";
        dark = true;
      } else {
        mapcolor = "black";
        dark = false;
      }

      paints = {
        circle: {
          "circle-color": mapcolor,
          "circle-radius": 3,
        },
        line: {
          "line-color": mapcolor,
          "line-width": 0.5,
        },
        fill: {
          "fill-color": mapcolor,
          "fill-outline-color": mapcolor,
          "fill-opacity": 0,
        },
      };

      mountMap(dark);
    });

    function enableLayer(source) {
      for (const layer of map.getStyle().layers) {
        if (layer["id"].includes("public.data")) {
          if (layer["source"] === source) {
            map.setLayoutProperty(layer["id"], "visibility", "visible");
          } else {
            map.setLayoutProperty(layer["id"], "visibility", "none");
          }
        }
      }
    }

    function onZoom(force = false) {
      const currentZoom = map.getZoom();
      console.log(map.getZoom());
      console.log(map.getBounds());
      if (force) {
        currentLayer = null;
      }

      if (currentZoom > 14) {
        if (currentLayer !== "public.data_building") {
          enableLayer("public.data_building");
          // document.querySelector(".mapboxgl-popup").remove();
          currentLayer = "public.data_building";
        }
      } else if (currentZoom > 8) {
        if (currentLayer !== "public.data_city") {
          enableLayer("public.data_city");
          // document.querySelector(".mapboxgl-popup").remove();
          currentLayer = "public.data_city";
        }
      } else if (currentZoom > 6) {
        if (currentLayer !== "public.data_region") {
          enableLayer("public.data_region");
          // document.querySelector(".mapboxgl-popup").remove();
          currentLayer = "public.data_region";
        }
      } else {
        if (currentLayer !== "public.data_country_view") {
          enableLayer("public.data_country_view");
          // document.querySelector(".mapboxgl-popup").remove();
          currentLayer = "public.data_country_view";
        }
      }
    }

    map.on("zoom", () => {
      onZoom();
    });
  });
</script>

<style>
#map,
.absolute {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
#legend {
  position: absolute;
  bottom: 0;
  left: 0;
}

.btm-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  height: 4rem;
  --tw-bg-opacity: 1;
  background-color: hsl(var(--b1) / var(--tw-bg-opacity));
  color: currentColor;
  z-index: 100;
}

.btm-nav > * {
  position: relative;
  display: flex;
  height: 100%;
  flex-basis: 100%;
  flex-direction: column;
  gap: 0.25rem;
  border-color: currentColor;
}

.btm-nav > *,
.btn {
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.btn {
  display: inline-flex;
  flex-shrink: 0;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  flex-wrap: wrap;
  border-color: transparent;
  border-color: hsl(var(--n) / var(--tw-border-opacity));
  text-align: center;
  transition-property: color, background-color, border-color, fill, stroke,
    opacity, box-shadow, transform, filter, -webkit-text-decoration-color,
    -webkit-backdrop-filter;
  transition-property: color, background-color, border-color,
    text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter,
    backdrop-filter;
  transition-property: color, background-color, border-color,
    text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter,
    backdrop-filter, -webkit-text-decoration-color, -webkit-backdrop-filter;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: var(--rounded-btn, 0.5rem);
  height: 3rem;
  padding-left: 1rem;
  padding-right: 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  line-height: 1em;
  min-height: 3rem;
  font-weight: 600;
  text-transform: uppercase;
  text-transform: var(--btn-text-case, uppercase);
  -webkit-text-decoration-line: none;
  text-decoration-line: none;
  border-width: var(--border-btn, 1px);
  -webkit-animation: button-pop var(--animation-btn, 0.25s) ease-out;
  animation: button-pop var(--animation-btn, 0.25s) ease-out;
  --tw-border-opacity: 1;
  --tw-bg-opacity: 1;
  background-color: hsl(var(--n) / var(--tw-bg-opacity));
  --tw-text-opacity: 1;
  color: hsl(var(--nc) / var(--tw-text-opacity));
}

.btn-disabled,
.btn[disabled] {
  pointer-events: none;
}

.btn-square {
  height: 3rem;
  width: 3rem;
  padding: 0;
}

.btn.loading,
.btn.loading:hover {
  pointer-events: none;
}

.btn.loading:before {
  margin-right: 0.5rem;
  height: 1rem;
  width: 1rem;
  border-radius: 9999px;
  border-width: 2px;
  -webkit-animation: spin 2s linear infinite;
  animation: spin 2s linear infinite;
  content: "";
  border-top-color: transparent;
  border-left-color: transparent;
  border-bottom-color: initial;
  border-right-color: initial;
}

@media (prefers-reduced-motion: reduce) {
  .btn.loading:before {
    -webkit-animation: spin 10s linear infinite;
    animation: spin 10s linear infinite;
  }
}

@-webkit-keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(1turn);
  }
}

.btn-group > input[type="radio"].btn {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.btn-group > input[type="radio"].btn:before {
  content: attr(data-title);
}
</style>
