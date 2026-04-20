const http = require('http');
const url = require('url');

let nextId = 1;
const businessUnits = [ { id: nextId++, name: 'QA-T1' }, { id: nextId++, name: 'HQ' } ];

function sendJSON(res, status, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(s);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => data += chunk);
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const parsed = url.parse(req.url, true);
  const parts = parsed.pathname.split('/').filter(Boolean);

  if (parts[0] === 'api' && parts[1] === 'master-data' && parts[2] === 'business-units') {
    const idPart = parts[3];
    if (req.method === 'GET' && parts.length === 3) {
      return sendJSON(res, 200, businessUnits);
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const item = { id: nextId++, name: body.name };
      businessUnits.push(item);
      return sendJSON(res, 201, item);
    }
    if (req.method === 'PUT' && idPart) {
      const id = Number(idPart);
      const body = await parseBody(req);
      const item = businessUnits.find(b => b.id === id);
      if (!item) return sendJSON(res, 404, { message: 'Not found' });
      item.name = body.name || item.name;
      return sendJSON(res, 200, item);
    }
    if (req.method === 'DELETE' && idPart) {
      const id = Number(idPart);
      const idx = businessUnits.findIndex(b => b.id === id);
      if (idx === -1) return sendJSON(res, 404, { message: 'Not found' });
      businessUnits.splice(idx,1);
      res.writeHead(204); return res.end();
    }
  }

  res.writeHead(404); res.end('Not found');
});

const port = 8080;
server.listen(port, () => console.log(`Mock API (simple) listening on http://localhost:${port}`));
