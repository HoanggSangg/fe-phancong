const ExcelJS = require("exceljs");
const path = require("path");

async function main() {
  const src = path.join("public", "templates", "_source_salary.xlsx");
  const out = path.join("public", "templates", "BANG_TINH_LUONG_TEMPLATE.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(src);

  const srcSheet = wb.worksheets.find((ws) => (ws.name || "").includes("T03-2025"));
  if (!srcSheet) throw new Error("Sheet T03 not found: " + wb.worksheets.map((w) => w.name).join(", "));

  // Create clean workbook with only the template sheet
  const outWb = new ExcelJS.Workbook();
  const ws = outWb.addWorksheet("BANG_TINH_LUONG", {
    views: srcSheet.views,
    properties: srcSheet.properties,
  });

  // Copy column widths
  srcSheet.columns.forEach((col, i) => {
    if (col && col.width) ws.getColumn(i + 1).width = col.width;
  });

  // Copy rows 1..5 fully (values + styles)
  for (let r = 1; r <= 5; r++) {
    const srcRow = srcSheet.getRow(r);
    const destRow = ws.getRow(r);
    destRow.height = srcRow.height;
    srcRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const dest = destRow.getCell(colNumber);
      dest.value = cell.value;
      if (cell.style) dest.style = { ...cell.style };
      if (cell.numFmt) dest.numFmt = cell.numFmt;
    });
    destRow.commit();
  }

  // Copy merges that only involve rows 1-5
  (srcSheet.model.merges || []).forEach((merge) => {
    // merge can be string like "E2:AI2"
    const range = typeof merge === "string" ? merge : null;
    if (!range) return;
    const [a, b] = range.split(":");
    const rowA = parseInt(a.replace(/[A-Z]/g, ""), 10);
    const rowB = parseInt(b.replace(/[A-Z]/g, ""), 10);
    if (rowA <= 5 && rowB <= 5) {
      try { ws.mergeCells(range); } catch (e) {}
    }
  });

  // Also try worksheet._merges
  if (srcSheet._merges) {
    Object.keys(srcSheet._merges).forEach((key) => {
      const m = srcSheet._merges[key];
      if (!m) return;
      const top = m.top || m.model?.top;
      const bottom = m.bottom || m.model?.bottom;
      if (top && bottom && top <= 5 && bottom <= 5) {
        try {
          ws.mergeCells(m.top, m.left, m.bottom, m.right);
        } catch (e) {}
      }
    });
  }

  // Keep one empty styled data row (row 6) as style template for cloning
  const styleSrc = srcSheet.getRow(16); // a real data row with formatting
  const styleRow = ws.getRow(6);
  styleRow.height = styleSrc.height || 18;
  for (let c = 1; c <= 50; c++) {
    const sc = styleSrc.getCell(c);
    const dc = styleRow.getCell(c);
    if (sc.style) dc.style = JSON.parse(JSON.stringify(sc.style));
    if (sc.numFmt) dc.numFmt = sc.numFmt;
    else if (c >= 5) dc.numFmt = "#,##0";
    dc.value = null;
  }
  styleRow.commit();

  // Freeze header
  ws.views = [{ state: "frozen", ySplit: 5, xSplit: 4 }];

  await outWb.xlsx.writeFile(out);
  console.log("Wrote", out);
  console.log("Merges out:", ws._merges ? Object.keys(ws._merges).length : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
