import React, { useState, useEffect, useRef } from "react";
import { csv } from "d3-fetch";
import * as d3 from "d3";

const PollutantComparison = () => {
  const [data, setData] = useState([]);
  const [pollutants] = useState(["CO(GT)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "NMHC(GT)", "PT08.S5(O3)"]);
  const [selected, setSelected] = useState(["C6H6(GT)", "CO(GT)"]);
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    csv("/AirQualityUCI_new.csv").then((rawData) => {
      // Step 1: Replace negative values with mean
      const pollutantMeans = {};
      pollutants.forEach((p) => {
        const validValues = rawData.map((d) => parseFloat(d[p])).filter(v => v >= 0);
        pollutantMeans[p] = validValues.length ? d3.mean(validValues) : 0;
      });

      // Step 2: Compute daily averages
      const dailyAvgData = {};
      rawData.forEach((entry) => {
        const date = entry.Date;
        if (!dailyAvgData[date]) {
          dailyAvgData[date] = { Date: new Date(date), count: 0 };
          pollutants.forEach((p) => (dailyAvgData[date][p] = 0));
        }
        pollutants.forEach((p) => {
          let value = parseFloat(entry[p]) || 0;
          dailyAvgData[date][p] += value >= 0 ? value : pollutantMeans[p];
        });
        dailyAvgData[date].count += 1;
      });

      const parsed = Object.values(dailyAvgData).map((d) => {
        const avg = { Date: d.Date };
        pollutants.forEach((p) => {
          avg[p] = d[p] / d.count;
        });
        return avg;
      });

      setData(parsed);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartData = data.map((d) => ({
      date: d.Date,
      pollutant1: d[selected[0]],
      pollutant2: d[selected[1]]
    }));

    const xScale = d3.scaleTime()
      .domain(d3.extent(chartData, d => d.date))
      .range([0, width]);

    const yMax = d3.max(chartData, d => Math.max(d.pollutant1, d.pollutant2));
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    const svgContainer = svg
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Axis
    svgContainer.append("g")
      .attr("transform", `translate(0, ${height})`)
      .attr("class", "axis")
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Date");

    // Y Axis
    svgContainer.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Pollutant Level");

    const line1 = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.pollutant1))
      .curve(d3.curveMonotoneX);

    const line2 = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.pollutant2))
      .curve(d3.curveMonotoneX);

    const drawAnimatedPath = (path, color) => {
      svgContainer.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", path)
        .attr("stroke-dasharray", function () {
          const length = this.getTotalLength();
          return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", function () {
          return this.getTotalLength();
        })
        .transition()
        .duration(2000)
        .attr("stroke-dashoffset", 0);
    };

    drawAnimatedPath(line1, "red");
    drawAnimatedPath(line2, "blue");

    // Tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#fff")
      .style("padding", "6px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("font-size", "13px")
      .style("z-index", "1000")               // Ensures it's on top
      .style("pointer-events", "none")        // Prevents blocking
      .style("white-space", "nowrap");

    // Hover dots
    svgContainer.selectAll(".dot1")
      .data(chartData)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.pollutant1))
      .attr("r", 3)
      .attr("fill", "red")
      .on("mouseover", (e, d) => {
        tooltip.style("visibility", "visible")
          .text(`${selected[0]}: ${d.pollutant1.toFixed(2)} on ${d.date.toLocaleDateString()}`);
      })
      .on("mousemove", (e) => {
        tooltip.style("top", e.pageY - 20 + "px").style("left", e.pageX + 10 + "px");
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    svgContainer.selectAll(".dot2")
      .data(chartData)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.pollutant2))
      .attr("r", 3)
      .attr("fill", "blue")
      .on("mouseover", (e, d) => {
        tooltip.style("visibility", "visible")
          .text(`${selected[1]}: ${d.pollutant2.toFixed(2)} on ${d.date.toLocaleDateString()}`);
      })
      .on("mousemove", (e) => {
        tooltip.style("top", e.pageY - 20 + "px").style("left", e.pageX + 10 + "px");
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

  }, [data, selected]);

  const handleSelect = (index, value) => {
    const newSelected = [...selected];
    newSelected[index] = value;
    setSelected(newSelected);
  };

  return (
    <div style={{ margin: "30px" }}>
      <h3>Compare Pollutants</h3>
      <div style={{ display: "flex", gap: "20px", marginBottom: "10px", flexWrap: "wrap" }}>
      <label>Select Pollutant (red): </label>
        <select onChange={(e) => handleSelect(0, e.target.value)} value={selected[0]}>
          {pollutants.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label>Select Pollutant (blue): </label>
        <select onChange={(e) => handleSelect(1, e.target.value)} value={selected[1]}>
          {pollutants.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "350px" }}></svg>
        <div ref={tooltipRef}></div>
      </div>
    </div>
  );
};

export default PollutantComparison;
