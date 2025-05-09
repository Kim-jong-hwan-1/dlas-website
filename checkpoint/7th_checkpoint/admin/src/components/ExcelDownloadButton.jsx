
import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ExcelDownloadButton = ({ data, filename = "data.xlsx" }) => {
  const handleDownload = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(blob, filename);
  };

  return (
    <button
      onClick={handleDownload}
      style={{
        padding: "8px 16px",
        backgroundColor: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        margin: "10px 0",
      }}
    >
      엑셀 다운로드
    </button>
  );
};

export default ExcelDownloadButton;
