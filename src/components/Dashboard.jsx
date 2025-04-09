import React from "react";
import { FaTemperatureHigh, FaTint, FaUpload } from "react-icons/fa";
import DateSelector from "./DateSelector";
import "./Dashboard.css";

const Dashboard = ({ selectedData, selectedDate, onDateChange, availableDates, onFileUpload }) => {

  return (
    <div className="dashboard">
      {/* Upload Button */}
      <div className="upload-section">
        <label className="upload-label">
          <FaUpload /> Upload Dataset
          <input type="file" accept=".csv" onChange={onFileUpload} hidden />
        </label>
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
