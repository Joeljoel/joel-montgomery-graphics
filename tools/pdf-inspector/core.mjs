// Pure PDF page-box analysis. All measurements are returned in millimetres.
export const MM_PER_POINT = 25.4 / 72;
export const BOX_NAMES = ['trim', 'crop', 'bleed', 'media', 'art'];

export function roundMm(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMm(value) {
  return Number.isFinite(value) ? roundMm(value).toLocaleString('en-AU', { maximumFractionDigits: 2 }) : '—';
}

export function sizeLabel(size) {
  return size ? `${formatMm(size.width)} × ${formatMm(size.height)} mm` : 'Not available';
}

function rotatedSize(rect, rotation) {
  return rotation === 90 || rotation === 270
    ? { width: rect.height, height: rect.width }
    : { width: rect.width, height: rect.height };
}

export function edgeBleed(trim, bleed, rotation = 0) {
  // PDF coordinate system is bottom-left origin. Positive values mean bleed
  // extends outward from trim; negative values indicate an invalid inset.
  const original = {
    top: bleed.y + bleed.height - trim.y - trim.height,
    right: bleed.x + bleed.width - trim.x - trim.width,
    bottom: trim.y - bleed.y,
    left: trim.x - bleed.x
  };
  switch (((rotation % 360) + 360) % 360) {
    case 90: return { top: original.left, right: original.top, bottom: original.right, left: original.bottom };
    case 180: return { top: original.bottom, right: original.left, bottom: original.top, left: original.right };
    case 270: return { top: original.right, right: original.bottom, bottom: original.left, left: original.top };
    default: return original;
  }
}

function validateBox(box, name) {
  if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite) ||
      box.width <= 0 || box.height <= 0) {
    throw new Error(`Page has invalid ${name} coordinates.`);
  }
}

function convertBox(box, factor) {
  return { x: box.x * factor, y: box.y * factor, width: box.width * factor, height: box.height * factor };
}

function outside(inner, outer, tolerance = 0.05) {
  return inner.x < outer.x - tolerance || inner.y < outer.y - tolerance ||
    inner.x + inner.width > outer.x + outer.width + tolerance ||
    inner.y + inner.height > outer.y + outer.height + tolerance;
}

// pdfLib supplies PDFName. The low-level page.node access is needed to tell
// explicitly saved Trim/Bleed boxes apart from pdf-lib's fallback rectangles.
export function analysePage(page, pdfLib) {
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const explicit = {
    media: true,
    crop: Boolean(page.node.CropBox()),
    trim: Boolean(page.node.TrimBox()),
    bleed: Boolean(page.node.BleedBox()),
    art: Boolean(page.node.ArtBox())
  };
  const rawUnit = page.node.get(pdfLib.PDFName.of('UserUnit'));
  const lookedUpUnit = rawUnit ? page.doc.context.lookup(rawUnit) : null;
  const unit = lookedUpUnit && typeof lookedUpUnit.asNumber === 'function'
    ? lookedUpUnit.asNumber() : 1;
  if (!Number.isFinite(unit) || unit <= 0) throw new Error('Page has an invalid UserUnit.');
  const factor = MM_PER_POINT * unit;
  const raw = {
    media: page.getMediaBox(),
    crop: page.getCropBox(),
    trim: page.getTrimBox(),
    bleed: page.getBleedBox(),
    art: page.getArtBox()
  };
  for (const name of BOX_NAMES) validateBox(raw[name], name);
  const boxes = Object.fromEntries(BOX_NAMES.map(name => [name, convertBox(raw[name], factor)]));
  const sizes = Object.fromEntries(BOX_NAMES.map(name => [name, rotatedSize(boxes[name], rotation)]));
  const bleed = explicit.trim && explicit.bleed ? edgeBleed(boxes.trim, boxes.bleed, rotation) : null;
  const warnings = [];
  if (!explicit.trim) warnings.push('TrimBox is not defined; finished size falls back to CropBox.');
  if (!explicit.bleed) warnings.push('BleedBox is not defined; bleed cannot be confirmed.');
  if (bleed) {
    const margins = Object.values(bleed);
    if (margins.some(value => value < -0.05)) warnings.push('BleedBox falls inside TrimBox on at least one edge.');
    else if (margins.some(value => value < 0.05)) warnings.push('One or more edges have 0 mm bleed.');
    if (Math.max(...margins) - Math.min(...margins) > 0.1) warnings.push('Bleed is uneven across the four edges.');
  }
  if (outside(boxes.trim, boxes.media)) warnings.push('TrimBox extends beyond MediaBox.');
  if (outside(boxes.bleed, boxes.media)) warnings.push('BleedBox extends beyond MediaBox.');
  return { rotation, userUnit: unit, explicit, boxes, sizes, bleed, warnings };
}

function differs(a, b, tolerance = 0.1) {
  return Math.abs(a - b) > tolerance;
}

export function summarisePages(pages) {
  if (!pages.length) return { mixedSizes: false, mixedBleed: false, warningPages: 0 };
  const first = pages[0];
  const mixedSizes = pages.some(page =>
    differs(page.sizes.trim.width, first.sizes.trim.width) ||
    differs(page.sizes.trim.height, first.sizes.trim.height));
  const mixedBleed = pages.some(page => {
    if (!first.bleed || !page.bleed) return Boolean(first.bleed) !== Boolean(page.bleed);
    return ['top', 'right', 'bottom', 'left'].some(edge => differs(page.bleed[edge], first.bleed[edge]));
  });
  return { mixedSizes, mixedBleed, warningPages: pages.filter(page => page.warnings.length).length };
}
