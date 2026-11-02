const MIN_WIDTH = 140;
const MAX_WIDTH = 240;
const MAX_AUTO_COLUMNS = 8;

export function pack(ratios, columns, columnWidth, gap = 12) {
  const heights = Array(columns).fill(0);
  const assignments = [];
  for (const ratio of ratios) {
    const column = heights.indexOf(Math.min(...heights));
    assignments.push(column);
    const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
    heights[column] += (heights[column] ? gap : 0) + columnWidth / safeRatio;
  }
  return {assignments, heights};
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
    for (let i = 0; i < 16; i++) {
      const mid = (low + high) / 2;
      if (Math.max(...pack(validRatios, columns, mid, gap).heights) <= height) low = mid;
      else high = mid;
    }
    columnWidth = low;
  }
  return {columns, columnWidth: Math.round(columnWidth)};
}
