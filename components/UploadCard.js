"use client";

import { useCallback, useRef, useState } from "react";

export default function UploadCard({
  step,
  title,
  hint,
  columns,
  fileName,
  rowCount,
  onFile,
  accent = "brand",
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (!file) return;
      onFile(file);
    },
    [onFile]
  );

  const accentClasses =
    accent === "gold"
      ? "bg-gold text-white"
      : "bg-brand text-white";

  return (
    <div className="rounded-2xl bg-card border border-line p-5">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs ${accentClasses}`}
        >
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base">{title}</h3>
          <p className="text-sm text-inkfaint mt-0.5">
            Expected columns: <span className="mono-nums text-ink">{columns}</span>
          </p>

          <div
            className={`dropzone mt-3 rounded-xl px-4 py-6 text-center cursor-pointer ${
              dragActive ? "drag-active" : ""
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {fileName ? (
              <div>
                <p className="text-sm font-medium text-ink">{fileName}</p>
                <p className="text-xs text-brand mt-1 mono-nums">
                  {rowCount} row{rowCount === 1 ? "" : "s"} loaded
                </p>
                <p className="text-xs text-inkfaint mt-2">Click or drop to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-ink">Drop the .xlsx file here</p>
                <p className="text-xs text-inkfaint mt-1">or click to browse — {hint}</p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>
    </div>
  );
}
