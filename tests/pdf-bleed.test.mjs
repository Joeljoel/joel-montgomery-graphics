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

test('extend trim edges in split page streams while preserving interior and transformed masks', async () => {
  const source = await lib.PDFDocument.create();
  const page = source.addPage([80, 60]);
  const streams = [
    'q 0 0 m 80 0 l 80 60 l 0 60 l h',
    'W n\nq 5 5 20 30 re W n Q\nq 1 0 0 1 5 5 cm q 0 0 80 60 re W n Q Q\nQ',
  ].map(text => source.context.register(source.context.flateStream(text)));
  page.node.set(lib.PDFName.of('Contents'), source.context.obj(streams));
  const doc = await lib.PDFDocument.load(await writeBleed(new Blob([await source.save()]), 2.54, false, lib));
  const content = new TextDecoder().decode(lib.decodePDFRawStream(doc.getPages()[0].node.Contents()).decode());
  assert.match(content, /-7\.200000 -7\.200000 m/);
  assert.match(content, /87\.200000 67\.200000 l/);
  assert.match(content, /5 5 20 30 re W n/);
  assert.match(content, /cm q 0 0 80 60 re W n/);
});
