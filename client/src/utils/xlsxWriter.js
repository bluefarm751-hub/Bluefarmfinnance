// A minimal, dependency-free .xlsx writer.
//
// No Excel-writing npm package (ExcelJS / SheetJS) is installed in this
// project and this environment has no network access to add one, so this
// hand-builds a real OOXML .xlsx file (a plain ZIP of XML parts) using the
// ZIP "stored" (uncompressed) method, which needs no compression library -
// only a CRC32 checksum, implemented below.
//
// Supports exactly what the reports need: a bold header row, a normal body
// font, landscape page orientation, and an optional background pattern
// image on the sheet.

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------- Minimal ZIP (stored / uncompressed) writer ----------
function strToBytes(str) {
  return new TextEncoder().encode(str);
}

function u16(n) {
  return [n & 0xff, (n >> 8) & 0xff];
}
function u32(n) {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}

function buildZip(files) {
  // files: [{ name: string, data: Uint8Array }]
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const dosTime = 0;
  const dosDate = 0x21; // Jan 1 2000-ish placeholder, valid DOS date

  files.forEach((file) => {
    const nameBytes = strToBytes(file.name);
    const data = file.data;
    const crc = crc32(data);

    const localHeader = [
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method = stored
      ...u16(dosTime),
      ...u16(dosDate),
      ...u32(crc),
      ...u32(data.length), // compressed size
      ...u32(data.length), // uncompressed size
      ...u16(nameBytes.length),
      ...u16(0), // extra length
    ];

    const localBytes = new Uint8Array(localHeader.length + nameBytes.length + data.length);
    localBytes.set(localHeader, 0);
    localBytes.set(nameBytes, localHeader.length);
    localBytes.set(data, localHeader.length + nameBytes.length);
    localParts.push(localBytes);

    const centralHeader = [
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method
      ...u16(dosTime),
      ...u16(dosDate),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0), // extra length
      ...u16(0), // comment length
      ...u16(0), // disk number start
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(offset), // local header offset
    ];

    const centralBytes = new Uint8Array(centralHeader.length + nameBytes.length);
    centralBytes.set(centralHeader, 0);
    centralBytes.set(nameBytes, centralHeader.length);
    centralParts.push(centralBytes);

    offset += localBytes.length;
  });

  const centralStart = offset;
  let centralSize = 0;
  centralParts.forEach((p) => (centralSize += p.length));

  const eocd = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0), // disk number
    ...u16(0), // disk with central dir
    ...u16(files.length), // entries this disk
    ...u16(files.length), // total entries
    ...u32(centralSize),
    ...u32(centralStart),
    ...u16(0), // comment length
  ]);

  const totalLen =
    localParts.reduce((a, p) => a + p.length, 0) + centralSize + eocd.length;

  const out = new Uint8Array(totalLen);
  let pos = 0;
  localParts.forEach((p) => {
    out.set(p, pos);
    pos += p.length;
  });
  centralParts.forEach((p) => {
    out.set(p, pos);
    pos += p.length;
  });
  out.set(eocd, pos);

  return out;
}

// ---------- XML helpers ----------
function xmlEscape(val) {
  const s = val === null || val === undefined ? "" : String(val);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colLetter(idx) {
  // 0-based column index -> "A", "B", ... "AA"
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ---------- Public API ----------
// columns: [{ key, label, width? }]
// rows: array of plain objects
// options: { filename, sheetName, title, subtitle, backgroundImageUrl }
export async function exportXlsx({ filename, columns, rows, title, subtitle, backgroundImageUrl }) {
  const sheetName = "Report";

  // Row 1: Title (merged), Row 2: Subtitle (merged), Row 3: blank, Row 4: header, Row 5+: data
  const titleRow = 1;
  const subtitleRow = 2;
  const headerRow = 4;
  const firstDataRow = 5;

  let sheetDataXml = "";

  if (title) {
    sheetDataXml += `<row r="${titleRow}"><c r="A${titleRow}" t="inlineStr" s="3"><is><t>${xmlEscape(title)}</t></is></c></row>`;
  }
  if (subtitle) {
    sheetDataXml += `<row r="${subtitleRow}"><c r="A${subtitleRow}" t="inlineStr" s="4"><is><t>${xmlEscape(subtitle)}</t></is></c></row>`;
  }

  // Header row (Arial 16 bold - style index 1)
  let headerCells = "";
  columns.forEach((col, i) => {
    const ref = `${colLetter(i)}${headerRow}`;
    headerCells += `<c r="${ref}" t="inlineStr" s="1"><is><t>${xmlEscape(col.label)}</t></is></c>`;
  });
  sheetDataXml += `<row r="${headerRow}">${headerCells}</row>`;

  // Body rows (Arial 12 - style index 2)
  rows.forEach((row, rIdx) => {
    const r = firstDataRow + rIdx;
    let cells = "";
    columns.forEach((col, cIdx) => {
      const ref = `${colLetter(cIdx)}${r}`;
      const raw = col.key === "__sno" ? rIdx + 1 : row[col.key];
      const isNumber = typeof raw === "number" && Number.isFinite(raw);
      if (isNumber) {
        cells += `<c r="${ref}" s="2"><v>${raw}</v></c>`;
      } else {
        cells += `<c r="${ref}" t="inlineStr" s="2"><is><t>${xmlEscape(raw)}</t></is></c>`;
      }
    });
    sheetDataXml += `<row r="${r}">${cells}</row>`;
  });

  const colsXml =
    "<cols>" +
    columns
      .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 18}" customWidth="1"/>`)
      .join("") +
    "</cols>";

  const lastCol = colLetter(columns.length - 1);
  const lastRow = firstDataRow + rows.length - 1;

  let pictureXml = "";
  let sheetRelsXml = "";
  let contentTypesImagePart = "";
  const zipFiles = [];

  if (backgroundImageUrl) {
    try {
      const resp = await fetch(backgroundImageUrl);
      const buf = new Uint8Array(await resp.arrayBuffer());
      zipFiles.push({ name: "xl/media/image1.png", data: buf });
      pictureXml = `<picture r:id="rId1"/>`;
      sheetRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`;
      contentTypesImagePart = `<Default Extension="png" ContentType="image/png"/>`;
    } catch (e) {
      console.log("Could not embed background image:", e);
    }
  }

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCol}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  ${colsXml}
  <sheetData>${sheetDataXml}</sheetData>
  <pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
  <pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>
  ${pictureXml}
</worksheet>`;

  zipFiles.push({ name: "xl/worksheets/sheet1.xml", data: strToBytes(sheetXml) });

  if (sheetRelsXml) {
    zipFiles.push({ name: "xl/worksheets/_rels/sheet1.xml.rels", data: strToBytes(sheetRelsXml) });
  }

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="12"/><name val="Arial"/></font>
    <font><b/><sz val="16"/><name val="Arial"/></font>
    <font><sz val="12"/><name val="Arial"/></font>
    <font><b/><sz val="16"/><name val="Arial"/></font>
    <font><b/><sz val="12"/><name val="Arial"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFB9C2D0"/></left>
      <right style="thin"><color rgb="FFB9C2D0"/></right>
      <top style="thin"><color rgb="FFB9C2D0"/></top>
      <bottom style="thin"><color rgb="FFB9C2D0"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${contentTypesImagePart}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  zipFiles.push({ name: "[Content_Types].xml", data: strToBytes(contentTypesXml) });
  zipFiles.push({ name: "_rels/.rels", data: strToBytes(rootRelsXml) });
  zipFiles.push({ name: "xl/workbook.xml", data: strToBytes(workbookXml) });
  zipFiles.push({ name: "xl/_rels/workbook.xml.rels", data: strToBytes(workbookRelsXml) });
  zipFiles.push({ name: "xl/styles.xml", data: strToBytes(stylesXml) });

  const zipBytes = buildZip(zipFiles);

  const blob = new Blob([zipBytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
