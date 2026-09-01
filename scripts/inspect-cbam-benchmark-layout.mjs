#!/usr/bin/env node

import * as XLSX from "xlsx";

const BENCHMARKS_URL =
  "https://taxation-customs.ec.europa.eu/document/download/9877523c-2a02-4926-a211-aefae7cf6d0d_en?filename=CBAM+Benchmarks_20260206.xlsx";

const clean = (v) =>
  v === null || v === undefined
    ? ""
    : String(v).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const response = await fetch(BENCHMARKS_URL, {
  headers: {
    "User-Agent":
      "GreenEngineeringTools-CBAM-Debug/1.0 (+https://greenengineeringtools.com)",
    Accept:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
  },
});

if (!response.ok) {
  throw new Error(`Download failed: HTTP ${response.status}`);
}

const buffer = Buffer.from(await response.arrayBuffer());
const wb = XLSX.read(buffer, { type: "buffer", raw: false });

console.log("Sheets:", wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
  });

  console.log(`\n=== SHEET: ${sheetName} ===`);

  rows.slice(0, 12).forEach((row, i) => {
    const cells = (Array.isArray(row) ? row : []).map(clean);

    console.log(`\nRow ${i + 1}`);

    cells.forEach((cell, idx) => {
      if (cell !== "") {
        console.log(`  [${idx}] ${JSON.stringify(cell)}`);
      }
    });
  });

  for (const target of ["25231000", "25232100", "25232900"]) {
    const hits = rows
      .map((row, i) => ({
        i,
        row: Array.isArray(row) ? row.map(clean) : [],
      }))
      .filter(({ row }) =>
        row.some(
          (cell) => clean(cell).replace(/\D/g, "") === target
        )
      );

    for (const hit of hits) {
      console.log(
        `\n*** TARGET ${target} — physical row ${hit.i + 1} ***`
      );

      hit.row.forEach((cell, idx) => {
        if (cell !== "") {
          console.log(`  [${idx}] ${JSON.stringify(cell)}`);
        }
      });
    }
  }

  const routeHits = rows
    .map((row, i) => ({
      i,
      row: Array.isArray(row) ? row.map(clean) : [],
    }))
    .filter(({ row }) =>
      row.some((cell) =>
        /\([A-HJKL]\)|\([12]\)/i.test(clean(cell))
      )
    )
    .slice(0, 12);

  console.log("\n=== FIRST ROUTE/YEAR RICH ROWS ===");

  for (const hit of routeHits) {
    console.log(`\nPhysical row ${hit.i + 1}`);

    hit.row.forEach((cell, idx) => {
      if (cell !== "") {
        console.log(`  [${idx}] ${JSON.stringify(cell)}`);
      }
    });
  }
}