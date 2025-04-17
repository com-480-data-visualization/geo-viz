// Smooth scrolling to the map section
d3.select("#start-button").on("click", () =>
    d3.select(".map-section").node().scrollIntoView({ behavior: "smooth" })
);

// The svg
const svg = d3.select("svg")
  .attr("viewBox", `0 0 800 400`) // Set the viewBox to match the map's dimensions
  .attr("preserveAspectRatio", "xMidYMid meet"); // Ensure the map scales properly

// Map and projection
const path = d3.geoPath();
const projection = d3.geoNaturalEarth1()
  .scale(140) // Adjust scale for better fit
  .center([0, 0]) // Center the map
  .translate([400, 200]); // Translate to the center of the viewBox

// Color scales
const colorScale = d3.scaleLog()
  .range([0, 1]);

// Load data through promises
const map_promise = d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    .then((topojson) => topojson.features);
const temperature_promise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/world_population.csv")
    .then((data) => {
        let temperature_data = {};
        dataforEach((row) => {
            temperature_data[row.Code] = row.
        });
    });
Promise.all([map_promise, pop_promise]).then((results) => {
  console.log("Data loaded");
  let topo = results[0];
  let data = results[1];
  console.log(data);
  colorScale.domain(d3.extent(data.values()));
  // Draw the map
  svg.append("g")
    .selectAll("path")
    .data(topo)
    .join("path")
      // Draw each country
      .attr("d", d3.geoPath().projection(projection))
      // Set the color of each country
      .attr("fill", function(d) {
        d.total = data.get(d.id) || 0;
        return d3.interpolateBlues(colorScale(d.total));
      });
});
