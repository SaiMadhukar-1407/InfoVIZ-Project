import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useLocation, useNavigate } from "react-router-dom";

const ZoomableChartPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const file = location.state?.filePath;
  const containerRef = useRef(null);

  // Define all columns to chart (excluding Date and Time)
  const columns = [
    "CO(GT)", "PT08.S1(CO)", "NMHC(GT)", "C6H6(GT)", "PT08.S2(NMHC)",
    "NOx(GT)", "PT08.S3(NOx)", "NO2(GT)", "PT08.S4(NO2)", "PT08.S5(O3)",
    "T", "RH", "AH"
  ];

  // Color scale for different charts
  const colorScale = d3.scaleOrdinal()
    .domain(columns)
    .range(d3.schemeCategory10); // 10 distinct colors, expandable if needed

  useEffect(() => {
    if (!file) {
      alert("No CSV file selected. Please upload a CSV file first.");
      navigate("/");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = d3.csvParse(text);

        if (data.length === 0) {
          alert("Error: The uploaded file is empty or invalid.");
          navigate("/");
          return;
        }

        // Parse data for each column
        const parsedData = data.map((d, index) => {
          const date = d3.timeParse("%m/%d/%Y")(d.Date);
          if (!date) {
            console.warn(`⚠️ Row ${index}: Invalid date: ${d.Date}`);
            return null;
          }

          const rowData = { date };
          columns.forEach(key => {
            const value = d[key]?.trim();
            if (!value || value === "") {
              console.log(`ℹ️ Row ${index}: Junk value (empty) for ${key}`);
              rowData[key] = 0;
            } else if (/^-?\d+(\.\d+)?$/.test(value)) {
              const numValue = parseFloat(value);
              rowData[key] = (numValue >= -500 && numValue <= 50000) ? numValue : 0;
              if (numValue < -500 || numValue > 50000) {
                console.warn(`⚠️ Row ${index}: Skipping out-of-range value for ${key}: ${numValue}`);
              }
            } else {
              console.warn(`⚠️ Row ${index}: Skipping non-numeric value for ${key}: ${value}`);
              rowData[key] = 0;
            }
          });

          return rowData;
        }).filter(d => d !== null);

        if (parsedData.length === 0) {
          console.error("No valid data to display.");
          return;
        }

        // Chart dimensions
        const width = 928;
        const height = 300; // Reduced height for multiple charts
        const marginTop = 40; // Increased for title
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Clear previous content
        const container = d3.select(containerRef.current);
        container.selectAll("*").remove();

        // Create a chart for each column
        columns.forEach((column, index) => {
          // Create SVG container
          const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "max-width: 100%; height: auto; margin-bottom: 20px;");

          // Add title
          svg.append("text")
            .attr("x", width / 2)
            .attr("y", marginTop / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(column);

          // Create x scale
          const x = d3.scaleUtc()
            .domain(d3.extent(parsedData, d => d.date))
            .range([marginLeft, width - marginRight]);

          // Create y scale
          const yMin = d3.min(parsedData, d => d[column]);
          const yMax = d3.max(parsedData, d => d[column]);
          const y = d3.scaleLinear()
            .domain([Math.min(0, yMin), yMax]).nice()
            .range([height - marginBottom, marginTop]);

          // Create axis generators
          const xAxis = (g, x) => g
            .call(d3.axisBottom(x)
              .ticks(width / 80)
              .tickSizeOuter(0)
              .tickFormat(d3.timeFormat("%b %d, %Y")));

          const area = (data, x) => d3.area()
            .curve(d3.curveStepAfter)
            .x(d => x(d.date))
            .y0(y(0))
            .y1(d => y(d[column]))
            (data);

          // Create zoom behavior
          const zoom = d3.zoom()
            .scaleExtent([1, 32])
            .extent([[marginLeft, 0], [width - marginRight, height]])
            .translateExtent([[marginLeft, -Infinity], [width - marginRight, Infinity]])
            .on("zoom", zoomed);

          // Add clip path
          const clipId = `clip-${column}-${Math.random().toString(36).substr(2, 9)}`;
          svg.append("clipPath")
            .attr("id", clipId)
            .append("rect")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom);

          // Add area
          const path = svg.append("path")
            .attr("clip-path", `url(#${clipId})`)
            .attr("fill", colorScale(column))
            .attr("d", area(parsedData, x));

          // Add x-axis
          const gx = svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(xAxis, x);

          // Add y-axis
          svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.select(".domain").remove())
            .call(g => g.select(".tick:last-of-type text").clone()
              .attr("x", 3)
              .attr("text-anchor", "start")
              .attr("font-weight", "bold")
              .text(column));

          // Dynamic x-axis tick formatting
          function updateXAxis(xScale) {
            const domainWidth = xScale.domain()[1] - xScale.domain()[0];
            const days = domainWidth / (1000 * 60 * 60 * 24);
            let tickFormat;
            if (days > 365) tickFormat = d3.timeFormat("%Y");
            else if (days > 7) tickFormat = d3.timeFormat("%b %Y");
            else tickFormat = d3.timeFormat("%b %d, %Y");

            gx.call(d3.axisBottom(xScale)
              .ticks(width / 80)
              .tickFormat(tickFormat));
          }

          // Zoom handler
          function zoomed(event) {
            const xz = event.transform.rescaleX(x);
            path.attr("d", area(parsedData, xz));
            updateXAxis(xz);
          }

          // Apply zoom
          svg.call(zoom)
            .transition()
            .duration(750)
            .call(zoom.scaleTo, 4, [x(new Date("2004-03-10")), 0]);
        });

      } catch (error) {
        alert("Error processing CSV file.");
        console.error("CSV Parsing Error:", error);
        navigate("/");
      }
    };
    reader.readAsText(file);
  }, [file, navigate]);

  const handleHomeClick = () => {
    navigate("/"); // Navigate to the root path (App.jsx home page)
  };

  return (
    <div className="p-5 bg-gray-100 min-h-screen">
          <button
    onClick={handleHomeClick}
    className="absolute top-5 right-15 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg shadow-lg hover:from-blue-500 hover:via-purple-600 hover:to-pink-600 hover:shadow-xl transition-all duration-300 border border-white/20"
    >
    Home
    </button>
      <h1 className="text-2xl font-bold text-blue-700 mb-4 text-center">
        {file?.name ? `Zoomable Area Charts for ${file.name}` : "Zoomable Area Charts"}
      </h1>
      <div ref={containerRef}></div>
    </div>
  );
};

export default ZoomableChartPage;