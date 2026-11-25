#!/usr/bin/env node
// Lokalny serwer do nagrywania rolki: podaje pliki gry i zapisuje gotowe nagranie.
// Działa tylko na tym komputerze (127.0.0.1). Użycie: node tools/reel/server.js plik.mp4
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const out = path.resolve(root, process.argv[2] || 'rolka-surowa.mp4');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/log') {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        console.log(body);
        res.end('ok');
      });
      return;
    }
    // Miniaturki YouTube przez ten serwer: obrazek z innej domeny blokuje nagrywanie płótna.
    const thumb = /^\/thumb\/([\w-]{11})$/.exec(url.pathname);
    if (thumb) {
      fetch(`https://i.ytimg.com/vi/${thumb[1]}/hqdefault.jpg`)
        .then((r) => r.arrayBuffer())
        .then((data) => {
          res.setHeader('Content-Type', 'image/jpeg');
          res.end(Buffer.from(data));
        })
        .catch(() => {
          res.statusCode = 502;
          res.end();
        });
      return;
    }
    if (req.method === 'PUT' && url.pathname === '/upload') {
      const file = fs.createWriteStream(out);
      req.pipe(file);
      file.on('finish', () => {
        res.end('saved');
        console.log(`SAVED ${out}`);
        setTimeout(() => process.exit(0), 300);
      });
      return;
    }
    const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) {
      res.statusCode = 403;
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(data);
    });
  })
  .listen(8330, '127.0.0.1', () => console.log('READY'));
