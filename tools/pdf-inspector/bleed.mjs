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
    if (recreateOutline && bleed > 0) {
      const candidate = findRasterOutline(page, lib);
      if (candidate) drawRasterOutline(page, candidate, bleed, lib);
    }
    if (recover && bleed > 0) {
      const trim = { x, y, width, height };
      const privateAI = page.node.lookup(lib.PDFName.of('PieceInfo'))?.has?.(lib.PDFName.of('Illustrator'));
      if (privateAI) revealIllustrator(page, trim, bleed, lib);
      else revealTrimClips(page, trim, bleed, lib);
    }
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
    // A Separation named All prints the trim guides on every plate, including spot inks.
    const registration = ['Separation', 'All', 'DeviceCMYK', {
      FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: [1, 1, 1, 1], N: 1
    }];
    const path = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = sx < 0 ? x : x + width;
        const cy = sy < 0 ? y : y + height;
        path.push(
          lib.moveTo(cx + sx * markStart, cy), lib.lineTo(cx + sx * markEnd, cy),
          lib.moveTo(cx, cy + sy * markStart), lib.lineTo(cx, cy + sy * markEnd)
        );
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
  return pdf.save({ updateFieldAppearances: false });
}
