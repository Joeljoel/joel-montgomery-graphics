import { MM_PER_POINT, analysePage } from './core.mjs';

export async function writeBleed(file, mm, marks, lib) {
  if (!Number.isFinite(mm) || mm < 0) throw new Error('Enter a bleed of 0 mm or more.');
  const pdf = await lib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  for (const page of pdf.getPages()) {
    const { userUnit } = analysePage(page, lib);
    const scale = 1 / (MM_PER_POINT * userUnit);
    const { x, y, width, height } = page.getTrimBox();
    const bleed = mm * scale;
    const margin = marks ? 6 * scale : 0;
    const extent = bleed + margin;
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
    const gap = bleed + scale;
    const end = extent - scale;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = sx < 0 ? x : x + width;
        const cy = sy < 0 ? y : y + height;
        const stroke = { thickness: 0.25 / userUnit, color: lib.cmyk(0, 0, 0, 1) };
        page.drawLine({ start: { x: cx + sx * gap, y: cy }, end: { x: cx + sx * end, y: cy }, ...stroke });
        page.drawLine({ start: { x: cx, y: cy + sy * gap }, end: { x: cx, y: cy + sy * end }, ...stroke });
      }
    }
  }
  return pdf.save({ updateFieldAppearances: false });
}
