import React, { useState, useEffect } from "react";
import * as d3 from "d3";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import "./components/charts.css";
import BarChartPage from "./components/BarChartPage";
import ZoomableChartPage from "./components/ZoomableChartPage"; // Import new component

const Home = ({ data, filePath, selectedData, selectedDate, setSelectedDate, handleFileUpload }) => {
  const navigate = useNavigate();


  return (
    <div className="relative w-full min-h-screen">
      {/* Render Dashboard only on Home Page */}
      <Dashboard
        filePath={filePath}
        selectedData={selectedData}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        availableDates={[...new Set(data.map((entry) => entry.Date))]}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
};

const App = () => {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState(null);

  // Handle File Upload
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
        <Route path="/zoomable" element={<ZoomableChartPage />} /> {/* Added new route */}
      </Routes>
    </Router>
  );
};

export default App;