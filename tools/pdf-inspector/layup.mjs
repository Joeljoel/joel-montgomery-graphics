import { analysePage, MM_PER_POINT } from './core.mjs';
import { drawCutMarks, recoverPageBleed } from './bleed.mjs';

import { presets, orientation } from './layup-presets.mjs';

export async function writeLayup(file, options, lib) {
  const source = await lib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  const output = await lib.PDFDocument.create();
  const { presetIndex, manual, width, height, dx, dy, columns, rows } = options;
  const preset = presets[presetIndex];
  if (![rows, columns].every(n => Number.isInteger(n) && n >= 1 && n <= 32))
    throw Error('Enter 1–32 rows and columns.');
  if (manual && (![width, height].every(n => Number.isFinite(n) && n > 0) || ![dx, dy].every(Number.isFinite)))
    throw Error('Enter valid trim dimensions and offsets.');
  const bleed = 3 / MM_PER_POINT;
  const margin = 33;
  const intents = source.catalog.get(lib.PDFName.of('OutputIntents'));
  if (intents) output.catalog.set(lib.PDFName.of('OutputIntents'), lib.PDFObjectCopier.for(source.context, output.context).copy(intents));
  for (const [index, page] of source.getPages().entries()) {
    const info = analysePage(page, lib);
    const unit = info.userUnit;
    const size = manual ? {width, height} : info.sizes.trim;
    const turn = preset ? orientation(size, preset) : 0;
    if (turn === null) throw Error('Page ' + (index + 1) + ' does not match this preset. Check the trim in Advanced options.');
    const trim = page.getTrimBox();
    const sideways = info.rotation % 180 !== 0;
    if (manual) {
      const media = page.getMediaBox();
      const w = (sideways ? height : width) / (MM_PER_POINT * unit);
      const h = (sideways ? width : height) / (MM_PER_POINT * unit);
      Object.assign(trim, {width:w, height:h, x:media.x + (media.width-w)/2 + dx/(MM_PER_POINT*unit),
        y:media.y + (media.height-h)/2 + dy/(MM_PER_POINT*unit)});
      page.setTrimBox(trim.x, trim.y, w, h);
    }
    const angle = (info.rotation + turn) % 360;
    const w = trim.width * unit, h = trim.height * unit;
    const sheetW = preset ? preset.sheet[0]/MM_PER_POINT : columns * (angle % 180 ? h : w);
    const sheetH = preset ? preset.sheet[1]/MM_PER_POINT : rows * (angle % 180 ? w : h);
    const cellW = sheetW / columns, cellH = sheetH / rows;
    const target = output.addPage([sheetW + 2*margin, sheetH + 2*margin]);
    target.setTrimBox(margin, margin, sheetW, sheetH);
    target.setBleedBox(margin-bleed, margin-bleed, sheetW+2*bleed, sheetH+2*bleed);
    const xCuts = Array.from({length: columns+1}, (_, i) => margin+i*cellW);
    const yCuts = Array.from({length: rows+1}, (_, i) => margin+i*cellH);
    if (page.node.Contents()) {
      if (!info.bleed || manual || Object.values(info.bleed).some(n => n < 2.999))
        recoverPageBleed(page, trim, bleed/unit, lib, true, true);
      const pad = bleed/unit;
      const embedded = await output.embedPage(page, {left:trim.x-pad, bottom:trim.y-pad,
        right:trim.x+trim.width+pad, top:trim.y+trim.height+pad});
      const fullW = w + 2*bleed, fullH = h + 2*bleed;
      const rotated = angle % 180 !== 0;
      for (let row=0; row<rows; row++) {
        for (let col=0; col<columns; col++) {
          const left = xCuts[col] - (col === 0 ? bleed : 0);
          const bottom = yCuts[row] - (row === 0 ? bleed : 0);
          const right = xCuts[col+1] + (col+1 === columns ? bleed : 0);
          const top = yCuts[row+1] + (row+1 === rows ? bleed : 0);
          const cx = xCuts[col]+cellW/2, cy = yCuts[row]+cellH/2;
          const halfW = (rotated ? fullH : fullW)/2, halfH = (rotated ? fullW : fullH)/2;
          target.pushOperators(lib.pushGraphicsState(), lib.rectangle(left,bottom,right-left,top-bottom), lib.clip(), lib.endPath());
          target.drawPage(embedded, {x:cx + ([180,270].includes(angle) ? halfW : -halfW),
            y:cy + ([90,180].includes(angle) ? halfH : -halfH), width:fullW, height:fullH, rotate:lib.degrees(-angle)});
          target.pushOperators(lib.popGraphicsState());
        }
      }
    }
    drawCutMarks(target, lib, target.getTrimBox(), margin, 1, xCuts, yCuts);
  }
  return output.save();
}
