// Offset only the sides of a convex clip that coincide with the finished page.
// Intersections of adjacent sides preserve the angles of rotated image masks.
function expandPolygon(points, trim, bleed, edgeTolerance = 0.002) {
  const tolerance = 0.002;
  const sides = points.map(([x,y], i) => {
    const [ex,ey] = points[(i+1) % points.length];
    const dx = ex-x, dy = ey-y;
    let shiftX = 0, shiftY = 0;
    if (Math.abs(dx) < tolerance) {
      if (Math.abs(x-trim.x) < edgeTolerance) shiftX = trim.x - bleed - x;
      else if (Math.abs(x-trim.x-trim.width) < edgeTolerance) shiftX = trim.x + trim.width + bleed - x;
    }
    if (Math.abs(dy) < tolerance) {
      if (Math.abs(y-trim.y) < edgeTolerance) shiftY = trim.y - bleed - y;
      else if (Math.abs(y-trim.y-trim.height) < edgeTolerance) shiftY = trim.y + trim.height + bleed - y;
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
  return vertices;
}

function polygonPath(vertices) {
  return vertices.map(([x,y],i) => x.toFixed(6)+' '+y.toFixed(6)+(i?' l':' m')).join('\n')+'\nh';
}

// Some print exports begin with a scaled page, a rectangular page clip,
// a white backing rectangle, and one oversized background image.
const numeric = '([-+]?(?:\\d+\\.?\\d*|\\.\\d+))';
const operands = count => Array(count).fill(numeric).join('\\s+');
const backgroundPrefix = new RegExp('^\\s*q\\s+' + operands(6) + '\\s+cm\\s+q\\s+' +
  operands(4) + '\\s+re\\s+W\\*?\\s+n\\s+1\\s+g\\s+' + operands(4) +
  '\\s+re\\s+f\\s+q\\s+' + operands(6) + '\\s+cm\\s+/([A-Za-z0-9_-]+)\\s+Do\\s+Q\\s+Q(?=\\s|$)');

function canExpandBackground(match, page, trim, lib) {
  if (!match) return false;
  const values = match.slice(1, -1).map(Number);
  const [sx, skewY, skewX, sy, tx, ty, x, y, w, h] = values;
  const [iw, iySkew, ixSkew, ih, ix, iy] = values.slice(14);
  if (!values.every(Number.isFinite) || skewY || skewX || iySkew || ixSkew ||
      sx <= 0 || sy <= 0 || iw <= 0 || ih <= 0) return false;

  const left = trim.x, right = left + trim.width;
  const bottom = trim.y, top = bottom + trim.height;
  // Allow up to half a PDF point of page-box rounding on each edge.
  const errors = [x*sx+tx-left, (x+w)*sx+tx-right, y*sy+ty-bottom, (y+h)*sy+ty-top];
  if (errors.some(error => Math.abs(error) > 0.5)) return false;
  if (ix*sx+tx >= left || (ix+iw)*sx+tx <= right ||
      iy*sy+ty >= bottom || (iy+ih)*sy+ty <= top) return false;
  const name = lib.PDFName.of;
  const imageName = match.at(-1);
  const image = page.node.Resources()?.lookup(name('XObject'))?.lookup(name(imageName));
  if (image?.dict?.get(name('Subtype'))?.toString() !== '/Image' ||
      ['Mask', 'SMask', 'ImageMask', 'OC', 'SMaskInData'].some(key => image.dict.has(name(key)))) return false;

  return true;
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
  const prefix = backgroundPrefix.exec(code.slice(0,2048));
  const expandBackground = canExpandBackground(prefix, page, trim, lib);
  const firstMatrix = new RegExp('^\\s*q\\s+' + operands(6) + '\\s+cm(?=\\s)').exec(code);
  const scale = firstMatrix && firstMatrix.slice(1).map(Number);
  const scaledPage = scale && scale.every(Number.isFinite) && scale[0] > 0 && scale[3] > 0 &&
    !scale[1] && !scale[2];
  const stack = [];
  let transformed = false;
  const edits = [];
  const op = /(?:^|\s)(q|Q|cm)(?=\s|$)/g;
  for (let m; (m = op.exec(code));) {
    if (m[1] === 'cm') {
      transformed = scaledPage && op.lastIndex === firstMatrix[0].length ? 'page' : true;
      continue;
    }
    if (m[1] === 'Q') { transformed = stack.pop() ?? false; continue; }
    stack.push(transformed);
    // The leading scale still applies between the background and its sibling
    // objects. Ignore any scope with an additional local transform.
    const inPageSpace = transformed === 'page' &&
      (expandBackground || op.lastIndex >= (prefix?.[0].length ?? 0));
    if (transformed && !inPageSpace) continue;
    const start = op.lastIndex;
    const path = /^\s*((?:[-+.\d]+[ \t]+){4}re|[-+.\d]+[ \t]+[-+.\d]+[ \t]+m(?:\s+[-+.\d]+[ \t]+[-+.\d]+[ \t]+l){2,12}(?:\s+h)?)\s+W\*?\s+n\b/.exec(code.slice(start,start+1200));
    if (!path || /^\s*Q\b/.test(code.slice(start + path[0].length, start + path[0].length + 32))) continue;
    const values = path[1].match(/[-+.\d]+/g).map(Number);
    if (!values.every(Number.isFinite)) continue;
    let points = [];
    if (path[1].endsWith('re')) {
      const [x,y,w,h] = values;
      points = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
    } else for(let j=0;j<values.length;j+=2) points.push(values.slice(j,j+2));
    if (points.length > 3 && points[0].every((v,k) => v === points.at(-1)[k])) points.pop();
    const startIndex = start + path[0].indexOf(path[1]);
    if (inPageSpace) {
      const [sx,,,sy,tx,ty] = scale;
      const mapped = points.map(([x,y]) => [x*sx+tx, y*sy+ty]);
      const expanded = expandPolygon(mapped, trim, bleed, 0.5);
      if (expanded) {
        // Replace the clip in its own coordinates. The original image is
        // painted once, continuously across any fractional trim inset.
        const local = expanded.map(([x,y]) => [(x-tx)/sx, (y-ty)/sy]);
        edits.push([startIndex, startIndex+path[1].length, polygonPath(local)+' ']);
      }
    } else {
      const expanded = expandPolygon(points, trim, bleed);
      if (expanded) edits.push([startIndex, startIndex+path[1].length, polygonPath(expanded)+' ']);
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
