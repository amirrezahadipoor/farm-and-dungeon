// serve.mjs — سرور استاتیک با Cache-Control: no-store (جلوگیری از ماژول کهنه در مرورگر)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json', '.mjs': 'text/javascript; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // پیش‌نمایش/ریشه = بیلد تک‌فایلی game.html (اسکریپت inline ⇒ در iframe سندباکسِ پیش‌نمایش هم اجرا می‌شود؛
  // index.html نسخه‌ی ماژولی است و ماژول‌های ES در origin=null بار نمی‌شوند)
  if (p === '/') p = '/game.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(8080, '0.0.0.0', () => console.log('serving on :8080 (no-store)'));
