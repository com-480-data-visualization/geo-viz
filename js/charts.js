export default function updateCountryCharts(destCode, destName, datasets) {
    const chartsPage = d3.select(".country-charts-page");
    chartsPage.select(".country-charts-header h1").text(`${destName}`);
    displayTemperatureChart(destCode, chartsPage, datasets);
    displayUWHList(destCode, chartsPage, datasets);
}

function displayUWHList(destCode, chartsPage, datasets) {
  const uwhList = datasets["sites_by_country"][destCode];
  // Check if the country has UWH
  if (uwhList === undefined || uwhList.length === 0) {
    chartsPage.select("#uwh-list").text("No UNESCO World Heritage Site available for this country.");
    return;
  }
  
  // Remove existing UWH list and clear text
  chartsPage.select("#uwh-list").selectAll("*").remove();
  chartsPage.select("#uwh-list").text(""); 

  // Create a list of UWH
  const sites = [];
  uwhList.forEach(uwh => {
    sites.push({
      "name": uwh["site"],
      "url": uwh["http_url"]
    });
  });
  d3.select("#uwh-list")
    .selectAll(".entry")
    .data(sites)
    .enter()
    .append("div")
    .attr("class", "entry")
    .text(d => d.name)
    .on("click", (event, d) => {
      window.open(d.url, "_blank"); // open in new tab
    });
}

function displayTemperatureChart (destCode, chartsPage, datasets) {
  const temperatures = datasets["temperature"][destCode];
  // Check if the country has temperature data
  if (temperatures === undefined || Object.keys(temperatures).length === 0) {
    chartsPage.select("#temperature-chart").text("No temperature data available for this country.");
    return;
  }
  const data = Object.entries(temperatures).map(([key, value]) => ({
    key: new Date(0, parseInt(key, 10) - 1).toLocaleString('en-US', { month: 'long' }),
    value
    }));
    
    const margin = {top: 20, right: 30, bottom: 40, left: 40},
    width = 500 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;
    
    // Remove existing charts and clear text
    chartsPage.select("#temperature-chart").selectAll("*").remove();
    chartsPage.select("#temperature-chart").text("");
    // Append SVG to the target container
    const svg = d3.select("#temperature-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleBand()
    .domain(data.map(d => d.key))
    .range([0, width])
    .padding(0.2);
    
    const y = d3.scaleLinear()
    .domain([
      Math.min(0, d3.min(data, d => d.value)), 
      Math.max(0, d3.max(data, d => d.value))
                ])
                .nice()
                .range([height, 0]);
                
                svg.append("g")
                .selectAll("rect")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.key))
                .attr("y", d => Math.min(y(d.value), y(0)))
                .attr("width", x.bandwidth())
                .attr("height", d => Math.abs(y(d.value) - y(0)))
                
                svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-40)")
                .style("text-anchor", "end")
                .attr("dx", "-0.8em")
                .attr("dy", "0.15em");
                
                svg.append("g")
                .call(d3.axisLeft(y));
}
