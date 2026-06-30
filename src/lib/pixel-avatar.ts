const PALETTES = [
  ["#F0EDF5", "#7C5CBF", "#5C3D99", "#B896E0", "#E8D5F5"],
  ["#EDF5F0", "#2D8F6F", "#1A6B50", "#6BBF9E", "#B8E0D0"],
  ["#F5F0ED", "#BF6B3A", "#994D1A", "#E0996B", "#F5D5B8"],
  ["#F0F5ED", "#5F8F2D", "#3D6B1A", "#8FBF5F", "#C8E0B0"],
  ["#EDF0F5", "#3A5FBF", "#1A3D99", "#6B8FE0", "#B8C8F5"],
  ["#F5EDF0", "#BF3A5F", "#991A3D", "#E06B8F", "#F5B8C8"],
  ["#F5F5ED", "#BF9F2D", "#997A1A", "#E0C06B", "#F0E8B8"],
  ["#EDF5F5", "#2D8F8F", "#1A6B6B", "#6BBFBF", "#B8E8E8"],
];

const GRID = 8;
const CELL = 10;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickByHash(seed: number, shift: number, max: number): number {
  return ((seed >> shift) & 0xFF) % max;
}

export function generatePixelAvatar(name: string, outputSize = 80): string {
  const seed = hashName(name);
  const palette = PALETTES[seed % PALETTES.length];

  const leftHalf: number[][] = [];
  for (let row = 0; row < GRID; row++) {
    const cols: number[] = [];
    for (let col = 0; col < GRID / 2; col++) {
      const cellSeed = ((seed + row * 13 + col * 37) * 31) | 0;
      const fill = Math.abs(cellSeed) % 100;
      if (fill > 25) {
        cols.push((Math.abs(cellSeed >> 4) + row + col) % (palette.length - 1) + 1);
      } else {
        cols.push(0);
      }
    }
    leftHalf.push(cols);
  }

  const size = GRID * CELL;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${outputSize}" height="${outputSize}">`;
  svg += `<rect width="${size}" height="${size}" rx="${CELL}" fill="${palette[0]}" />`;

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const srcCol = col < GRID / 2 ? col : GRID - 1 - col;
      const ci = leftHalf[row][srcCol];
      if (ci > 0) {
        svg += `<rect x="${col * CELL}" y="${row * CELL}" width="${CELL}" height="${CELL}" fill="${palette[ci]}" rx="1.5" />`;
      }
    }
  }

  svg += "</svg>";
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
