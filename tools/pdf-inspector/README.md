# PDF Inspector

A static, client-side PDF page-box inspector at `/tools/pdf-inspector/`.
No PDF bytes are uploaded or persisted. The viewer loads the pinned MIT-licensed
[`pdf-lib` 1.17.1](https://github.com/Hopding/pdf-lib) browser build from jsDelivr;
the library requires a network connection on first use.

## What is measured

- MediaBox, CropBox, TrimBox, BleedBox and ArtBox, converted from PDF points to
  millimetres (including the optional page UserUnit).
- Display dimensions account for 90°/270° page rotation.
- Bleed is calculated as the distance **between explicit TrimBox and BleedBox
  edges** and displayed on all four sides, accounting for page rotation.
- Missing trim / bleed boxes are labelled as missing. `pdf-lib` returns the
  effective CropBox as a fallback for each, which must not be mistaken for a
  declared finished size or genuine zero bleed.
- Per-page inconsistencies, negative margins, asymmetric margins and boxes
  outside the MediaBox are called out.
- Multi-file inspection and a per-page CSV export.

## Limits

A file may be up to 150 MB. This tool inspects PDF page *metadata*; it does
not rasterise or visually verify artwork, crop marks, safety margins, or actual
ink/image extension into the bleed area. Password-protected PDFs are not
supported. The box diagram reflects geometry, not page artwork. Dimensions
are displayed to two decimal places.

## Sample PDF

A downloadable three-page fixture is included at
[`fixtures/pdf-inspector-test-suite.pdf`](fixtures/pdf-inspector-test-suite.pdf).

1. A4 TrimBox 210 × 297 mm with a 216 × 303 mm BleedBox: 3 mm on all edges.
2. TrimBox 148 × 210 mm with asymmetric bleed (top 6, right 5,
   bottom 4, left 5 mm), plus a larger CropBox.
3. A4 with no explicit TrimBox or BleedBox, to check fallback messaging.

## Tests

From the repository root:

```sh
node --test tests/pdf-inspector.test.mjs
# with a local server on port 8765, Playwright and internet access:
node tests/pdf-inspector.browser.test.cjs
```

To smoke-test the site, serve the repo root with a static HTTP server and open
`/tools/pdf-inspector/`. Test a PDF with explicit page boxes, an ordinary
PDF lacking trim/bleed metadata, an asymmetrical layout, and a multi-page
document with inconsistent sizes. Check the browser console, mobile overflow,
and CSV output. Also run the existing `tests/tools-page.test.cjs` with
Playwright to cover the added utility card.
