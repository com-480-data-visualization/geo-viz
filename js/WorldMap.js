export default class WorldMap {
    constructor(topo, datasets) {
        this.topo = topo;
        this.datasets = datasets;
        this.width = 800; // Set the width of the SVG
        this.height = 400; // Set the height of the SVG
        this.svg = d3.select("svg#world-map")
        .attr("viewBox", `0 0 ${this.width} ${this.height}`) // Set the viewBox for responsive scaling
        .attr("preserveAspectRatio", "xMidYMid meet"); // Ensure the map scales properly
        this.container = this.svg.append("g");
        this.zoom_transform = d3.zoomIdentity; // Initialize zoom transform
        this.zoom = d3.zoom()
        .scaleExtent([1, 100]) // Set zoom limits
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

    // Function to handle country selection and display details
    selectCountry(event, country) {
        // Reset all countries to default styling
        this.container.selectAll("path").classed("selected-country", false)
            .attr("stroke", null)
            .attr("stroke-width", null);

        // Highlight the selected country
        const countryPath = this.container.select(`path[data-id="${country.id}"]`);
        if (!countryPath.empty()) {
            countryPath.classed("selected-country", true)
                .attr("stroke", "#333")
                .attr("stroke-width", "2px");
        }

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

    createLegend(selectedDataset) {
        // Select the legend container
        const legendContainer = d3.select(".legend-container");
        // Get the dimensions of the legend from the container
        const legendWidth = 50;
        const legendHeight = this.height;
        // Clear previous legend
        legendContainer.selectAll("*").remove();
        // 1. Set dimensions
        const margin = { top: 10, right: 60, bottom: 10, left: 40 };
        // 2. Create SVG
        const svg = d3.select(".legend-container")
        .append("svg")
        .attr("width", 60)
        .attr("height", legendHeight + margin.top + margin.bottom);
        // 3. Create a defs element and a linear gradient
        const defs = svg.append("defs");
        const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%") // Top to bottom
        .attr("x2", "0%")
        .attr("y2", "0%");
        // 4. Define gradient stops (you can increase the number for smoother gradient)
        const dataset = this.datasets[selectedDataset];
        const colorScale = this.colorScales[selectedDataset];
        const domain = colorScale.domain();
        const minValue = colorScale.domain()[0];
        const maxValue = domain.length > 2 ? colorScale.domain()[2] : colorScale.domain()[1];
        const range = maxValue - minValue;
        const stops = d3.range(0, 1.01, 0.1);  // 0 to 1 in steps of 0.1
        stops.forEach(t => {
            linearGradient.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", colorScale(t * range + minValue));
        });
        // 5. Append the gradient-filled rect
        svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");
        // 6. Create a scale for the legend axis
        const legendScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([legendHeight, 0]); // Invert the range for top-to-bottom
        // 7. Create and add the axis
        const legendAxis = d3.axisLeft(legendScale)
        .ticks(10)
        .tickFormat((d) => {
            if (selectedDataset === "temperature") {
                return d + "°C";
            } else if (selectedDataset === "budget") {
                return "$" + d;
            } else if (selectedDataset === "popularity") {
                return parseInt(d) / 1000000 + "M";
            } else if (selectedDataset === "hotels") {
                return parseInt(d) / 1000000 + "M";
            } else if (selectedDataset === "natural_sites") {
                return d;
            } else if (selectedDataset === "cultural_sites") {
                return d;
            }
        });
        svg.append("g")
        .attr("class", "legend-axis")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(legendAxis);        
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
            color_scale.domain([-20, 10, 40]);
        } else {
            minValue = d3.min(Object.values(data));
            maxValue = d3.max(Object.values(data));
            if (selectedDataset === "budget") {
                midValue = d3.median(Object.values(data));
                color_scale.domain([0, midValue, maxValue]);
            }
            else {
                color_scale.domain([0, maxValue]);
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

        // Add or update the legend
        this.createLegend(selectedDataset);
    }
}
