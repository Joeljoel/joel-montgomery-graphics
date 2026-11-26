// Offset only the sides of a convex clip that coincide with the finished page.
// Intersections of adjacent sides preserve the angles of rotated image masks.
function expandPolygon(points, trim, bleed) {
  const tolerance = 0.002;
  const sides = points.map(([x,y], i) => {
    const [ex,ey] = points[(i+1) % points.length];
    const dx = ex-x, dy = ey-y;
    let shiftX = 0, shiftY = 0;
    if (Math.abs(dx) < tolerance) {
      if (Math.abs(x-trim.x) < tolerance) shiftX = -bleed;
      else if (Math.abs(x-trim.x-trim.width) < tolerance) shiftX = bleed;
    }
    if (Math.abs(dy) < tolerance) {
      if (Math.abs(y-trim.y) < tolerance) shiftY = -bleed;
      else if (Math.abs(y-trim.y-trim.height) < tolerance) shiftY = bleed;
    }
    return {x:x+shiftX,y:y+shiftY,dx,dy,shifted:!!(shiftX || shiftY)};
  });
  if (!sides.some(s => s.shifted)) return;
  const vertices = [];
  let winding;
  for (const [i,b] of sides.entries()) {
    const a = sides[(i+sides.length-1)%sides.length];
    const cross = a.dx*b.dy-a.dy*b.dx;
    if (Math.abs(cross)<1e-8 || (winding && winding !== Math.sign(cross))) return;
    winding = Math.sign(cross);
    const t = ((b.x-a.x)*b.dy-(b.y-a.y)*b.dx)/cross;
    vertices.push([a.x+t*a.dx,a.y+t*a.dy]);
  }
  // Reject self-intersecting paths as well as concave ones.
  if (sides.some((s, i) => points.some(([x,y]) =>
    winding*(s.dx*(y-points[i][1])-s.dy*(x-points[i][0])) < -tolerance))) return;
  return vertices.map(([x,y],i) => x.toFixed(6)+' '+y.toFixed(6)+(i?' l':' m')).join('\n')+'\nh';
}

export function revealTrimClips(page, trim, bleed, lib) {
  const contents = page.node.Contents();
  const streams = contents instanceof lib.PDFArray
    ? contents.asArray().map(ref => page.doc.context.lookup(ref)) : [contents];
  let source = '';
  try {
    for (const stream of streams) {
      const bytes = lib.decodePDFRawStream(stream).decode();
      if (source.length + bytes.length > 8*1024*1024) return;
      for (let i=0;i<bytes.length;i+=8192)
        source += String.fromCharCode(...bytes.subarray(i,i+8192));
      source += '\n';
    }
  } catch { return; }
  // Work on a same-length lexical copy so strings/comments never match code.
  // A binary inline image can contain arbitrary bytes that look like operators.
  if (/(?:^|[\s>\]])BI(?=\s|\/)/.test(source)) return;
  const pieces = [];
  let cursor = 0;
  // A single '<' begins a hex string; '<<' begins a dictionary.
  const delimiters = /\(|%|<<|</g;
  for (let token; (token = delimiters.exec(source));) {
    if (token[0] === '<<') continue;
    let end = delimiters.lastIndex;
    if (token[0] === '(') {
      let nesting = 1;
      while (end < source.length && nesting) {
        const c = source[end++];
        if (c === '\\') end++;
        else if (c === '(') nesting++;
        else if (c === ')') nesting--;
      }
      if (nesting) return;
    } else if (token[0] === '<') {
      end = source.indexOf('>',end) + 1;
      if (!end) return;
    } else {
      while (end < source.length && !'\r\n'.includes(source[end])) end++;
    }
    const placeholder = token[0] === '%' ? ' ' : '_';
    pieces.push(source.slice(cursor,token.index), placeholder.repeat(end-token.index));
    cursor = delimiters.lastIndex = end;
  }
  pieces.push(source.slice(cursor));
  const code = pieces.join('');
  const stack = [];
  let transformed = false;
  const edits = [];
  const op = /(?:^|\s)(q|Q|cm)(?=\s|$)/g;
  for (let m; (m = op.exec(code));) {
    if (m[1] === 'cm') { transformed = true; continue; }
    if (m[1] === 'Q') { transformed = stack.pop() ?? false; continue; }
    stack.push(transformed);
    if (transformed) continue;
    const start = op.lastIndex;
    const path = /^\s*((?:[-+.\d]+[ \t]+){4}re|(?:[-+.\d]+[ \t]+[-+.\d]+[ \t]+m\s+)(?:[-+.\d]+[ \t]+[-+.\d]+[ \t]+l\s+){2,12}h)\s+W\*?\s+n\b/.exec(code.slice(start,start+1200));
    if (!path) continue;
    const values = path[1].match(/[-+.\d]+/g).map(Number);
    if (!values.every(Number.isFinite)) continue;
    let points = [];
    if (path[1].endsWith('re')) {
      const [x,y,w,h] = values;
      points = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
    } else for(let j=0;j<values.length;j+=2) points.push(values.slice(j,j+2));
    const replacement = expandPolygon(points,trim,bleed);
    if (replacement) {
      const pos = start+path[0].indexOf(path[1]);
      edits.push([pos,pos+path[1].length,replacement]);
    }
  }
  if (!edits.length) return;
  const parts = [];
  let pos = 0;
  for (const [from,to,value] of edits) { parts.push(source.slice(pos,from),value); pos=to; }
  parts.push(source.slice(pos));
  const bytes = Uint8Array.from(parts.join(''), c => c.charCodeAt(0));
  page.node.set(lib.PDFName.of('Contents'),page.doc.context.register(page.doc.context.flateStream(bytes)));
}
