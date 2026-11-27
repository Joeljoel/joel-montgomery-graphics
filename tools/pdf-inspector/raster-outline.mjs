// A supported export paints a flat-colour silhouette, then its clipped photo,
// in the same scaled page coordinate system. Work in the silhouette's pixels.
const number = '[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)';
const numbers = count => Array(count).fill(number).join('\\s+');
const matrix = '(' + numbers(6) + ')\\s+cm';
const imageDraw = 'q\\s+' + matrix + '\\s+/([\\w-]+)\\s+Do\\s+Q';
const rectangleClip = 'q\\s+(' + numbers(4) + ')\\s+re\\s+W\\*?\\s+n\\s+';
const prefix = new RegExp('^\\s*q\\s+' + matrix + '\\s+' +
  '(?:' + numbers(4) + '\\s+k\\s+' + numbers(4) + '\\s+re\\s+f\\s+)?' +
  '(?:q\\s+' + numbers(6) + '\\s+cm\\s+/[\\w-]+\\s+Do\\s+Q\\s+)?' +
  imageDraw + '\\s+(?:q\\s+' + numbers(4) + '\\s+re\\s+W\\*?\\s+n\\s+Q\\s+)?' +
  rectangleClip + imageDraw + '\\s+Q(?=\\s|$)', 'd');
const values = s => s.trim().split(/\s+/).map(Number);
const uint = (dict, key, lib) => dict.lookup(lib.PDFName.of(key))?.asNumber?.();

// pdf-lib inflates the stream but leaves PNG row prediction in place.
function samples(stream, channels, lib) {
  const dict = stream.dict;
  const get = key => dict.lookup(lib.PDFName.of(key));
  const w = uint(dict,'Width',lib), h = uint(dict,'Height',lib);
  if (!(w > 0 && h > 0 && w*h*channels <= 32e6) ||
      uint(dict,'BitsPerComponent',lib) !== 8 || get('Filter')?.toString() !== '/FlateDecode' ||
      get('Decode') || get('ColorSpace')?.toString() !== (channels === 4 ? '/DeviceCMYK' : '/DeviceGray')) return;
  const params = get('DecodeParms');
  const predictor = params && uint(params,'Predictor',lib);
  const stride = w*channels;
  const raw = lib.decodePDFRawStream(stream).decode();
  if (!predictor || predictor === 1) return raw.length === stride*h ? raw : undefined;
  if (predictor < 10 || predictor > 15 || uint(params,'Columns',lib) !== w ||
      (uint(params,'Colors',lib) ?? 1) !== channels || raw.length !== (stride+1)*h) return;
  const output = new Uint8Array(stride*h);
  for (let row=0; row<h; row++) {
    const start = row*(stride+1), filter = raw[start];
    if (filter > 4) return;
    for (let j=0; j<stride; j++) {
      const i = row*stride+j;
      const a = j >= channels ? output[i-channels] : 0;
      const b = row ? output[i-stride] : 0;
      const c = row && j >= channels ? output[i-stride-channels] : 0;
      let prediction = 0;
      if (filter === 1) prediction = a;
      if (filter === 2) prediction = b;
      if (filter === 3) prediction = (a+b) >> 1;
      if (filter === 4) {
        const p = a+b-c;
        const da = Math.abs(p-a), db = Math.abs(p-b), dc = Math.abs(p-c);
        prediction = da <= db && da <= dc ? a : db <= dc ? b : c;
      }
      output[i] = raw[start+1+j]+prediction;
    }
  }
  return output;
}

function detect(page, lib) {
  const stream = page.node.Contents();
  if (!(stream instanceof lib.PDFRawStream) || stream.contents.length > 2e6) return;
  const bytes = lib.decodePDFRawStream(stream).decode();
  if (bytes.length > 8e6) return;
  const source = String.fromCharCode(...bytes.subarray(0,4096));
  const m = prefix.exec(source);
  if (!m) return;
  const [scale, outline, photo] = [m[1],m[2],m[5]].map(values);
  if ([scale,outline,photo].some(([w,b,c,h]) => w<=0 || h<=0 || b || c)) return;
  const [sx,,,,tx] = scale;
  const trim = page.getTrimBox();
  const edge = (trim.x+trim.width-tx)/sx;
  const [cx,,cw] = values(m[4]);
  if (Math.abs((cx+cw-edge)*sx)>0.5 || Math.abs((outline[4]+outline[0]-edge)*sx)>0.5 ||
      photo[4]>=edge || photo[4]+photo[0]<=edge) return;
  const objects = page.node.Resources()?.lookup(lib.PDFName.of('XObject'));
  const getImage = name => objects?.lookup(lib.PDFName.of(name));
  const ink = getImage(m[3]), image = getImage(m[6]);
  if ([ink,image].some(s => s?.dict?.get(lib.PDFName.of('Subtype'))?.toString() !== '/Image')) return;
  const mask = s => s.dict.lookup(lib.PDFName.of('SMask'));
  const inkMask = mask(ink), photoMask = mask(image);
  if (!inkMask || !photoMask) return;
  const w = uint(ink.dict,'Width',lib), h = uint(ink.dict,'Height',lib);
  if (w<16 || h<16 || uint(inkMask.dict,'Width',lib)!==w || uint(inkMask.dict,'Height',lib)!==h) return;
  const alpha = samples(inkMask,1,lib);
  if (!alpha) return;
  const pixels = samples(ink,4,lib);
  if (!pixels) return;
  let color, count = 0;
  for (let i=0; i<w*h; i+=43) {
    if (alpha[i]<240) continue;
    const sample = pixels.subarray(4*i,4*i+4);
    if (!color) color = Array.from(sample);
    if (color.some((v,k) => Math.abs(v-sample[k])>5)) return;
    count++;
  }
  if (count<32) return;
  const silhouette = samples(photoMask,1,lib);
  if (!silhouette) return;
  const pw = uint(photoMask.dict,'Width',lib), ph = uint(photoMask.dict,'Height',lib);
  function photoSpan(x) {
    const col = Math.floor((x-photo[4])*pw/photo[0]);
    if (col<0 || col>=pw) return;
    let first=0, last=ph-1;
    while (first<ph && silhouette[first*pw+col]<128) first++;
    while (last>=first && silhouette[last*pw+col]<128) last--;
    if (last<first) return;
    return [photo[5]+photo[3]*(1-(last+1)/ph), photo[5]+photo[3]*(1-first/ph)];
  }
  const step = outline[0]/w, row = outline[3]/h;
  function margins(col) {
    let first=0, last=h-1;
    while (first<h && alpha[first*w+col]<128) first++;
    while (last>=first && alpha[last*w+col]<128) last--;
    if (last-first<4) return;
    // A single continuous ink band at the cut is required.
    for (let y=first; y<=last; y++) if (alpha[y*w+col]<128) return;
    const span = photoSpan(outline[4]+(col+0.5)*step);
    if (!span) return;
    const lo = span[0]-(outline[5]+outline[3]-(last+1)*row);
    const hi = outline[5]+outline[3]-first*row-span[1];
    if (Math.min(lo,hi)<row || Math.max(lo,hi)>outline[3]*0.12) return;
    return [lo,hi];
  }
  let col = Math.min(w-1, Math.floor((edge-outline[4])/step));
  let offsets;
  for (let i=0;i<3 && col>=0;i++,col--) {
    offsets = margins(col);
    if (offsets) break;
  }
  if (!offsets || !margins(col-8) || !margins(col-16)) return;
  return {bytes, edge, join: outline[4]+col*step, step, sx, color, photoSpan, offsets, end: photo[4]+photo[0],
    insert: m.indices[2][0]};
}

export function findRasterOutline(page, lib) {
  try { return detect(page, lib); } catch { return undefined; }
}

export function drawRasterOutline(page, candidate, bleed, lib) {
  const {bytes,edge,step,sx,color,photoSpan,offsets,end,insert} = candidate;
  if (insert<0) return;
  const width = Math.min(bleed/sx,end-edge);
  const steps = Math.min(2048,Math.ceil(width/step));
  if (!(steps>0)) return;
  const top=[], bottom=[];
  for (let i=0;i<=steps;i++) {
    const x=edge+i*width/steps, span=photoSpan(Math.min(x,end-step/100));
    if (!span) break;
    top.push([x,span[1]+offsets[1]]);
    bottom.push([x,span[0]-offsets[0]]);
  }
  if (top.length<2) return;
  // Tuck the start under the last solid outline column to avoid a preview seam.
  const start = Math.min(edge,candidate.join) - Math.min(step, 0.25/sx);
  top.unshift([start,top[0][1]]);
  bottom.unshift([start,bottom[0][1]]);
  const path=top.concat(bottom.reverse()).map(([x,y],i) =>
    x.toFixed(5)+' '+y.toFixed(5)+(i?' l':' m'));
  const patch = ['q', color.map(v=>(v/255).toFixed(6)).join(' ')+' k', ...path, 'h f','Q',''].join('\n');
  const joined = new Uint8Array(bytes.length+patch.length);
  joined.set(bytes.subarray(0,insert));
  joined.set(new TextEncoder().encode(patch),insert);
  joined.set(bytes.subarray(insert),insert+patch.length);
  page.node.set(lib.PDFName.of('Contents'),page.doc.context.register(page.doc.context.flateStream(joined)));
}
