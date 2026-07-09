"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UploadCard from "@/components/UploadCard";
import { readPointsFile, readDialsFile, buildManagerWorkbook, writeWorkbookToBlob, buildSingleSheetWorkbook, downloadBlob } from "@/lib/xlsxUtils";
import { joinData, UNASSIGNED } from "@/lib/matching";
import { loadMap } from "@/lib/mapStore";
import JSZip from "jszip";

export default function DashboardPage() {
  const [pointsRows, setPointsRows] = useState(null);
  const [pointsFileName, setPointsFileName] = useState("");
  const [dialRows, setDialRows] = useState(null);
  const [dialsFileName, setDialsFileName] = useState("");
  const [mapRows, setMapRows] = useState([]);
  const [rate, setRate] = useState(0.04);
  const [error, setError] = useState("");

  useEffect(() => {
    setMapRows(loadMap());
  }, []);

  const joined = useMemo(() => {
    if (!pointsRows || !dialRows) return null;
    try {
      return joinData(pointsRows, dialRows, mapRows, rate);
    } catch (e) {
      setError("Something went wrong while matching the sheets: " + e.message);
      return null;
    }
  }, [pointsRows, dialRows, mapRows, rate]);

  async function handlePointsFile(file) {
    setError("");
    try {
      const rows = await readPointsFile(file);
      setPointsRows(rows);
      setPointsFileName(file.name);
    } catch (e) {
      setError("Couldn't read that Points file. Make sure it's a valid .xlsx.");
    }
  }

  async function handleDialsFile(file) {
    setError("");
    try {
      const rows = await readDialsFile(file);
      setDialRows(rows);
      setDialsFileName(file.name);
    } catch (e) {
      setError("Couldn't read that Dials file. Make sure it's a valid .xlsx.");
    }
  }

  function downloadWorkbook() {
    if (!joined) return;
    const wb = buildManagerWorkbook(joined.byManager, UNASSIGNED);
    const blob = writeWorkbookToBlob(wb);
    downloadBlob(blob, "Natimpo Points - Area Manager Payouts.xlsx");
  }

  async function downloadZip() {
    if (!joined) return;
    const zip = new JSZip();
    for (const [manager, rows] of joined.byManager.entries()) {
      const sheetRows = rows.map((r) => ({
        Phone: r.phone,
        Name: r.name,
        Points: r.points,
        Amount: r.amount,
        "Shop Name": r.shop,
      }));
      const wb = buildSingleSheetWorkbook(sheetRows, manager);
      const blob = writeWorkbookToBlob(wb);
      const buf = await blob.arrayBuffer();
      zip.file(`${manager.replace(/[\\/:*?"<>|]/g, " ")}.xlsx`, buf);
    }
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "Natimpo Points - Payouts by Manager.zip");
  }

  const managerSummaries = useMemo(() => {
    if (!joined) return [];
    return [...joined.byManager.entries()]
      .map(([manager, rows]) => ({
        manager,
        count: rows.length,
        points: round2(rows.reduce((a, r) => a + r.points, 0)),
        amount: round2(rows.reduce((a, r) => a + r.amount, 0)),
        unresolved: rows.filter((r) => r.status !== "ok").length,
      }))
      .sort((a, b) => (a.manager === UNASSIGNED ? 1 : b.manager === UNASSIGNED ? -1 : a.manager.localeCompare(b.manager)));
  }, [joined]);

  const totals = useMemo(() => {
    if (!joined) return null;
    return {
      rows: joined.results.length,
      points: round2(joined.results.reduce((a, r) => a + r.points, 0)),
      amount: round2(joined.results.reduce((a, r) => a + r.amount, 0)),
      unresolved: joined.results.filter((r) => r.status !== "ok").length,
    };
  }, [joined]);

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-gold font-mono mb-2">
          Payout run
        </p>
        <h1 className="font-display text-3xl">Points in, payout sheets out</h1>
        <p className="text-inkfaint mt-2 max-w-xl">
          Upload the phone/points balances and the customer-dial-to-shop file. Natimpo
          matches each balance to a shop, looks up its area manager, and builds a
          payout sheet per manager.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <UploadCard
          step="1"
          title="Points balances"
          hint="Phone, Name, Points"
          columns="Phone, Name, Points"
          fileName={pointsFileName}
          rowCount={pointsRows?.length}
          onFile={handlePointsFile}
        />
        <UploadCard
          step="2"
          title="Customer dials → shops"
          hint="CUSTOMER_DIAL, shop_name"
          columns="CUSTOMER_DIAL, shop_name"
          fileName={dialsFileName}
          rowCount={dialRows?.length}
          onFile={handleDialsFile}
          accent="gold"
        />
      </div>

      <div className="my-8 perf-divider" />

      <div className="rounded-2xl bg-card border border-line p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base">Payout rate</h3>
          <p className="text-sm text-inkfaint mt-0.5">
            Amount = Points × rate. Default is 0.04% of the points balance.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="number"
            step="0.001"
            min="0"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value) || 0)}
            className="w-28 rounded-lg border border-line bg-paper px-3 py-2 mono-nums text-right"
          />
          <span className="text-sm text-inkfaint">%</span>
        </label>
      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-danger-light border border-danger/30 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!pointsRows || !dialRows ? (
        <p className="text-sm text-inkfaint mt-8 text-center">
          Upload both files above to see the matched results.
        </p>
      ) : joined ? (
        <section className="mt-10">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <h2 className="font-display text-xl">Result</h2>
              <p className="text-sm text-inkfaint mt-1">
                {totals.rows} balance rows matched into {managerSummaries.length} sheet
                {managerSummaries.length === 1 ? "" : "s"}
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
                  <th className="px-4 py-3 font-medium">Area manager</th>
                  <th className="px-4 py-3 font-medium text-right">Rows</th>
                  <th className="px-4 py-3 font-medium text-right">Total points</th>
                  <th className="px-4 py-3 font-medium text-right">Total amount</th>
                </tr>
              </thead>
              <tbody>
                {managerSummaries.map((m) => (
                  <tr
                    key={m.manager}
                    className={`border-b border-line last:border-0 ${
                      m.manager === UNASSIGNED ? "bg-danger-light/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {m.manager === UNASSIGNED ? (
                        <span className="text-danger font-medium">{UNASSIGNED}</span>
                      ) : (
                        m.manager
                      )}
                      {m.unresolved > 0 && m.manager !== UNASSIGNED && (
                        <span className="ml-2 text-xs text-danger">
                          ({m.unresolved} unmatched shop)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right mono-nums">{m.count}</td>
                    <td className="px-4 py-3 text-right mono-nums">
                      {m.points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right mono-nums">
                      {m.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totals.unresolved > 0 && (
            <p className="text-sm text-inkfaint mt-3">
              Rows land in <span className="text-danger font-medium">{UNASSIGNED}</span>{" "}
              when the phone isn't in the dials file, or its shop isn't in the map yet.
              Fix mappings on the{" "}
              <Link href="/map" className="text-brand underline underline-offset-2">
                shop &amp; manager map
              </Link>{" "}
              page and come back — your files stay loaded.
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={downloadWorkbook}
              className="rounded-full bg-brand text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-dark transition-colors"
            >
              Download workbook (one sheet per manager)
            </button>
            <button
              onClick={downloadZip}
              className="rounded-full border border-line bg-card px-5 py-2.5 text-sm font-medium hover:bg-black/5 transition-colors"
            >
              Download ZIP (one file per manager)
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
