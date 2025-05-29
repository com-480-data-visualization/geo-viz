import updateCountryCharts from './charts.js';

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
        this.siteRadius = 5; // Initial radius for site points
        this.minSiteRadius = 0.5; // Minimum radius for site points
        this.siteStrokeWidth = 0.5; // Initial stroke width for site points
        this.minSiteStrokeWidth = 0.1; // Minimum stroke width for site points
        this.zoom_transform = d3.zoomIdentity; // Initialize zoom transform
        this.zoom = d3.zoom()
        .scaleExtent([1, 100]) // Set zoom limits
        .on("zoom", (event) => {
            this.container.attr("transform", event.transform); // Apply zoom transformation
            this.zoom_transform = event.transform; // Update zoom transform
            const strokeWidth = 1.5 / event.transform.k;
            this.container.selectAll("path.selected-country")
                .attr("stroke-width", strokeWidth);
            this.siteRadius = d3.max([5 / event.transform.k, this.minSiteRadius]) // Adjust site radius based on zoom
            this.siteStrokeWidth = d3.max([2 / event.transform.k, this.minSiteStrokeWidth])
            this.container.selectAll(".uwh-site")
                .attr("r",  this.siteRadius)
                .attr("stroke-width", this.siteStrokeWidth);
        });
        this.svg.call(this.zoom); // Apply zoom behavior to the SVG 
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
            if (this.homeCountry && this.destinationCountry) {
                this.displayTripDetails();
            }
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
        d3.select(".controls-container")
            .append("div")
            .attr("class", "selection-controls")
            .html(`
                <button id="toggle-selection" class="selection-btn home-mode">
                    Selecting: <span>Home Country</span>
                </button>
            `);
        d3.select("#toggle-selection").on("click", () => this.toggleSelectionMode());
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
        // Reset zoom
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity);

            
            // Clear selected countries
            this.homeCountry = null;
            this.destinationCountry = null;
            this.container.selectAll("path")
            .classed("selected-country", false)
            .classed("home-country", false)
            .classed("destination-country", false)
            .attr("stroke", null)
            .attr("stroke-width", null);
            
        // Hide UNESCO World Heritage sites
        this.container.selectAll(".uwh-site").remove();
        // Hide country charts page
        d3.select(".country-charts-page").style("display", "none");

        // Reset selection mode to home
        this.selectionMode = "home";
        const button = d3.select("#toggle-selection");
        button.classed("home-mode", true).classed("destination-mode", false);
        button.select("span").text("Home Country");
            
        // display instructions header and trip details back
        d3.select(".instructions-header").style("display", "block");
        d3.select(".trip-details").html(`
            <h3>Trip Details</h3>
            <p>Select a home country and a destination country to see trip details.</p>
        `);

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
        // Reset the projection to initial scale and translate
        this.projection
            .scale(this.initialScale)
            .translate(this.initialTranslate);
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
            // If no home country is set, switch back to home selection mode
            if (!this.homeCountry) {
                this.toggleSelectionMode();
            }
            // Can't select same country as both home and destination
            if (this.homeCountry && this.homeCountry.id === countryCode) {
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

            // Display UNESCO World Heritage sites for the selected destination
            this.displayUWHSites(countryCode);

            // Update country charts with the selected destination
            updateCountryCharts(countryCode, countryName, this.datasets);
        }
        
        // Display details if both countries are selected
        if (this.homeCountry && this.destinationCountry) {
            this.displayTripDetails();
        }
    }
    
    // Add a method to calculate and display trip details
    displayTripDetails() {
        // Hide instructions header
        d3.select(".instructions-header").style("display", "none");

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
        
        detailHTML += `
        <div class="destination-details">
            <div class"destination-details-header">
                <h3>Destination Information: ${destName}</h3>
                <button id="country-charts-button">Show additional details</button>
            </div>
            <div class="details-grid">
        `;
        
        // Add temperature data if available
        if (this.datasets.temperature[destCode]) {
            const temp = this.datasets.temperature[destCode][this.currentMonth];
            const month = new Date(0, this.currentMonth - 1).toLocaleString('en-US', { month: 'long' });
            detailHTML += `
                <div class="detail-item">
                    <div class="detail-label">🌡️ Temperature in ${month}</div>
                    <div class="detail-value">${temp !== undefined ? temp.toFixed(1) + "°C" : "Data not available"}</div>
                </div>
            `;
        }
        
        // Add popularity/tourism data if available
        if (this.datasets.popularity[destCode]) {
            const popularity = this.datasets.popularity[destCode];
            detailHTML += `
                <div class="detail-item">
                    <div class="detail-label">👥 Annual Tourists</div>
                    <div class="detail-value">${popularity !== undefined ? Number(popularity).toLocaleString() : "N/A"}</div>
                </div>
            `;
        }
        
        // Add budget data if available
        if (this.datasets.budget[destCode]) {
            const budget = this.datasets.budget[destCode];
            detailHTML += `
                <div class="detail-item">
                    <div class="detail-label">💰 Average Trip Cost</div>
                    <div class="detail-value">${budget !== undefined ? "$" + budget.toFixed(0) : "N/A"}</div>
                </div>
            `;
        }
        
        // Add hotel data if available
        if (this.datasets.hotels && this.datasets.hotels[destCode]) {
            detailHTML += `
                <div class="detail-item">
                    <div class="detail-label">🏨 Annual Hotel Guests</div>
                    <div class="detail-value">${Number(this.datasets.hotels[destCode]).toLocaleString()}</div>
                </div>
            `;
        }
        
        // Add UNESCO natural sites if available
        if (this.datasets.natural_sites && this.datasets.natural_sites[destCode] !== undefined) {
            detailHTML += `
                <div class="detail-item">
                    <div class="detail-label">🏞️ UNESCO Natural Sites</div>
                    <div class="detail-value">${this.datasets.natural_sites[destCode]}</div>
                </div>
            `;
        }
        
        // Add UNESCO cultural sites if available
        if (this.datasets.cultural_sites && this.datasets.cultural_sites[destCode] !== undefined) {
            detailHTML += `
                <div class="detail-item">
                    <div class="detail-label">🏛️ UNESCO Cultural Sites</div>
                    <div class="detail-value">${this.datasets.cultural_sites[destCode]}</div>
                </div>
            `;
        }
        
        // Close the details grid and destination details div
        detailHTML += `
            </div>
        </div>
    `;
    
        // Update the details div
        d3.select(".trip-details").html(detailHTML);
        // Add event listener to expand/collapse details
        d3.select("#country-charts-button").on("click", () => {
            const chartsPage = d3.select(".country-charts-page");
            // Update country charts page
            updateCountryCharts(destCode, destName, this.datasets);
            // Display the charts page
            chartsPage.style("display", "block");
            // Scroll to charts page smoothly
            chartsPage.node().scrollIntoView({ behavior: "smooth" });
        });
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

    displayUWHSites(countryCode) {
        // Remove any existing site circles
        this.container.selectAll(".uwh-site").remove();
        // Get the sites data for the selected country
        const sites = this.datasets["sites_by_country"][countryCode];
        // If there are sites, display them
        if (sites && sites.length > 0) {
            sites.forEach(site => {
                const lon = site["longitude"];
                const lat = site["latitude"];
                const [x, y] = this.projection([lon, lat]);
                const fill = site["category"] === "Natural" ? "green" : "purple";
                const circle = this.container.append("circle")
                    .attr("class", "uwh-site")
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", this.siteRadius)
                    .attr("fill", fill)
                    .attr("stroke", "black")
                    .attr("stroke-width", this.siteStrokeWidth)
                    .on("click", () => {
                        window.open(site["http_url"], "_blank"); // Open site URL in a new tab
                    })
                    .on("mouseover", (event) => {
                        // Increase radius on hover
                        d3.select(event.currentTarget)
                            .attr("r", this.siteRadius * 2)
                            .attr("stroke-width", this.siteStrokeWidth * 2);

                        // Remove any existing image preview
                        d3.select("#site-image-preview").remove();

                        // Get mouse position relative to the SVG
                        const [mouseX, mouseY] = d3.pointer(event, this.svg.node());

                        // Append a div to the body for the image preview
                        d3.select("body")
                            .append("div")
                            .attr("id", "site-image-preview")
                            .style("position", "absolute")
                            .style("left", `${event.clientX + 10}px`)
                            .style("top", `${event.clientY - 80}px`)
                            .style("background", "rgba(255,255,255,0.95)")
                            .style("border", "1px solid #ccc")
                            .style("padding", "4px")
                            .style("border-radius", "4px")
                            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
                            .style("pointer-events", "none")
                            .html(`<img src="${site["image_url"]}" alt="Site image" style="max-width:120px; max-height:80px; display:block;">`);
                    })
                    .on("mousemove", (event) => {
                        // Move the image preview with the mouse
                        d3.select("#site-image-preview")
                            .style("left", `${event.clientX + 10}px`)
                            .style("top", `${event.clientY - 80}px`);
                    })
                    .on("mouseout", (event) => {
                        d3.select(event.currentTarget)
                            .attr("r", this.siteRadius)
                            .attr("stroke-width", this.siteStrokeWidth); // Reset radius on mouse out

                        // Remove the image preview
                        d3.select("#site-image-preview").remove();
                    });

                circle.append("title").text(site["site"]);
            });
        }
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

        // Add transparent background rect to catch ocean clicks
        this.container.insert("rect", ":first-child")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("fill", "transparent")
            .style("pointer-events", "all")
            .on("click", (event) => {
                // Only reset if the click is not on a country path
                if (event.target.tagName !== "path") {
                    this.resetCountrySelection();
                }
            });
    
        // Show or hide the slider based on the selected dataset
        this.slider.style("display", selectedDataset === "temperature" ? "block" : "none");

        // Add or update the legend
        this.createLegend(selectedDataset);
    }
}
