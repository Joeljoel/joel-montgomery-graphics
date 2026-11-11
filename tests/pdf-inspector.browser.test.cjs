// Serve the repo root on port 8765, then run with Playwright available via NODE_PATH.
// This is a full browser smoke test; its pinned pdf-lib CDN script requires internet.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const pt = mm => mm * 72 / 25.4;

// A tiny, real, uncompressed PDF with correctly indexed byte offsets.
function pdfWithBoxes(hasBoxes) {
  const media = [0, 0, pt(216), pt(303)].join(' ');
  const trim = [pt(3), pt(3), pt(213), pt(300)].join(' ');
  const pageBoxes = hasBoxes ? ' /TrimBox [' + trim + '] /BleedBox [' + media + ']' : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [' + media + ']' + pageBoxes + ' /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += (index + 1) + ' 0 obj\n' + body + '\nendobj\n';
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => { pdf += String(offset).padStart(10, '0') + ' 00000 n \n'; });
  pdf += 'trailer\n<< /Root 1 0 R /Size ' + (objects.length + 1) + ' >>\n';
  pdf += 'startxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf, 'latin1');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:8765/tools/pdf-inspector/');
    await page.locator('#files').setInputFiles([
      { name: 'with-bleed.pdf', mimeType: 'application/pdf', buffer: pdfWithBoxes(true) },
      { name: 'no-boxes.pdf', mimeType: 'application/pdf', buffer: pdfWithBoxes(false) }
    ]);
    await page.locator('.file-card').nth(1).waitFor();
    const cards = page.locator('.file-card');
    assert.equal(await cards.count(), 2);
    assert.match(await cards.nth(0).innerText(), /210 × 297 mm/);
    assert.match(await cards.nth(0).innerText(), /3 mm on all sides/);
    assert.match(await cards.nth(1).innerText(), /BleedBox is not defined/);
    assert.match(await cards.nth(1).innerText(), /Not defined/);
    await cards.first().locator('.page-row summary').click();
    assert.equal(await cards.first().locator('.box-table tr').count(), 6);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.setViewportSize({ width: 375, height: 850 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS: PDF parser, defined / fallback boxes, page details, mobile layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
