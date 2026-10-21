export function parse(text, delimiter = '\t') {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else cell += c;
    } else if (c === delimiter || c === '\n' || c === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (c !== delimiter) { rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else if (c === '"' && cell === '' && !closed) quoted = true;
    else { if (closed || c === '"') throw Error('Invalid quoting near row ' + (rows.length + 1)); cell += c; }
  }
  if (quoted) throw Error('Unclosed quoted field.');
  if (cell !== '' || row.length || closed) { row.push(cell); rows.push(row); }
  if (!rows.length) throw Error('No data found.');
  const width = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== width) throw Error(`Row ${i + 1} has ${r.length} columns; expected ${width}.`); });
  return rows;
}
export function encode(input) {
  let sum = 104;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 32 || c > 126) throw Error('Barcode contains characters outside ASCII 32–126.');
    sum += (c - 32) * (i + 1);
  }
  const check = sum % 103;
  return 'Ì' + input + String.fromCharCode(check < 95 ? check + 32 : check + 100) + 'Î';
}
export function prepare(text, delimiter, hasHeader) {
  const rows = parse(text, delimiter);
  const headers = hasHeader ? rows.shift() : rows[0].map((_, i) => `Column${i + 1}`);
  if (!rows.length) throw Error('No data rows found.');
  if (headers.some(h => !h.trim())) throw Error('Each column needs a non-empty heading.');
  if (new Set(headers.map(h => h.toLowerCase())).size !== headers.length) throw Error('Column headings must be unique.');
  const matches = headers.map((h, i) => /^(barcode|barcodevalue)$/.test(h.toLowerCase().replace(/[ _-]/g, '')) ? i : -1).filter(i => i >= 0);
  return {headers, rows, selected: headers.length === 1 ? 0 : matches.length === 1 ? matches[0] : -1};
}
export function convert(headers, rows, source, name) {
  if (!Number.isInteger(source) || source < 0 || source >= headers.length) throw Error('Select a barcode source column.');
  if (!name.trim() || /[\t\r\n]/.test(name)) throw Error('Enter a valid output column name.');
  if (headers.some(h => h.toLowerCase() === name.toLowerCase())) throw Error('That column already exists. Choose a new name to preserve it.');
  const output = [[...headers, name]];
  rows.forEach((r, i) => {
    if (r[source] === '') throw Error(`Data row ${i + 1}: barcode is empty.`);
    let formatted;
    try { formatted = encode(r[source]); } catch (e) { throw Error(`Data row ${i + 1}: ${e.message}`); }
    output.push([...r, formatted]);
  });
  const quote = value => /[\t\r\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
  const text = output.map(r => r.map(quote).join('\t')).join('\r\n') + '\r\n';
  const bytes = new Uint8Array(2 + text.length * 2); bytes[0] = 255; bytes[1] = 254;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); bytes[2 + i * 2] = c & 255; bytes[3 + i * 2] = c >> 8; }
  return {bytes, preview: output.slice(0, 6)};
}
