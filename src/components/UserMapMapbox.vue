<template>
  <div id="map" :class="['mapboxgl-map', { disabled: isMeshActive }]"></div>
  <div :class="['btm-nav', { disabled: isMeshActive || currentZoom < 13 }]">
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
    id="toggleMesh"
    @click="toggleMesh"
    title="Change view"
    :class="{ disabled: currentZoom < 13, active: isMeshActive }"
  >
    <span>zoom in to start</span>
  </button>
</template>

<script setup>
import mapboxgl from "mapbox-gl";
import { createCanvasWithMesh } from "./convert-to-mesh.js";
import "mapbox-gl/dist/mapbox-gl.css";
import { ref } from "vue";
import { painttypes, choropleth } from "../constants.js";

let isMeshActive = ref(false);
const currentZoom = ref(0);
const choroplethChoice = ref("height");
let map;
let paints;
let enableLayer;
let mapcolor = "white";
let currentLayer = null;
let switchChoropleth; // init here, because we need to use it in the template
const tile_url = "https://tiles.eubucco.com/";

async function toggleMesh() {
  if (isMeshActive.value) {
    document.querySelector(".absolute")?.remove();
    isMeshActive.value = false;
  } else {
    if (map.getZoom() > 13) {
      document.querySelector(".absolute")?.remove();
      const canvas = await createCanvasWithMesh(
        map,
        window.innerWidth,
        window.innerHeight,
        map.getZoom() >= 15
      );
      canvas.classList.add("absolute");
      document.body.appendChild(canvas);
      isMeshActive.value = true;
    } else {
      alert("Please zoom in to start");
    }
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
        console.log(item, index);
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
  --primary-color: rgb(220, 0, 0);
}
#map,
.absolute {
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

.btm-nav {
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

#toggleMesh {
  font-size: 1em;
  position: fixed;
  bottom: 2em;
  left: calc(50%);
  transform: translateX(-50%);
  width: 2.7em;
  height: 2.7em;
  border-radius: 99px;
  border: 2px solid var(--primary-color);
  z-index: 1000;
  background-color: transparent;
  transition: all 0.7s;
  cursor: pointer;
  &::after {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    content: "";
    border-radius: 50%;
    width: 2em;
    height: 2em;
    transition: all 0.3s;
    background-color: var(--primary-color);
  }

  span {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    pointer-events: none;
    transition: all 0.3s;
    opacity: 0;
    line-height: 1;
    font-size: 0.8rem;
    color: rgb(73, 73, 73);
  }
  &.disabled {
    filter: saturate(0);
    border-color: rgb(128, 128, 128);
    background-color: rgba(255, 255, 255, 0.5);
    width: 8em;
    &::after {
      opacity: 0;
      width: 1em;
      height: 1em;
    }
    span {
      opacity: 1;
    }
  }
  &.active::after {
    border-radius: 4px;
    width: 1.2em;
    height: 1.2em;
  }
}
</style>
