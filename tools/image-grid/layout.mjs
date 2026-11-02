const MIN_WIDTH = 140;
const MAX_WIDTH = 240;
const MAX_AUTO_COLUMNS = 8;

/** Reorder images between columns to keep their bottom edges as even as possible. */
export function pack(ratios, columns, columnWidth, gap = 12) {
  if (!Number.isInteger(columns) || columns < 1) return {assignments: [], heights: []};
  const assignments = Array(ratios.length);
  const sums = Array(columns).fill(0);
  const counts = Array(columns).fill(0);
  const weights = ratios.map(r => columnWidth / (Number.isFinite(r) && r > 0 ? r : 1) + gap);

  // Distribute the tallest images first. Renderers can preserve original order
  // within each column even though column assignments are height-balanced.
  const indices = weights.map((_, i) => i).sort((a, b) => weights[b] - weights[a] || a - b);
  for (const index of indices) {
    let target = 0;
    for (let column = 1; column < columns; column++) {
      if (sums[column] < sums[target]) target = column;
    }
    assignments[index] = target;
    sums[target] += weights[index];
    counts[target]++;
  }

  // Refine with moves/swaps. Minimizing squared heights reduces bottom-edge
  // variance. Stop after a bounded number of passes for large image sets.
  const passes = Math.min(24, Math.max(0, ratios.length - columns) * 2);
  for (let pass = 0; pass < passes; pass++) {
    let bestDelta = -1e-7, best = null;
    for (let i = 0; i < weights.length; i++) {
      const a = assignments[i], from = sums[a], weight = weights[i];
      if (counts[a] > 1) {
        for (let b = 0; b < columns; b++) {
          if (a === b) continue;
          const to = sums[b];
          const delta = (from - weight) ** 2 + (to + weight) ** 2 - from ** 2 - to ** 2;
          if (delta < bestDelta) { bestDelta = delta; best = {type: 'move', i, a, b}; }
        }
      }
      for (let j = i + 1; j < weights.length; j++) {
        const b = assignments[j];
        if (a === b) continue;
        const to = sums[b], difference = weight - weights[j];
        const delta = (from - difference) ** 2 + (to + difference) ** 2 - from ** 2 - to ** 2;
        if (delta < bestDelta) { bestDelta = delta; best = {type: 'swap', i, j, a, b}; }
      }
    }
    if (!best) break;
    const {type, i, j, a, b} = best;
    if (type === 'move') {
      assignments[i] = b;
      sums[a] -= weights[i]; sums[b] += weights[i];
      counts[a]--; counts[b]++;
    } else {
      assignments[i] = b; assignments[j] = a;
      const difference = weights[i] - weights[j];
      sums[a] -= difference; sums[b] += difference;
    }
  }
  return {assignments, heights: sums.map((h, c) => counts[c] ? h - gap : 0)};
}

export function layout(count, width, height, ratios = [], gap = 12, requested = 'auto') {
  if (!count) return {columns: 0, columnWidth: MAX_WIDTH};

  const maxFit = Math.max(1, Math.min(count, MAX_AUTO_COLUMNS,
    Math.floor((width + gap) / (MIN_WIDTH + gap))));
  let columns = 1;
  if (requested !== 'auto' && Number.isInteger(Number(requested)) && Number(requested) > 0) {
    columns = Math.min(count, Number(requested));
  } else {
    let bestScore = -Infinity;
    for (let candidate = 1; candidate <= maxFit; candidate++) {
      const rows = Math.ceil(count / candidate);
      const fullness = count / (candidate * rows);
      const shape = Math.abs(Math.log((candidate / rows) / 1.3));
      const score = fullness - shape * 0.16;
      if (score > bestScore) {
        bestScore = score;
        columns = candidate;
      }
    }
  }

  // Keep columns compact and left-aligned even on a very wide display.
  // Explicit column counts can scroll horizontally instead of shrinking to nothing.
  const widthCap = Math.min(MAX_WIDTH,
    Math.max(MIN_WIDTH, (width - (columns - 1) * gap) / columns));
  const validRatios = Array.from({length: count}, (_, i) => ratios[i] || 1);
  let columnWidth = widthCap;
  if (height > 0 && Math.max(...pack(validRatios, columns, columnWidth, gap).heights) > height && columnWidth > MIN_WIDTH) {
    let low = MIN_WIDTH, high = columnWidth;
    // Fit the height when possible, but keep the images large enough to inspect.
    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2;
      if (Math.max(...pack(validRatios, columns, mid, gap).heights) <= height) low = mid;
      else high = mid;
    }
    columnWidth = low;
  }
  return {columns, columnWidth: Math.round(columnWidth)};
}
