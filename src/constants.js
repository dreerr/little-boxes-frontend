// EUBUCCO v0.2 building tiles (layer "buildings", z12–z14), see https://eubucco.com/explore/map
export const PMTILES_URL =
  "https://s3.eubucco.com/eubucco/v0.2/buildings/tiles/buildings.pmtiles";

const UNKNOWN_COLOR = "#ccc";

// Each scheme keeps [value, color] stops once and derives both the paint expression and the legend.
const ramp = (property, stops) => ({
  legend: [...stops, ["unknown", UNKNOWN_COLOR]],
  paint: [
    "case",
    ["has", property],
    ["interpolate", ["linear"], ["get", property], ...stops.flat()],
    UNKNOWN_COLOR,
  ],
});

const categories = (property, stops) => ({
  legend: [...stops, ["unknown", UNKNOWN_COLOR]],
  paint: ["match", ["get", property], ...stops.flat(), UNKNOWN_COLOR],
});

export const choropleth = {
  height: ramp("height", [
    [0, "#5e4ea6"],
    [5, "#2f89be"],
    [10, "#62c3a5"],
    [15, "#e6f697"],
    [20, "#fce08c"],
    [25, "#f46d45"],
    [50, "#d3404a"],
    [1000, "#a00042"],
  ]),
  age: ramp("construction_year", [
    [0, "#5e4ea6"],
    [1900, "#2f89be"],
    [1945, "#62c3a5"],
    [1960, "#addda3"],
    [1970, "#e6f697"],
    [1980, "#ffffba"],
    [1990, "#fce08c"],
    [2000, "#f46d45"],
    [2010, "#d3404a"],
    [2030, "#a00042"],
  ]),
  type: categories("type", [
    ["residential", "green"],
    ["non-residential", "red"],
  ]),
};
