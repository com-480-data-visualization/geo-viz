// Smooth scrolling to the map section
d3.select("#start-button").on("click", () =>
    d3.select(".map-section").node().scrollIntoView({ behavior: "smooth" })
);

// The svg
const svg = d3.select("svg#world_map")
    .attr("viewBox", `0 0 800 400`) // Set the viewBox to match the map's dimensions
    .attr("preserveAspectRatio", "xMidYMid meet"); // Ensure the map scales properly

const g = svg.append("g");

const zoom = d3.zoom()
    .scaleExtent([1, 8]) // Set zoom limits
    .on("zoom", (event) => {
        g.attr("transform", event.transform); // Apply zoom transformation

        const strokeWidth = 1.5 / event.transform.k;
        g.selectAll("path.selected-country")
            .attr("stroke-width", strokeWidth);
    });

svg.call(zoom); // Apply zoom behavior to the SVG 

// Map and projection
const path = d3.geoPath();
const projection = d3.Mercator()
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
        g.selectAll("path")
            .data(topo)
            .join("path")
            .attr("d", d3.geoPath().projection(projection))
            .attr("fill", function (d) {
                const value =
                    selectedDataset === "temperature"
                        ? data[d.id]?.[currentMonth]
                        : data[d.id];
                return value ? scale(value) : "#ccc"; // Default color for missing data
            })
            .on("click", function (event, d) {
                selectCountry(event, d, selectedDataset);
                centerOnCountry(d);
            })
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("stroke", "#333")
                    .attr("stroke-width", "4px")
                    .attr("cursor", "pointer")
                    .attr("vector-effect", "non-scaling-stroke");
            })
            .on("mouseout", function (event, d) {
                if (!this.classList.contains('selected-country')) {
                    d3.select(this)
                        .attr("stroke", null)
                        .attr("stroke-width", null);
                }
            });

        // Show or hide the slider based on the selected dataset
        slider.style("display", selectedDataset === "temperature" ? "block" : "none");
    }

    // Function to handle country selection and display details
    function selectCountry(event, country, selectedDataset) {
        // Reset all countries to default styling
        g.selectAll("path").classed("selected-country", false)
            .attr("stroke", null)
            .attr("stroke-width", null);

        // Highlight the selected country
        d3.select(event.currentTarget)
            .classed("selected-country", true)
            .attr("stroke", "#333")
            .attr("stroke-width", "2px");

        // Get country data
        const countryCode = country.id;
        const countryName = country.properties.name;

        centerOnCountry(country);

        // Create HTML with all available data for this country
        let detailHTML = `<h3>${countryName}</h3>`;

        // Temperature data
        if (datasets.temperature[countryCode]) {
            const temp = datasets.temperature[countryCode][currentMonth];
            detailHTML += `
                <div class="data-section">
                    <h4>Temperature</h4>
                    <p><strong>Average Temperature:</strong> ${temp !== undefined ? temp.toFixed(1) + "°C" : "Data not available"}</p>
                    <p><strong>Month:</strong> ${new Date(0, currentMonth - 1).toLocaleString('default', { month: 'long' })}</p>
                </div>
            `;
        }

        // Tourism popularity data
        if (datasets.popularity[countryCode]) {
            const popularity = datasets.popularity[countryCode];
            detailHTML += `
                <div class="data-section">
                    <h4>Tourism Popularity</h4>
                    <p><strong>Score:</strong> ${popularity !== undefined ? popularity.toFixed(2) : "Data not available"}</p>
                </div>
            `;
        }

        // Budget data
        if (datasets.budget[countryCode]) {
            const budget = datasets.budget[countryCode];
            detailHTML += `
                <div class="data-section">
                    <h4>Trip Budget</h4>
                    <p><strong>Average Cost:</strong> ${budget !== undefined ? "$" + budget.toFixed(0) : "Data not available"}</p>
                </div>
            `;
        }

        // If no data available for any dataset
        if (!datasets.temperature[countryCode] &&
            !datasets.popularity[countryCode] &&
            !datasets.budget[countryCode]) {
            detailHTML += "<p>No data available for this country</p>";
        }

        // Update the existing country-details div
        d3.select(".country-details").html(detailHTML);
    }

    function centerOnCountry(country) {
        // Get the bounds of the country path
        const bounds = path.bounds(country);
        const width = bounds[1][0] - bounds[0][0];
        const height = bounds[1][1] - bounds[0][1];
        
        // Get the centroid for position calculation
        const centroid = d3.geoCentroid(country);
        const [x, y] = projection(centroid);
        
        // Calculate the country's area and aspect ratio
        const area = width * height;
        const aspectRatio = width / height;
        
        console.log("Country:", country.properties.name);
        console.log("Area:", area, "Aspect ratio:", aspectRatio.toFixed(2));
        
        // Base scale calculation (current approach)
        let baseScale = 0.9 / Math.max(width / 800, height / 400);
        
        // Adjust scale based on country characteristics
        let scale = baseScale;
        
        // Handle special cases
        if (area < 20) {
            // Very small countries - ensure they're visible (islands, city states)
            scale = Math.max(baseScale, 4);
            console.log("Very small country detected, applying minimum zoom");
        } else if (area < 100) {
            // Small countries - ensure they're prominent
            scale = Math.min(Math.max(baseScale, 3), 7);
            console.log("Small country detected, adjusting zoom");
        } else if (area > 2000) {
            // Very large countries (Russia, Canada, etc)
            // Ensure the entire country is visible with some padding
            scale = Math.min(baseScale * 0.85, 5);
            console.log("Large country detected, ensuring full visibility");
        } else if (aspectRatio > 3 || aspectRatio < 0.33) {
            // Countries with extreme aspect ratios (very wide or very tall)
            // Ensure we see the whole shape
            scale = Math.min(baseScale * 0.9, 6);
            console.log("Unusual shape detected, adjusting for visibility");
        }
        
        // Ensure scale is within reasonable limits
        scale = Math.min(scale, 7);  // Maximum zoom level
        scale = Math.max(scale, 1);  // Minimum zoom level
        
        // Calculate translation to center
        const translateX = 400 - x * scale;
        const translateY = 200 - y * scale;
        
        // Apply the transform with a transition
        svg.transition()
           .duration(750)
           .call(
               zoom.transform,
               d3.zoomIdentity
                 .translate(translateX, translateY)
                 .scale(scale)
           );
           
        console.log("Final scale:", scale.toFixed(2), "Translation:", [translateX.toFixed(0), translateY.toFixed(0)]);
    }

    // Initial map rendering with temperature data
    updateMap("temperature");

    // Add event listeners to dropdown buttons
    d3.selectAll(".menu-button").on("click", function () {
        const selectedDataset = d3.select(this).attr("data-map-type");
        updateMap(selectedDataset);
    });

    d3.select("#reset-zoom").on("click", function () {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });
});
