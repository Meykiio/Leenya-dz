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

interface PixelCoverProps {
  name: string;
}

export default function PixelCover({ name }: PixelCoverProps) {
  const seed = hashName(name);
  const palette = PALETTES[seed % PALETTES.length];
  const angle = (seed % 360).toString();
  const c1 = palette[1];
  const c2 = palette[2];
  const c3 = palette[3];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 140" width="100%" height="100%" preserveAspectRatio="none" style="display:block">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${palette[0]}" />
        <stop offset="35%" stop-color="${c1}" />
        <stop offset="70%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c3}" />
      </linearGradient>
    </defs>
    <rect width="800" height="140" fill="url(#g)" />
  </svg>`;

  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return (
    <div className="h-[140px] w-full overflow-hidden">
      <img src={dataUrl} alt="" className="h-full w-full" />
    </div>
  );
}
