export default class WorldMap {
    constructor(topo, datasets) {
        this.topo = topo;
        this.datasets = datasets;
        this.svg = d3.select("svg#world_map")
        .attr("viewBox", `0 0 800 400`) // Set the viewBox to match the map's dimensions
        .attr("preserveAspectRatio", "xMidYMid meet"); // Ensure the map scales properly
        this.container = this.svg.append("g");
        this.zoom = d3.zoom()
        .scaleExtent([1, 8]) // Set zoom limits
        .on("zoom", (event) => {
            this.container.attr("transform", event.transform); // Apply zoom transformation
            const strokeWidth = 1.5 / event.transform.k;
            this.container.selectAll("path.selected-country")
                .attr("stroke-width", strokeWidth);
        });
        this.svg.call(this.zoom); // Apply zoom behavior to the SVG 
        this.path = d3.geoPath();
        this.projection = d3.geoMercator()
            .scale(140) // Adjust scale for better fit
            .center([0, 0]) // Center the map
            .translate([400, 200]); // Translate to the center of the otate([0, 0])viewBox
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
            popularity: d3.scaleSequentialLog().interpolator(d3.interpolateBlues), // Blue for tourism popularity
            budget: d3.scaleDiverging().interpolator((t) => d3.interpolateRdYlGn(1-t)) // Green for low budget, red for high budget
        };
        this.titles = {
            temperature: "Global Temperature Map",
            popularity: "Tourism Popularity Map",
            budget: "Trip Budget Map"
        };
    }

    getCurrentMonth() {
        return this.currentMonth;
    }

    centerOnCountry(country) {
        // Get the bounds of the country path
        const bounds = this.path.bounds(country);
        const width = bounds[1][0] - bounds[0][0];
        const height = bounds[1][1] - bounds[0][1];
        
        // Get the centroid for position calculation
        const centroid = d3.geoCentroid(country);
        const [x, y] = this.projection(centroid);
        
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
        this.svg.transition()
           .duration(750)
           .call(
               this.zoom.transform,
               d3.zoomIdentity
                 .translate(translateX, translateY)
                 .scale(scale)
           );
    }

    // Function to handle country selection and display details
    selectCountry(event, country) {
        // Reset all countries to default styling
        this.container.selectAll("path").classed("selected-country", false)
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

        this.centerOnCountry(country);

        // Create HTML with all available data for this country
        let detailHTML = `<h3>${countryName}</h3>`;

        // Temperature data
        if (this.datasets.temperature[countryCode]) {
            const temp = this.datasets.temperature[countryCode][this.currentMonth];
            detailHTML += `
                <div class="data-section">
                    <h4>Temperature</h4>
                    <p><strong>Average Temperature:</strong> ${temp !== undefined ? temp.toFixed(1) + "°C" : "Data not available"}</p>
                    <p><strong>Month:</strong> ${new Date(0, this.currentMonth - 1).toLocaleString('en-US', { month: 'long' })}</p>
                </div>
            `;
        }

        // Tourism popularity data
        if (this.datasets.popularity[countryCode]) {
            const popularity = this.datasets.popularity[countryCode];
            detailHTML += `
                <div class="data-section">
                    <h4>Tourism Popularity</h4>
                    <p><strong>Score:</strong> ${popularity !== undefined ? popularity.toFixed(2) : "Data not available"}</p>
                </div>
            `;
        }

        // Budget data
        if (this.datasets.budget[countryCode]) {
            const budget = this.datasets.budget[countryCode];
            detailHTML += `
                <div class="data-section">
                    <h4>Trip Budget</h4>
                    <p><strong>Average Cost:</strong> ${budget !== undefined ? "$" + budget.toFixed(0) : "Data not available"}</p>
                </div>
            `;
        }

        // If no data available for any dataset
        if (!this.datasets.temperature[countryCode] &&
            !this.datasets.popularity[countryCode] &&
            !this.datasets.budget[countryCode]) {
            detailHTML += "<p>No data available for this country</p>";
        }

        // Update the existing country-details div
        d3.select(".country-details").html(detailHTML);
    }

    // Function to update the map based on the selected dataset
    updateMap(selectedDataset) {
        let data = this.datasets[selectedDataset];
        let scale = this.colorScales[selectedDataset];
    
        // Set the domain of the scale based on the dataset
        let minValue, maxValue, midValue;
        if (selectedDataset === "temperature") {
            minValue = d3.min(Object.values(data), (d) => d[this.currentMonth]);
            maxValue = d3.max(Object.values(data), (d) => d[this.currentMonth]);
            midValue = (minValue + maxValue) / 2; // Use the midpoint for divergence
            scale.domain([minValue, midValue, maxValue]);
        } else {
            minValue = d3.min(Object.values(data));
            maxValue = d3.max(Object.values(data));
            if (selectedDataset === "budget") {
                midValue = d3.median(Object.values(data));
                scale.domain([minValue, midValue, maxValue]);
            }
            else {
                scale.domain([minValue, maxValue]);
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
            .attr("d", d3.geoPath().projection(this.projection))
            .attr("fill", (d) => {
                const value =
                selectedDataset === "temperature"
                ? data[d.id]?.[this.currentMonth]
                : data[d.id];
                return value ? scale(value) : "#ccc"; // Default color for missing data
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
