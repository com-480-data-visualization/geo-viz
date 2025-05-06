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
        const sourceStrokeWidth = "4px";
        const destStrokeWidth = "4px";
        
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

// Add these variables at the top of your file (after the svg and projection definitions)
// Global variables for airport data
let airportDataLoaded = false;
let airportDataPromise = null;
let countryToAirport = {}; // Will be populated with country code -> airport code mapping

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

    // Function to update the country details panel with carbon data
    function updateCountryDetails(selectedDataset) {
        let detailHTML = '';
        
        // Source country section
        if (selectedCountries.source) {
            detailHTML += `<h3>From: ${selectedCountries.source.name}</h3>`;
            detailHTML += generateCountryDataHTML(selectedCountries.source.code, selectedDataset);
        } else {
            detailHTML += `<h3>Select Source Country</h3>
                          <p>Click on a country after selecting the "Source" mode</p>`;
        }
        
        // Destination country section
        if (selectedCountries.destination) {
            detailHTML += `<h3>To: ${selectedCountries.destination.name}</h3>`;
            detailHTML += generateCountryDataHTML(selectedCountries.destination.code, selectedDataset);
        } else {
            detailHTML += `<h3>Select Destination Country</h3>
                          <p>Click on a country after selecting the "Destination" mode</p>`;
        }
        
        // Trip section if both countries are selected
        if (selectedCountries.source && selectedCountries.destination) {
            detailHTML += `
                <div class="trip-details">
                    <h3>Trip Carbon Footprint</h3>
                    <p>Flight from ${selectedCountries.source.name} to ${selectedCountries.destination.name}</p>
                    <p class="carbon-info">
                        <span class="carbon-label">CO2 Emissions:</span>
                        <span class="carbon-data">Calculating...</span>
                        <span class="loading-spinner"></span>
                    </p>
                    <p class="note">Data provided by Carbon Interface API</p>
                </div>
            `;
            
            // Update the DOM first with loading state
            d3.select(".country-details").html(detailHTML);
            
            // Make the API call
            calculateCarbonEmissions(selectedCountries.source, selectedCountries.destination)
                .then(carbonData => {
                    if (!carbonData) return;
                    
                    // Hide spinner
                    d3.select(".loading-spinner").style("display", "none");
                    
                    // Update carbon data display
                    d3.select(".carbon-data").html(`${carbonData.emissions} kg CO2 
                        ${carbonData.isEstimate ? '<span class="note">(estimated)</span>' : ''}`);
                    
                    // Add additional details
                    const tripDetails = d3.select(".trip-details");
                    
                    // Add distance information
                    tripDetails.append("p")
                        .html(`<span class="carbon-label">Distance:</span> ${carbonData.distance} km (${carbonData.flightType})`);
                    
                    // Add visualization
                    tripDetails.append("div")
                        .attr("class", "carbon-visualization")
                        .append("div")
                        .attr("class", "carbon-bar")
                        .style("width", `${Math.min(carbonData.emissions/20, 100)}%`);
                    
                    // Add context information
                    tripDetails.append("p")
                        .attr("class", "carbon-context")
                        .text("Environmental impact equivalent to:");
                    
                    const equivalentsList = tripDetails.append("ul")
                        .attr("class", "carbon-equivalents");
                    
                    equivalentsList.append("li")
                        .text(`${Math.round(carbonData.emissions/2.5)} km driven by an average car`);
                    
                    equivalentsList.append("li")
                        .text(`${Math.round(carbonData.emissions/8.9)} hours of air conditioning`);
                    
                    equivalentsList.append("li")
                        .text(`${Math.round(carbonData.emissions/50)} trees needed to absorb this CO2 over one year`);
                })
                .catch(error => {
                    console.error("Error calculating carbon:", error);
                    d3.select(".loading-spinner").style("display", "none");
                    d3.select(".carbon-data").text("Calculation failed");
                });
        } else {
            // Update the DOM for cases where both countries aren't selected
            d3.select(".country-details").html(detailHTML);
        }
    }

    // Function to generate HTML for country data section
    function generateCountryDataHTML(countryCode, selectedDataset) {
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


// Simple fallback estimation based on distance
function estimateCarbonEmissions(sourceCountry, destCountry) {
    // Calculate distance between country centroids
    const sourceCentroid = d3.geoCentroid(sourceCountry.country);
    const destCentroid = d3.geoCentroid(destCountry.country);
    const distance = d3.geoDistance(sourceCentroid, destCentroid) * 6371; // Earth radius in km
    
    // Simple emissions calculation (kg CO2 per passenger km)
    const emissionFactor = distance < 1500 ? 0.15 : (distance < 4000 ? 0.12 : 0.11);
    const emissions = distance * emissionFactor;
    
    return {
        distance: Math.round(distance),
        emissions: Math.round(emissions * 10) / 10,
        sourceAirport: getAirportCode(sourceCountry.code),
        destAirport: getAirportCode(destCountry.code),
        isEstimate: true
    };
}



// Helper function to load ISO3 to ISO2 country code mapping
async function loadISO3To2Mapping() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/slim-2/slim-2.json');
        const countries = await response.json();
        
        const mapping = {};
        countries.forEach(country => {
            mapping[country['alpha-3']] = country['alpha-2'];
            // Also map by country name for flexibility
            mapping[country.name] = country['alpha-2'];
        });
        
        return mapping;
    } catch (error) {
        console.error('Error loading ISO code mapping:', error);
        return {};
    }
}

// Load airport data at the beginning of your app
countryToAirport = {}; // Will be populated with country code -> airport code mapping

// Load the airport data at startup
loadAirportData().then(data => {
    countryToAirport = data;
    console.log("Airport data loaded");
});

// Updated loadAirportData function that returns a promise
function loadAirportData() {
    // Only load once
    if (airportDataPromise) {
        return airportDataPromise;
    }
    
    // Create and store the promise
    airportDataPromise = new Promise(async (resolve) => {
        try {
            console.log("Loading airport data...");
            const response = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat');
            const text = await response.text();
            
            // Process CSV-like data
            const airports = [];
            text.split('\n').forEach(line => {
                if (!line) return;
                // Parse the comma-separated values (handling quoted fields)
                const fields = line.match(/("([^"]*)"|([^,]*))(,|$)/g)?.map(field => {
                    return field.replace(/(^,|,$)/g, '').replace(/^"(.*)"$/, '$1');
                });
                
                if (fields && fields.length >= 8) {
                    airports.push({
                        id: fields[0],
                        name: fields[1],
                        city: fields[2],
                        country: fields[3],
                        iata: fields[4] !== '\\N' ? fields[4] : null,
                        icao: fields[5] !== '\\N' ? fields[5] : null,
                        latitude: parseFloat(fields[6]),
                        longitude: parseFloat(fields[7]),
                        altitude: parseInt(fields[8]),
                        size: parseInt(fields[9] || 0) // Use size/importance metric
                    });
                }
            });
            
            // Create a map of countries to their major airports
            const countryAirports = {};
            
            // Group airports by country
            const airportsByCountry = {};
            airports.forEach(airport => {
                if (!airport.iata) return; // Skip airports without IATA codes
                
                const countryName = airport.country;
                if (!airportsByCountry[countryName]) {
                    airportsByCountry[countryName] = [];
                }
                airportsByCountry[countryName].push(airport);
            });
            
            // For each country, find the largest/most important airport
            Object.keys(airportsByCountry).forEach(countryName => {
                // Sort by international status, size, and other factors
                const sortedAirports = airportsByCountry[countryName].sort((a, b) => {
                    // First, prioritize airports with "International" in the name
                    const aIsIntl = a.name.toLowerCase().includes('international');
                    const bIsIntl = b.name.toLowerCase().includes('international');
                    if (aIsIntl && !bIsIntl) return -1;
                    if (!aIsIntl && bIsIntl) return 1;
                    
                    // Next, prioritize by size if available
                    if (a.size && b.size && a.size !== b.size) {
                        return b.size - a.size;
                    }
                    
                    // Finally, prefer capital city airports
                    const capitalCities = ['london', 'paris', 'berlin', 'madrid', 'rome', 'washington', 'beijing', 'tokyo'];
                    const aIsCapital = capitalCities.some(capital => a.city.toLowerCase().includes(capital));
                    const bIsCapital = capitalCities.some(capital => b.city.toLowerCase().includes(capital));
                    if (aIsCapital && !bIsCapital) return -1;
                    if (!aIsCapital && bIsCapital) return 1;
                    
                    return 0;
                });
                
                if (sortedAirports.length > 0) {
                    // Store by country name
                    countryAirports[countryName] = sortedAirports[0].iata;
                    
                    // Also try to map to ISO3 codes using a basic mapping
                    // This is just a basic example - you'd need a more comprehensive mapping
                    const iso3Mapping = {
                        'United States': 'USA',
                        'United Kingdom': 'GBR',
                        'France': 'FRA',
                        'Germany': 'DEU',
                        'China': 'CHN',
                        'Japan': 'JPN',
                        'Algeria': 'DZA',
                        // Add more as needed
                    };
                    
                    if (iso3Mapping[countryName]) {
                        countryAirports[iso3Mapping[countryName]] = sortedAirports[0].iata;
                    }
                }
            });
            
            console.log(`Loaded airports for ${Object.keys(countryAirports).length} countries`);
            airportDataLoaded = true;
            resolve(countryAirports);
        } catch (error) {
            console.error('Error loading airport data:', error);
            airportDataLoaded = false;
            resolve({}); // Resolve with empty object on error
        }
    });
    
    return airportDataPromise;
}

// Updated Carbon Interface API function
async function calculateCarbonEmissions(sourceCountry, destCountry) {
    if (!sourceCountry || !destCountry) return null;
    
    try {
        // First check hardcoded mapping - prioritize these over dynamic data
        const hardcodedAirports = getAirportCode(sourceCountry.code);
        const hardcodedDestination = getAirportCode(destCountry.code);
        
        // Start with hardcoded values for major countries
        let sourceAirport = hardcodedAirports;
        let destAirport = hardcodedDestination;
        
        // Only use dynamic data if hardcoded mapping didn't work
        if (sourceAirport === sourceCountry.code || destAirport === destCountry.code) {
            // Make sure airport data is loaded
            if (!airportDataLoaded) {
                countryToAirport = await loadAirportData();
            }
            
            // Only override sourceAirport if it wasn't already matched
            if (sourceAirport === sourceCountry.code) {
                sourceAirport = countryToAirport[sourceCountry.name] || 
                                countryToAirport[sourceCountry.code] ||
                                sourceCountry.code;  
            }
            
            // Only override destAirport if it wasn't already matched
            if (destAirport === destCountry.code) {
                destAirport = countryToAirport[destCountry.name] || 
                             countryToAirport[destCountry.code] ||
                             destCountry.code;
            }
        }
        
        // Log the resolution process
        console.log(`Country codes: ${sourceCountry.code} → ${destCountry.code}`);
        console.log(`Using airports: ${sourceAirport} → ${destAirport}`);
        
        // If we can't resolve both airports, fall back to estimation
        if (!sourceAirport || !destAirport) {
            console.warn("Could not resolve airport codes, using fallback estimation");
            return estimateCarbonEmissions(sourceCountry, destCountry); 
        }
        
        // Continue with the API call using the resolved airport codes
        const payload = {
            "type": "flight",
            "passengers": 1,
            "legs": [
                {
                    "departure_airport": sourceAirport,
                    "destination_airport": destAirport
                }
            ]
        };
        
        // Rest of your existing API call code...
        const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer W3pfo842IxX3bhoQ3j40wQ',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API response error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Carbon API response:', data);
        
        return {
            distance: Math.round(data.data.attributes.distance_value || 0),
            emissions: Math.round(data.data.attributes.carbon_kg * 10) / 10,
            flightType: data.data.attributes.distance_value < 1500 ? 'short-haul' : 
                      (data.data.attributes.distance_value < 4000 ? 'medium-haul' : 'long-haul'),
            sourceAirport: sourceAirport,
            destAirport: destAirport
        };
    } catch (error) {
        console.error('Error calculating carbon emissions:', error);
        return estimateCarbonEmissions(sourceCountry, destCountry);
    }
}

// Update where you start loading airport data
// Initialize immediately so it's ready when needed
loadAirportData().then(data => {
    countryToAirport = data;
    console.log("Airport data loaded successfully:", Object.keys(data).length, "countries mapped");
}).catch(error => {
    console.error("Failed to load airport data:", error);
});

// Simplified airport code mapping using CCA3 country codes
function getAirportCode(countryCode) {
    const airportMap = {
        // Europe
        "GBR": "LHR", // London Heathrow (not Belfast)
        "UKR": "KBP", // Kyiv Boryspil (not Simferopol)
        "FRA": "CDG", // Paris Charles de Gaulle
        "DEU": "FRA", // Frankfurt
        "ITA": "FCO", // Rome Fiumicino
        "ESP": "MAD", // Madrid Barajas
        "NLD": "AMS", // Amsterdam Schiphol
        
        // North America
        "USA": "JFK", // New York JFK
        "CAN": "YYZ", // Toronto
        "MEX": "MEX", // Mexico City
        
        // Asia
        "CHN": "PEK", // Beijing
        "JPN": "HND", // Tokyo Haneda
        "IND": "DEL", // Delhi
        "THA": "BKK", // Bangkok
        "SGP": "SIN", // Singapore Changi
        
        // Middle East & Africa
        "ARE": "DXB", // Dubai
        "ZAF": "JNB", // Johannesburg
        "EGY": "CAI", // Cairo
        "DZA": "ALG", // Algiers
        "MAR": "CMN", // Casablanca
        
        // South America
        "BRA": "GRU", // São Paulo
        "ARG": "EZE", // Buenos Aires
        "CHL": "SCL", // Santiago
        "COL": "BOG", // Bogotá
        
        // Oceania
        "AUS": "SYD", // Sydney
        "NZL": "AKL"  // Auckland
    };
    
    return airportMap[countryCode] || countryCode;
}
