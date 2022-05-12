const fs = require('fs');
const PDFDocument = require('pdfkit-table');
const jsonData = require('./data.json');
const labels = require('./column-labels');

// Helpers
/**
 * Converts millimeters to points
 * @param {number} mm millimeters
 * @returns points
 */
function mmToPt(mm) {
  return mm * 2.83;
}

// A4 koko
const documentWidth = 595.28;
const sideMargin = mmToPt(20);
const topMargin = mmToPt(12.5);
const bottomMargin = mmToPt(25);
const contentWidth = documentWidth - sideMargin * 2;
const columnWidth = contentWidth / 4;
const baseFont = 'Helvetica';
const baseFontBold = 'Helvetica-Bold';
const baseFontSize = 12;
const highlightColor = '#ADD2EE';

let doc = new PDFDocument({
  margins: {
    top: topMargin,
    bottom: bottomMargin,
    left: sideMargin,
    right: sideMargin,
  },
  size: 'A4',
  bufferPages: true,
});

doc.pipe(fs.createWriteStream('./document.pdf'));
doc.fontSize(baseFontSize);

/**
 *
 * @param doc - pdfkit document
 * @param {number} spaceFromEdge - how far the right and left sides should be away from the edge (in px)
 * @param {number} linesAboveAndBelow - how much space should be above and below the HR (in lines)
 * https://github.com/foliojs/pdfkit/issues/1035
 */

function addHorizontalRule(doc, spaceFromEdge = 0, linesAboveAndBelow = 0.5) {
  doc.moveDown(linesAboveAndBelow);
  doc
    .moveTo(0 + spaceFromEdge, doc.y)
    .lineTo(contentWidth + sideMargin, doc.y)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(linesAboveAndBelow);
  return doc;
}

const header = (eventcode) => {
  const event = new Date(Date.now());
  const options = {
    //weekday: 'numeric',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };
  const heading = `Tarkastustapahtuman ${eventcode} yhteenveto`;
  const date = `Lähtetetty ${event.toLocaleDateString('fi-FI', options)}`;
  return (
    doc.image('./images/header.png', sideMargin, topMargin, { width: 300 }),
    doc.moveDown(),
    doc
      .font(baseFontBold)
      .text(heading, {
        width: contentWidth,
        continued: true,
      })

      .text(date, { align: 'right' }),
    addHorizontalRule(doc, sideMargin)
  );
};

function createSectionData(data) {
  const sections = data.map((section) => {
    const values = Object.entries(section.data);
    const res = values.reduce((acc, next, index) => {
      if (index % 2 === 0) {
        acc.push(next);
      } else {
        acc[acc.length - 1] = acc[acc.length - 1].concat(next);
      }
      return acc;
    }, []);
    return {
      name: section.tableName,
      rows: res,
    };
  });
  return sections;
}

function createTables() {
  const tables = createSectionData(jsonData);

  const tab = tables.map((table) => {
    const { name, rows } = table;
    const datas = rows.map((row) => {
      let columns = {
        column0: {
          label: '',
        },
        column1: {
          label: '',
          options: {},
        },
        column2: {
          label: '',
        },
        column3: {
          label: '',
          options: {},
        },
      };
      row.forEach((column, index) => {
        columns[`column${index}`].label = labels[column] || column;
        if (index % 2 !== 0) {
          columns[`column${index}`].options.backgroundColor = highlightColor;
          columns[`column${index}`].options.backgroundOpacity = 1;
        }
      });
      return columns;
    });

    const tableOutput = {
      title: name,
      headers: [
        {
          label: '',
          property: 'column0',
          width: columnWidth,
          renderer: null,
        },
        {
          label: '',
          property: 'column1',
          width: columnWidth,
          renderer: null,
        },
        {
          label: '',
          property: 'column2',
          width: columnWidth,
          renderer: null,
        },
        {
          label: '',
          property: 'column3',
          width: columnWidth,
          renderer: null,
        },
      ],
      datas,
    };
    return tableOutput;
  });

  tab.forEach((t, index) => {
    doc.moveDown();
    doc.table(t, {
      hideHeader: true,
      divider: {
        horizontal: { disabled: true },
      },
      padding: { top: 0, right: 10, bottom: 0, left: 3 },
      prepareHeader: () => doc.font(baseFontBold).fontSize(baseFontSize),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font(baseFont).fontSize(baseFontSize);
      },
    });
    addHorizontalRule(doc, sideMargin);
  });
}

header('12345');

createTables();

let pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);

  //Footer: Add page number
  let oldBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0; //Dumb: Have to remove bottom margin in order to write into it
  doc.text(
    `Sivu: ${i + 1} / ${pages.count}`,
    0,
    doc.page.height - oldBottomMargin / 2, // Centered vertically in bottom margin
    { align: 'center' }
  );
  doc.page.margins.bottom = oldBottomMargin; // ReProtect bottom margin
}

doc.end();
