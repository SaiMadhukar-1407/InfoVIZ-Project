import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useLocation, useNavigate } from "react-router-dom";

const StackedBarChartPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const file = location.state?.filePath;
  const fileName = location.state?.fileName;
  const svgRefs = [useRef(null), useRef(null), useRef(null)]; // Refs for Months, Weeks, Days

  const columns = ["PT08.S1(CO)", "PT08.S2(NMHC)", "PT08.S3(NOx)", "PT08.S4(NO2)", "PT08.S5(O3)"];
  const colorScale = d3.scaleOrdinal()
    .domain(columns)
    .range(d3.schemeCategory10);

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

        // Parse and clean data
        const parseDate = d3.timeParse("%m/%d/%Y");
        data.forEach(d => {
          d.date = parseDate(d.Date);
          columns.forEach(col => {
            d[col] = +d[col]; // Convert to number, keep -200 as is
          });
        });

        // Aggregate by Month, Week, Day of Week
        const byMonth = d3.group(data, d => d3.timeFormat("%Y-%m")(d.date));
        const byWeek = d3.group(data, d => d3.timeFormat("%Y-%W")(d.date));
        const byDayOfWeek = d3.group(data, d => d3.timeFormat("%A")(d.date)); // Day of week

        const aggData = [
          aggregateData(byMonth, "Month"),
          aggregateData(byWeek, "Week"),
          aggregateData(byDayOfWeek, "Day of Week")
        ];

        // Chart dimensions
        const width = 928;
        const height = 400;
        const marginTop = 20;
        const marginRight = 200; // Increased to accommodate legend
        const marginBottom = 60;
        const marginLeft = 60;

        // Days of the week in order
        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        aggData.forEach((dataAgg, index) => {
          const svg = d3.select(svgRefs[index].current)
            .attr("viewBox", [0, 0, width, height])
            .attr("width", width)
            .attr("height", height)
            .attr("style", "max-width: 100%; height: auto;");

          svg.selectAll("*").remove();

          // Use dayOrder for Day of Week chart (index 2), otherwise use data keys
          const xDomain = index === 2 ? dayOrder : dataAgg.map(d => d.key);
          const x = d3.scaleBand()
            .domain(xDomain)
            .range([marginLeft, width - marginRight])
            .padding(0.1);

          const stack = d3.stack()
            .keys(columns)
            .value((d, key) => d[key] || 0)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

          const stackedData = stack(dataAgg);

          const yMin = d3.min(stackedData, layer => d3.min(layer, d => d[0])); // Account for negatives
          const yMax = d3.max(stackedData, layer => d3.max(layer, d => d[1]));
          const y = d3.scaleLinear()
            .domain([Math.min(0, yMin), yMax]).nice() // Include negatives if present
            .range([height - marginBottom, marginTop]);

          // Add bars
          svg.selectAll(".bar")
            .data(stackedData)
            .enter()
            .append("g")
            .attr("fill", d => colorScale(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter()
            .append("rect")
            .attr("x", d => x(d.data.key))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth());

          // X-axis
          svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.8em")
            .attr("dy", "0.15em");

          // Y-axis
          svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.select(".domain").remove());

          // Legend (moved to right side, outside bars)
          const legend = svg.append("g")
            .attr("transform", `translate(${width - marginRight + 20},${marginTop})`); // Adjusted position

          legend.selectAll("rect")
            .data(columns)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => colorScale(d));

          legend.selectAll("text")
            .data(columns)
            .enter()
            .append("text")
            .attr("x", 20)
            .attr("y", (d, i) => i * 20 + 12)
            .attr("font-size", "12px")
            .text(d => d);
        });

      } catch (error) {
        alert("Error processing CSV file.");
        console.error("CSV Parsing Error:", error);
        navigate("/");
      }
    };
    reader.readAsText(file);
  }, [file, navigate]);

  // Aggregate data for Months and Weeks
  function aggregateData(groupedData, type) {
    return Array.from(groupedData, ([key, values]) => {
      const agg = { key };
      columns.forEach(col => {
        agg[col] = d3.sum(values, d => d[col]); // Adds positives, subtracts negatives
      });
      return agg;
    });
  }

  // Aggregate data for Days of Week (ensuring order)
  function aggregateData(groupedData, type) {
    if (type === "Day of Week") {
      const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const aggMap = new Map();

      // Initialize aggregation for each day
      dayOrder.forEach(day => {
        aggMap.set(day, { key: day });
        columns.forEach(col => {
          aggMap.get(day)[col] = 0;
        });
      });

      // Sum data for each day of the week
      groupedData.forEach((values, day) => {
        const agg = aggMap.get(day);
        columns.forEach(col => {
          agg[col] += d3.sum(values, d => d[col]); // Adds positives, subtracts negatives
        });
      });

      return dayOrder.map(day => aggMap.get(day));
    } else {
      return Array.from(groupedData, ([key, values]) => {
        const agg = { key };
        columns.forEach(col => {
          agg[col] = d3.sum(values, d => d[col]); // Adds positives, subtracts negatives
        });
        return agg;
      });
    }
  }

  const handleHomeClick = () => {
    navigate("/"); // Navigate to the root path (App.jsx home page)
  };

  return (
    <div className="p-5 bg-gray-100 min-h-screen relative">
     <button
    onClick={handleHomeClick}
    className="absolute top-5 right-15 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg shadow-lg hover:from-blue-500 hover:via-purple-600 hover:to-pink-600 hover:shadow-xl transition-all duration-300 border border-white/20"
    >
    Home
    </button>
      <h1 className="text-2xl font-bold text-blue-700 mb-4 text-center">
        {fileName ? `Stacked Bar Charts for ${fileName}` : "Stacked Bar Charts"}
      </h1>
      <div>
        <h2 className="text-xl font-semibold mb-2">By Months</h2>
        <svg ref={svgRefs[0]}></svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2 mt-6">By Weeks</h2>
        <svg ref={svgRefs[1]}></svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2 mt-6">By Days of Week</h2>
        <svg ref={svgRefs[2]}></svg>
      </div>
    </div>
  );
};

export default StackedBarChartPage;