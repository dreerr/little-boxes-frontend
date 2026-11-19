<template>
  <div id="map" :class="{ disabled: isMeshActive }"></div>
  <div
    :class="[
      'choropleth-ctl',
      { disabled: isMeshActive || currentZoom < MIN_ZOOM },
    ]"
  >
    <button
      v-for="value in ['Off', 'Height', 'Age', 'Type']"
      :key="value"
      @click="choroplethChoice = value.toLowerCase()"
      :class="{ active: choroplethChoice === value.toLowerCase() }"
    >
      {{ value }}
    </button>
  </div>
  <div id="legend" :class="{ disabled: currentZoom < MIN_ZOOM }">
    <div
      v-for="[label, color] in choropleth[choroplethChoice]?.legend"
      :key="label"
      :style="{ backgroundColor: color }"
    >
      {{ label }}
    </div>
  </div>
  <button
    class="mesh-ctl"
    @click="toggleMesh"
    title="Change view"
    :class="{
      enabled: currentZoom >= MIN_ZOOM,
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
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { choropleth, PMTILES_URL } from "../constants.js";
import { createCanvasWithMesh } from "./convert-to-mesh.js";

const MIN_ZOOM = 13;
const POPUP_FIELDS = [
  "id",
  "type",
  "subtype",
  "height",
  "floors",
  "construction_year",
  "geometry_source",
];

maplibregl.addProtocol("pmtiles", new Protocol().tile);

const isMeshActive = ref(false);
const isUntouched = ref(true);
const currentZoom = ref(0);
const choroplethChoice = ref("height");
let map, destroyMesh;
const popup = new maplibregl.Popup();

function applyChoropleth() {
  const scheme = choropleth[choroplethChoice.value];
  map.setPaintProperty("buildings-fill", "fill-color", scheme?.paint ?? "black");
  map.setPaintProperty("buildings-fill", "fill-opacity", scheme ? 0.75 : 0);
}
watch(choroplethChoice, () => map.getLayer("buildings-fill") && applyChoropleth());

function showPopup(e) {
  const p = e.features[0].properties;
  const el = document.createElement("p");
  for (const k of POPUP_FIELDS.filter((k) => p[k] != null)) {
    const b = document.createElement("b");
    b.textContent = `${k}: `;
    el.append(b, String(p[k]), document.createElement("br"));
  }
  popup.setLngLat(e.lngLat).setDOMContent(el).addTo(map);
}

function toggleMesh() {
  if (!map.getLayer("buildings-fill")) return; // style still loading
  if (map.getZoom() < MIN_ZOOM) return alert("Please zoom in to start");
  isUntouched.value = false;
  if (isMeshActive.value) {
    destroyMesh();
    isMeshActive.value = false;
    return;
  }
  const mesh = createCanvasWithMesh(map, window.innerWidth, window.innerHeight);
  if (!mesh) return alert("No buildings found in this area");
  mesh.canvas.id = "mesh";
  document.body.appendChild(mesh.canvas);
  destroyMesh = mesh.destroy;
  isMeshActive.value = true;
  window._paq?.push(["setCustomUrl", window.location.href]);
  window._paq?.push(["trackPageView"]);
}

function onKeyUp(e) {
  if (e.key === "m") toggleMesh();
  if (e.key === "h") document.body.classList.toggle("hide-ui");
}

onMounted(() => {
  map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    bounds: [
      [-31.27, 27.64],
      [34.59, 71.17],
    ],
    hash: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

  map.on("load", () => {
    // Drop the basemap's own buildings so only EUBUCCO footprints show.
    for (const layer of map.getStyle().layers) {
      if (layer["source-layer"] === "buildings") map.removeLayer(layer.id);
    }
    // Tiles exist for z12–z14 (a few regions z15); pinning 14 overzooms everywhere.
    map.addSource("eubucco", {
      type: "vector",
      url: `pmtiles://${PMTILES_URL}`,
      maxzoom: 14,
      attribution: '<a href="https://eubucco.com">EUBUCCO</a>',
    });
    const layer = {
      source: "eubucco",
      "source-layer": "buildings",
      minzoom: MIN_ZOOM,
    };
    map.addLayer({ ...layer, id: "buildings-fill", type: "fill" });
    map.addLayer({
      ...layer,
      id: "buildings-line",
      type: "line",
      paint: { "line-color": "black", "line-width": 0.5 },
    });
    applyChoropleth();

    map.on("click", "buildings-fill", showPopup);
    map.on("mouseenter", "buildings-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "buildings-fill", () => {
      map.getCanvas().style.cursor = "";
    });
  });

  currentZoom.value = map.getZoom();
  map.on("zoom", () => {
    currentZoom.value = map.getZoom();
    if (currentZoom.value < MIN_ZOOM) popup.remove();
  });
  document.addEventListener("keyup", onKeyUp);
});

onUnmounted(() => {
  document.removeEventListener("keyup", onKeyUp);
  document.body.classList.remove("hide-ui");
  destroyMesh?.();
  map.remove();
});
</script>

<style lang="scss">
:root {
  --primary-color: rgb(20, 20, 20);
  --primary-color: rgb(200, 20, 20);
}
// "h" toggles all controls, e.g. for the installation or screenshots.
.hide-ui {
  .back,
  .mesh-ctl,
  .choropleth-ctl,
  #legend,
  .maplibregl-control-container {
    display: none;
  }
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
    text-transform: capitalize;
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
