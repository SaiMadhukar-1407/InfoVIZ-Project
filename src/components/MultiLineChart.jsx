import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import "./charts.css";

const MultiLineChart = ({ data }) => {
  const chartRef = useRef();

  useEffect(() => {
    if (!data.length) return;

    const pollutants = ["CO(GT)", "C6H6(GT)", "NMHC(GT)", "NOx(GT)", "NO2(GT)", "PT08.S5(O3)"];
    const colors = d3.scaleOrdinal(d3.schemeCategory10).domain(pollutants);

    // Compute daily average values and replace negatives with mean
    const pollutantMeans = {};
    pollutants.forEach((p) => {
      const validValues = data.map(d => parseFloat(d[p])).filter(v => v >= 0);
      pollutantMeans[p] = validValues.length ? d3.mean(validValues) : 0; // Compute mean excluding negatives
    });

    const dailyAvgData = {};
    data.forEach((entry) => {
      const date = entry.Date;
      if (!dailyAvgData[date]) {
        dailyAvgData[date] = { Date: new Date(date), count: 0 };
        pollutants.forEach((p) => (dailyAvgData[date][p] = 0));
      }
      pollutants.forEach((p) => {
        let value = parseFloat(entry[p]) || 0;
        dailyAvgData[date][p] += value >= 0 ? value : pollutantMeans[p]; // Replace negative with mean
      });
      dailyAvgData[date].count += 1;
    });

    const parsedData = Object.values(dailyAvgData).map((d) => {
      const avg = { Date: d.Date };
      pollutants.forEach((p) => {
        avg[p] = d[p] / d.count; // Compute average per day
      });
      return avg;
    });

    const margin = { top: 40, right: 50, bottom: 50, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const x = d3.scaleTime().domain(d3.extent(parsedData, (d) => d.Date)).range([0, width]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(parsedData, (d) => d3.max(pollutants, (p) => d[p]))])
      .nice()
      .range([height, 0]);

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // ✅ Add X and Y Axis (Black Color & Stroke Width)
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .attr("class", "axis")
      .selectAll("text")
      .style("fill", "black");

    g.append("g")
      .call(d3.axisLeft(y))
      .attr("class", "axis")
      .selectAll("text")
      .style("fill", "black");

    g.selectAll(".axis path, .axis line")
      .style("stroke", "black")
      .style("stroke-width", "2px");

    // ✅ Draw the Lines for Each Pollutant (Averaged Data)
    const line = d3.line()
      .x((d) => x(d.Date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    pollutants.forEach((pollutant) => {
      const pollutantData = parsedData.map((d) => ({ Date: d.Date, value: d[pollutant] }));

      g.append("path")
        .datum(pollutantData)
        .attr("fill", "none")
        .attr("stroke", colors(pollutant))
        .attr("stroke-width", 2)
        .attr("d", line);
    });

    // ✅ Add Legend
    const legend = g.append("g").attr("transform", `translate(${width - 150}, 0)`);
    pollutants.forEach((p, i) => {
      legend.append("circle").attr("cx", 10).attr("cy", i * 20).attr("r", 6).style("fill", colors(p));
      legend.append("text").attr("x", 20).attr("y", i * 20 + 5).text(p).style("font-size", "12px").attr("alignment-baseline", "middle");
    });

  }, [data]);

  return <svg ref={chartRef} width={900} height={400}></svg>;
};

export default MultiLineChart;
