export default class WorldMap {
    constructor(topo, datasets) {
        this.topo = topo;
        this.datasets = datasets;
        this.width = 800; // Set the width of the SVG
        this.height = 400; // Set the height of the SVG
        this.svg = d3.select("svg#world_map")
        .attr("viewBox", `0 0 ${this.width} ${this.height}`) // Set the viewBox for responsive scaling
        .attr("preserveAspectRatio", "xMidYMid meet"); // Ensure the map scales properly
        this.container = this.svg.append("g");
        this.zoom_transform = d3.zoomIdentity; // Initialize zoom transform
        this.zoom = d3.zoom()
        .scaleExtent([1, 8]) // Set zoom limits
        .on("zoom", (event) => {
            this.container.attr("transform", event.transform); // Apply zoom transformation
            this.zoom_transform = event.transform; // Update zoom transform
            const strokeWidth = 1.5 / event.transform.k;
            this.container.selectAll("path.selected-country")
                .attr("stroke-width", strokeWidth);
        });
        this.svg.call(this.zoom); // Apply zoom behavior to the SVG 
        d3.select("#reset-zoom").on("click", ()=> {
            this.svg.transition()
                .duration(750)
                .call(this.zoom.transform, d3.zoomIdentity);
        });
        this.path = d3.geoPath();
        this.projection = d3.geoMercator()
        .scale(140) // Adjust scale for better fit
        .center([0, 0]) // Center the map
        .translate([400, 250]); // Translate to the center of the viewBox
        this.initialScale = this.projection.scale();
        this.initialTranslate = this.projection.translate();
        this.selectedDataset = "temperature"; // Default dataset
        this.currentMonth = 1; // Default month
        // Add slider for temperature map below the map title
        this.slider = d3.select(".map-container")
        .append("input")
        .attr("type", "range")
        .attr("min", 1)
        .attr("max", 12)
        .attr("value", this.currentMonth)
        .attr("step", 1)
        .attr("class", "month-slider");
        this.slider.on("input", (event) => {
            this.currentMonth = +event.target.value;
            this.updateMap("temperature");
        });
        this.colorScales = {
            temperature: d3.scaleDiverging((t) => d3.interpolateRdBu(1 - t)), // Red for warm, blue for cold
            popularity: d3.scaleSequential().interpolator(d3.interpolateBlues), // Blue for tourism popularity
            budget: d3.scaleDiverging().interpolator((t) => d3.interpolateRdYlGn(1-t)), // Green for low budget, red for high budget
            hotels: d3.scaleSequential().interpolator(d3.interpolateOranges), // Orange for hotel guests
            natural_sites: d3.scaleSequential().interpolator(d3.interpolateGreens), // Green for natural sites
            cultural_sites: d3.scaleSequential().interpolator(d3.interpolatePurples) // Purple for cultural sites
        };
        this.titles = {
            temperature: "Average Monthly Temperature",
            popularity: "Annual Number of Tourists",
            budget: "Average Trip Budget",
            hotels: "Annual Number of Hotel Guests",
            natural_sites: "Number of UNESCO World Heritage Natural Sites",
            cultural_sites: "Number of UNESCO World Heritage Cultural Sites"
        };
        this.homeCountry = null;
        this.destinationCountry = null;
        this.selectionMode = "home"; // Start with selecting home country
        
        // Add a toggle button for selection mode
        d3.select(".map-container")
            .append("div")
            .attr("class", "selection-controls")
            .html(`
                <button id="toggle-selection" class="selection-btn home-mode">
                    Currently selecting: <span>Home Country</span>
                </button>
                <button id="reset-selection" class="selection-btn">Reset Selection</button>
            `);
            
        d3.select("#toggle-selection").on("click", () => this.toggleSelectionMode());
        d3.select("#reset-selection").on("click", () => this.resetCountrySelection());
    }
    
    // Add a method to toggle between home and destination selection
    toggleSelectionMode() {
        this.selectionMode = this.selectionMode === "home" ? "destination" : "home";
        const button = d3.select("#toggle-selection");
        
        if (this.selectionMode === "home") {
            button.classed("home-mode", true).classed("destination-mode", false);
            button.select("span").text("Home Country");
        } else {
            button.classed("home-mode", false).classed("destination-mode", true);
            button.select("span").text("Destination Country");
        }
    }
    
    resetCountrySelection() {
        this.homeCountry = null;
        this.destinationCountry = null;
        this.container.selectAll("path")
            .classed("selected-country", false)
            .classed("home-country", false)
            .classed("destination-country", false)
            .attr("stroke", null)
            .attr("stroke-width", null);
            
        d3.select(".country-details").html("<h3>Country Details</h3><p>Select a home country and destination to see trip details.</p>");
    }

    // Function to center the map on a selected country
    centerOnCountry(country) {
        const padding = 50;
        // Calculate the bounding box of the country
        this.projection.fitExtent(
            [[padding, padding], [this.width - padding, this.height - padding]],
            country
        );
        // Get the new scale and translation values
        const newScale = this.projection.scale();
        const [newTranslateX, newTranslateY] = this.projection.translate();
        const k = newScale / this.initialScale;
        const tx = newTranslateX - this.initialTranslate[0] * k;
        const ty = newTranslateY - this.initialTranslate[1] * k;
        // Apply the transform with a transition
        this.svg.transition()
           .duration(750)
           .call(
               this.zoom.transform,
               d3.zoomIdentity
                 .translate(tx, ty)
                 .scale(k)
        );
    }

    selectCountry(event, country) {
        const countryCode = country.id;
        const countryName = country.properties.name;
        
        if (this.selectionMode === "home") {
            // If selecting home country, clear previous home selection
            this.container.selectAll("path.home-country")
                .classed("home-country", false)
                .classed("selected-country", false)
                .attr("stroke", null)
                .attr("stroke-width", null);
                
            // Set new home country
            this.homeCountry = country;
            const countryPath = this.container.select(`path[data-id="${countryCode}"]`);
            if (!countryPath.empty()) {
                countryPath.classed("home-country", true)
                    .classed("selected-country", true)
                    .attr("stroke", "#0066CC")
                    .attr("stroke-width", "2px");
            }
            
            // Switch to destination selection mode
            this.toggleSelectionMode();
        } else {
            // If selecting destination country
            if (this.homeCountry && this.homeCountry.id === countryCode) {
                // Can't select same country as both home and destination
                return;
            }
            
            // Clear previous destination selection
            this.container.selectAll("path.destination-country")
                .classed("destination-country", false)
                .classed("selected-country", false)
                .attr("stroke", null)
                .attr("stroke-width", null);
                
            // Set new destination country
            this.destinationCountry = country;
            const countryPath = this.container.select(`path[data-id="${countryCode}"]`);
            if (!countryPath.empty()) {
                countryPath.classed("destination-country", true)
                    .classed("selected-country", true)
                    .attr("stroke", "#CC0000")
                    .attr("stroke-width", "2px");
            }
        }
        
        // Display details if both countries are selected
        if (this.homeCountry && this.destinationCountry) {
            this.displayTripDetails();
        }
    }
    
    // Add a method to calculate and display trip details
    displayTripDetails() {
        const homeCode = this.homeCountry.id;
        const homeName = this.homeCountry.properties.name;
        const destCode = this.destinationCountry.id;
        const destName = this.destinationCountry.properties.name;
        
        // Calculate the distance between countries
        const distance = this.calculateDistance(this.homeCountry, this.destinationCountry);
        
        // Estimate CO2 emissions (rough calculation - 0.2 kg CO2 per km per person for air travel)
        const co2Emissions = distance * 0.2 * 2; // Multiply by 2 for round trip
        
        // Reference value: Recommended max CO2 emissions per person per year (2000 kg)
        const annualCO2Budget = 2000;
        
        // Determine which value is larger for scaling
        const maxValue = Math.max(co2Emissions, annualCO2Budget);
        
        // Calculate percentages based on the max value
        const tripPercent = (co2Emissions / maxValue) * 100;
        const budgetPercent = (annualCO2Budget / maxValue) * 100;
        
        // Calculate percentage of annual budget
        const percentOfAnnual = (co2Emissions / annualCO2Budget) * 100;
        
        // Determine trip impact class
        const impactClass = co2Emissions > annualCO2Budget ? "high-impact" : "";
        
        let detailHTML = `
            <h3>Trip Details</h3>
            <div class="trip-overview">
                <p><strong>From:</strong> ${homeName}</p>
                <p><strong>To:</strong> ${destName}</p>
                <p><strong>Approximate Distance:</strong> ${Math.round(distance)} km</p>
                <p><strong>Estimated CO2 Emissions (Round Trip):</strong> ${Math.round(co2Emissions)} kg</p>
                
                <div class="co2-comparison">
                    <h4>Environmental Impact</h4>
                    <p>This trip represents <strong>${percentOfAnnual.toFixed(1)}%</strong> of the recommended annual CO2 budget per person</p>
                    
                    <div class="co2-bar-container">
                        <div class="co2-label">
                            <span>Annual Budget</span>
                            <span class="co2-value">2000 kg</span>
                        </div>
                        <div class="co2-bar annual-bar" style="width: ${Math.max(1, budgetPercent)}%;"></div>
                    </div>
                    
                    <div class="co2-bar-container">
                        <div class="co2-label">
                            <span>This Trip</span>
                            <span class="co2-value">${Math.round(co2Emissions)} kg</span>
                        </div>
                        <div class="co2-bar trip-bar ${impactClass}" style="width: ${Math.max(1, tripPercent)}%;"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Add destination country details
        if (this.datasets.temperature[destCode]) {
            const temp = this.datasets.temperature[destCode][this.currentMonth];
            detailHTML += `
                <div class="data-section destination-data">
                    <h4>Destination Temperature</h4>
                    <p><strong>Average Temperature:</strong> ${temp !== undefined ? temp.toFixed(1) + "°C" : "Data not available"}</p>
                    <p><strong>Month:</strong> ${new Date(0, this.currentMonth - 1).toLocaleString('en-US', { month: 'long' })}</p>
                </div>
            `;
        }
        
        if (this.datasets.popularity[destCode]) {
            const popularity = this.datasets.popularity[destCode];
            detailHTML += `
                <div class="data-section destination-data">
                    <h4>Tourism Popularity</h4>
                    <p><strong>Annual Visitors:</strong> ${popularity !== undefined ? Number(popularity).toLocaleString() : "Data not available"}</p>
                </div>
            `;
        }
        
        if (this.datasets.budget[destCode]) {
            const budget = this.datasets.budget[destCode];
            detailHTML += `
                <div class="data-section destination-data">
                    <h4>Trip Budget</h4>
                    <p><strong>Average Cost:</strong> ${budget !== undefined ? "$" + budget.toFixed(0) : "Data not available"}</p>
                </div>
            `;
        }
        
        // Update the details div
        d3.select(".country-details").html(detailHTML);
    }
    
    // Add a method to calculate distance between two countries
    calculateDistance(country1, country2) {
        // Calculate centroids of both countries
        const centroid1 = d3.geoCentroid(country1);
        const centroid2 = d3.geoCentroid(country2);
        
        // Convert to radians
        const lon1 = centroid1[0] * Math.PI / 180;
        const lat1 = centroid1[1] * Math.PI / 180;
        const lon2 = centroid2[0] * Math.PI / 180;
        const lat2 = centroid2[1] * Math.PI / 180;
        
        // Haversine formula to calculate great-circle distance
        const earthRadius = 6371; // in km
        const dLon = lon2 - lon1;
        const dLat = lat2 - lat1;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
                  
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return earthRadius * c;
    }

    // Function to update the map based on the selected dataset
    updateMap(selectedDataset) {
        let data = this.datasets[selectedDataset];
        let color_scale = this.colorScales[selectedDataset];
        this.projection.scale(this.initialScale); // Reset projection scale
        this.projection.translate(this.initialTranslate); // Reset projection translation
        // apply current zoom transform
        this.svg.transition()
            .duration(0)
            .call(
                this.zoom.transform,
                d3.zoomIdentity
                    .translate(this.zoom_transform.x, this.zoom_transform.y)
                    .scale(this.zoom_transform.k)
            );
    
        // Set the domain of the color scale based on the dataset
        let minValue, maxValue, midValue;
        if (selectedDataset === "temperature") {
            minValue = d3.min(Object.values(data), (d) => d[this.currentMonth]);
            maxValue = d3.max(Object.values(data), (d) => d[this.currentMonth]);
            midValue = (minValue + maxValue) / 2; // Use the midpoint for divergence
            color_scale.domain([minValue, midValue, maxValue]);
        } else {
            minValue = d3.min(Object.values(data));
            maxValue = d3.max(Object.values(data));
            if (selectedDataset === "budget") {
                midValue = d3.median(Object.values(data));
                color_scale.domain([minValue, midValue, maxValue]);
            }
            else {
                color_scale.domain([minValue, maxValue]);
            }
        }
    
        // Update map title
        const title = this.titles[selectedDataset];
        d3.select("#map-title").text(
            selectedDataset === "temperature"
                ? `${title} (Month: ${new Date(0, this.currentMonth - 1).toLocaleString('en-US', { month: 'long' })})`
                : title
        );
    
        // Update the map
        this.container.selectAll("path")
            .data(this.topo)
            .join("path")
            .attr("data-id", (d) => d.id) // Add data-id attribute
            .attr("d", d3.geoPath().projection(this.projection))
            .attr("fill", (d) => {
                const value =
                selectedDataset === "temperature"
                ? data[d.id]?.[this.currentMonth]
                : data[d.id];
                return value ? color_scale(value) : "#ccc"; // Default color for missing data
            })
            .on("click", (event, d) => {
                this.selectCountry(event, d);
                this.centerOnCountry(d);
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
        this.slider.style("display", selectedDataset === "temperature" ? "block" : "none");
    }
}
