export const painttypes = {
  Point: "circle",
  MultiPoint: "circle",
  LineString: "line",
  MultiLineString: "line",
  Polygon: "fill",
  MultiPolygon: "fill",
};

export const choropleth = {
  height: {
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
  },
  age: {
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
  },

  type: {
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
  },
};
