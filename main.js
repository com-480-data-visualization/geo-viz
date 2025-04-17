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

// Define color scales for each dataset
const colorScales = {
  temperature: d3.scaleDiverging((t) => d3.interpolateRdBu(1 - t)), // Red for warm, blue for cold
  popularity: d3.scaleSymlog().interpolate(d3.interpolateHcl).range(["#ccc", "#1a9850"]), // Green for tourism popularity
  budget: d3.scaleLog().interpolate(d3.interpolateHcl).range(["#1a9850", "#d73027"]) // Green for low budget, red for high budget
};

// Load data through promises
const map_promise = d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
        .then((topojson) => topojson.features);
const temperature_promise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/temperatures.csv")
    .then((data) => {
        let temperature_data = {};
        data.forEach((row) => {
            const country = row["Code"];
            const month = parseInt(row["Month"]);
            const temperature = parseFloat(row["Temperature"]);
            if (!temperature_data[country]) {
                temperature_data[country] = {};
            }
            temperature_data[country][month] = temperature;
        });
        return temperature_data;
    });
const popularity_promise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/popularity.csv")
    .then((data) => {
        let popularity_data = {};
        data.forEach((row) => {
            popularity_data[row["Code"]] = parseFloat(row["Popularity"]);
        });
        return popularity_data;
    });
const budget_promise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/budget.csv")
.then((data) => {
    let budget_data = {};
    data.forEach((row) => {
        budget_data[row["Code"]] = parseFloat(row["Budget"]);
    });
    return budget_data;
});

// Draw map when promises return
Promise.all([map_promise, temperature_promise, popularity_promise, budget_promise]).then((results) => {
  console.log("Data loaded");
  let topo = results[0];
  let datasets = {
    temperature: results[1],
    popularity: results[2],
    budget: results[3]
  };
  let titles = {
    temperature: "Global Temperature Map",
    popularity: "Tourism Popularity Map",
    budget: "Trip Budget Map"
  };

  let currentMonth = 1; // Default month for temperature map
  // Add slider for temperature map below the map title
  const slider = d3.select(".map-container")
    .append("input")
    .attr("type", "range")
    .attr("min", 1)
    .attr("max", 12)
    .attr("value", currentMonth)
    .attr("step", 1)
    .attr("class", "month-slider");

    slider.on("input", function () {
        currentMonth = +this.value; // Update the current month
        updateMap("temperature"); // Re-render the temperature map
    });
    
    // Function to update the map based on the selected dataset
    function updateMap(selectedDataset) {
        let data = datasets[selectedDataset];
        let scale = colorScales[selectedDataset];
    
        // Set the domain of the scale based on the dataset
        let minValue, maxValue, midValue;
        if (selectedDataset === "temperature") {
            minValue = d3.min(Object.values(data), (d) => d[currentMonth]);
            maxValue = d3.max(Object.values(data), (d) => d[currentMonth]);
            midValue = (minValue + maxValue) / 2; // Use the midpoint for divergence
            scale.domain([minValue, midValue, maxValue]);
        } else {
            minValue = d3.min(Object.values(data));
            maxValue = d3.max(Object.values(data));
            scale.domain([minValue, maxValue]);
        }
    
        // Update map title
        const title = titles[selectedDataset];
        d3.select("#map-title").text(
            selectedDataset === "temperature"
                ? `${title} (Month: ${currentMonth})`
                : title
        );
    
        // Update the map
        svg.selectAll("path")
            .data(topo)
            .join("path")
            .attr("d", d3.geoPath().projection(projection))
            .attr("fill", function (d) {
                const value =
                    selectedDataset === "temperature"
                        ? data[d.id]?.[currentMonth]
                        : data[d.id];
                return value ? scale(value) : "#ccc"; // Default color for missing data
            });
    
        // Show or hide the slider based on the selected dataset
        slider.style("display", selectedDataset === "temperature" ? "block" : "none");
    }
    
    // Initial map rendering with temperature data
    updateMap("temperature");
    
    // Add event listeners to dropdown buttons
    d3.selectAll(".menu-button").on("click", function () {
        const selectedDataset = d3.select(this).attr("data-map-type");
        updateMap(selectedDataset);
    });
});