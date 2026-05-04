const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveIndex(res) {
  fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
    if (err) { res.writeHead(500); res.end('Error'); return; }
    const keyScript = API_KEY
      ? `<script>window.__FORGE_KEY__=${JSON.stringify(API_KEY)}</script>`
      : '';
    const html = data.toString().replace('<!-- __FORGE_KEY__ -->', keyScript);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
}

http.createServer((req, res) => {
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  if (req.url === '/' || ext === '.html') {
    serveIndex(res);
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { serveIndex(res); return; }
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Forge running on port ${PORT}`));
