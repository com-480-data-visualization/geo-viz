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
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
        g.attr("transform", event.transform);

        // Adjust stroke width based on zoom level but maintain styles
        const sourceStrokeWidth = countryStyles.source.strokeWidth / event.transform.k;
        const destStrokeWidth = countryStyles.destination.strokeWidth / event.transform.k;
        
        g.selectAll("path.source-country")
            .attr("stroke-width", sourceStrokeWidth);
            
        g.selectAll("path.destination-country")
            .attr("stroke-width", destStrokeWidth);
    });

svg.call(zoom); // Apply zoom behavior to the SVG 

// Map and projection
const path = d3.geoPath();
const projection = d3.geoMercator()
    .scale(140) // Adjust scale for better fit
    .center([0, 0]) // Center the map
    .translate([400, 200]); // Translate to the center of the otate([0, 0])viewBox

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

    // Track selected countries and selection mode
    let selectedCountries = {
        source: null,
        destination: null
    };
    let selectionMode = 'source'; // Default selection mode
    
    // Add style for source and destination countries
    const countryStyles = {
        source: {
            stroke: "#0066cc",
            strokeWidth: 4,  // Changed from "4px" to 4
            className: "source-country"
        },
        destination: {
            stroke: "#cc6600",
            strokeWidth: 4,  // Changed from "4px" to 4
            className: "destination-country"
        }
    };
    
    // Enhanced event listeners for selection mode buttons with defensive checks
    const sourceButton = d3.select("#source-mode");
    const destinationButton = d3.select("#destination-mode");
    const modeLabel = d3.select(".selection-mode .mode-label");

    // Only add event listeners if the elements exist
    if (!sourceButton.empty()) {
        sourceButton.on("click", function() {
            selectionMode = 'source';
            d3.selectAll(".mode-button").classed("active", false);
            d3.select(this).classed("active", true);
            
            // Visual indicator that shows which mode is active
            if (!modeLabel.empty()) {
                modeLabel.text("Select Source Country:")
                    .style("color", countryStyles.source.stroke);
            }
        });
    }

    if (!destinationButton.empty()) {
        destinationButton.on("click", function() {
            selectionMode = 'destination';
            d3.selectAll(".mode-button").classed("active", false);
            d3.select(this).classed("active", true);
            
            // Visual indicator that shows which mode is active
            if (!modeLabel.empty()) {
                modeLabel.text("Select Destination Country:")
                    .style("color", countryStyles.destination.stroke);
            }
        });
    }

    // Set initial label only if the element exists
    if (!modeLabel.empty()) {
        modeLabel.text("Select Source Country:")
            .style("color", countryStyles.source.stroke);
    }

    // Create selection controls if they don't exist
    if (d3.select(".selection-controls").empty()) {
        const mapContainer = d3.select(".map-container");
        
        const controls = mapContainer.append("div")
            .attr("class", "selection-controls");
        
        const selectionMode = controls.append("div")
            .attr("class", "selection-mode");
        
        selectionMode.append("span")
            .attr("class", "mode-label")
            .text("Select Source Country:")
            .style("color", countryStyles.source.stroke);
        
        const buttonGroup = selectionMode.append("div")
            .attr("class", "button-group");
        
        buttonGroup.append("button")
            .attr("id", "source-mode")
            .attr("class", "mode-button active")
            .text("Source Country")
            .on("click", function() {
                selectionMode = 'source';
                d3.selectAll(".mode-button").classed("active", false);
                d3.select(this).classed("active", true);
                d3.select(".mode-label")
                    .text("Select Source Country:")
                    .style("color", countryStyles.source.stroke);
            });
        
        buttonGroup.append("button")
            .attr("id", "destination-mode")
            .attr("class", "mode-button")
            .text("Destination Country")
            .on("click", function() {
                selectionMode = 'destination';
                d3.selectAll(".mode-button").classed("active", false);
                d3.select(this).classed("active", true);
                d3.select(".mode-label")
                    .text("Select Destination Country:")
                    .style("color", countryStyles.destination.stroke);
            });
    }

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
                // Check if this country is already selected
                const isSource = selectedCountries.source && selectedCountries.source.code === d.id;
                const isDestination = selectedCountries.destination && selectedCountries.destination.code === d.id;
                
                // Don't override styling if it's already a selected country
                if (!isSource && !isDestination) {
                    d3.select(this)
                        .attr("stroke", "#333")
                        .attr("stroke-width", 4)  // Use same value as in countryStyles
                        .attr("cursor", "pointer")
                        .attr("vector-effect", "non-scaling-stroke");
                }
            })
            .on("mouseout", function (event, d) {
                // Check if this is either a source or destination country
                const isSource = selectedCountries.source && selectedCountries.source.code === d.id;
                const isDestination = selectedCountries.destination && selectedCountries.destination.code === d.id;
                
                // Only remove styling if this is not a selected country
                if (!isSource && !isDestination) {
                    d3.select(this)
                        .attr("stroke", null)
                        .attr("stroke-width", null);
                } else {
                    // Ensure proper styling is maintained for selected countries
                    if (isSource) {
                        d3.select(this)
                            .attr("stroke", countryStyles.source.stroke)
                            .attr("stroke-width", countryStyles.source.strokeWidth);
                    } else if (isDestination) {
                        d3.select(this)
                            .attr("stroke", countryStyles.destination.stroke)
                            .attr("stroke-width", countryStyles.destination.strokeWidth);
                    }
                }
            });

        // Show or hide the slider based on the selected dataset
        slider.style("display", selectedDataset === "temperature" ? "block" : "none");
        
        // Make sure country styling is maintained after map update
        updateCountryStyles();
    }

    // Function to handle country selection and display details
    function selectCountry(event, country, selectedDataset) {
        // Get country data
        const countryCode = country.id;
        const countryName = country.properties.name;
        
        // Check if this country is already selected in the other mode to avoid conflicts
        const otherMode = selectionMode === 'source' ? 'destination' : 'source';
        
        // If the same country is selected in both modes, clear the previous selection
        if (selectedCountries[otherMode] && selectedCountries[otherMode].code === countryCode) {
            selectedCountries[otherMode] = null;
        }
        
        // Record the selected country based on selection mode
        selectedCountries[selectionMode] = {
            code: countryCode,
            name: countryName,
            element: event.currentTarget,
            country: country
        };
        
        // Apply proper styling to all countries
        updateCountryStyles();
        
        // Center map on the selected country
        centerOnCountry(country);
        
        // Update the details panel
        updateCountryDetails(selectedDataset);
    }

    // Function to handle country styling
    function updateCountryStyles() {
        // Reset all country styling first
        g.selectAll("path")
            .classed("source-country destination-country", false)
            .attr("stroke", null)
            .attr("stroke-width", null);
        
        // Apply styling to source country if selected
        if (selectedCountries.source && selectedCountries.source.element) {
            d3.select(selectedCountries.source.element)
                .classed("source-country", true)
                .attr("stroke", countryStyles.source.stroke)
                .attr("stroke-width", countryStyles.source.strokeWidth)
                .attr("vector-effect", "non-scaling-stroke");
        }
        
        // Apply styling to destination country if selected
        if (selectedCountries.destination && selectedCountries.destination.element) {
            d3.select(selectedCountries.destination.element)
                .classed("destination-country", true)
                .attr("stroke", countryStyles.destination.stroke)
                .attr("stroke-width", countryStyles.destination.strokeWidth)
                .attr("vector-effect", "non-scaling-stroke");
        }
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
        
        // Base scale calculation with more moderate zooming
        let baseScale = 0.8 / Math.max(width / 800, height / 400);
        
        // Adjust scale based on country characteristics with more conservative values
        let scale = baseScale;
        
        // Handle special cases with reduced zoom levels
        if (area < 20) {
            // Very small countries - use a more moderate zoom
            scale = Math.min(Math.max(baseScale, 2.5), 4);
        } else if (area < 100) {
            // Small countries - more moderate zoom
            scale = Math.min(Math.max(baseScale, 2), 3.5);
        } else if (area > 2000) {
            // Very large countries (Russia, Canada, etc)
            scale = Math.min(baseScale * 0.7, 3);
        } else if (aspectRatio > 3 || aspectRatio < 0.33) {
            // Countries with extreme aspect ratios
            scale = Math.min(baseScale * 0.8, 3);
        }
        
        // More conservative scale limits
        scale = Math.min(scale, 4);  // Lower maximum zoom level
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
    }

    // Function to update the country details panel
    function updateCountryDetails(selectedDataset) {
        let detailHTML = '';
        
        // Source country section
        if (selectedCountries.source) {
            detailHTML += `<h3>From: ${selectedCountries.source.name}</h3>`;
            detailHTML += generateCountryDataHTML(selectedCountries.source.code);
        } else {
            detailHTML += `<h3>Select Source Country</h3>
                          <p>Click on a country after selecting the "Source" mode</p>`;
        }
        
        // Destination country section
        if (selectedCountries.destination) {
            detailHTML += `<h3>To: ${selectedCountries.destination.name}</h3>`;
            detailHTML += generateCountryDataHTML(selectedCountries.destination.code);
            
            // Add section for trip details (carbon footprint placeholder)
            if (selectedCountries.source) {
                detailHTML += `
                    <div class="trip-details">
                        <h3>Trip Information</h3>
                        <p>From ${selectedCountries.source.name} to ${selectedCountries.destination.name}</p>
                        <p><strong>Carbon Footprint:</strong> <span class="carbon-data">Calculating...</span></p>
                        <p class="note">Carbon footprint data will be available in the next update.</p>
                    </div>
                `;
            }
        } else {
            detailHTML += `<h3>Select Destination Country</h3>
                          <p>Click on a country after selecting the "Destination" mode</p>`;
        }
        
        // Update the existing country-details div
        d3.select(".country-details").html(detailHTML);
        
        // If both countries are selected, we could call the carbon emissions API here in the future
        if (selectedCountries.source && selectedCountries.destination) {
            // Placeholder for future API call:
            // calculateCarbonEmissions(selectedCountries.source.code, selectedCountries.destination.code);
        }
    }

    // Function to generate HTML for country data section
    function generateCountryDataHTML(countryCode) {
        let html = '';
        
        // Temperature data
        if (datasets.temperature[countryCode]) {
            const temp = datasets.temperature[countryCode][currentMonth];
            html += `
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
            html += `
                <div class="data-section">
                    <h4>Tourism Popularity</h4>
                    <p><strong>Score:</strong> ${popularity !== undefined ? popularity.toFixed(2) : "Data not available"}</p>
                </div>
            `;
        }

        // Budget data
        if (datasets.budget[countryCode]) {
            const budget = datasets.budget[countryCode];
            html += `
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
            html += "<p>No data available for this country</p>";
        }
        
        return html;
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
