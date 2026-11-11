import test from 'node:test';
import assert from 'node:assert/strict';
import { analysePage, edgeBleed, summarisePages, formatMm, MM_PER_POINT } from '../tools/pdf-inspector/core.mjs';

const mmToPt = value => value / MM_PER_POINT;
const rect = (x, y, width, height) => ({ x: mmToPt(x), y: mmToPt(y),
  width: mmToPt(width), height: mmToPt(height) });

function fakePage({ media = rect(0, 0, 216, 303), crop, trim, bleed, art, rotation = 0, userUnit = 1 } = {}) {
  const base = crop || media;
  const resolved = { media, crop: base, trim: trim || base, bleed: bleed || base, art: art || base };
  return {
    node: {
      CropBox: () => crop ? {} : undefined,
      TrimBox: () => trim ? {} : undefined,
      BleedBox: () => bleed ? {} : undefined,
      ArtBox: () => art ? {} : undefined,
      get: key => key === 'UserUnit' ? { asNumber: () => userUnit } : undefined
    },
    doc: { context: { lookup: value => value } },
    getRotation: () => ({ angle: rotation }),
    getMediaBox: () => resolved.media,
    getCropBox: () => resolved.crop,
    getTrimBox: () => resolved.trim,
    getBleedBox: () => resolved.bleed,
    getArtBox: () => resolved.art
  };
}
const pdfLib = { PDFName: { of: value => value } };
const near = (actual, expected, precision = 1e-7) =>
  assert.ok(Math.abs(actual - expected) < precision, String(actual) + ' should equal ' + expected);

test('A4 with explicit 3 mm bleed on all sides', () => {
  const page = analysePage(fakePage({
    trim: rect(3, 3, 210, 297),
    bleed: rect(0, 0, 216, 303)
  }), pdfLib);
  near(page.sizes.trim.width, 210);
  near(page.sizes.trim.height, 297);
  for (const edge of ['top', 'right', 'bottom', 'left']) near(page.bleed[edge], 3);
  assert.equal(page.explicit.trim, true);
  assert.equal(page.explicit.bleed, true);
  assert.deepEqual(page.warnings, []);
});

test('missing explicit boxes do not produce fictional bleed', () => {
  const page = analysePage(fakePage(), pdfLib);
  assert.equal(page.bleed, null);
  assert.equal(page.explicit.trim, false);
  assert.equal(page.explicit.bleed, false);
  assert.equal(page.warnings.length, 2);
  near(page.sizes.trim.width, 216);
});

test('off-centre boxes report individual edges', () => {
  const page = analysePage(fakePage({
    trim: rect(2, 1, 210, 297),
    bleed: rect(0, 0, 216, 301)
  }), pdfLib);
  near(page.bleed.left, 2);
  near(page.bleed.right, 4);
  near(page.bleed.top, 3);
  near(page.bleed.bottom, 1);
  assert.match(page.warnings.join(' '), /uneven/i);
});

test('rotated page swaps printed dimensions and oriented edge names', () => {
  const page = analysePage(fakePage({
    trim: rect(2, 1, 210, 297),
    bleed: rect(0, 0, 216, 301),
    rotation: 90
  }), pdfLib);
  near(page.sizes.trim.width, 297);
  near(page.sizes.trim.height, 210);
  near(page.bleed.top, 2);
  near(page.bleed.right, 3);
  near(page.bleed.bottom, 4);
  near(page.bleed.left, 1);
});

test('UserUnit is accounted for', () => {
  const page = analysePage(fakePage({
    media: rect(0, 0, 100, 200), userUnit: 2
  }), pdfLib);
  near(page.sizes.media.width, 200);
  near(page.sizes.media.height, 400);
});

test('negative bleed and boxes outside MediaBox are flagged', () => {
  const page = analysePage(fakePage({
    media: rect(0, 0, 216, 303),
    trim: rect(0, 0, 210, 297),
    bleed: rect(1, 1, 208, 295)
  }), pdfLib);
  assert.ok(page.bleed.left < 0);
  assert.match(page.warnings.join(' '), /inside TrimBox/i);
});

test('mixed size and bleed across pages', () => {
  const a = analysePage(fakePage({ trim: rect(3, 3, 210, 297), bleed: rect(0, 0, 216, 303) }), pdfLib);
  const b = analysePage(fakePage({ trim: rect(3, 3, 208, 297), bleed: rect(0, 0, 216, 303) }), pdfLib);
  const result = summarisePages([a, b]);
  assert.equal(result.mixedSizes, true);
  assert.equal(result.mixedBleed, true);
  assert.equal(result.warningPages, 1);
});

test('formatting mm values', () => {
  assert.equal(formatMm(3), '3');
  assert.equal(formatMm(2.997), '3');
  assert.equal(formatMm(3.125), '3.13');
  assert.equal(formatMm(NaN), '—');
  assert.deepEqual(edgeBleed({ x: 2, y: 3, width: 10, height: 20 },
    { x: 0, y: 0, width: 14, height: 26 }), { top: 3, right: 2, bottom: 3, left: 2 });
});
