import test from 'node:test';
import assert from 'node:assert/strict';
import {pack, layout} from './layout.mjs';

const GAP = 12;
function heightsFromAssignments(ratios, result, width, gap = GAP) {
  const groups = Array.from({length: result.heights.length}, () => []);
  result.assignments.forEach((column, i) => groups[column].push(i));
  return groups.map(indices => indices.reduce((height, i) => height + width / ratios[i], 0) +
    Math.max(0, indices.length - 1) * gap);
}
function originalOrderHeights(ratios, columns, width, gap = GAP) {
  const heights = Array(columns).fill(0);
  for (const ratio of ratios) {
    const target = heights.indexOf(Math.min(...heights));
    heights[target] += (heights[target] ? gap : 0) + width / ratio;
  }
  return heights;
}
const spread = heights => Math.max(...heights) - Math.min(...heights);

test('assignments include every image exactly once with correct measured heights', () => {
  const ratios = [0.2, 0.5, 1, 2, 4, 0.75, 3, 0.25];
  const result = pack(ratios, 3, 180);
  assert.equal(result.assignments.length, ratios.length);
  assert.ok(result.assignments.every(column => column >= 0 && column < 3));
  heightsFromAssignments(ratios, result, 180).forEach((height, column) => {
    assert.ok(Math.abs(height - result.heights[column]) < 1e-6);
  });
});

test('mixed portrait and landscape tiles have a significantly more even bottom edge', () => {
  const ratios = [...Array.from({length: 56}, (_, i) => 0.8 + (i % 7) * 0.2), 0.12];
  const result = pack(ratios, 7, 140);
  assert.ok(spread(result.heights) < spread(originalOrderHeights(ratios, 7, 140)) * 0.7);
});

test('balanced packing is deterministic for the same dimensions', () => {
  const ratios = [0.7, 2, 0.4, 3, 1, 0.7, 0.2, 1.5, 2];
  assert.deepEqual(pack(ratios, 4, 160), pack(ratios, 4, 160));
});

test('handles empty, single-image and unknown aspect ratios', () => {
  assert.deepEqual(pack([], 3, 140), {assignments: [], heights: [0, 0, 0]});
  assert.deepEqual(pack([1], 1, 140), {assignments: [0], heights: [140]});
  assert.ok(pack([0, NaN, 2], 2, 140).heights.every(Number.isFinite));
});

test('manual columns are retained and tile widths stay compact', () => {
  const ratios = Array(57).fill(1);
  const manual = layout(57, 1600, 800, ratios, GAP, '7');
  assert.equal(manual.columns, 7);
  assert.ok(manual.columnWidth >= 140 && manual.columnWidth <= 240);
  const narrow = layout(12, 200, 500, Array(12).fill(1), GAP, '4');
  assert.equal(narrow.columns, 4);
  assert.equal(narrow.columnWidth, 140);
  assert.equal(layout(0, 1000, 800).columns, 0);
});
