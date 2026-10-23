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

export function table(text, format, header) {
  let rows;
  if (format === 'lines' || (format === 'auto' && !text.includes('\t'))) {
    // Auto treats pasted single-column URLs as literal lines, including commas.
    rows = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).map(x => [x]);
    if (rows.at(-1)?.[0] === '') rows.pop();
  } else rows = parse(text, {tab:'\t', comma:',', semicolon:';'}[format] || '\t');
  if (!rows.length || rows.every(r => r.every(v => v === ''))) throw Error('Add some links or text to get started.');
  const headers = header ? rows.shift() : rows[0].map((_, i) => `Column ${i + 1}`);
  if (!rows.length) throw Error('The file has headings but no data rows.');
  return {headers, rows};
}
export function entries(rows, source, naming, extension) {
  if (source < 0) throw Error('Select the QR content column.');
  const used = new Set(); let renamed = 0;
  const items = rows.map((r, i) => {
    const text = r[source];
    if (!text?.trim()) throw Error(`Data row ${i + 1}: QR content is empty.`);
    const original = naming < 0 ? text : r[naming];
    if (!original?.trim()) throw Error(`Data row ${i + 1}: filename is empty. Select another filename column or fill in the missing value.`);
    let stem = original.normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/\.(png|svg)$/i, '').replace(/[. ]+$/g, '').trim();
    stem = Array.from(stem).slice(0, 100).join('');
    if (!stem || /^\.+$/.test(stem)) stem = 'qr';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)) stem = '_' + stem;
    let name = `${stem}.${extension}`, n = 2;
    while (used.has(name.toLowerCase())) name = `${stem} (${n++}).${extension}`;
    used.add(name.toLowerCase());
    if (name !== `${original}.${extension}`) renamed++;
    return {text, name};
  });
  return {items, renamed};
}
export function svg({size, cells}, {foreground, background, transparent}) {
  let d = '';
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) if(cells[y*size+x]) d+=`M${x+4} ${y+4}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size+8}" height="${size+8}" viewBox="0 0 ${size+8} ${size+8}" shape-rendering="crispEdges">${transparent?'':`<path fill="${background}" d="M0 0h${size+8}v${size+8}H0z"/>`}<path fill="${foreground}" d="${d}"/></svg>`;
}
// ZIP STORE records: UTF-8 names, CRC-32, no compression needed for PNGs.
const crcTable = Uint32Array.from({length:256}, (_, n) => {for(let i=0;i<8;i++) n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export class Archive {
  constructor(){this.parts=[];this.directory=[];this.offset=0;this.count=0;}
  add(name, data){
    if(this.count>=65535 || this.offset+data.length>512*1024*1024) throw Error('This ZIP is too large. Export smaller batches (maximum 65,535 files or 512 MB).');
    const filename=new TextEncoder().encode(name); let crc=0xffffffff;
    for(const b of data) crc=crcTable[(crc^b)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;
    const record=(length, signature)=>{const a=new Uint8Array(length+filename.length);const v=new DataView(a.buffer);v.setUint32(0,signature,true);a.set(filename,length);return [a,v];};
    const [local,l]=record(30,0x04034b50);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,filename.length,true);
    const [central,c]=record(46,0x02014b50);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,filename.length,true);c.setUint32(42,this.offset,true);
    this.parts.push(local,data);this.directory.push(central);this.offset+=local.length+data.length;this.count++;
  }
  finish(){const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,this.count,true);v.setUint16(10,this.count,true);v.setUint32(12,this.directory.reduce((n,a)=>n+a.length,0),true);v.setUint32(16,this.offset,true);return new Blob([...this.parts,...this.directory,end],{type:'application/zip'});}
}
