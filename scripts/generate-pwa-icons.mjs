import sharp from "sharp";

const sizes = [192, 512];
const input = "public/logo.png";

// Standard icons — fill the whole square
for (const size of sizes) {
  await sharp(input)
    .resize(size, size, { fit: "cover", position: "center" })
    .png()
    .toFile(`public/pwa-icon-${size}.png`);
  console.log(`Generated public/pwa-icon-${size}.png`);
}

// Maskable icon — shrink to 80% with background for OS safe-zone cropping
for (const size of sizes) {
  const inner = Math.round(size * 0.72);
  const pad = Math.round((size - inner) / 2);
  await sharp(input)
    .resize(inner, inner, { fit: "cover", position: "center" })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 104, g: 40, b: 232, alpha: 1 } })
    .png()
    .toFile(`public/pwa-icon-${size}-maskable.png`);
  console.log(`Generated public/pwa-icon-${size}-maskable.png`);
}
