const fs = require('fs');
const PDFDocument = require('pdfkit-table');
const jsonData = require('./data.json');
const labels = require('./column-labels');

let doc = new PDFDocument({ margin: 30, size: 'A4' });
doc.pipe(fs.createWriteStream('./document.pdf'));
doc.fontSize(16);

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
      name: section.sectionName,
      rows: res,
    };
  });
  return sections;
}

// A4 koko
const documentWidth = 595.28;
const margin = 30;
const contentWidth = documentWidth - margin * 2;
const columnWidth = contentWidth / 4;

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
          columns[`column${index}`].options.backgroundColor = '#D5E9F6';
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

  tab.forEach((t) => {
    doc.table(t, {
      hideHeader: true,
      divider: {
        horizontal: { disabled: true },
      },
      padding: 5,
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font('Helvetica').fontSize(12);
      },
    });
  });
}

createTables();

doc.end();
