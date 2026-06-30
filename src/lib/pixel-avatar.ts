const PALETTES = [
  ["#F5F3FF", "#8B5CF6", "#6D28D9", "#A78BFA", "#C4B5FD"],
  ["#ECFDF5", "#10B981", "#059669", "#34D399", "#6EE7B7"],
  ["#FFF7ED", "#F97316", "#C2410C", "#FB923C", "#FDBA74"],
  ["#F7FEE7", "#84CC16", "#4D7C0F", "#A3E635", "#BEF264"],
  ["#EFF6FF", "#3B82F6", "#1D4ED8", "#60A5FA", "#93C5FD"],
  ["#FFF1F2", "#F43F5E", "#BE123C", "#FB7185", "#FDA4AF"],
  ["#FFFBEB", "#F59E0B", "#B45309", "#FBBF24", "#FDE68A"],
  ["#F0FDFA", "#14B8A6", "#0F766E", "#2DD4BF", "#5EEAD4"],
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generatePixelAvatar(name: string, outputSize = 80): string {
  const seed = hashName(name);
  const palette = PALETTES[seed % PALETTES.length];
  const angle = ((seed * 13) % 360).toString();
  const c1 = palette[1 + (seed % 3)];
  const c2 = palette[3 + (seed % 2)];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${outputSize}" height="${outputSize}">
    <defs>
      <linearGradient id="a" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${palette[0]}" />
        <stop offset="50%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </linearGradient>
    </defs>
    <rect width="80" height="80" rx="40" fill="url(#a)" />
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
