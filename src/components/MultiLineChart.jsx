import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./charts.css";

const MultiLineChart = ({ data }) => {
  const chartRef = useRef();
  const [brushedData, setBrushedData] = useState([]);
  const [selectedRange, setSelectedRange] = useState([null, null]);

  useEffect(() => {
    if (!data.length) return;

    const pollutants = ["CO(GT)", "C6H6(GT)", "NMHC(GT)", "NOx(GT)", "NO2(GT)", "PT08.S5(O3)"];
    const colors = d3.scaleOrdinal(d3.schemeCategory10).domain(pollutants);

    // Preprocess
    const pollutantMeans = {};
    pollutants.forEach((p) => {
      const valid = data.map(d => +d[p]).filter(v => v >= 0);
      pollutantMeans[p] = d3.mean(valid);
    });

    const dailyAvgData = {};
    data.forEach(entry => {
      const date = entry.Date;
      if (!dailyAvgData[date]) {
        dailyAvgData[date] = { Date: new Date(date), count: 0 };
        pollutants.forEach(p => dailyAvgData[date][p] = 0);
      }
      pollutants.forEach(p => {
        let val = +entry[p];
        dailyAvgData[date][p] += val >= 0 ? val : pollutantMeans[p];
      });
      dailyAvgData[date].count++;
    });

    const parsedData = Object.values(dailyAvgData).map(d => {
      const avg = { Date: d.Date };
      pollutants.forEach(p => avg[p] = d[p] / d.count);
      return avg;
    });

    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(parsedData, d => d.Date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(parsedData, d => d3.max(pollutants, p => d[p]))])
      .nice()
      .range([height, 0]);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(12).tickFormat(d3.timeFormat("%b")))
      .attr("class", "axis");

    g.append("g")
      .call(d3.axisLeft(y))
      .attr("class", "axis");

    // Lines
    const line = d3.line()
      .x(d => x(d.Date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    pollutants.forEach((pollutant) => {
      const lineData = parsedData.map(d => ({ Date: d.Date, value: d[pollutant] }));
      g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", colors(pollutant))
        .attr("stroke-width", 1.5)
        .attr("d", line);
    });

    // Brush (Rectangular)
    const brush = d3.brush()
      .extent([[0, 0], [width, height]])
      .on("end", (event) => {
        if (!event.selection) {
          setBrushedData([]);
          setSelectedRange([null, null]);
          return;
        }

        const [[x0, y0], [x1, y1]] = event.selection;
        const xStart = x.invert(x0), xEnd = x.invert(x1);
        const yStart = y.invert(y1), yEnd = y.invert(y0); // y-axis inverted

        const activePollutants = new Set();
        const filtered = parsedData.filter(d => {
          const withinX = d.Date >= xStart && d.Date <= xEnd;
          if (!withinX) return false;
          let active = false;
          for (const p of pollutants) {
            if (d[p] >= yStart && d[p] <= yEnd) {
              activePollutants.add(p);
              active = true;
            }
          }
          return active;
        });

        setBrushedData({ rows: filtered, columns: [...activePollutants] });
        setSelectedRange([xStart, xEnd]);
      });

    g.append("g")
      .call(brush)
      .selectAll(".selection")
      .attr("stroke", "#333")
      .attr("fill", "#999")
      .attr("fill-opacity", 0.3);

  }, [data]);

  return (
    <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", marginTop: "20px" }}>
      {/* Chart */}
      <svg ref={chartRef} style={{ width: "600px", height: "450px" }}></svg>

      {/* Table */}
      <div style={{ maxHeight: "450px", overflowY: "auto", flex: 1 }}>
        <h4>
          Selected Data{" "}
          {selectedRange[0] &&
            `(From ${selectedRange[0].toLocaleDateString()} to ${selectedRange[1].toLocaleDateString()})`}
        </h4>
                {brushedData.rows && (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={cellStyle}>Date</th>
                {brushedData.columns.map((p) => (
                  <th key={p} style={cellStyle}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brushedData.rows.length === 0 ? (
                <tr>
                  <td colSpan={brushedData.columns.length + 1} style={{ ...cellStyle, textAlign: "center", fontStyle: "italic" }}>
                    No data selected. Brush to view values.
                  </td>
                </tr>
              ) : (
                brushedData.rows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={cellStyle}>{row.Date.toLocaleDateString()}</td>
                    {brushedData.columns.map((p) => (
                      <td key={p} style={cellStyle}>{row[p].toFixed(2)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const cellStyle = {
  border: "1px solid #ccc",
  padding: "4px",
  textAlign: "center",
  color: "#000",
};

export default MultiLineChart;
