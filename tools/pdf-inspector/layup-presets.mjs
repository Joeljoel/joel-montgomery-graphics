export const presets = [
  { name: '3 × DL on A4', width: 99, height: 210, columns: 3, rows: 1, sheet: [297, 210] },
  { name: '2 × A5 on A4', width: 148, height: 210, columns: 2, rows: 1, sheet: [297, 210] },
  { name: '2 × A4 on A3', width: 210, height: 297, columns: 2, rows: 1, sheet: [420, 297] },
  { name: '4 × A6 on A4', width: 105, height: 148, columns: 2, rows: 2, sheet: [210, 297] },
  { name: '4 × A5 on A3', width: 148, height: 210, columns: 2, rows: 2, sheet: [297, 420] }
];

export function orientation(size, preset) {
  const fits = (a, b) => Math.abs(size.width - a) < 0.55 && Math.abs(size.height - b) < 0.55;
  if (fits(preset.width, preset.height)) return 0;
  if (fits(preset.height, preset.width)) return 90;
  return null;
}
