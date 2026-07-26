"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UploadCard from "@/components/UploadCard";
import {
  readStockFile,
  buildStockWorkbook,
  writeWorkbookToBlob,
  buildSingleSheetWorkbook,
  downloadBlob,
} from "@/lib/xlsxUtils";
import { joinStockData, UNASSIGNED } from "@/lib/matching";
import { loadMap } from "@/lib/mapStore";
import JSZip from "jszip";

export default function StockFlow() {
  const [stockRows, setStockRows] = useState(null);
  const [stockFileName, setStockFileName] = useState("");
  const [mapRows, setMapRows] = useState([]);
  const [groupBy, setGroupBy] = useState("manager"); // "manager" | "region"
  const [error, setError] = useState("");

  useEffect(() => {
    setMapRows(loadMap());
  }, []);

  const joined = useMemo(() => {
    if (!stockRows) return null;
    try {
      return joinStockData(stockRows, mapRows, groupBy);
    } catch (e) {
      setError("Something went wrong while matching the sheet: " + e.message);
      return null;
    }
  }, [stockRows, mapRows, groupBy]);

  async function handleStockFile(file) {
    setError("");
    try {
      const rows = await readStockFile(file);
      setStockRows(rows);
      setStockFileName(file.name);
    } catch (e) {
      setError("Couldn't read that Stock file. Make sure it's a valid .xlsx.");
    }
  }

  const groupLabel = groupBy === "region" ? "Region" : "Area Manager";
  const unassignedKey = UNASSIGNED;

  function downloadWorkbook() {
    if (!joined) return;
    const wb = buildStockWorkbook(joined.grouped, unassignedKey, groupLabel);
    const blob = writeWorkbookToBlob(wb);
    downloadBlob(
      blob,
      `Natimpo Points - Stock by ${groupLabel === "Region" ? "Region" : "Area Manager"}.xlsx`
    );
  }

  async function downloadZip() {
    if (!joined) return;
    const zip = new JSZip();
    for (const [group, rows] of joined.grouped.entries()) {
      const sheetRows = rows.map((r) => ({
        "Item Code": r.itemCode,
        "Item Name": r.itemName,
        Quantity: r.quantity,
        "Cust Price": r.custPrice,
        "Total Price": r.totalPrice,
        "Shop Name": r.shop,
        "Shop Code": r.shopCode,
        "Stock Name": r.stockName,
        "Partner Code": r.partnerCode,
        "Area Manager": r.manager,
        Region: r.region,
      }));
      const wb = buildSingleSheetWorkbook(sheetRows, group);
      const blob = writeWorkbookToBlob(wb);
      const buf = await blob.arrayBuffer();
      zip.file(`${group.replace(/[\\/:*?"<>|]/g, " ")}.xlsx`, buf);
    }
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, `Natimpo Points - Stock by ${groupLabel}.zip`);
  }

  const groupSummaries = useMemo(() => {
    if (!joined) return [];
    return [...joined.grouped.entries()]
      .map(([group, rows]) => ({
        group,
        count: rows.length,
        quantity: round2(rows.reduce((a, r) => a + r.quantity, 0)),
        totalPrice: round2(rows.reduce((a, r) => a + r.totalPrice, 0)),
        unresolved: rows.filter((r) => r.status !== "ok").length,
      }))
      .sort((a, b) =>
        a.group === unassignedKey ? 1 : b.group === unassignedKey ? -1 : a.group.localeCompare(b.group)
      );
  }, [joined, unassignedKey]);

  const totals = useMemo(() => {
    if (!joined) return null;
    return {
      rows: joined.results.length,
      quantity: round2(joined.results.reduce((a, r) => a + r.quantity, 0)),
      totalPrice: round2(joined.results.reduce((a, r) => a + r.totalPrice, 0)),
      unresolved: joined.results.filter((r) => r.status !== "ok").length,
    };
  }, [joined]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl">Stock in, regional sheets out</h1>
        <p className="text-inkfaint mt-2 max-w-xl">
          Upload a stock export (item, quantity, price, and shop). Natimpo looks up
          each shop's area manager and region from the map, then builds one sheet
          per group.
        </p>
      </header>

      <UploadCard
        step="1"
        title="Stock export"
        hint="ITEM_CODE, ITEM_NAME, QUANTITY, CUST_PRICE, total price, SHOP_NAME, SHOP_CODE, STOCK_NAME, PARTNER_CODE"
        columns="ITEM_CODE, ITEM_NAME, QUANTITY, CUST_PRICE, total price, SHOP_NAME, SHOP_CODE, STOCK_NAME, PARTNER_CODE"
        fileName={stockFileName}
        rowCount={stockRows?.length}
        onFile={handleStockFile}
      />

      <div className="my-8 perf-divider" />

      <div className="rounded-2xl bg-card border border-line p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base">Group sheets by</h3>
          <p className="text-sm text-inkfaint mt-0.5">
            Choose whether each exported sheet covers one area manager or one region.
          </p>
        </div>
        <div className="flex rounded-full border border-line bg-paper p-1">
          <button
            onClick={() => setGroupBy("manager")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              groupBy === "manager" ? "bg-brand text-white" : "text-inkfaint hover:text-ink"
            }`}
          >
            Area manager
          </button>
          <button
            onClick={() => setGroupBy("region")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              groupBy === "region" ? "bg-brand text-white" : "text-inkfaint hover:text-ink"
            }`}
          >
            Region
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-danger-light border border-danger/30 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!stockRows ? (
        <p className="text-sm text-inkfaint mt-8 text-center">
          Upload the stock file above to see the matched results.
        </p>
      ) : joined ? (
        <section className="mt-10">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <h2 className="font-display text-xl">Result</h2>
              <p className="text-sm text-inkfaint mt-1">
                {totals.rows} stock rows matched into {groupSummaries.length} sheet
                {groupSummaries.length === 1 ? "" : "s"} by {groupLabel.toLowerCase()}
                {totals.unresolved > 0 && (
                  <>
                    {" · "}
                    <span className="text-danger">{totals.unresolved} unresolved</span>
                  </>
                )}
              </p>
            </div>
            <div className="stamp text-brand shrink-0">
              Ready
              <br />
              to export
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-inkfaint border-b border-line bg-paper/60">
                  <th className="px-4 py-3 font-medium">{groupLabel}</th>
                  <th className="px-4 py-3 font-medium text-right">Rows</th>
                  <th className="px-4 py-3 font-medium text-right">Total quantity</th>
                  <th className="px-4 py-3 font-medium text-right">Total price</th>
                </tr>
              </thead>
              <tbody>
                {groupSummaries.map((g) => (
                  <tr
                    key={g.group}
                    className={`border-b border-line last:border-0 ${
                      g.group === unassignedKey ? "bg-danger-light/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {g.group === unassignedKey ? (
                        <span className="text-danger font-medium">{unassignedKey}</span>
                      ) : (
                        g.group
                      )}
                      {g.unresolved > 0 && g.group !== unassignedKey && (
                        <span className="ml-2 text-xs text-danger">
                          ({g.unresolved} unmatched shop)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right mono-nums">{g.count}</td>
                    <td className="px-4 py-3 text-right mono-nums">
                      {g.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right mono-nums">
                      {g.totalPrice.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totals.unresolved > 0 && (
            <p className="text-sm text-inkfaint mt-3">
              Rows land in <span className="text-danger font-medium">{unassignedKey}</span>{" "}
              when a shop isn't in the map yet, or has no region set. Fix mappings on the{" "}
              <Link href="/map" className="text-brand underline underline-offset-2">
                shop &amp; manager map
              </Link>{" "}
              page and come back — your file stays loaded.
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={downloadWorkbook}
              className="rounded-full bg-brand text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-dark transition-colors"
            >
              Download workbook (one sheet per {groupLabel.toLowerCase()})
            </button>
            <button
              onClick={downloadZip}
              className="rounded-full border border-line bg-card px-5 py-2.5 text-sm font-medium hover:bg-black/5 transition-colors"
            >
              Download ZIP (one file per {groupLabel.toLowerCase()})
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
