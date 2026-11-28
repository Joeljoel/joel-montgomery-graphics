import { findRasterOutline, drawRasterOutline } from './raster-outline.mjs';
import { revealTrimClips } from './trim-clips.mjs';
import { revealIllustrator } from './illustrator-bleed.mjs';
import { MM_PER_POINT, analysePage } from './core.mjs';

export async function writeBleed(file, mm, marks, lib, recover = true, recreateOutline = false) {
  if (!Number.isFinite(mm) || mm < 0) throw new Error('Enter a bleed of 0 mm or more.');
  const pdf = await lib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  for (const page of pdf.getPages()) {
    const { userUnit } = analysePage(page, lib);
    const scale = 1 / (MM_PER_POINT * userUnit);
    const { x, y, width, height } = page.getTrimBox();
    const bleed = mm * scale;
    const markStart = 6 / userUnit;
    const markEnd = markStart + 27 / userUnit;
    const extent = marks ? Math.max(markEnd, bleed) : bleed;
    recoverPageBleed(page, { x, y, width, height }, bleed, lib, recover, recreateOutline);
    page.setTrimBox(x, y, width, height);
    page.setBleedBox(x - bleed, y - bleed, width + 2 * bleed, height + 2 * bleed);
    page.setMediaBox(x - extent, y - extent, width + 2 * extent, height + 2 * extent);
    page.setCropBox(x - extent, y - extent, width + 2 * extent, height + 2 * extent);
    if (!marks) continue;

    // Keep retained artwork inside the bleed while leaving space for fresh marks.
    const clip = pdf.context.contentStream([lib.pushGraphicsState(),
      lib.rectangle(x - bleed, y - bleed, width + 2 * bleed, height + 2 * bleed),
      lib.clip(), lib.endPath()]);
    const restore = pdf.context.contentStream([lib.popGraphicsState()]);
    page.node.normalize();
    page.node.wrapContentStreams(pdf.context.register(clip), pdf.context.register(restore));
    drawCutMarks(page, lib, page.getTrimBox(), extent, userUnit, [x, x + width], [y, y + height]);
  }
  return pdf.save({ updateFieldAppearances: false });
}

export function recoverPageBleed(page, trim, bleed, lib, recover, recreateOutline) {
  if (recreateOutline && bleed > 0) {
    const candidate = findRasterOutline(page, lib);
    if (candidate) drawRasterOutline(page, candidate, bleed, lib);
  }
  if (recover && bleed > 0) {

    const privateAI = page.node.lookup(lib.PDFName.of('PieceInfo'))?.has?.(lib.PDFName.of('Illustrator'));
    if (privateAI) revealIllustrator(page, trim, bleed, lib);
    else revealTrimClips(page, trim, bleed, lib);
  }
}

export function drawCutMarks(page, lib, { x, y, width, height }, extent, userUnit, xCuts, yCuts) {
  const pdf = page.doc;
  const markStart = 6 / userUnit;
  const markEnd = 33 / userUnit;
  // A Separation named All prints the trim guides on every plate, including spot inks.
  const registration = ['Separation', 'All', 'DeviceCMYK', {
    FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: [1, 1, 1, 1], N: 1
  }];
  const path = [];
  for (const cut of xCuts) {
    for (const sign of [-1, 1]) {
      const edge = sign < 0 ? y : y + height;
      path.push(lib.moveTo(cut, edge + sign * markStart), lib.lineTo(cut, edge + sign * markEnd));
    }
  }
  for (const cut of yCuts) {
    for (const sign of [-1, 1]) {
      const edge = sign < 0 ? x : x + width;
      path.push(lib.moveTo(edge + sign * markStart, cut), lib.lineTo(edge + sign * markEnd, cut));
    }
  }
  // Illustrator paints the same eight segments twice with flat ends.
  const lines = [
    lib.setLineCap(0), lib.PDFOperator.of('CS', [lib.PDFName.of('Registration')]),
    lib.PDFOperator.of('SCN', [lib.PDFNumber.of(0)]),
    lib.setLineWidth(1.25 / userUnit), ...path, lib.stroke(),
    lib.PDFOperator.of('SCN', [lib.PDFNumber.of(1)]),
    lib.setLineWidth(0.25 / userUnit), ...path, lib.stroke(),
  ];
  const form = pdf.context.formXObject(lines, {
    BBox: [x - extent, y - extent, x + width + extent, y + height + extent],
    Resources: { ColorSpace: { Registration: registration } },
  });
  const marksName = page.node.newXObject('TrimMarks', pdf.context.register(form));
  page.pushOperators(lib.drawObject(marksName));
}
