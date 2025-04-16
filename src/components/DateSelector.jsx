import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, format } from "date-fns";

const DateSelector = ({ selectedDate, onDateChange, availableDates }) => {
  // Convert dataset dates to JavaScript Date objects
  const parsedDates = availableDates.map((date) =>
    parse(date, "M/d/yyyy", new Date())
  );

  return (
    <div className="date-selector">
      <label>Select Date: </label>
      <DatePicker
        selected={selectedDate ? parse(selectedDate, "M/d/yyyy", new Date()) : null}
        onChange={(date) => onDateChange(format(date, "M/d/yyyy"))}
        includeDates={parsedDates} // Only allow dataset dates
        dateFormat="M/d/yyyy"
        placeholderText="Select a date"
      />
    </div>
  );
};

export default DateSelector;
