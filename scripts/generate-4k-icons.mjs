import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generate4kIcons() {
  const sourcePath = 'public/chillbill-exact-transparent-4k.png';
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source 4K transparent logo not found at ${sourcePath}`);
  }

  console.log('Loading 4K source image:', sourcePath);
  const rawMeta = await sharp(sourcePath).metadata();
  console.log(`Source dimensions: ${rawMeta.width}x${rawMeta.height}, channels: ${rawMeta.channels}, format: ${rawMeta.format}`);

  // Find exact tight bounding box of visible artwork
  const { data, info } = await sharp(sourcePath).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const tightW = maxX - minX + 1;
  const tightH = maxY - minY + 1;
  console.log(`Tight bounding box: left=${minX}, top=${minY}, width=${tightW}, height=${tightH}`);
  console.log(`Optical center of artwork in source: X=${(minX + maxX)/2}, Y=${(minY + maxY)/2}`);

  // Extract tight cropped artwork buffer
  const croppedArtwork = await sharp(sourcePath)
    .extract({ left: minX, top: minY, width: tightW, height: tightH })
    .toBuffer();

  const pureBlackBg = { r: 0, g: 0, b: 0, alpha: 1 }; // Pure pitch black OLED

  // Helper to create perfectly centered icon
  async function createCenteredIcon(canvasSize, contentTargetHeight, outputPath) {
    const resizedContent = await sharp(croppedArtwork)
      .resize(null, contentTargetHeight, {
        fit: 'inside',
        kernel: 'lanczos3'
      })
      .toBuffer();

    const result = await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: pureBlackBg
      }
    })
      .composite([{ input: resizedContent, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(outputPath);

    // Verify bounds of output
    const outMeta = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
    let oMinX = outMeta.info.width, oMaxX = 0, oMinY = outMeta.info.height, oMaxY = 0;
    for (let y = 0; y < outMeta.info.height; y++) {
      for (let x = 0; x < outMeta.info.width; x++) {
        const idx = (y * outMeta.info.width + x) * 4;
        const r = outMeta.data[idx], g = outMeta.data[idx+1], b = outMeta.data[idx+2];
        if (r > 30 || g > 30 || b > 30) {
          if (x < oMinX) oMinX = x;
          if (x > oMaxX) oMaxX = x;
          if (y < oMinY) oMinY = y;
          if (y > oMaxY) oMaxY = y;
        }
      }
    }
    const cX = (oMinX + oMaxX) / 2;
    const cY = (oMinY + oMaxY) / 2;
    const leftMargin = oMinX;
    const rightMargin = canvasSize - oMaxX - 1;
    console.log(`Generated ${outputPath} (${canvasSize}x${canvasSize}):`);
    console.log(`  Artwork bounds: W=${oMaxX - oMinX + 1}, H=${oMaxY - oMinY + 1}`);
    console.log(`  Center: (${cX}, ${cY}), Left margin=${leftMargin}px, Right margin=${rightMargin}px, Symmetry diff=${Math.abs(leftMargin - rightMargin)}px`);
  }

  // 1. Full 4K Master App Icon (3840x3840)
  // Artwork height = 2600px (~68% of 3840)
  await createCenteredIcon(3840, 2600, 'public/chillbill-app-icon-4k.png');

  // 2. High-Res 1024 Master Icon (1024x1024)
  // Artwork height = 700px (~68.3% of 1024)
  await createCenteredIcon(1024, 700, 'public/chillbill-app-icon-1024.png');

  // 3. Standard 512 PWA Icon (512x512)
  // Artwork height = 350px (~68.3% of 512)
  await createCenteredIcon(512, 350, 'public/icon-512.png');

  // 4. Android Maskable 512 Icon (512x512)
  // Safe zone diameter = 66%-70%, artwork height = 328px (~64% of 512) to ensure
  // zero clipping across all squircle, circle, and teardrop shapes
  await createCenteredIcon(512, 328, 'public/icon-maskable-512.png');

  // 5. Standard 192 PWA Icon (192x192)
  // Artwork height = 132px (~68.7% of 192)
  await createCenteredIcon(192, 132, 'public/icon-192.png');

  // 6. Apple Touch Icon for iOS Safari (180x180)
  // Artwork height = 124px (~68.8% of 180)
  await createCenteredIcon(180, 124, 'public/apple-touch-icon.png');

  // 7. Favicon 48x48 PNG (for browser tab)
  await createCenteredIcon(48, 36, 'public/favicon-48.png');

  console.log('All 4K upscale icons successfully generated with perfect mathematical centering!');
}

generate4kIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
