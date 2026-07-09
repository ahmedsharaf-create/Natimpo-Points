"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { readMapFile, buildSingleSheetWorkbook, writeWorkbookToBlob, downloadBlob } from "@/lib/xlsxUtils";
import { loadMap, saveMap } from "@/lib/mapStore";

export default function MapPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [newShop, setNewShop] = useState("");
  const [newManager, setNewManager] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setRows(loadMap());
  }, []);

  function persist(next) {
    setRows(next);
    saveMap(next);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function addRow(e) {
    e.preventDefault();
    const shop = newShop.trim();
    const manager = newManager.trim();
    if (!shop || !manager) return;
    const next = [...rows, { shop_name: shop, area_manager: manager }];
    persist(next);
    setNewShop("");
    setNewManager("");
    showToast("Shop added to the map");
  }

  function updateRow(index, field, value) {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    persist(next);
  }

  function deleteRow(index) {
    const next = rows.filter((_, i) => i !== index);
    persist(next);
    showToast("Shop removed");
  }

  async function handleImport(file) {
    if (!file) return;
    try {
      const imported = await readMapFile(file);
      if (imported.length === 0) {
        showToast("No shop rows found in that file");
        return;
      }
      // Merge: imported rows overwrite existing entries for the same shop.
      const merged = new Map(rows.map((r) => [r.shop_name.toLowerCase(), r]));
      for (const r of imported) {
        merged.set(r.shop_name.toLowerCase(), r);
      }
      persist([...merged.values()]);
      showToast(`Imported ${imported.length} row${imported.length === 1 ? "" : "s"}`);
    } catch (e) {
      showToast("Couldn't read that file — check it's a valid .xlsx");
    }
  }

  function downloadMap() {
    const sheetRows = rows.map((r) => ({
      "Shop Name": r.shop_name,
      "Area Manager": r.area_manager,
    }));
    const wb = buildSingleSheetWorkbook(sheetRows, "Map");
    const blob = writeWorkbookToBlob(wb);
    downloadBlob(blob, "Natimpo Points - Map.xlsx");
  }

  function clearAll() {
    if (!window.confirm("Remove every shop from the map? This can't be undone.")) return;
    persist([]);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.shop_name.toLowerCase().includes(q) || r.area_manager.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const managerCount = useMemo(
    () => new Set(rows.map((r) => r.area_manager.trim()).filter(Boolean)).size,
    [rows]
  );

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-gold font-mono mb-2">
          Shop &amp; manager map
        </p>
        <h1 className="font-display text-3xl">Who owns which shop</h1>
        <p className="text-inkfaint mt-2 max-w-xl">
          This map decides which area manager a shop's points land in. Edit it here,
          or import an updated map file — new rows overwrite existing shops with the
          same name.
        </p>
      </header>

      <div className="rounded-2xl bg-card border border-line p-5 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-inkfaint">Shops mapped</p>
            <p className="font-display text-2xl mt-0.5 mono-nums">{rows.length}</p>
          </div>
          <div>
            <p className="text-inkfaint">Area managers</p>
            <p className="font-display text-2xl mt-0.5 mono-nums">{managerCount}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium hover:bg-black/5 transition-colors"
          >
            Import map file
          </button>
          <button
            onClick={downloadMap}
            disabled={rows.length === 0}
            className="rounded-full bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-40"
          >
            Download map
          </button>
          <button
            onClick={clearAll}
            disabled={rows.length === 0}
            className="rounded-full border border-danger/30 text-danger px-4 py-2 text-sm font-medium hover:bg-danger-light transition-colors disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>

      <form onSubmit={addRow} className="rounded-2xl bg-card border border-line p-5 mt-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-inkfaint">Shop name</label>
          <input
            value={newShop}
            onChange={(e) => setNewShop(e.target.value)}
            placeholder="e.g. OB. Moharam beck"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 mt-1 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-inkfaint">Area manager</label>
          <input
            value={newManager}
            onChange={(e) => setNewManager(e.target.value)}
            placeholder="e.g. Mostafa Adel"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 mt-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-gold text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Add shop
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shop or manager…"
          className="w-full max-w-xs rounded-lg border border-line bg-card px-3 py-2 text-sm"
        />
        {toast && <span className="text-sm text-brand">{toast}</span>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-inkfaint border-b border-line bg-paper/60">
              <th className="px-4 py-3 font-medium">Shop name</th>
              <th className="px-4 py-3 font-medium">Area manager</th>
              <th className="px-4 py-3 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-inkfaint">
                  {rows.length === 0
                    ? "No shops mapped yet. Add one above or import a map file."
                    : "No shops match your search."}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const rowIndex = rows.indexOf(r);
                return (
                  <tr key={rowIndex} className="border-b border-line last:border-0">
                    <td className="px-2 py-1.5">
                      <input
                        value={r.shop_name}
                        onChange={(e) => updateRow(rowIndex, "shop_name", e.target.value)}
                        className="w-full rounded-lg px-2 py-1.5 bg-transparent hover:bg-paper focus:bg-paper outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={r.area_manager}
                        onChange={(e) => updateRow(rowIndex, "area_manager", e.target.value)}
                        className="w-full rounded-lg px-2 py-1.5 bg-transparent hover:bg-paper focus:bg-paper outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => deleteRow(rowIndex)}
                        className="text-inkfaint hover:text-danger text-xs px-2 py-1"
                        aria-label={`Remove ${r.shop_name}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-inkfaint mt-4">
        The map is saved in this browser. Use "Download map" to back it up, or share
        the file with a teammate to import on their machine.
      </p>
    </div>
  );
}
