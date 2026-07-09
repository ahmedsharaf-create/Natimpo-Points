import * as XLSX from "xlsx";

// Reads the first sheet of a File/Blob and returns an array of row objects
// keyed by the header row.
export async function readSheet(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

// Reads Points sheet: expects Phone, Name, Points columns (case-insensitive).
export async function readPointsFile(file) {
  const rows = await readSheet(file);
  return rows.map((r) => normalizeKeys(r, ["Phone", "Name", "Points"]));
}

// Reads Dials sheet: expects CUSTOMER_DIAL, shop_name columns.
export async function readDialsFile(file) {
  const rows = await readSheet(file);
  return rows.map((r) => normalizeKeys(r, ["CUSTOMER_DIAL", "shop_name"]));
}

// Reads Map sheet: expects a shop name column and an area manager column.
// Accepts common header variants ("Shop Nam", "Shop Name", "Area Manager").
export async function readMapFile(file) {
  const rows = await readSheet(file);
  return rows.map((r) => {
    const keys = Object.keys(r);
    const shopKey = keys.find((k) => /shop/i.test(k)) || keys[0];
    const mgrKey = keys.find((k) => /manager|area/i.test(k)) || keys[1];
    return {
      shop_name: (r[shopKey] ?? "").toString().trim(),
      area_manager: (r[mgrKey] ?? "").toString().trim(),
    };
  }).filter((r) => r.shop_name);
}

// Case-insensitive header matching helper: given a row and the expected
// canonical keys, returns a new object with those canonical keys populated
// from whichever header actually matched (case-insensitively, trimmed).
function normalizeKeys(row, expectedKeys) {
  const out = {};
  const rowKeys = Object.keys(row);
  for (const expected of expectedKeys) {
    const found = rowKeys.find(
      (k) => k.toString().trim().toLowerCase() === expected.toLowerCase()
    );
    out[expected] = found !== undefined ? row[found] : "";
  }
  return out;
}

// Builds a single workbook with one sheet per area manager, plus a Summary
// sheet and an Unmatched sheet for rows that couldn't be resolved.
export function buildManagerWorkbook(byManager, unmatchedKey) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [];
  const managerNames = [...byManager.keys()].sort((a, b) =>
    a === unmatchedKey ? 1 : b === unmatchedKey ? -1 : a.localeCompare(b)
  );

  for (const manager of managerNames) {
    const rows = byManager.get(manager);
    const sheetRows = rows.map((r) => ({
      Phone: r.phone,
      Name: r.name,
      Points: r.points,
      Amount: r.amount,
      "Shop Name": r.shop,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(manager));

    summaryRows.push({
      "Area Manager": manager,
      Rows: rows.length,
      "Total Points": round2sum(rows.map((r) => r.points)),
      "Total Amount": round2sum(rows.map((r) => r.amount)),
    });
  }

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
  // Move Summary to the front
  wb.SheetNames.unshift(wb.SheetNames.pop());

  return wb;
}

export function writeWorkbookToBlob(wb) {
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], { type: "application/octet-stream" });
}

export function buildSingleSheetWorkbook(rows, sheetName) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
  return wb;
}

function safeSheetName(name) {
  // Excel sheet names: max 31 chars, no : \ / ? * [ ]
  let s = String(name).replace(/[:\\/?*\[\]]/g, " ").trim();
  if (!s) s = "Sheet";
  return s.slice(0, 31);
}

function round2sum(arr) {
  const total = arr.reduce((a, b) => a + b, 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
