import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "handsontable/dist/handsontable.full.min.css";

registerAllModules();

const MODULE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function App() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [changes, setChanges] = useState([]);
  const [addedRows, setAddedRows] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const hotTableRef = useRef(null);

  const fetchData = async () => {
    const res = await axios.get("https://license-server-697p.onrender.com/admin/users");
    const rows = res.data.map(row => {
      const mods = row.module_licenses || {};
      MODULE_IDS.forEach(id => {
        row[id] = mods[id] || "";
      });
      return row;
    });

    const baseCols = [
      { data: 'email', title: 'email' },
      { data: 'name', title: 'name' },
      { data: 'country', title: 'country' },
      { data: 'workplace_name', title: 'workplace_name' },
      { data: 'workplace_address', title: 'workplace_address' },
      { data: 'marketing_agree', title: 'marketing' },
      { data: 'password', title: 'password' },
      { data: 'is_verified', title: 'is_verified' },
      { data: 'license_key', title: 'license_key' },
      { data: 'created_at', title: 'created_at' },
      { data: 'expiration_date', title: 'expiration_date' },
    ];

    const moduleCols = MODULE_IDS.map(id => ({
      data: id,
      title: String(id),
      type: "date",
      dateFormat: "YYYY-MM-DD",
      correctFormat: true,
      renderer: (instance, td, row, col, prop, value) => {
        td.textContent = value === "9999-12-31" ? "🟢 무제한" : value || "";
      },
    }));

    setData(rows);
    setColumns([...baseCols, ...moduleCols]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (changesArr, source) => {
    if (source === "loadData" || !changesArr) return;
    const newChanges = [...changes];
    changesArr.forEach(([row, prop, oldValue, newValue]) => {
      if (oldValue !== newValue) {
        newChanges.push({ row, prop, oldValue, newValue });
      }
    });
    setChanges(newChanges);
  };

  const handleSave = async () => {
    const updates = [...changes];
    const newAdds = [...addedRows];

    for (const row of newAdds) {
      if (!row.email || row.email.trim() === "" || !row.password || row.password.trim() === "") {
        alert("❗ 추가된 줄 중 이메일 또는 비밀번호가 비어 있습니다.");
        return;
      }
    }

    for (const change of updates) {
      const rowData = data[change.row];
      const email = rowData.email;
      const field = MODULE_IDS.includes(Number(change.prop))
        ? `module_licenses.${change.prop}`
        : change.prop;
      const value = change.newValue !== null ? change.newValue : "";
      try {
        await axios.patch("https://license-server-697p.onrender.com/admin/update_user", {
          email,
          field,
          value,
        });
        console.log(`✅ ${email} - ${field} updated`);
      } catch (err) {
        console.error(`❌ Failed to update ${field} for ${email}`, err);
      }
    }

    for (const row of newAdds) {
      const payload = {
        email: row.email,
        password: row.password,
        is_active: true,
        is_verified: true,
        modules: [],
        module_licenses: {},
      };
      MODULE_IDS.forEach(id => {
        if (row[id]) {
          payload.module_licenses[id] = row[id];
        }
      });

      try {
        await axios.post("https://license-server-697p.onrender.com/admin/add_user", payload);
        console.log(`✅ ${row.email} 추가 완료`);
      } catch (err) {
        console.error(`❌ 추가 실패: ${row.email}`, err);
      }
    }

    setChanges([]);
    setAddedRows([]);
    alert("저장이 완료되었습니다!");
    await fetchData();
  };

  const handleDelete = async () => {
    if (!selectedEmail) {
      alert("삭제할 유저를 선택하세요.");
      return;
    }

    if (!window.confirm(`정말로 ${selectedEmail} 사용자를 삭제하시겠습니까?`)) return;

    try {
      await axios.delete(`https://license-server-697p.onrender.com/admin/delete_user/${selectedEmail}`);
      alert("삭제되었습니다.");
      await fetchData();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  const handleExport = () => {
    const exportData = data.map(row => {
      const cleanRow = { ...row };
      MODULE_IDS.forEach(id => {
        cleanRow[`Module ${id}`] = cleanRow[id];
        delete cleanRow[id];
      });
      return cleanRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UserData");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `DLAS_User_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleAddRow = () => {
    const newRow = {
      email: "",
      password: "",
      is_verified: true,
      license_key: "",
      created_at: new Date().toISOString().slice(0, 10),
      expiration_date: new Date().toISOString().slice(0, 10),
    };
    MODULE_IDS.forEach(id => newRow[id] = "9999-12-31");
    setData(prev => [...prev, newRow]);
    setAddedRows(prev => [...prev, newRow]);
  };

  const handleRowSelect = (rowIndex) => {
    const rowData = data[rowIndex];
    setSelectedEmail(rowData.email);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>DLAS Admin Panel (추가/수정/삭제/엑셀)</h1>
      <button onClick={handleSave} disabled={changes.length === 0 && addedRows.length === 0}>
        💾 저장 ({changes.length + addedRows.length}건)
      </button>{" "}
      <button onClick={handleExport}>📥 Excel 다운로드</button>{" "}
      <button onClick={handleAddRow}>➕ 추가</button>{" "}
      <button onClick={handleDelete} style={{ color: "red" }}>🗑 삭제</button>

      <HotTable
        ref={hotTableRef}
        data={data}
        colHeaders={columns.map(c => c.title)}
        columns={columns}
        rowHeaders={true}
        afterChange={handleChange}
        afterSelection={(r) => handleRowSelect(r)}
        licenseKey="non-commercial-and-evaluation"
        stretchH="all"
        width="100%"
        filters
        dropdownMenu
      />
    </div>
  );
}

export default App;
