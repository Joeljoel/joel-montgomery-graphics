const $ = id => document.getElementById(id);
let worker, text = '', filename = 'barcodes', busy = false, fileVersion = 0, previewTimer;
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function setBusy(value) { busy = value; $('download').disabled = value; }
function invalidate() { clearTimeout(previewTimer); worker?.terminate(); worker = null; $('settings').hidden = true; setBusy(false); status(''); }
function preview(headers, rows) {
  const table = $('preview'); table.replaceChildren();
  const head = table.createTHead().insertRow();
  headers.forEach(value => { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = value; head.append(cell); });
  const body = table.createTBody();
  rows.forEach(values => { const row = body.insertRow(); values.forEach(value => { row.insertCell().textContent = value; }); });
}
function load() {
  invalidate();
  if (!text) return;
  setBusy(true); status('Reading data…');
  worker = new Worker('./worker.js', {type:'module'});
  worker.onerror = () => { setBusy(false); status('Unable to process the file. Please reload and try again.', true); };
  worker.onmessage = ({data}) => {
    setBusy(false);
    if (data.type === 'error') { status(data.message, true); return; }
    if (data.type === 'loaded') {
      $('source').replaceChildren(new Option('Choose a column', ''));
      data.headers.forEach((h, i) => $('source').add(new Option(h, String(i))));
      $('source').value = data.selected < 0 ? '' : String(data.selected);
      let name = 'BarcodeFormatted', suffix = 2;
      while (data.headers.some(h => h.toLowerCase() === name.toLowerCase())) name = 'BarcodeFormatted_' + suffix++;
      $('name').value = name;
      $('settings').hidden = false;
      $('count').textContent = `${data.count.toLocaleString()} data rows + 1 heading row (${(data.count + 1).toLocaleString()} total). Preview shows the first ${data.preview.length} data rows.`;
      preview(data.headers, data.preview);
      const showLast = () => { const col = $('source').value; $('last-row').textContent = col === '' ? '' : `Last barcode in source (data row ${data.count.toLocaleString()}): ${data.lastRow[Number(col)]}`; };
      $('source').onchange = showLast;
      showLast();
      status(data.selected < 0 ? 'Choose the column containing your barcodes.' : 'Check the selected barcode column, then download.');
    } else {
      preview(data.preview[0], data.preview.slice(1));
      const url = URL.createObjectURL(new Blob([data.bytes], {type:'text/plain;charset=utf-16le'}));
      const a = document.createElement('a'); a.href = url; a.download = filename + '_InDesign.txt'; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status(`Exported ${data.count.toLocaleString()} data rows + 1 heading row. In InDesign, select Unicode and tab-delimited data.`);
    }
  };
  worker.postMessage({type:'load', text, delimiter:$('delimiter').value === '\\t' ? '\t' : ',', hasHeader:$('header').checked});
}
async function readFile(file) {
  invalidate(); text = ''; const version = ++fileVersion;
  if (!file) return;
  status('Reading file…');
  try {
    const buffer = await file.arrayBuffer();
    if (version !== fileVersion) return;
    text = new TextDecoder('utf-8', {fatal:true}).decode(buffer);
    filename = file.name.replace(/\.[^.]+$/, '') || 'barcodes';
    $('paste').value = ''; $('paste').placeholder = `Loaded ${file.name}. Paste here to replace it.`;
    $('delimiter').value = /\.csv$/i.test(file.name) ? ',' : '\\t';
    load();
  } catch { status('Could not read this file as UTF-8. Use a TSV or CSV exported from Google Sheets.', true); }
}
$('drop').onclick = () => $('file').click();
$('file').onchange = () => { readFile($('file').files[0]); $('file').value = ''; };
for (const name of ['dragenter','dragover']) $('drop').addEventListener(name, e => { e.preventDefault(); $('drop').classList.add('drag'); });
$('drop').ondragleave = () => $('drop').classList.remove('drag');
$('drop').ondrop = e => { e.preventDefault(); $('drop').classList.remove('drag'); if (e.dataTransfer.files.length !== 1) { status('Please upload one file at a time.', true); return; } readFile(e.dataTransfer.files[0]); };
$('paste').oninput = () => { ++fileVersion; invalidate(); text = $('paste').value; filename = 'barcodes'; previewTimer = setTimeout(load, 300); };
for (const id of ['header','delimiter']) $(id).onchange = load;
$('download').onclick = () => {
  if (busy || !worker) return;
  if ($('source').value === '') { status('Select a barcode source column.', true); return; }
  setBusy(true); status('Generating barcodes…');
  worker.postMessage({type:'convert', source:Number($('source').value), name:$('name').value});
};
