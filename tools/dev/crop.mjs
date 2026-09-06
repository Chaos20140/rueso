import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const [file, x, y, w, h, scale] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
const png = await p.evaluate(async ([d, X, Y, W, H, S]) => {
  const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = 'data:image/png;base64,' + d; });
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, X, Y, W, H, 0, 0, W * S, H * S);
  return c.toDataURL('image/png').split(',')[1];
}, [fs.readFileSync(file).toString('base64'), +x, +y, +w, +h, +(scale || 6)]);
await b.close();
const out = file.replace(/\.png$/, `-crop.png`);
fs.writeFileSync(out, Buffer.from(png, 'base64'));
console.log(out);
