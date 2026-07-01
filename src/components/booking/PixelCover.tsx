import { generateCoverBlobs } from "@/lib/pixel-avatar";

interface PixelCoverProps {
  name: string;
}

export default function PixelCover({ name }: PixelCoverProps) {
  const { bgColor, blobs } = generateCoverBlobs(name);

  const blobSvg = blobs.map((b) =>
    `<circle cx="${b.cx}%" cy="${b.cy}%" r="${b.r}" fill="${b.fill}" opacity="0.6"/>`
  ).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 140" width="100%" height="100%" preserveAspectRatio="none" style="display:block">
  <defs>
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.10 0"/>
    </filter>
    <filter id="b">
      <feGaussianBlur stdDeviation="25"/>
    </filter>
  </defs>
  <rect width="800" height="140" fill="${bgColor}"/>
  <g filter="url(#b)">${blobSvg}</g>
  <rect width="800" height="140" fill="transparent" filter="url(#n)"/>
</svg>`;

  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return (
    <div className="h-[140px] w-full overflow-hidden">
      <img src={dataUrl} alt="" className="h-full w-full" />
    </div>
  );
}
