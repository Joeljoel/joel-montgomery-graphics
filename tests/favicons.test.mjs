import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url));

for (const page of ['calculator', 'joeldle']) {
  test(page + ' links its own distinct 64px PNG favicon', () => {
    const html = read(page + '/index.html').toString('utf8');
    assert.match(html, /rel="icon" type="image\/png" sizes="64x64" href="favicon\.png\?v=20261104"/);
    const png = read(page + '/favicon.png');
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 64);
    assert.equal(png.readUInt32BE(20), 64);
    assert.ok(png.includes(Buffer.from('tRNS')), 'icon should have transparent corners');
  });
}

test('homepage, utilities and legacy retain their own favicon links', () => {
  assert.match(read('index.html').toString('utf8'), /href="favicon\.svg\?v=jm-2026"/);
  assert.match(read('tools/index.html').toString('utf8'), /utilities-favicon-group-11\.png/);
  assert.match(read('legacy/index.html').toString('utf8'), /favicon\.ico/);
});
