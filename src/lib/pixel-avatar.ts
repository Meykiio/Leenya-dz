export function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number, index: number): number {
  let s = seed + index * 7919;
  s = ((s * 1103515245) + 12345) & 0x7fffffff;
  s = ((s * 1103515245) + 12345) & 0x7fffffff;
  return s / 0x7fffffff;
}

export function generatePixelAvatar(name: string, outputSize = 80): string {
  const seed = hashName(name);
  const baseHue = 250 + seededRandom(seed, 0) * 40;
  const sat = 40 + seededRandom(seed, 1) * 50;

  const blobs = [];
  for (let i = 0; i < 3; i++) {
    const hue = baseHue + (seededRandom(seed, 2 + i * 6) * 30 - 15);
    const bSat = Math.min(90, sat + (seededRandom(seed, 3 + i * 6) * 20 - 10));
    const light = 50 + seededRandom(seed, 4 + i * 6) * 25;
    const cx = 20 + seededRandom(seed, 5 + i * 6) * 60;
    const cy = 20 + seededRandom(seed, 6 + i * 6) * 60;
    const r = 22 + seededRandom(seed, 7 + i * 6) * 18;
    blobs.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${hue}, ${bSat}%, ${light}%)" opacity="0.7"/>`);
  }

  const bgLight = 95 + seededRandom(seed, 20) * 3;
  const bgColor = `hsl(${baseHue}, ${sat * 0.3}%, ${bgLight}%)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${outputSize}" height="${outputSize}">
  <defs>
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.12 0"/>
    </filter>
    <filter id="b">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
    <clipPath id="c"><rect width="80" height="80" rx="40"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="80" height="80" fill="${bgColor}"/>
    <g filter="url(#b)">${blobs.join('')}</g>
    <rect width="80" height="80" fill="transparent" filter="url(#n)"/>
  </g>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface CoverBlob {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}

export function generateCoverBlobs(name: string): { bgColor: string; blobs: CoverBlob[] } {
  const seed = hashName(name);
  const baseHue = 250 + seededRandom(seed, 0) * 40;
  const sat = 40 + seededRandom(seed, 1) * 50;

  const blobs: CoverBlob[] = [];
  for (let i = 0; i < 4; i++) {
    const hue = baseHue + (seededRandom(seed, 50 + i * 5) * 30 - 15);
    const bSat = Math.min(90, sat + (seededRandom(seed, 51 + i * 5) * 20 - 10));
    const light = 50 + seededRandom(seed, 52 + i * 5) * 25;
    const cx = seededRandom(seed, 53 + i * 5) * 100;
    const cy = 20 + seededRandom(seed, 54 + i * 5) * 60;
    const r = 20 + seededRandom(seed, 55 + i * 5) * 30;
    blobs.push({ cx, cy, r, fill: `hsl(${hue}, ${bSat}%, ${light}%)` });
  }

  const bgLight = 95 + seededRandom(seed, 80) * 3;
  const bgColor = `hsl(${baseHue}, ${sat * 0.3}%, ${bgLight}%)`;

  return { bgColor, blobs };
}
