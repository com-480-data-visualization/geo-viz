import WorldMap from './js/WorldMap.js';

// Smooth scrolling to the map section
d3.select("#start-button").on("click", () =>
    d3.select(".map-section").node().scrollIntoView({ behavior: "smooth" })
);

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

    const world_map = new WorldMap(topo, datasets);

    // Initial map rendering with temperature data
    world_map.updateMap("temperature");

    // Add event listeners to dropdown buttons
    d3.selectAll(".menu-button").on("click", function () {
        const selectedDataset = d3.select(this).attr("data-map-type");
        world_map.updateMap(selectedDataset);
    });

    d3.select("#reset-zoom").on("click", function () {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });

    // Update the search functionality to display country details upon confirmation
    let searchTimeout;
    d3.select("#country-search").on("input", function () {
        const searchTerm = this.value.toLowerCase();

        // Clear any existing timeout to debounce user input
        clearTimeout(searchTimeout);

        // Only proceed if the user has entered more than one character
        if (searchTerm.length > 1) {
            searchTimeout = setTimeout(() => {
                // Filter matching countries
                const matchingCountries = topo
                    .filter((d) => d.properties.name.toLowerCase().includes(searchTerm))
                    .map((d) => d.properties.name);

                // Populate the dropdown list
                const dropdown = d3.select("#country-dropdown");
                dropdown.style("display", matchingCountries.length ? "block" : "none");
                dropdown.selectAll("li").remove();
                dropdown.selectAll("li")
                    .data(matchingCountries)
                    .enter()
                    .append("li")
                    .text((d) => d)
                    .on("click", function (event, countryName) {
                        // Find the selected country
                        const selectedCountry = topo.find((d) => d.properties.name === countryName);
                        if (selectedCountry) {
                            centerOnCountry(selectedCountry);
                            selectCountry(event, selectedCountry, "temperature"); // Display details
                        }

                        // Hide the dropdown and clear the search input
                        dropdown.style("display", "none");
                        d3.select("#country-search").property("value", countryName);
                    });
            }, 300); // Debounce delay of 300ms
        } else {
            // Hide the dropdown if input is cleared or too short
            d3.select("#country-dropdown").style("display", "none");
        }
    });
});
