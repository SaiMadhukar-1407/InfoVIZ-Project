import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import * as d3 from "d3";
import {  useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const PollutantPage = () => {
  const navigate = useNavigate();  
  const location = useLocation();
  const { pollutant, filePath , color } = location.state || {};
  const monthMap = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };
  
  const [rawData, setRawData] = useState([]);
  const [chartData, setChartData] = useState([]);

  const [selectedPointData, setSelectedPointData] = useState([]);

  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [days, setDays] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    if (!filePath) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = d3.csvParse(text);

      const parsed = data
        .map((row) => {
          const [month, day, year] = row.Date?.split("/") || [];
          const date = `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;
          return {
            ...row,
            _year: year,
            _month: month?.padStart(2, "0"),
            _day: day?.padStart(2, "0"),
            _date: date,
            _hour: row.Time?.split(":")[0],
            value: parseFloat(row[pollutant]) || 0,
          };
        })
        .filter((row) => !isNaN(row.value));

      setRawData(parsed);

      // Populate dropdowns
      const allYears = [...new Set(parsed.map((r) => r._year))].sort();
      setYears(allYears);
      if (allYears.includes("2004")) {
        setSelectedYear("2004");
       }

      const uniqueMonths = [...new Set(parsed.map((r) => r._month))].sort();
      const monthObjects = uniqueMonths.map((m) => ({ key: m, label: monthMap[m] }));
      setMonths(monthObjects);

      setDays([...new Set(parsed.map((r) => r._day))].sort());
    };

    reader.readAsText(filePath);
  }, [filePath, pollutant]);

  // Filter and set chart data based on dropdowns
  useEffect(() => {
    if (!selectedYear) return;

    let filtered = rawData.filter((r) => r._year === selectedYear);

    if (selectedMonth) {
      filtered = filtered.filter((r) => r._month === selectedMonth);
    }

    if (selectedDay) {
      filtered = filtered.filter((r) => r._day === selectedDay);

      // Group by hour if specific day is selected
      const hourMap = new Map();
      for (let r of filtered) {
        const hour = r._hour;
        const existing = hourMap.get(hour) || { hour, total: 0, count: 0 };
        existing.total += r.value;
        existing.count += 1;
        hourMap.set(hour, existing);
      }
      console.log("Hourly Chart Data", hourMap);
      const result = Array.from(hourMap.values()).map((h) => ({
        label: `${h.hour}:00`,
        value: h.total / h.count,
      }));
      console.log("Hourly Chart Data result", result);
      const sortedResult = result.sort((a, b) => parseInt(a.label) - parseInt(b.label));
      result.push({ label: '23.59', value: result[23].value });
      console.log("Sorted chart data:", sortedResult);
      setChartData(sortedResult);

    } else if (selectedMonth) {
      // Group by day
      const grouped = d3.groups(filtered, (d) => d._day);
      const result = grouped.map(([day, values]) => ({
        label: `Day ${day}`,
        value: d3.mean(values, (v) => v.value),
      }));
      setChartData(result);
    } else {
      // Group by month
      const grouped = d3.groups(filtered, (d) => d._month);
      const result = grouped.map(([month, values]) => ({
            label: monthMap[month],
            value: d3.mean(values, (v) => v.value),
        }));
      setChartData(result);
    }
    setSelectedPointData([]); // Reset second chart
  }, [selectedYear, selectedMonth, selectedDay, rawData]);

  const handleChartClick = (e) => {
    if (!e?.activeLabel) return;
    let filterKey = selectedDay ? "_hour" : selectedMonth ? "_day" : "_month";
    let filterValue = selectedDay ? e.activeLabel.split(":")[0] : selectedMonth ? e.activeLabel.split(" ")[1] : Object.keys(monthMap).find(k => monthMap[k] === e.activeLabel);

    const filtered = rawData.filter((r) =>
      r._year === selectedYear &&
      (!selectedMonth || r._month === selectedMonth) &&
      (!selectedDay || r._day === selectedDay) &&
      r[filterKey] === filterValue &&
      !isNaN(r.T) && !isNaN(r.AH)
    );

    const tAhData = filtered.map((r) => ({
      T: r.T,
      AH: r.AH,
    }));
    setSelectedPointData(tAhData);
  };

  const handleHomeClick = () => {
    navigate("/");
  };

   {/* main starting background changes */}
  return (
    <div 
    style={{
        width: "100%",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "Arial",
        background: "linear-gradient(135deg, #afa5a1 0%, #e2d1c3 100%)",
        minHeight: "100vh",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease-in-out"
      }}
    >
    <button
        onClick={handleHomeClick}
        className="absolute top-5 right-15 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg shadow-lg hover:from-blue-500 hover:via-purple-600 hover:to-pink-600 hover:shadow-xl transition-all duration-300 border border-white/20">
        Home
      </button> 
      <h1>Pollutant: {pollutant}</h1>
      <p>File: {filePath?.name}</p>

      <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem", alignItems: "flex-end" }}>
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={{ marginBottom: "0.5rem", fontWeight: "bold", color: "#333" }}>Year:</label>
    <select
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "10px",
        border: "1px solid #ccc",
        background: "linear-gradient(to right, #e0eafc, #cfdef3)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        fontSize: "1rem",
        color: "#333",
        cursor: "pointer",
      }}
    >
      <option value="">--Select--</option>
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  </div>

  <div style={{ display: "flex", flexDirection: "column" }}>
        <label style={{ marginBottom: "0.5rem", fontWeight: "bold", color: "#333" }}>Month:</label>
        <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        disabled={!selectedYear}
        style={{
            padding: "0.5rem 1rem",
            borderRadius: "10px",
            border: "1px solid #ccc",
            background: selectedYear
            ? "linear-gradient(to right, #e0f7fa, #b2ebf2)"
            : "#f5f5f5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            fontSize: "1rem",
            color: selectedYear ? "#333" : "#999",
            cursor: selectedYear ? "pointer" : "not-allowed",
        }}
        >
        <option value="">--Select--</option>
        {months.map((m) => (
            <option key={m.key} value={m.key}>
            {m.label}
            </option>
        ))}
        </select>
    </div>

    <div style={{ display: "flex", flexDirection: "column" }}>
        <label style={{ marginBottom: "0.5rem", fontWeight: "bold", color: "#333" }}>Day:</label>
        <select
        value={selectedDay}
        onChange={(e) => setSelectedDay(e.target.value)}
        disabled={!selectedMonth}
        style={{
            padding: "0.5rem 1rem",
            borderRadius: "10px",
            border: "1px solid #ccc",
            background: selectedMonth
            ? "linear-gradient(to right, #fdfbfb, #ebedee)"
            : "#f5f5f5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            fontSize: "1rem",
            color: selectedMonth ? "#333" : "#999",
            cursor: selectedMonth ? "pointer" : "not-allowed",
        }}
        >
        <option value="">--Select--</option>
        {days.map((d) => (
            <option key={d} value={d}>{d}</option>
        ))}
        </select>
    </div>
    </div>

        {/* first Chart */}
      <div style={{ width: "100%", margin: "0 auto" ,background: "#f8f6f5" }}>
        {chartData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", fontSize: "1.1rem", color: "red" }}>
            {!selectedYear
                ? "Please select a dropdown to view chart data."
                : "No data available for the selected filters. Please try other dropdown combinations."
            }
            </div>
        ) : (
            <ResponsiveContainer width="100%" height={500}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            onClick={handleChartClick} 
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={1} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} />
            </LineChart>
            </ResponsiveContainer>
        )}
        </div>

        {/* Second Chart */}
      {selectedPointData.length > 0 && (
        <div style={{ width: "100%", margin: "0 auto"  ,background: "#f8f6f5" }}>
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Temperature vs Humidity</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={selectedPointData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="T" label={{ value: "Temperature (T)", position: "insideBottom", offset: -5 }} />
              <YAxis label={{ value: "Humidity (AH)", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="AH" stroke={color} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
};

export default PollutantPage;
