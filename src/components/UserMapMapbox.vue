<template>
  <div id="map" :class="['mapboxgl-map', { disabled: isMeshActive }]"></div>
  <div
    :class="['choropleth-ctl', { disabled: isMeshActive || currentZoom < 13 }]"
  >
    <button
      v-for="value in ['Off', 'Height', 'Age', 'Type']"
      :key="value"
      @click="switchChoropleth(value.toLowerCase())"
      :class="{ active: choroplethChoice === value.toLowerCase() }"
    >
      {{ value }}
    </button>
  </div>
  <div id="legend" :class="{ disabled: currentZoom < 13 }"></div>
  <button
    class="mesh-ctl"
    @click="toggleMesh"
    title="Change view"
    :class="{
      enabled: currentZoom >= 13,
      active: isMeshActive,
      untouched: isUntouched,
    }"
  >
    <div class="text-disabled">zoom in to start</div>
    <div class="circle">
      <span class="text-enabled"
        >click here to interact with the buildings</span
      >
    </div>
  </button>
</template>

<script setup>
import mapboxgl from "mapbox-gl";
import { createCanvasWithMesh } from "./convert-to-mesh.js";
import "mapbox-gl/dist/mapbox-gl.css";
import { ref } from "vue";
import { painttypes, choropleth } from "../constants.js";

let map, paints, enableLayer, canvas, destroyPromise;
let isMeshActive = ref(false);
let isUntouched = ref(true);
const currentZoom = ref(0);
const choroplethChoice = ref("height");
let mapcolor = "white";
let currentLayer = null;
let switchChoropleth; // init here, because we need to use it in the template
const tile_url = "https://tiles.eubucco.com/";

async function toggleMesh() {
  if (map.getZoom() < 13) {
    return alert("Please zoom in to start");
  }
  isUntouched.value = false;
  if (isMeshActive.value) {
    destroyPromise.then(function (destroyFn) {
      destroyFn();
    });
    document.querySelector("#mesh")?.remove();
    isMeshActive.value = false;
  } else {
    document.querySelector("#mesh")?.remove();
    [canvas, destroyPromise] = await createCanvasWithMesh(
      map,
      window.innerWidth,
      window.innerHeight
    );
    if (!canvas) {
      alert("No buildings found in this area");
      return;
    }
    canvas.id = "mesh";
    document.body.appendChild(canvas);
    isMeshActive.value = true;
    window._paq.push(["setCustomUrl", window.location.href]);
    window._paq.push(["trackPageView"]);
  }
}
document.onkeyup = (e) => {
  if (e.key === "m") {
    toggleMesh();
  }
};

mapboxgl.accessToken =
  "pk.eyJ1IjoiZHJlZXJyIiwiYSI6ImNseGRxbGRuMzA5NWoycnNjeHQ3aHFsYTMifQ.qz0_kP4890CI-8z_EbCs5A";

fetch(`${tile_url}public.data_building.json`)
  .then((response) => response.json())
  .then((layer) => {
    let mapConfig = {
      container: "map",
      bounds: layer["bounds"],
      hash: true,
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
      style: "mapbox://styles/dreerr/clxg9jyw5006l01pdel8n6kfy",
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
        if (["height", "type", "age"].includes(choroplethChoice.value)) {
          config["paint"] = choropleth[choroplethChoice.value];
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
      if (!["height", "type", "age"].includes(choroplethChoice.value)) {
        return;
      }

      choropleth[choroplethChoice.value]["fill-color"].forEach(function (
        item,
        index
      ) {
        if (choroplethChoice.value === "type") {
          index += 1;
        }
        if (index > 2) {
          if (index % 2 === 0) {
            const legendElement = document.createElement("div");
            legendElement.innerHTML = value;
            legendElement.style.backgroundColor = item;
            legend.appendChild(legendElement);
          } else {
            if (choroplethChoice.value === "type") {
              value = typeEnumToString(item);
            } else {
              value = item;
            }
          }
        }
      });
    }

    function resetLayers() {
      try {
        map.removeLayer("public.data_building.Point.circle");
        map.removeLayer("public.data_building.Polygon.fill");
        map.removeLayer("public.data_building.LineString.line");
        map.removeLayer("public.data_building.Polygon.line");
      } catch (e) {
        console.warn(e);
      }
      addOneLayer("public.data_building", "Polygon");
      updateLegend();
    }

    switchChoropleth = (choice) => {
      choroplethChoice.value = choice;
      resetLayers();
    };

    function featureHtml(f) {
      let p = f.properties;
      let h = "<p>";
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
        new mapboxgl.Popup({ closeButton: true })
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
      const gtypebasic = gtype.replace("Multi", "");
      const gtypes = ["Point", "LineString", "Polygon"];
      if (gtypes.includes(gtypebasic)) {
        addOneLayer(id, gtypebasic);
      } else {
        gtypes.forEach((gt) => {
          addOneLayer(id, gt);
        });
      }
    }

    // ######################################################

    function mountMap() {
      map = new mapboxgl.Map(mapConfig);
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

      // disable map rotation using right click + drag
      map.dragRotate.disable();

      // disable map rotation using touch rotation gesture
      map.touchZoomRotate.disableRotation();

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
        mapcolor = "black";
        dark = false;
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

    enableLayer = (source) => {
      for (const layer of map.getStyle().layers) {
        if (layer["id"].includes("public.data")) {
          if (layer["source"] === source) {
            map.setLayoutProperty(layer["id"], "visibility", "visible");
          } else {
            map.setLayoutProperty(layer["id"], "visibility", "none");
          }
        }
      }
    };

    function onZoom(force = false) {
      currentZoom.value = map.getZoom();

      if (force) {
        currentLayer = null;
      }

      if (currentZoom.value > 13) {
        if (currentLayer !== "public.data_building") {
          enableLayer("public.data_building");
          document.querySelector(".mapboxgl-popup")?.remove();
          currentLayer = "public.data_building";
        }
        // } else if (currentZoom.value > 8) {
        //   if (currentLayer !== "public.data_city") {
        //     enableLayer("public.data_city");
        //     // document.querySelector(".mapboxgl-popup").remove();
        //     currentLayer = "public.data_city";
        //   }
        // } else if (currentZoom.value > 6) {
        //   if (currentLayer !== "public.data_region") {
        //     enableLayer("public.data_region");
        //     // document.querySelector(".mapboxgl-popup").remove();
        //     currentLayer = "public.data_region";
        //   }
      } else {
        if (currentLayer !== "public.data_country_view") {
          enableLayer("public.data_country_view");
          document.querySelector(".mapboxgl-popup")?.remove();
          currentLayer = "public.data_country_view";
        }
      }
    }

    map.on("zoom", () => {
      onZoom();
    });
  });
</script>

<style lang="scss">
:root {
  --primary-color: rgb(20, 20, 20);
  --primary-color: rgb(200, 20, 20);
}
#map,
#mesh {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  transition: opacity 0.3s;
  &.disabled {
    opacity: 0;
    pointer-events: none;
  }
}
#legend {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 1em;
  left: auto;
  text-align: center;
  div {
    padding: 0.25em;
  }
  transition: opacity 0.3s;
  &.disabled {
    opacity: 0;
    pointer-events: none;
  }
}

.choropleth-ctl {
  position: fixed;
  bottom: 2em;
  right: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  align-items: center;
  justify-content: space-around;
  z-index: 1000;
  outline: none;
  border: none;
  border-radius: 3px;
  transition: opacity 0.3s;
  &.disabled {
    opacity: 0;
    pointer-events: none;
  }
  button {
    background-color: #fff;
    color: inherit;
    border: none;
    padding: 0.2em;
    font: inherit;
    cursor: pointer;
    outline: inherit;
    width: 100%;
    box-shadow: 0 0 0.5em rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    &.active {
      background-color: var(--primary-color);
      color: white;
    }
  }
}

.mesh-ctl {
  --size-disabled: 2.7em;
  --size-enabled: 3.8em;
  --size-circle: 3em;
  --size-circle-active: 1.5em;
  font-size: 1em;
  position: fixed;
  bottom: 2em;
  left: calc(50%);
  transform: translateX(-50%);
  width: 8em;
  height: var(--size-disabled);
  border-radius: 99px;
  border: 2px solid var(--primary-color);
  background-color: transparent;
  transition: all 0.5s;
  cursor: pointer;
  border-color: rgb(128, 128, 128);
  background-color: rgba(255, 255, 255, 0.5);
  z-index: 1000;

  .circle {
    overflow: hidden;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    opacity: 0;
    width: 1em;
    height: 1em;
    transition: all 0.4s;
  }
  .text-enabled,
  .text-disabled {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    pointer-events: none;
    transition: opacity 0.5s;
    line-height: 1;
    opacity: 0;
    font-size: 0.8rem;
  }
  .text-disabled {
    left: 50%;
    color: rgb(73, 73, 73);
    opacity: 1;
  }
  .text-enabled {
    left: 0;
    transform: translateX(100%) translateY(-50%);
    color: white;
  }
  // ------------------------------

  &.enabled {
    border-color: var(--primary-color);
    border-width: 3px;
    width: var(--size-enabled);
    height: var(--size-enabled);
    bottom: calc(2em - (var(--size-enabled) - var(--size-disabled)) / 2);
    @keyframes untouched {
      0% {
        transform: translateX(100%) translateY(-50%);
      }
      75% {
        transform: translateX(-100%) translateY(-50%);
      }
      100% {
        transform: translateX(-100%) translateY(-50%);
      }
    }
    &.untouched .text-enabled {
      opacity: 1;
      animation: untouched 10s infinite linear;
      animation-delay: 10s;
    }
    .circle {
      opacity: 1;
      width: var(--size-circle);
      height: var(--size-circle);
      background-color: var(--primary-color);
    }
    .text-disabled {
      opacity: 0;
    }
  }
  // ------------------------------
  &.active {
    .circle {
      border-radius: 4px;
      width: var(--size-circle-active);
      height: var(--size-circle-active);
    }
  }
}
</style>
