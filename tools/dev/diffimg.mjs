/** Dev: erzeugt ein Diff-Bild für ein Screenshot-Paar aus .shots/. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [vp, idx] = process.argv.slice(2);
const dir = path.join(ROOT, '.shots', vp);
const A = path.join(dir, `ref-${idx}.png`);
const B = path.join(dir, `new-${idx}.png`);

const b = await chromium.launch();
const p = await b.newPage();
const out = await p.evaluate(async ([a, bb]) => {
  const load = (x) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej;
    i.src = 'data:image/png;base64,' + x;
  });
  const [ia, ib] = await Promise.all([load(a), load(bb)]);
  const cv = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, img.width, img.height); };
  const da = cv(ia), db = cv(ib);
  const outC = document.createElement('canvas'); outC.width = ia.width; outC.height = ia.height;
  const octx = outC.getContext('2d'); const od = octx.createImageData(ia.width, ia.height);
  const boxes = [];
  for (let y = 0; y < ia.height; y++) for (let x = 0; x < ia.width; x++) {
    const i = (y * ia.width + x) * 4;
    const d = Math.abs(da.data[i] - db.data[i]) + Math.abs(da.data[i + 1] - db.data[i + 1]) + Math.abs(da.data[i + 2] - db.data[i + 2]);
    const bad = d > 24;
    od.data[i] = bad ? 255 : da.data[i] * 0.25 + 190;
    od.data[i + 1] = bad ? 0 : da.data[i + 1] * 0.25 + 190;
    od.data[i + 2] = bad ? 0 : da.data[i + 2] * 0.25 + 190;
    od.data[i + 3] = 255;
    if (bad) boxes.push([x, y]);
  }
  octx.putImageData(od, 0, 0);
  const xs = boxes.map(b2 => b2[0]), ys = boxes.map(b2 => b2[1]);
  return {
    png: outC.toDataURL('image/png').split(',')[1],
    count: boxes.length,
    bbox: boxes.length ? { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } : null,
  };
}, [fs.readFileSync(A).toString('base64'), fs.readFileSync(B).toString('base64')]);
await b.close();

const file = path.join(dir, `diff-${idx}.png`);
fs.writeFileSync(file, Buffer.from(out.png, 'base64'));
console.log(`abweichende Pixel: ${out.count}`);
console.log('Bounding-Box:', out.bbox);
console.log('→', path.relative(ROOT, file));
