import React, { useState, useEffect } from "react";
import * as d3 from "d3";
import Dashboard from "./components/Dashboard";
import MultiLineChart from "./components/MultiLineChart";
import PollutantComparison from "./components/PollutantComparison";
import "./components/charts.css";

const App = () => {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [fileName, setFileName] = useState("");

  // Handle File Upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const parsedData = d3.csvParse(csvText);

          // Ensure dataset is not empty
          if (parsedData.length > 0) {
            setData(parsedData);
            setSelectedDate(parsedData[0].Date); // Set default to first date
          } else {
            alert("Error: The uploaded file is empty or invalid.");
          }
        } catch (error) {
          alert("Error processing file. Please check the format.");
          console.error("CSV Parsing Error:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (selectedDate && data.length > 0) {
      const entry = data.find((entry) => entry.Date === selectedDate);
      if (entry) {
        setSelectedData(entry);
      }
    }
  }, [selectedDate, data]);

  return (
    <div className="container">
      {/* Upload Button */}
      {/* <div className="upload-section">
        <label className="upload-label">
          Upload CSV File:
          <input type="file" accept=".csv" onChange={handleFileUpload} hidden />
        </label>
        {fileName && <p className="file-name">Uploaded: {fileName}</p>}
      </div> */}
          <Dashboard
            selectedData={selectedData}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            availableDates={[...new Set(data.map((entry) => entry.Date))]}
            onFileUpload={handleFileUpload}
          />
      {/* Display Dashboard only if data is uploaded */}
      /*{data.length > 0 ? (
        <>
          <h3>Pollutant Trends Over Time</h3>
          <MultiLineChart data={data} />

          <PollutantComparison />
        </>
      ) : (
        <p className="upload-message">Please upload a dataset to visualize graphs.</p>
      )}*/
    </div>
  );
};

export default App;
