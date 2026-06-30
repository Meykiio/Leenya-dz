import { Phone, MapPin } from "lucide-react";

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
  category?: string | null;
  wilaya?: string | null;
  phone?: string | null;
}

export default function PixelCover({ name, category, wilaya, phone }: PixelCoverProps) {
  const seed = hashName(name);
  const palette = PALETTES[seed % PALETTES.length];
  const gl = seed % 6;

  const gradientDefs = [
    `<linearGradient id="g0" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.6)"/></linearGradient>`,
    `<linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(0,0,0,0.35)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></linearGradient>`,
  ];

  const cells: string[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 40; col++) {
      const srcCol = col < 20 ? col : 39 - col;
      const cellSeed = ((seed + row * 13 + srcCol * 37) * 31) | 0;
      if (Math.abs(cellSeed) % 100 > 22) {
        const ci = (Math.abs(cellSeed >> 4) + row + srcCol) % (palette.length - 1) + 1;
        cells.push(
          `<rect x="${col * 20}" y="${row * 20}" width="20" height="20" fill="${palette[ci]}" rx="2" />`
        );
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 140" width="100%" height="100%" preserveAspectRatio="none" style="display:block">
    <defs>${gradientDefs.join("")}</defs>
    <rect width="800" height="140" fill="${palette[0]}" />
    ${cells.join("")}
    <rect width="800" height="140" fill="url(#g0)" />
    <rect width="500" height="140" fill="url(#g1)" />
  </svg>`;

  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return (
    <div className="h-[140px] w-full relative overflow-hidden">
      <img src={dataUrl} alt="" className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 px-5 flex flex-col justify-center">
        <h1 className="text-[22px] font-bold text-white drop-shadow-sm leading-tight max-w-[65%]">
          {name}
        </h1>
        {(category || wilaya) && (
          <p className="text-[13px] text-white/80 mt-0.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 inline" />
            {[category, wilaya].filter(Boolean).join(" · ")}
          </p>
        )}
        {phone && (
          <p className="text-[12px] text-white/60 mt-0.5 flex items-center gap-1.5">
            <Phone className="h-3 w-3 inline" />
            {phone}
          </p>
        )}
      </div>
    </div>
  );
}
