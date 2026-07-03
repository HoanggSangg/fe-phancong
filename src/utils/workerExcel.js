import * as XLSX from 'xlsx';

const normalizeCell = (value) => String(value ?? '').trim();

const isTeamHeaderRow = (stt, name) => {
  const nameUpper = name.toUpperCase();
  if (!stt && nameUpper.startsWith('TỔ')) return true;
  if (nameUpper.startsWith('TỔ ') || nameUpper.includes('TỔ THỢ')) return true;
  return false;
};

const findHeaderRowIndex = (rows) => {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const cells = row.map((cell) => normalizeCell(cell).toUpperCase());
    const hasStt = cells.some((cell) => cell === 'STT' || cell.includes('STT'));
    const hasName = cells.some(
      (cell) =>
        cell.includes('TÊN NHÂN VIÊN') ||
        cell.includes('TEN NHAN VIEN') ||
        cell.includes('TÊN THỢ') ||
        cell === 'TÊN'
    );
    if (hasStt && hasName) return i;
  }
  return 0;
};

export const parseWorkersFromExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const headerIndex = findHeaderRowIndex(rows);
        const workers = [];
        const seen = new Set();

        for (let i = headerIndex + 1; i < rows.length; i += 1) {
          const row = rows[i] || [];
          const rawStt = row[0];
          const rawName = row[1];

          if (rawStt === '' || rawStt === null || rawStt === undefined) continue;

          const soBaoDanh = normalizeCell(rawStt);
          const name = normalizeCell(rawName);

          if (!soBaoDanh || !name) continue;
          if (isTeamHeaderRow(soBaoDanh, name)) continue;
          if (Number.isNaN(Number(soBaoDanh)) && !/^\d+$/.test(soBaoDanh)) continue;

          const key = soBaoDanh;
          if (seen.has(key)) continue;
          seen.add(key);

          workers.push({ soBaoDanh, name });
        }

        resolve(workers);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Không đọc được file Excel'));
    reader.readAsArrayBuffer(file);
  });
