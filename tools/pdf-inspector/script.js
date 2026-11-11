import { analysePage, summarisePages, formatMm, sizeLabel, BOX_NAMES } from './core.mjs';

const input = document.querySelector('#files');
const dropZone = document.querySelector('#drop-zone');
const choose = document.querySelector('#choose');
const status = document.querySelector('#status');
const resultSection = document.querySelector('#results');
const resultList = document.querySelector('#file-results');
const fileCount = document.querySelector('#file-count');
const clearButton = document.querySelector('#clear');
const exportButton = document.querySelector('#export');
const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_BYTES = 150 * 1024 * 1024;
const reports = [];

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = String(text);
  return el;
}

function append(parent, ...children) {
  parent.append(...children);
  return parent;
}

function makePill(text, tone) {
  return element('span', 'pill' + (tone ? ' ' + tone : ''), text);
}

function byteLabel(bytes) {
  if (bytes < 1024 * 1024) return formatMm(bytes / 1024) + ' KB';
  return formatMm(bytes / (1024 * 1024)) + ' MB';
}

function metric(label, value, note) {
  const container = element('div', 'metric');
  append(container, element('div', 'metric-label', label), element('p', 'metric-value', value),
    element('div', 'metric-sub', note));
  return container;
}

function edgeSummary(bleed) {
  if (!bleed) return 'Bleed not defined';
  const edges = ['top', 'right', 'bottom', 'left'];
  if (edges.every(key => Math.abs(bleed[key] - bleed.top) < 0.05)) {
    return formatMm(bleed.top) + ' mm on all sides';
  }
  return edges.map(key => key[0].toUpperCase() + ': ' + formatMm(bleed[key])).join(' · ') + ' mm';
}

function edgeSection(page, mixed) {
  const section = element('section', 'bleed-section');
  const title = element('div', 'bleed-title');
  title.append(element('strong', '', 'Bleed beyond trim'));
  title.append(makePill(page.bleed ? 'Defined boxes' : 'Not confirmed', page.bleed ? 'good' : 'warn'));
  section.append(title);
  if (page.bleed) {
    const grid = element('div', 'edge-grid');
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      append(grid, append(element('div', 'edge-item'), element('span', '', edge[0].toUpperCase() + edge.slice(1)),
        element('b', '', formatMm(page.bleed[edge]) + ' mm')));
    }
    section.append(grid);
  } else {
    section.append(element('p', 'file-meta', 'Both an explicit TrimBox and BleedBox are needed to calculate reliable bleed.'));
  }
  if (mixed) section.append(element('p', 'file-meta', 'These are page 1 values. Other pages differ; expand them below.'));
  return section;
}

function warningsList(messages) {
  const list = element('div', 'notice-list');
  messages.forEach(message => list.append(element('p', 'notice', message)));
  return list;
}

function svgNode(tag, attributes = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
  return el;
}

function diagram(page) {
  // A geometry diagram, not a rendered preview of the artwork.
  const area = element('div', 'diagram-panel');
  const svg = svgNode('svg', { viewBox: '0 0 290 250', class: 'box-diagram', role: 'img',
    'aria-label': 'Diagram of MediaBox, CropBox, BleedBox and TrimBox' });
  const boxes = page.boxes;
  const boxList = BOX_NAMES.map(name => boxes[name]);
  const minX = Math.min(...boxList.map(box => box.x));
  const minY = Math.min(...boxList.map(box => box.y));
  const maxX = Math.max(...boxList.map(box => box.x + box.width));
  const maxY = Math.max(...boxList.map(box => box.y + box.height));
  const scale = Math.min(248 / (maxX - minX), 205 / (maxY - minY));
  const left = 21 + (248 - (maxX - minX) * scale) / 2;
  const top = 12 + (205 - (maxY - minY) * scale) / 2;
  const styles = {
    media: { fill: '#e8edf3', stroke: '#9faebe', 'stroke-width': 1.6 },
    crop: { fill: 'none', stroke: '#777f89', 'stroke-dasharray': '5 4', 'stroke-width': 1.4 },
    bleed: { fill: '#6dafff', 'fill-opacity': '.22', stroke: '#2a78d4', 'stroke-width': 2 },
    trim: { fill: '#ffffff', 'fill-opacity': '.58', stroke: '#1c2e43', 'stroke-width': 1.8 },
    art: { fill: 'none', stroke: '#ad79b6', 'stroke-dasharray': '2 4', 'stroke-width': 1 }
  };
  for (const name of ['media', 'crop', 'bleed', 'trim']) {
    const box = boxes[name];
    const rect = svgNode('rect', { x: left + (box.x - minX) * scale,
      y: top + (maxY - box.y - box.height) * scale,
      width: box.width * scale, height: box.height * scale, ...styles[name] });
    rect.append(svgNode('title'));
    rect.firstChild.textContent = name[0].toUpperCase() + name.slice(1) + 'Box';
    svg.append(rect);
  }
  // A separate legend avoids ambiguities when two boxes share a boundary.
  const legend = element('div', 'diagram-caption', 'Grey: Media · Dashed: Crop · Blue: Bleed · Dark: Trim');
  append(area, svg, legend, element('p', 'diagram-caption',
    page.rotation ? 'Box coordinates before ' + page.rotation + '° page rotation' : 'Schematic of PDF page boxes'));
  return area;
}

function pageTable(page) {
  const wrap = element('div');
  const table = element('table', 'box-table');
  const thead = element('thead');
  append(thead, append(element('tr'), element('th', '', 'Page box'),
    element('th', '', 'Dimensions'), element('th', '', 'Source')));
  table.append(thead);
  const tbody = element('tbody');
  const fallback = { trim: 'CropBox fallback', bleed: 'CropBox fallback',
    crop: 'MediaBox fallback', art: 'CropBox fallback', media: 'Defined / inherited' };
  for (const name of BOX_NAMES) {
    const row = element('tr');
    const label = name[0].toUpperCase() + name.slice(1) + 'Box';
    append(row, element('th', '', label), element('td', '', sizeLabel(page.sizes[name])),
      element('td', '', page.explicit[name] ? 'Defined' : fallback[name]));
    tbody.append(row);
  }
  table.append(tbody);
  wrap.append(table);
  if (page.userUnit !== 1 || page.rotation !== 0) {
    wrap.append(element('p', 'diagram-caption',
      'Page rotation: ' + page.rotation + '° · UserUnit: ' + formatMm(page.userUnit)));
  }
  if (page.warnings.length) {
    const list = element('ul', 'page-notes');
    page.warnings.forEach(message => list.append(element('li', '', message)));
    wrap.append(list);
  }
  return wrap;
}

function renderPageRow(page, index) {
  const details = element('details', 'page-row');
  const summary = element('summary');
  append(summary, element('span', 'page-number', 'Page ' + (index + 1)),
    element('span', 'page-size', sizeLabel(page.sizes.trim)),
    element('span', 'page-bleed', edgeSummary(page.bleed)));
  if (page.warnings.length) summary.append(makePill(page.warnings.length + ' note' +
    (page.warnings.length > 1 ? 's' : ''), 'warn'));
  details.append(summary);
  // Only construct the diagrams and tables when requested, even for long PDFs.
  details.addEventListener('toggle', () => {
    if (!details.open || details.querySelector('.page-content')) return;
    const content = element('div', 'page-content');
    append(content, diagram(page), pageTable(page));
    details.append(content);
  });
  return details;
}

function renderReport(report) {
  const card = element('article', 'file-card');
  const head = element('header', 'file-heading');
  const identity = element('div');
  append(identity, element('h3', '', report.name),
    element('p', 'file-meta', byteLabel(report.bytes) +
      (report.pages ? ' · ' + report.pages.length + ' page' + (report.pages.length === 1 ? '' : 's') : '')));
  const pills = element('div', 'pills');
  if (report.error) {
    pills.append(makePill('Could not inspect', 'warn'));
    append(head, identity, pills);
    append(card, head, element('p', 'error-text', report.error));
    return card;
  }
  const first = report.pages[0];
  if (report.summary.mixedSizes) pills.append(makePill('Mixed page sizes', 'warn'));
  if (report.summary.mixedBleed) pills.append(makePill('Mixed bleed', 'warn'));
  if (report.summary.warningPages) pills.append(makePill(report.summary.warningPages + ' page(s) with notes', 'warn'));
  if (!pills.children.length) pills.append(makePill('Boxes defined', 'good'));
  append(head, identity, pills);
  card.append(head);
  const overview = element('div', 'overview');
  append(overview, metric('Finished size · TrimBox', sizeLabel(first.sizes.trim),
      first.explicit.trim ? 'Explicitly defined · page 1' : 'CropBox fallback · page 1'),
    metric('Visible size · CropBox', sizeLabel(first.sizes.crop),
      first.explicit.crop ? 'Explicitly defined · page 1' : 'MediaBox fallback · page 1'),
    metric('With bleed · BleedBox', first.explicit.bleed ? sizeLabel(first.sizes.bleed) : 'Not defined',
      first.explicit.bleed ? 'Explicitly defined · page 1' : 'Bleed cannot be confirmed'));
  card.append(overview);
  card.append(edgeSection(first, report.summary.mixedBleed));
  const notices = [];
  if (report.summary.mixedSizes) notices.push('Page dimensions vary across this PDF.');
  if (report.summary.mixedBleed) notices.push('Bleed values or bleed-box definitions vary across pages.');
  if (report.summary.warningPages) notices.push(report.summary.warningPages +
    ' page(s) have notes. Expand individual pages to see exactly what is missing or unusual.');
  if (notices.length) card.append(warningsList(notices));
  const pagesLabel = element('div', 'pages-heading', 'Page-by-page details');
  const pages = element('div', 'page-rows');
  report.pages.forEach((page, index) => pages.append(renderPageRow(page, index)));
  append(card, pagesLabel, pages);
  return card;
}

function render() {
  resultSection.hidden = reports.length === 0;
  fileCount.textContent = '(' + reports.length + ')';
  exportButton.disabled = !reports.some(report => report.pages);
  resultList.replaceChildren(...reports.map(renderReport));
}

async function inspectFiles(files) {
  if (!files.length) return;
  const library = window.PDFLib;
  let failures = 0;
  for (const file of files) {
    status.textContent = 'Inspecting ' + file.name + '…';
    // Let the status paint before parsing large documents.
    await new Promise(resolve => setTimeout(resolve, 0));
    const report = { name: file.name, bytes: file.size, pages: null, summary: null, error: null };
    try {
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')
        throw new Error('Please select PDF files only.');
      if (file.size > MAX_BYTES)
        throw new Error('This file exceeds the 150 MB browser processing limit.');
      if (!library || !library.PDFDocument)
        throw new Error('The PDF parser could not load. Check your connection and reload the page.');
      const bytes = await file.arrayBuffer();
      const doc = await library.PDFDocument.load(bytes, { updateMetadata: false });
      report.pages = doc.getPages().map(page => analysePage(page, library));
      if (!report.pages.length) throw new Error('This PDF has no pages.');
      report.summary = summarisePages(report.pages);
    } catch (error) {
      failures++;
      const message = String(error?.message || error);
      report.error = /encrypted|password/i.test(message)
        ? 'This PDF is encrypted or password-protected. Please supply an unlocked copy.'
        : message;
      report.pages = null;
    }
    reports.push(report);
    render();
  }
  status.textContent = files.length + ' file(s) processed' +
    (failures ? ' · ' + failures + ' could not be inspected.' : '. All PDF data stayed in your browser.');
}

choose.addEventListener('click', () => input.click());
input.addEventListener('change', () => {
  inspectFiles(Array.from(input.files || []));
  input.value = '';
});
dropZone.addEventListener('click', event => {
  if (event.target.closest('button')) return;
  input.click();
});
for (const name of ['dragenter', 'dragover']) {
  dropZone.addEventListener(name, event => {
    event.preventDefault();
    dropZone.classList.add('is-over');
  });
}
dropZone.addEventListener('dragleave', event => {
  if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('is-over');
});
dropZone.addEventListener('drop', event => {
  event.preventDefault();
  dropZone.classList.remove('is-over');
  inspectFiles(Array.from(event.dataTransfer?.files || []));
});
clearButton.addEventListener('click', () => {
  reports.length = 0;
  render();
  status.textContent = '';
});

function csvQuote(value) {
  const raw = String(value ?? '');
  // Protect spreadsheet users from formulas in untrusted filenames.
  const safe = /^[=+@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
exportButton.addEventListener('click', () => {
  const headers = ['File', 'Page', 'TrimBox (mm)', 'CropBox (mm)', 'BleedBox (mm)',
    'MediaBox (mm)', 'ArtBox (mm)', 'Top bleed (mm)', 'Right bleed (mm)',
    'Bottom bleed (mm)', 'Left bleed (mm)', 'Trim defined', 'Bleed defined',
    'Rotation (degrees)', 'Notes'];
  const rows = [headers];
  reports.filter(report => report.pages).forEach(report => report.pages.forEach((page, i) => {
    rows.push([report.name, i + 1, ...BOX_NAMES.map(name => sizeLabel(page.sizes[name])),
      ...['top', 'right', 'bottom', 'left'].map(edge => page.bleed ? formatMm(page.bleed[edge]) : ''),
      page.explicit.trim ? 'Yes' : 'No', page.explicit.bleed ? 'Yes' : 'No',
      page.rotation, page.warnings.join('; ')]);
  }));
  const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvQuote).join(',')).join('\r\n')],
    { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pdf-inspector-report.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
