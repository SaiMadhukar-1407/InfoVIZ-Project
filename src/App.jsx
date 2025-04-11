import React, { useState, useEffect } from "react";
import * as d3 from "d3";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import MultiLineChart from "./components/MultiLineChart";
import PollutantComparison from "./components/PollutantComparison";
import BarChartPage from "./components/BarChartPage";
import ZoomableChartPage from "./components/ZoomableChartPage";

import "./components/charts.css";

// Home component with dashboard + additional charts
const Home = ({ data, filePath, selectedData, selectedDate, setSelectedDate, handleFileUpload }) => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen">
      <Dashboard
        filePath={filePath}
        selectedData={selectedData}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        availableDates={[...new Set(data.map((entry) => entry.Date))]}
        onFileUpload={handleFileUpload}
      />

      {data.length > 0 ? (
        <>
          <h3 className="text-xl font-semibold mt-6 ml-4">Pollutant Trends Over Time</h3>
          <MultiLineChart data={data} />
          <PollutantComparison />
        </>
      ) : (
        <p className="upload-message ml-4 mt-4 text-gray-700">Please upload a dataset to visualize graphs.</p>
      )}
    </div>
  );
};

const App = () => {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState(null);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      setFilePath(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const parsedData = d3.csvParse(csvText);

          if (parsedData.length > 0) {
            setData(parsedData);
            setSelectedDate(parsedData[0].Date);
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

  // Update selected data when date changes
  useEffect(() => {
    if (selectedDate && data.length > 0) {
      const entry = data.find((entry) => entry.Date === selectedDate);
      if (entry) {
        setSelectedData(entry);
      }
    }
  }, [selectedDate, data]);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              data={data}
              filePath={filePath}
              selectedData={selectedData}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              handleFileUpload={handleFileUpload}
            />
          }
        />
        <Route path="/barchart" element={<BarChartPage />} />
        <Route path="/zoomable" element={<ZoomableChartPage />} />
      </Routes>
    </Router>
  );
};

export default App;
