// Illustrator sometimes crops filled rectangles in the PDF stream but keeps
// their original paths in the editable data. Only accept an unambiguous match.
import { Decompress } from './vendor/fzstd.mjs';

const number = '[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
const rect = new RegExp('^(' + Array(4).fill(number).join('\\s+') + ')\\s+re$');
const near = (a, b) => Math.abs(a - b) < 0.002;
const bounds = (x, y, w, h) => [Math.min(x, x+w), Math.min(y, y+h), Math.max(x, x+w), Math.max(y, y+h)];

function originalRectangles(ai, trim, lib) {
  const name = lib.PDFName.of;
  const data = ai.lookup(name('Private'));
  const chunks = [];
  let total = 0;
  const decode = new Decompress(chunk => {
    total += chunk.length;
    if (total > 16 * 1024 * 1024) throw new Error('Illustrator data exceeds recovery limit');
    chunks.push(new TextDecoder('latin1').decode(chunk));
  });
  for (let i = 1; i <= 256; i++) {
    const stream = data.lookup(name('AIPDFPrivateData' + i));
    if (!stream) break;
    let bytes = stream.contents;
    if (i === 1) {
      const prefix = '%AI24_ZStandard_Data';
      if (!new TextDecoder().decode(bytes.subarray(0, prefix.length)).startsWith(prefix)) return [];
      bytes = bytes.subarray(prefix.length);
    }
    decode.push(bytes);
  }
  decode.push(new Uint8Array(), true);
  const lines = chunks.join('').split(/\r\n|[\r\n]/);
  const board = lines.find(line => line.startsWith('%AI3_Cropmarks:'))?.slice(15).trim().split(/\s+/).map(Number);
  if (!board || !near(board[2]-board[0], trim.width) || !near(board[3]-board[1], trim.height)) return [];
  const rectangles = [];
  const point = new RegExp('^(' + number + ') (' + number + ') ([mL])$');
  for (let i = 5; i < lines.length; i++) {
    if (lines[i] !== 'f') continue;
    const points = lines.slice(i-5, i).map(line => line.match(point));
    if (rectangles.length > 4096) return [];
    if (points.some((p,j) => !p || p[3] !== (j ? 'L' : 'm'))) continue;
    const xs = points.map(p => +p[1] - board[0] + trim.x);
    const ys = points.map(p => +p[2] - board[1] + trim.y);
    if (new Set(xs).size !== 2 || new Set(ys).size !== 2 || xs[4] !== xs[0] || ys[4] !== ys[0]) continue;
    if (xs.slice(1).some((x,j) => (x === xs[j]) === (ys[j+1] === ys[j]))) continue;
    rectangles.push([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
  }
  return rectangles;
}

export function revealIllustrator(page, trim, bleed, lib) {
  const name = lib.PDFName.of;
  const ai = page.node.lookup(name('PieceInfo'))?.lookup?.(name('Illustrator'));
  const stream = page.node.Contents();
  if (!ai || !(stream instanceof lib.PDFRawStream)) return;
  let bytes;
  try { bytes = lib.decodePDFRawStream(stream).decode(); } catch { return; }
  if (bytes.length > 8 * 1024 * 1024 || bytes.some(b => b > 126 || (b < 32 && ![9,10,13].includes(b)))) return;
  const source = new TextDecoder().decode(bytes);
  // Restrict rewriting to simple Illustrator line-oriented streams. Do not
  // interpret inline images or multiline string data as drawing operators.
  if (/\bBI\b|[<>%]/.test(source.replace(/\((?:\\.|[^()\\\r\n])*\)/g, ''))) return;
  const lines = source.split(/\r\n|[\r\n]/);
  if (lines.some(line => /[()]/.test(line.replace(/\((?:\\.|[^()\\])*\)/g,'')))) return;
  const edges = bounds(trim.x,trim.y,trim.width,trim.height);
  let originals = [];
  try { originals = originalRectangles(ai, trim, lib); } catch { /* Private data is optional. */ }
  const stack = [];
  let transformed = false, changed = false;
  for (let i=0; i<lines.length; i++) {
    const line = lines[i].trim();
    const match = !transformed && rect.exec(line);
    if (match) {
      const [x,y,w,h] = match[1].split(/\s+/).map(Number);
      const box = bounds(x,y,w,h);
      let target;
      if (/^W\*?\s+n$/.test(lines[i+1]?.trim()) && lines[i-1]?.trim() === 'q') {
        target = box.map((v,j) => near(v,edges[j]) ? v + (j<2 ? -bleed : bleed) : v);
      } else if (lines[i+1]?.trim() === 'f') {
        const matches = originals.filter(b => b.every((v,j) =>
          near(j<2 ? Math.max(v,edges[j]) : Math.min(v,edges[j]),box[j])));
        if (matches.length === 1) target = matches[0];
      }
      if (target && target.some((v,j) => !near(v,box[j]))) {
        lines[i] = [target[0],target[1],target[2]-target[0],target[3]-target[1]].map(v => v.toFixed(5)).join(' ') + ' re';
        changed = true;
      }
    }
    for (const token of line.replace(/\((?:\\.|[^()\\])*\)/g,'').split(/\s+/)) {
      if (token === 'q') stack.push(transformed);
      if (token === 'Q') transformed = stack.pop() ?? false;
      if (token === 'cm') transformed = true;
    }
  }
  if (changed) page.node.set(name('Contents'),page.doc.context.register(page.doc.context.flateStream(lines.join('\n'))));
}
