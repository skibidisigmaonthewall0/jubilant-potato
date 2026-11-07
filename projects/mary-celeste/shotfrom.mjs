// node shotfrom.mjs <frames csv> <out.jpg> [q]  — renders frames of the short into a contact sheet
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [,, csv, out] = process.argv;
const frames = csv.split(',').map(Number);
const root = path.resolve('web');
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); try { if (!fs.statSync(p).isFile()) throw 0; } catch { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(p).pipe(s); }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
pg.on('console', m => { if (!/GL|WebGL|swiftshader/i.test(m.text())) console.log('PAGE', m.text()); });
pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto(`http://localhost:${srv.address().port}/index.html`);
await pg.waitForFunction(() => window.ready || window.err, null, { timeout: 240000 });
if (await pg.evaluate(() => window.err)) { console.log('page error'); process.exit(1); }
fs.mkdirSync('stills/tmp', { recursive: true });
for (const f of frames) {
  const d = await pg.evaluate((f) => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', 0.9); }, f);
  fs.writeFileSync(`stills/tmp/f${String(f).padStart(4, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
  console.log('rendered', f);
}
await b.close(); srv.close();
