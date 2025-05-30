import WorldMap from './js/WorldMap.js';

// Smooth scrolling to the map section on start button click
d3.select("#start-button").on("click", () => {
    // Show the map section first (so we can scroll to it)
    d3.select('.map-section').style('display', 'flex');

    // Scroll to map section smoothly
    d3.select('.map-section').node().scrollIntoView({ behavior: "smooth" });

    // Wait ~500ms (scroll duration) before hiding the home page
    setTimeout(() => {
        d3.select('.home-page').style('display', 'none');
    }, 600);
});


// Load data through promises
const mapPromise = d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    .then((topojson) => topojson.features);
const temperaturePromise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/temperatures.csv")
    .then((data) => {
        let temperatureData = {};
        data.forEach((row) => {
            const country = row["Code"];
            const month = parseInt(row["Month"]);
            const temperature = parseFloat(row["Temperature"]);
            if (!temperatureData[country]) {
                temperatureData[country] = {};
            }
            temperatureData[country][month] = temperature;
        });
        return temperatureData;
    });
const popularityPromise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/popularity.csv")
    .then((data) => {
        let popularityData = {};
        data.forEach((row) => {
            popularityData[row["Code"]] = parseFloat(row["Popularity"]);
        });
        return popularityData;
    });
const budgetPromise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/budget.csv")
    .then((data) => {
        let budgetData = {};
        data.forEach((row) => {
            budgetData[row["Code"]] = parseFloat(row["Budget"]);
        });
        return budgetData;
    });
const hotelsPromise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/hotels.csv")
    .then((data) => {
        let hotelsData = {};
        data.forEach((row) => {
            hotelsData[row["Code"]] = parseFloat(row["Hotel guests"]);
        });
        return hotelsData;
    });
const naturalSitesPromise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/natural_sites.csv")
    .then((data) => {
        let naturalSitesData = {};
        data.forEach((row) => {
            naturalSitesData[row["Code"]] = parseFloat(row["Natural sites"]);
        });
        return naturalSitesData;
    });
const culturalSitesPromise = d3.csv("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/cultural_sites.csv")
    .then((data) => {
        let cuturalSitesData = {};
        data.forEach((row) => {
            cuturalSitesData[row["Code"]] = parseFloat(row["Cultural sites"]);
        });
        return cuturalSitesData;
    });
const sitesByCountryPromise = d3.json("https://raw.githubusercontent.com/com-480-data-visualization/geo-viz/refs/heads/master/datasets/processed/uwh_sites_by_code.json")
    .then((data) => {
        return data;
    });
// Draw map when promises return
Promise.all([mapPromise, temperaturePromise, popularityPromise, budgetPromise,
    hotelsPromise, naturalSitesPromise, culturalSitesPromise, sitesByCountryPromise
]).then((results) => {
    console.log("Data loaded");
    let topo = results[0];
    let datasets = {
        temperature: results[1],
        popularity: results[2],
        budget: results[3],
        hotels: results[4],
        naturalSites: results[5],
        culturalSites: results[6],
        sitesByCountry: results[7]
    };

    const worldMap = new WorldMap(topo, datasets);

    // Initial map rendering with temperature data
    worldMap.updateMap("temperature");

    // Add event listeners to dropdown buttons
    d3.selectAll(".menu-button").on("click", function () {
        const selectedDataset = d3.select(this).attr("data-map-type");
        worldMap.updateMap(selectedDataset);
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
                    .filter((country) => country.properties.name.toLowerCase().includes(searchTerm))
                    .map((country) => country.properties.name);

                // Populate the dropdown list
                const dropdown = d3.select("#country-dropdown");
                dropdown.style("display", matchingCountries.length ? "block" : "none");
                dropdown.selectAll("li").remove();
                dropdown.selectAll("li")
                    .data(matchingCountries)
                    .enter()
                    .append("li")
                    .text((country) => country)
                    .on("click", function (event, countryName) {
                        // Find the selected country
                        const selectedCountry = topo.find((country) => country.properties.name === countryName);
                        console.log("Selected country:", selectedCountry);
                        if (selectedCountry) {
                            worldMap.centerOnCountry(selectedCountry);
                            worldMap.selectCountry(selectedCountry, "temperature"); // Display details
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
