import { analysePage, summarisePages, formatMm, sizeLabel, BOX_NAMES } from './core.mjs';

const input = document.querySelector('#files');
const dropZone = document.querySelector('#drop-zone');
const choose = document.querySelector('#choose');
const status = document.querySelector('#status');
const resultSection = document.querySelector('#results');
const resultList = document.querySelector('#file-results');
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

const EDGES = ['top', 'right', 'bottom', 'left'];

function uniformBleed(bleed) {
  return bleed && EDGES.every(key => Math.abs(bleed[key] - bleed.top) < 0.05);
}

function measurement(value, unit = 'mm') {
  const node = element('p', 'metric-value');
  append(node, element('span', '', value), element('span', 'metric-unit', unit));
  return node;
}

function trimMetric(page) {
  const section = element('section', 'metric trim-metric');
  section.append(element('h4', 'metric-label', 'Trim size'));
  if (page.explicit.trim) {
    const size = page.sizes.trim;
    section.append(measurement(formatMm(size.width) + ' × ' + formatMm(size.height)));
  } else {
    section.append(element('p', 'metric-value metric-undefined', 'Not defined'));
    section.append(element('p', 'metric-sub', 'CropBox fallback: ' + sizeLabel(page.sizes.trim)));
  }
  return section;
}

function edgeSummary(bleed) {
  if (!bleed) return 'Not confirmed';
  if (uniformBleed(bleed)) return formatMm(bleed.top) + ' mm on all sides';
  return EDGES.map(key => key[0].toUpperCase() + ': ' + formatMm(bleed[key])).join(' · ') + ' mm';
}

function bleedMetric(page) {
  const section = element('section', 'metric bleed-metric');
  section.append(element('h4', 'metric-label', 'Bleed'));
  if (!page.bleed) {
    section.append(element('p', 'metric-value metric-undefined', 'Not confirmed'));
    section.append(element('p', 'metric-sub', 'Explicit TrimBox and BleedBox required'));
  } else if (uniformBleed(page.bleed)) {
    section.append(measurement(formatMm(page.bleed.top)));
    section.append(element('p', 'metric-sub', 'On all sides'));
  } else {
    const grid = element('dl', 'edge-grid');
    for (const edge of EDGES) {
      const item = element('div', 'edge-item');
      append(item, element('dt', '', edge[0].toUpperCase() + edge.slice(1)),
        append(element('dd'), element('span', '', formatMm(page.bleed[edge])), element('span', 'metric-unit', 'mm')));
      grid.append(item);
    }
    section.append(grid, element('p', 'metric-sub', 'Uneven bleed · beyond trim'));
  }
  return section;
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

function renderPageRow(page, index, single) {
  const details = element('details', 'page-row');
  const summary = element('summary', single ? 'single-page' : '');
  append(summary, element('span', 'page-number', 'Page ' + (index + 1)),
    append(element('span', 'page-size'), element('span', 'row-label', 'Trim size'),
      element('span', '', page.explicit.trim ? sizeLabel(page.sizes.trim) : 'Not defined')),
    append(element('span', 'page-bleed'), element('span', 'row-label', 'Bleed'),
      element('span', '', edgeSummary(page.bleed))));
  if (single) summary.replaceChildren(element('span', 'page-number', 'Page details'));
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

function bleedEditor(report) {
  const editor = element('section', 'bleed-editor');
  const form = element('form', 'bleed-controls');
  editor.append(element('h3', 'bleed-title', 'Download with custom bleed'), form);
  const amount = element('input');
  amount.type = 'number';
  amount.min = '0';
  amount.step = 'any';
  amount.required = true;
  amount.value = '3';
  const marks = element('input');
  marks.type = 'checkbox';
  marks.checked = true;
  const prepare = element('button', 'bleed-download', 'Download');
  const recover = element('input');
  recover.type = 'checkbox';
  recover.checked = true;
  const message = element('p', 'status');
  message.setAttribute('role', 'status');
  let worker;
  function reset() {
    worker?.terminate();
    worker = null;
    prepare.disabled = false;
    message.textContent = '';
  }
  report.dispose = reset;
  form.addEventListener('input', reset);
  form.onsubmit = event => {
    event.preventDefault();
    const mm = amount.valueAsNumber;
    reset();
    prepare.disabled = true;
    message.textContent = 'Preparing PDF…';
    worker = new Worker(new URL('inspect-worker.mjs', import.meta.url), { type: 'module' });
    worker.onerror = () => { reset(); message.textContent = 'Could not prepare PDF.'; };
    worker.onmessage = ({ data }) => {
      reset();
      if (data.error) { message.textContent = data.error; return; }
      const url = URL.createObjectURL(new Blob([data.bytes], { type: 'application/octet-stream' }));
      const download = element('a');
      download.href = url;
      download.download = report.name.replace(/\.pdf$/i, '') + '-' + mm + 'mm.pdf';
      download.target = '_self';
      download.hidden = true;
      document.body.append(download);
      download.click();
      download.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
    worker.postMessage({ action: 'bleed', source: report.file, mm, marks: marks.checked,
      recover: recover.checked, recreateOutline: report.hasRasterOutline });
  };
  const field = element('div', 'bleed-amount');
  const steppers = element('div', 'bleed-steppers');
  for (const delta of [1, -1]) {
    const stepper = element('button');
    stepper.type = 'button';
    stepper.setAttribute('aria-label', delta > 0 ? 'Increase bleed' : 'Decrease bleed');
    stepper.onclick = () => {
      amount.value = String(Math.max(0, Number(((amount.valueAsNumber || 0) + delta).toFixed(10))));
      amount.dispatchEvent(new Event('input', { bubbles: true }));
    };
    steppers.append(stepper);
  }
  field.append(append(element('label', '', 'Bleed (mm)'), amount), steppers);
  form.append(field,
    append(element('label', 'bleed-check'), marks, 'Include crop marks'), prepare);
  if (report.illustrator) form.insertBefore(append(element('label', 'bleed-check'), recover, 'Reveal Illustrator artwork at trim edges'), prepare);
  if (report.hasRasterOutline) {
    const warning = element('p', 'outline-warning',
      'Clipped outlines detected in PDF. These will be recreated experimentally, please check these after downloading.');
    const icon = element('span', 'outline-info', 'i');
    icon.setAttribute('aria-hidden', 'true');
    warning.prepend(icon);
    editor.append(warning);
    amount.addEventListener('input', () => { warning.hidden = !(amount.valueAsNumber > 0); });
  }
  editor.append(message);
  return editor;
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
  if (!pills.children.length && report.summary.warningPages) pills.append(makePill('Review page notes', 'warn'));
  append(head, identity, pills);
  card.append(head);
  const scope = element('div', 'overview-scope');
  const mixed = report.summary.mixedSizes || report.summary.mixedBleed;
  // Only claim a document-wide measurement when definitions also agree.
  const sameTrimSource = report.pages.every(page => page.explicit.trim === first.explicit.trim);
  scope.append(element('span', '', report.pages.length === 1 ? 'Page 1' :
    mixed || !sameTrimSource ? 'Page 1 of ' + report.pages.length : 'All ' + report.pages.length + ' pages'));
  if (mixed || !sameTrimSource) scope.append(element('span', 'scope-note', 'Values vary · compare pages below'));
  if (report.pages.length > 1) card.append(scope);
  const overview = element('div', 'overview');
  append(overview, trimMetric(first), bleedMetric(first));
  card.append(overview);
  card.append(bleedEditor(report));
  const pagesLabel = element('div', 'pages-heading', 'Page details');
  const pages = element('div', 'page-rows');
  report.pages.forEach((page, index) => pages.append(renderPageRow(page, index, report.pages.length === 1)));
  if (report.pages.length > 1) card.append(pagesLabel);
  card.append(pages);
  return card;
}

function render(report) {
  resultSection.hidden = reports.length === 0;
  dropZone.classList.toggle('has-results', reports.length > 0);
  if (report) resultList.append(renderReport(report));
  else resultList.replaceChildren();
}

let generation = 0;
let queue = Promise.resolve();
let cancelActive;
function inspectFiles(files) {
  if (!files.length) return;
  clearReports();
  const current = generation;
  queue = queue.then(() => processFiles(files, current));
}
async function processFiles(files, current) {
  if (!files.length) return;

  let failures = 0;
  for (const file of files) {
    if (current !== generation) return;
    status.textContent = 'Inspecting ' + file.name + '…';
    // Let the status paint before parsing large documents.
    await new Promise(resolve => setTimeout(resolve, 0));
    if (current !== generation) return;
    const report = { file, name: file.name, bytes: file.size, pages: null, summary: null, error: null };
    try {
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')
        throw new Error('Please select PDF files only.');
      if (file.size > MAX_BYTES)
        throw new Error('This file exceeds the 150 MB browser processing limit.');
      const worker = new Worker(new URL('inspect-worker.mjs', import.meta.url), {type: 'module'});
      try {
        const result = await new Promise((resolve, reject) => {
          cancelActive = () => reject(new Error('Cancelled'));
          worker.onmessage = ({data}) => data.error ? reject(new Error(data.error)) : resolve(data);
          worker.onerror = () => reject(new Error('The PDF parser could not load.'));
          worker.postMessage(file);
        });
        Object.assign(report, result);
      } finally {
        worker.terminate();
        cancelActive = null;
      }
    } catch (error) {
      failures++;
      const message = String(error?.message || error);
      report.error = /encrypted|password/i.test(message)
        ? 'This PDF is encrypted or password-protected. Please supply an unlocked copy.'
        : message;
      report.pages = null;
    }
    if (current !== generation) return;
    reports.push(report);
    render(report);
  }
  status.textContent = failures ? failures + ' failed to load.' : '';
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
function clearReports() {
  generation++;
  cancelActive?.();
  reports.forEach(report => report.dispose?.());
  reports.length = 0;
  render();
  status.textContent = '';
}
