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
  for (const [mm, marks] of [[3, false], [0, false], [3, true], [20, true]]) {
    const output = await lib.PDFDocument.load(await writeBleed(file, mm, marks, lib));
    const [result] = output.getPages();
    assert.deepEqual(result.getTrimBox(), page.getCropBox());
    assert.equal(result.getRotation().angle, 90);
    const expected = mm * 72 / 25.4 / 2;
    assert.ok(Math.abs(result.getBleedBox().x - (10 - expected)) < 1e-8);
    assert.ok(Math.abs(result.getCropBox().width - (80 + 2 * (marks ? Math.max(33 / 2, expected) : expected))) < 1e-8);
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

test('reveal only a scaled, trim-sized background with an oversized unmasked image', async () => {
  for (const [clip, imageWidth, masked, recover] of [
    ['0 1 399 399', 440, false, true],
    ['0 1 390 399', 440, false, false],
    ['0 1 399 399', 400, false, false],
    ['0 1 399 399', 440, true, false],
  ]) {
    const pdf = await lib.PDFDocument.create();
    const page = pdf.addPage([100, 100]);
    const image = pdf.context.flateStream(new Uint8Array([255]), {
      Type: 'XObject', Subtype: 'Image', Width: 1, Height: 1, BitsPerComponent: 8,
      ColorSpace: 'DeviceGray', ...(masked ? { Mask: [0, 0] } : {}),
    });
    const name = page.node.newXObject('Background', pdf.context.register(image));
    const original = 'q .25 0 0 .25 0 0 cm q ' + clip + ' re W* n 1 g -20 -20 440 440 re f q ' +
      imageWidth + ' 0 0 440 -20 -20 cm ' + name + ' Do Q Q q 0 0 10 10 re W n Q Q';
    page.node.set(lib.PDFName.of('Contents'), pdf.context.register(pdf.context.flateStream(original)));
    const result = await lib.PDFDocument.load(await writeBleed(new Blob([await pdf.save()]), 3, false, lib));
    const content = new TextDecoder().decode(lib.decodePDFRawStream(result.getPages()[0].node.Contents()).decode());
    const expanded = '-34.015748 -34.015748 m\n434.015748 -34.015748 l\n434.015748 434.015748 l\n-34.015748 434.015748 l\nh';
    assert.equal(content.trimEnd(), recover ? original.replace(clip + ' re', expanded + ' ') : original);
    assert.equal(content.split(name + ' Do').length - 1, 1);
  }
});

test('extend only the trim side of a scaled foreground mask outside trim', async () => {
  const pdf = await lib.PDFDocument.create();
  const page = pdf.addPage([100,100]);
  const image = pdf.context.flateStream(new Uint8Array([128]), {
    Type: 'XObject', Subtype: 'Image', Width: 1, Height: 1, BitsPerComponent: 8, ColorSpace: 'DeviceGray'
  });
  const name = page.node.newXObject('Photo', pdf.context.register(image));
  const draw = 'q 200 0 0 200 -10 0 cm ' + name + ' Do Q';
  const inset = 'q 4 10 80 80 re W n ' + draw + ' Q';
  const original = 'q .5 0 0 .5 0 0 cm q 0.5 20.05 m 100 30 l 100 80 l 0.5 89.95 l W n ' +
    draw + ' Q ' + inset + ' Q';
  page.node.set(lib.PDFName.of('Contents'), pdf.context.register(pdf.context.flateStream(original)));
  const result = await lib.PDFDocument.load(await writeBleed(new Blob([await pdf.save()]), 2.54, false, lib));
  const content = new TextDecoder().decode(lib.decodePDFRawStream(result.getPages()[0].node.Contents()).decode());
  assert.equal(content.split(draw).length - 1, 2);
  assert.equal(content.includes('0.5 20.05 m'), false);
  assert.ok(content.includes('-14.400000 18.560000'));
  assert.ok(content.includes('-14.400000 91.440000 l'));
  assert.equal(content.split(inset).length - 1, 1);
});

test('recreate a detected flat raster outline only when requested', async () => {
  const { findRasterOutline } = await import('../tools/pdf-inspector/raster-outline.mjs');
  const doc = await lib.PDFDocument.create();
  const page = doc.addPage([100,100]);
  function image(width, height, top, bottom, color) {
    const format = { Type: 'XObject', Subtype: 'Image', Width: width, Height: height, BitsPerComponent: 8 };
    const alpha = new Uint8Array(width*height);
    alpha.fill(255,top*width,bottom*width);
    const mask = doc.context.flateStream(alpha, { ...format, ColorSpace: 'DeviceGray' });
    const bytes = new Uint8Array(width*height*4).fill(color);
    const stream = doc.context.flateStream(bytes, { ...format, ColorSpace: 'DeviceCMYK', SMask: doc.context.register(mask) });
    return page.node.newXObject('Image',doc.context.register(stream));
  }
  const flat = image(130,100,4,94,64);
  const photo = image(160,100,10,88,128);
  const contents = 'q .5 0 0 .5 0 0 cm q 130 0 0 100 70 0 cm ' + flat +
    ' Do Q q 70 0 130 100 re W n q 160 0 0 100 70 0 cm ' + photo + ' Do Q Q Q';
  page.node.set(lib.PDFName.of('Contents'),doc.context.register(doc.context.flateStream(contents)));
  const file = new Blob([await doc.save()]);
  const source = await lib.PDFDocument.load(await file.arrayBuffer());
  assert.ok(findRasterOutline(source.getPages()[0],lib));
  for (const enabled of [false,true]) {
    const result = await lib.PDFDocument.load(await writeBleed(file,3,false,lib,true,enabled));
    const data = lib.decodePDFRawStream(result.getPages()[0].node.Contents()).decode();
    const code = new TextDecoder().decode(data);
    assert.equal(code.includes('h f\nQ'),enabled);
  }
});
