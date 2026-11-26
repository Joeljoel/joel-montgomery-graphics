import test from 'node:test';
import assert from 'node:assert/strict';
import lib from '../tools/pdf-inspector/pdf-lib.min.js';
import { writeBleed } from '../tools/pdf-inspector/bleed.mjs';

test('expand and remove bleed around offset, rotated trim in scaled page units', async () => {
  const source = await lib.PDFDocument.create();
  const page = source.addPage([80, 60]);
  page.setMediaBox(10, 20, 80, 60);
  page.setRotation(lib.degrees(90));
  page.node.set(lib.PDFName.of('UserUnit'), lib.PDFNumber.of(2));
  page.drawRectangle({ x: 0, y: 0, width: 120, height: 120, color: lib.rgb(1, 0, 0) });
  const file = new Blob([await source.save()]);
  for (const [mm, marks] of [[3, false], [0, false], [3, true]]) {
    const output = await lib.PDFDocument.load(await writeBleed(file, mm, marks, lib));
    const [result] = output.getPages();
    assert.deepEqual(result.getTrimBox(), page.getCropBox());
    assert.equal(result.getRotation().angle, 90);
    const expected = mm * 72 / 25.4 / 2;
    assert.ok(Math.abs(result.getBleedBox().x - (10 - expected)) < 1e-8);
    assert.ok(Math.abs(result.getCropBox().width - (80 + 2 * (expected + (marks ? 6 * 72 / 25.4 / 2 : 0)))) < 1e-8);
  }
});
