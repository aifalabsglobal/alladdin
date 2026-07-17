// One-off asset build: derive public/logo-transparent.png from public/logo.png
// by making near-white background pixels transparent (soft threshold).
import sharp from "sharp";

const src = "public/logo.png";
const out = "public/logo-transparent.png";

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const min = Math.min(r, g, b);
  if (min >= 230) {
    // Fade out near-white: fully transparent at 245+, partial between 230-245.
    const t = Math.min(1, (min - 230) / 15);
    data[i + 3] = Math.round(data[i + 3] * (1 - t));
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim()
  .resize(512, 512, { fit: "inside" })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log("wrote", out);
