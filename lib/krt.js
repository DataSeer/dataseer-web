/*
 * @prettier
 */

'use strict';

const path = require(`path`);
const fs = require(`fs`);
const { parse } = require(`csv-parse`);
const xlsx = require(`xlsx`);

const { PDFDocument, rgb } = require(`pdf-lib`);
const fontkit = require(`fontkit`);

// Load config file
const config = require(`../conf/krt.json`);

async function readFile(filePath, mimeType) {
  switch (mimeType) {
  case `text/csv`:
    return readCSV(filePath, `,`);
  case `text/tab-separated-values`:
    return readCSV(filePath, `\t`);
  case `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`:
  case `application/vnd.ms-excel`:
    return readXLSX(filePath);
  case `application/vnd.oasis.opendocument.spreadsheet`:
    return readODS(filePath);
  default:
    throw new Error(`Unsupported MIME type`);
  }
}

function readCSV(filePath, delimiter) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(parse({ delimiter, columns: true }))
      .on(`data`, (data) => results.push(data))
      .on(`end`, () => resolve(results))
      .on(`error`, (error) => reject(error));
  });
}

function readXLSX(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      const result = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

function readODS(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      const result = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

const identifiersRegExp = {
  URL: [
    /((?:http(s)?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/=]*)(?=[^\w]\s|$))/gim
  ],
  DOI: [/(?:(?:http)?(?:s)?(?:\:\/\/)?(?:dx\.|www\.)?doi\.org\/)?10\.\d{4,9}\/[-._;()\/:A-Z0-9]+/gim],
  PID: [/^[A-Z0-9]+[\-\.\_\;\(\)\/\:]?[A-Z0-9]+$/gim],
  RRID: [
    /(?:(?:RRID|SRC)(?:\s?\:\s?|\s)?)?((?:CVCL|AB|MMRRC|IMSR|SCR|Addgene|RGD|MMRC|MGI|SCCR|BDSC|FlyBase|B|DGRC|VDRC|VCL)(?:\s?(?:\:|\_)\s?|\s)[a-zA-Z0-9][a-zA-Z0-9\_\-\:]+)/gm
  ],
  catalogNumber: [/[a-z]+(?:\s+)?[\#]{1}(?:\s+)?[a-z0-9\-]+/gim],
  CAS: [/CAS:(?:\s+)?[a-z0-9\_\-\:]+/gim],
  accessionNumber: [/^(?:\s*Accession\s*number:\s*)?[A-Z0-9]{3,}(?:\s;)?$/gm]
};

const REGEXP_CONTENT_DELIMITERS = /[;,\n]{1}/;

function extractUsingRegExp(string, regExps) {
  for (let i = 0; i < regExps.length; i++) {
    const match = string.match(regExps[i]);
    if (match) return match;
  }
  return [];
}

function extractIdentifiers(string = ``) {
  let results = {};
  if (typeof string !== `string`) return results;
  let split = string.replace(/[\n\r\t]+/, ``).split(REGEXP_CONTENT_DELIMITERS);
  for (let key in identifiersRegExp) {
    for (let i = 0; i < split.length; i++) {
      if (!Array.isArray(results[key])) results[key] = [];
      let match = extractUsingRegExp(split[i], identifiersRegExp[key]);
      results[key] = results[key].concat(match);
    }
  }
  return results;
}

function calculateMaxCharsPerCell(columnWidth, fontSize, font, cellPadding) {
  const cellWidth = columnWidth - 2 * cellPadding;
  const avgCharWidth = font.widthOfTextAtSize(config.avgChar, fontSize);
  return Math.floor(cellWidth / avgCharWidth);
}

function filterObjectProperties(obj) {
  if (typeof obj !== `object` || obj === null) {
    return obj;
  }
  for (const prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      if (typeof obj[prop] === `string`) {
        obj[prop] = obj[prop].replace(/[\n\r\s]+/g, ` `);
      } else if (typeof obj[prop] === `object`) {
        obj[prop] = filterObjectProperties(obj[prop]);
      }
    }
  }
  return obj;
}

function splitTextToFit(text, maxChunkSize, forcedDelimiter = /[;\[]/gm, optionalDelimiter = /[\:\.\(\s\n\r\-\/]/gm) {
  const chunks = [];
  let startIndex = 0;
  let optionalDelimiterIndex = -1;
  let i = 0;

  while (i < text.length) {
    if (text[i].match(forcedDelimiter)) {
      chunks.push(text.slice(startIndex, i + 1));
      startIndex = i + 1;
      optionalDelimiterIndex = -1;
    } else if (text[i].match(optionalDelimiter)) {
      optionalDelimiterIndex = i;
    }

    if (i - startIndex === maxChunkSize) {
      if (optionalDelimiterIndex !== -1) {
        chunks.push(text.slice(startIndex, optionalDelimiterIndex + 1));
        startIndex = optionalDelimiterIndex + 1;
        i = optionalDelimiterIndex;
        optionalDelimiterIndex = -1;
      } else {
        chunks.push(text.slice(startIndex, i + 1));
        startIndex = i + 1;
        optionalDelimiterIndex = -1;
      }
    }
    i++;
  }

  if (startIndex < text.length) {
    chunks.push(text.slice(startIndex));
  }

  return chunks;
}

function calculateRowHeight(page, tableWidth, columnWidths, rowData, fontSize, font, cellPadding) {
  const textHeight = fontSize * 1.2;
  let maxRowHeight = 0;
  columnWidths.forEach((columnWidth, columnIndex) => {
    const cellWidth = (columnWidth / 100) * tableWidth;
    const maxCharsPerCell = calculateMaxCharsPerCell(cellWidth, fontSize, font, cellPadding);
    let content = rowData[columnIndex] ? rowData[columnIndex] : ``;
    const lines = splitTextToFit(content, maxCharsPerCell);
    let rowHeight = 2 * cellPadding + lines.length * textHeight;
    maxRowHeight = Math.max(rowHeight, maxRowHeight);
  });
  return maxRowHeight;
}

function drawLine(page, start, end, thickness, color) {
  const halfThickness = thickness / 2;
  const startX = start.x - halfThickness;
  const startY = start.y - halfThickness;
  const endX = end.x - halfThickness;
  const endY = end.y - halfThickness;

  page.drawLine({
    start: {
      x: startX,
      y: startY
    },
    end: {
      x: endX,
      y: endY
    },
    thickness,
    color: rgb(...color)
  });
}

function drawRow(
  page,
  startX,
  startY,
  tableWidth,
  rowHeight,
  columnWidths,
  rowData,
  fontSize,
  font,
  cellPadding,
  border,
  isHeader
) {
  let currentX = startX;
  const textHeight = fontSize * 1.2;
  const { color, thickness } = border;
  const cellData = [];
  columnWidths.forEach((columnWidth, columnIndex) => {
    const cellWidth = (columnWidth / 100) * tableWidth;
    const maxCharsPerCell = calculateMaxCharsPerCell(cellWidth, fontSize, font, cellPadding);
    let content = rowData[columnIndex] ? rowData[columnIndex] : ``;
    const lines = splitTextToFit(content, maxCharsPerCell);

    lines.forEach((line, index) => {
      const textX = currentX + cellPadding;
      const textY = startY - cellPadding / 2 - (index + 1) * textHeight;
      page.drawText(line, {
        x: textX,
        y: textY,
        size: fontSize,
        font
      });
    });

    drawLine(
      page,
      {
        x: currentX,
        y: startY
      },
      {
        x: currentX,
        y: startY - rowHeight
      },
      thickness,
      color
    ); // Left border
    drawLine(
      page,
      {
        x: currentX + cellWidth,
        y: startY
      },
      {
        x: currentX + cellWidth,
        y: startY - rowHeight
      },
      thickness,
      color
    ); // Right border
    drawLine(
      page,
      {
        x: startX,
        y: startY - rowHeight
      },
      {
        x: startX + tableWidth,
        y: startY - rowHeight
      },
      thickness,
      color
    ); // Top border
    drawLine(
      page,
      {
        x: startX,
        y: startY
      },
      {
        x: startX + tableWidth,
        y: startY
      },
      thickness,
      color
    ); // Bottom border

    cellData.push({
      isHeader,
      x: currentX,
      y: startY - rowHeight,
      width: cellWidth,
      height: rowHeight,
      content: rowData[columnIndex]
    });

    currentX += cellWidth;
  });

  return cellData;
}

const addKRTText = (page, text, fontSize, font) => {
  page.drawText(text, {
    x: 0,
    y: 0,
    size: fontSize,
    font,
    color: rgb(1, 1, 1)
  });
};

function extractHeaders(rows) {
  let mapping = {};
  for (let i = 0; i < rows.length; i++) {
    let keys = Object.keys(rows[i]);
    for (let j = 0; j < keys.length; j++) {
      mapping[keys[j]] = true;
    }
  }
  return Object.keys(mapping);
}

function rowIsEmpty(data) {
  let isEmpty = true;
  for (let key in data) {
    isEmpty = isEmpty && data[key].length <= 0;
    if (!isEmpty) break;
  }
  return isEmpty;
}

async function processCSV(options) {
  const { csvFilePath, mimeType, hash } = options;

  try {
    // Read all rows from the CSV file into an array
    const rows = await new Promise((resolve, reject) => {
      readFile(csvFilePath, mimeType)
        .then((data) => resolve(data))
        .catch(reject);
    });

    // Now that all rows are available, proceed to create the PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regularFontBytes = await fs.promises.readFile(path.join(__dirname, config.fontFiles.regular));
    const boldFontBytes = await fs.promises.readFile(path.join(__dirname, config.fontFiles.bold));
    const [regularFont, boldFont] = await Promise.all([
      pdfDoc.embedFont(regularFontBytes),
      pdfDoc.embedFont(boldFontBytes)
    ]);

    const fontSize = config.fontSize;
    let currentPage = pdfDoc.addPage();
    addKRTText(currentPage, `KRT-${hash}`, fontSize, regularFont);
    let pageNumber = 1;
    const { width, height } = currentPage.getSize();
    let currentY = Math.floor(height - config.topMargin);
    const startX = config.leftMargin;
    const tableWidth = width - (config.leftMargin + config.rightMargin);
    const allLineData = [];
    const headers = extractHeaders(rows);

    // Calculate column widths
    const columnWidths = Array(headers.length).fill(100 / headers.length);

    const headersRowHeight = calculateRowHeight(
      currentPage,
      tableWidth,
      columnWidths,
      headers,
      fontSize,
      boldFont,
      config.cellPadding
    );
    const headerCellData = drawRow(
      currentPage,
      startX,
      currentY,
      tableWidth,
      headersRowHeight,
      columnWidths,
      headers,
      fontSize,
      boldFont,
      config.cellPadding,
      config.border,
      true
    );
    allLineData.push({
      x: startX,
      y: currentY,
      width: tableWidth,
      height: headersRowHeight,
      cells: headerCellData,
      line: 1,
      page: pageNumber,
      isHeader: true
    });
    currentY -= headersRowHeight;
    const remainingRows = rows.slice(1);

    let lineCounter = 2;
    for (const rowData of remainingRows) {
      if (rowIsEmpty(rowData)) continue;
      const rowHeight = calculateRowHeight(
        currentPage,
        tableWidth,
        columnWidths,
        Object.values(rowData),
        fontSize,
        regularFont,
        config.cellPadding
      );

      if (currentY - rowHeight < config.bottomMargin) {
        currentPage = pdfDoc.addPage();
        addKRTText(currentPage, `KRT-${hash}`, fontSize, regularFont);
        pageNumber++;
        currentY = Math.floor(height - config.topMargin);
        if (!config.headerOnFirstPageOnly) {
          drawRow(
            currentPage,
            startX,
            currentY,
            tableWidth,
            headersRowHeight,
            columnWidths,
            headers,
            fontSize,
            boldFont,
            config.cellPadding,
            config.border,
            true
          );
          allLineData.push({
            x: startX,
            y: currentY,
            width: tableWidth,
            height: headersRowHeight,
            cells: headerCellData,
            line: lineCounter,
            page: pageNumber,
            isHeader: true
          });
          lineCounter++;
          currentY -= headersRowHeight;
        }
      }

      const rowCellData = drawRow(
        currentPage,
        startX,
        currentY,
        tableWidth,
        rowHeight,
        columnWidths,
        Object.values(rowData),
        fontSize,
        regularFont,
        config.cellPadding,
        config.border,
        false
      );

      allLineData.push({
        x: startX,
        y: currentY,
        width: tableWidth,
        height: rowHeight,
        cells: rowCellData,
        line: lineCounter,
        page: pageNumber,
        isHeader: false
      });
      lineCounter++;
      currentY -= rowHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    return {
      json: { pages: { width, height }, lines: allLineData },
      pdf: pdfBuffer
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  processCSV,
  extractIdentifiers
};
