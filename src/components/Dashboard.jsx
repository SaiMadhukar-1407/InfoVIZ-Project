import { FaTemperatureHigh, FaTint, FaUpload } from "react-icons/fa";
import DateSelector from "./DateSelector";
import "./Dashboard.css";
import React, { useState, useEffect } from "react";
import * as d3 from "d3";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import BarChartPage from "./BarChartPage";
import ZoomableChartPage from "./ZoomableChartPage"; // Import new component

const Dashboard = ({filePath, selectedData, selectedDate, onDateChange, availableDates, onFileUpload }) => {
  const navigate = useNavigate();

  const handleSelectChange = (e) => {
    const value = e.target.value;
    if (!filePath) {
      alert("No CSV file selected. Please upload a CSV file first.");
      e.target.value="";
      return;
    }
    if (value === "barchart") {
      navigate("/barchart", { state: { filePath } });
    } else if (value === "zoomable") {
      navigate("/zoomable", { state: { filePath } });
    }
  };

  return (
    <div className="dashboard">
      {/* Upload Button */}
      <div className="upload-section">
        <label className="upload-label">
          <FaUpload /> Upload Dataset
          <input type="file" accept=".csv" onChange={onFileUpload} hidden />
        </label>
      </div>

      <div className="date-selector">
        <select
          className="p-3 w-64 border border-gray-300 rounded-lg shadow-lg bg-white text-gray-800 font-semibold hover:bg-gray-200 transition duration-300"
          onChange={handleSelectChange}
        >
          <option value="">Select Chart</option>
          <option value="barchart">Bar Chart</option>
          <option value="zoomable">Zoomable Area Chart</option> {/* Added new option */}
        </select>
      </div>

      {/* Calendar Date Selector */}
      <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} availableDates={availableDates} />

      <h2>AirViz Dashboard</h2>
      <div className="metrics">
        {["CO(GT)", "C6H6(GT)", "NMHC(GT)", "NO2(GT)", "PT08.S5(O3)", "NOx(GT)"].map((pollutant, index) => (
          <div key={pollutant} className="metric">
            <strong>{pollutant.replace("(GT)", "")}</strong>
            <p>{selectedData ? selectedData[pollutant] : ""} {pollutant.includes("O3") ? "µg/m³" : "mg/m³"}</p>
          </div>
        ))}
      </div>
      <div className="extra-info">
        <p className="temp-icon">
          <FaTemperatureHigh /> {selectedData ? selectedData["T"] : ""}°C
        </p>
        <p className="humidity-icon">
          <FaTint /> {selectedData ? selectedData["RH"] : ""}%
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
