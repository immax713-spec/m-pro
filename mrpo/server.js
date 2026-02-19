const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const constants = require('constants');

const root = __dirname;
const port = Number(process.env.PORT || 5174);
const TARGET = process.env.TARGET_URL || 'https://script.google.com/macros/s/AKfycbwbUxbTH5jvqX6awLbVdmDy0-8vbftNs1z47Fvro2LYSgIoIeWEUCJeQDnXBGzSHw3MRA/exec';
// 🔥 GLOBAL AGENT: Keep-Alive DISABLED for stability with GAS
// 🔥 GLOBAL AGENT: Enforce TLS 1.2 and LEGACY_SERVER_CONNECT to prevent 'bad record mac' errors on Node 20+
const agent = new https.Agent({
  keepAlive: false,
  maxSockets: 100,
  timeout: 300000,
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.2',
  secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT
});

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.map': 'application/octet-stream',
  '.ico': 'image/x-icon'
};

function safeJoin(base, target) {
  const normalizedBase = path.resolve(base);
  const cleaned = String(target || '');
  const stripped = cleaned.replace(/^[/\\]+/, '');
  const joined = path.join(normalizedBase, stripped);
  const normalizedJoined = path.resolve(joined);
  if (!normalizedJoined.startsWith(normalizedBase)) return normalizedBase;
  return normalizedJoined;
}

const server = http.createServer((req, res) => {
  try {
    console.log(`[Request] ${req.method} ${req.url}`);
    const raw = req.url || '/';
    const parsed = url.parse(raw, true);
    const pathname = parsed.pathname || '/';
    const search = parsed.search || '';
    const query = parsed.query || {};
    let decodedPathname = pathname;
    try { decodedPathname = decodeURIComponent(pathname); } catch (_) { }

    if (pathname === '/') {
      const filePath = path.join(root, 'Приложение 1', 'index.html');
      console.log('Serving root:', filePath);
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          console.error('Root index not found:', err);
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        fs.createReadStream(filePath).pipe(res);
      });
      return;
    }

    if (decodedPathname === '/Приложение 2/' || pathname === '/Приложение%202/') {
      const filePath = path.join(root, 'Приложение 2', 'dist', 'index.html');
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        fs.createReadStream(filePath).pipe(res);
      });
      return;
    }

    if (pathname === '/favicon.ico' || pathname === '/favicon.svg') {
      let faviconPath;
      if (pathname === '/favicon.svg') {
        faviconPath = path.join(root, 'Приложение 1', 'favicon.svg');
        res.setHeader('Content-Type', 'image/svg+xml');
      } else {
        faviconPath = path.join(root, 'Приложение 1', 'favicon.svg');
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      fs.stat(faviconPath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(204);
          res.end();
          return;
        }
        fs.createReadStream(faviconPath).pipe(res);
      });
      return;
    }

    if (pathname && pathname.startsWith('/exec')) {
      const targetUrl = TARGET + (search || '');
      const cbName = String((query && query.callback) || 'callback');
      const action = String((query && query.action) || '');

      console.log(`[${req.method}] /exec Action=${action}`);

      let bodyBuffer = null;

      const performProxy = () => {
        // We will store the current active request to abort it if client disconnects
        let activeUpstreamRequest = null;

        const handle = (nextUrl, attempt = 0, method = req.method || 'GET', cookies = []) => {
          console.log(`[Proxy] ⏱️  START Attempt ${attempt}: ${method} ${nextUrl}`);
          const opts = url.parse(nextUrl);
          opts.method = method;
          opts.agent = agent;
          opts.timeout = 300000;
          // Normalize and filter headers
          const cleanHeaders = {};
          Object.keys(req.headers).forEach(k => {
            const lowKey = k.toLowerCase();
            // Remove headers that should be recalculated or are problematic for proxying
            if (!['host', 'accept-encoding', 'connection', 'content-length', 'content-type', 'transfer-encoding'].includes(lowKey)) {
              cleanHeaders[lowKey] = req.headers[k];
            }
          });
          cleanHeaders['connection'] = 'close';

          // For POST requests, ensure correct content headers
          if (method === 'POST') {
            const originalCT = req.headers['content-type'] || req.headers['Content-Type'];
            cleanHeaders['content-type'] = originalCT || 'application/json';

            if (bodyBuffer) {
              cleanHeaders['content-length'] = bodyBuffer.length;
              console.log(`[Proxy] Setting content-length: ${bodyBuffer.length} for POST`);
            }
          }
          opts.headers = cleanHeaders;

          if (cookies && cookies.length) {
            const existing = opts.headers.cookie || '';
            const newCookies = cookies.map(c => c.split(';')[0]).join('; ');
            opts.headers.cookie = existing ? `${existing}; ${newCookies}` : newCookies;
          }

          const protocol = opts.protocol === 'https:' ? https : http;
          console.log(`[Proxy] 🚀 Sending ${method} request to upstream...`);
          const up = protocol.request(opts, (upRes) => {
            const status = upRes.statusCode || 200;
            const loc = upRes.headers.location;
            const setCookie = upRes.headers['set-cookie'];
            console.log(`[Proxy] ✅ Response received: ${status} Location: ${loc}`);

            if ([301, 302, 303, 307, 308].includes(status) && loc && attempt < 5) {
              console.log(`[Proxy] Redirecting to ${loc}`);
              let nextMethod = method;

              // GAS usually redirects POST to GET via 302/303. 
              // We must switch to GET to follow the redirect correctly and get the payload.
              if (status === 302 || status === 303 || (status === 301 && method === 'POST')) {
                nextMethod = 'GET';
                console.log(`[Proxy] Switching method to GET for redirect (Status ${status})`);
              }

              const nextCookies = (cookies || []).concat(setCookie || []);
              return handle(loc, attempt + 1, nextMethod, nextCookies);
            }

            const chunks = [];
            upRes.on('data', (c) => {
              if (res.headersSent) return;
              chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
              console.log(`[Proxy] 📦 Received data chunk: ${c.length} bytes`);
            });
            upRes.on('end', () => {
              if (res.headersSent) return;
              console.log(`[Proxy] ✅ All data received. Total chunks: ${chunks.length}`);

              const buf = Buffer.concat(chunks);
              console.log(`[Proxy] Buffer size: ${buf.length} bytes`);
              console.log(`[Proxy] First 200 chars:`, buf.toString('utf8', 0, Math.min(200, buf.length)));
              const ct = (upRes.headers['content-type'] || '').toLowerCase();
              let outBody = buf;
              let outType = ct || 'application/json';

              const hasCallback = !!(query && query.callback);
              const looksHtml = ct.includes('text/html') || (buf.toString('utf8', 0, 10).trim().startsWith('<'));

              // Final transformation logic
              if (hasCallback) {
                // For JSONP requests, we MUST return JavaScript and a function call
                outType = 'application/javascript; charset=utf-8';

                if (looksHtml || status >= 400) {
                  // If it's HTML or an error, wrap the text into a JSON object so it's safe for the callback
                  console.log(`[Proxy] ⚠️ Wrapping HTML/Error response for JSONP. Status=${status}`);
                  const wrap = {
                    success: status < 400,
                    status,
                    message: status >= 400 ? 'upstream error' : 'html response',
                    html: buf.toString('utf8')
                  };
                  outBody = Buffer.from(`${cbName}(${JSON.stringify(wrap)})`, 'utf8');
                } else {
                  // Presumably it's already JSON or compatible text
                  outBody = Buffer.from(`${cbName}(${buf.toString('utf8')})`, 'utf8');
                }
              } else if (looksHtml) {
                outType = 'text/html';
                outBody = buf;
              }

              res.writeHead(status, { 'Content-Type': outType, 'Cache-Control': 'no-store' });
              res.end(outBody);
              console.log('[Proxy] Request Completed with Status:', status);
            });

            upRes.on('error', (err) => {
              console.error('[Proxy] Upstream Response Error:', err);
              if (!res.headersSent) {
                res.writeHead(502);
                res.end('Upstream Response Error');
              }
            });
          });

          // 🔥 DISABLED: Don't abort upload even if browser disconnects
          // This allows uploads to complete and folders to be created on Yandex
          // even if browser thinks the request timed out
          /*
          req.on('close', () => {
            if (up && !up.destroyed) {
              console.log('❌ Browser disconnected. Aborting upstream request.');
              up.destroy();
            }
          });
          */

          up.on('error', (err) => {
            console.error(`[Proxy] ❌ Upstream request error:`, err.message);
            if (activeUpstreamRequest === up) activeUpstreamRequest = null;
            if (res.headersSent) return;
            // Only log if not aborted by user
            if (err.message !== 'socket hang up') {
              console.error('[Proxy] Full error details:', err);
              res.writeHead(500);
              res.end(JSON.stringify({ error: String(err) }));
            }
          });

          if (method === 'POST' && bodyBuffer) {
            console.log(`[Proxy] 📤 Writing POST body to upstream: ${bodyBuffer.length} bytes`);
            up.write(bodyBuffer);
          }
          console.log(`[Proxy] 🏁 Request sent, waiting for response...`);
          up.end();

          activeUpstreamRequest = up;
          return up;
        };

        handle(targetUrl);
      };

      if (req.method === 'POST') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          bodyBuffer = Buffer.concat(chunks);
          console.log(`[Proxy] POST Body Received via Localhost. Size: ${bodyBuffer.length} bytes`);

          // Try to parse action from body
          try {
            const bodyStr = bodyBuffer.toString('utf8');
            const bodyJson = JSON.parse(bodyStr);
            const bodyAction = bodyJson.action || '';
            console.log(`[Proxy] POST Body action: ${bodyAction}`);
            console.log(`[Proxy] POST Body preview:`, bodyStr.substring(0, 200));
          } catch (e) {
            console.log(`[Proxy] Could not parse POST body as JSON:`, e.message);
          }

          performProxy();
        });
      } else {
        performProxy();
      }
      return;
    }

    if (pathname === '/image') {
      const rawUrl = String((query && (query.u || query.url)) || '');
      if (!rawUrl) { res.statusCode = 400; res.end('Bad Request'); return; }
      const client = rawUrl.startsWith('https') ? https : http;
      try {
        const up = client.request(rawUrl, { method: 'GET' }, (upRes) => {
          const chunks = [];
          upRes.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          upRes.on('end', () => {
            const buf = Buffer.concat(chunks);
            const ct = (upRes.headers['content-type'] || 'application/octet-stream');
            res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
            res.end(buf);
          });
        });
        up.on('error', () => { res.statusCode = 502; res.end('Bad Gateway'); });
        up.end();
      } catch (_) {
        res.statusCode = 500; res.end('Server Error');
      }
      return;
    }

    let filePath;
    if (decodedPathname.startsWith('/assets/')) {
      filePath = safeJoin(path.join(root, 'Приложение 1'), decodedPathname);
    } else if (decodedPathname.startsWith('/Приложение 2/')) {
      const relative = decodedPathname.substring('/Приложение 2/'.length);
      filePath = safeJoin(path.join(root, 'Приложение 2', 'dist'), relative);
    } else {
      // Try Приложение 1 first for root-level files
      filePath = safeJoin(path.join(root, 'Приложение 1'), decodedPathname);
    }

    if ((decodedPathname || '').endsWith('/')) filePath = path.join(filePath, 'index.html');

    console.log(`[Server] 📂 Resolving file: ${decodedPathname} → ${filePath}`);
    fs.stat(filePath, (err, stat) => {
      console.log(`[Server] 📂 File stat: ${filePath} (exists: ${!err}, size: ${stat ? stat.size : 'N/A'})`);
      if (err || !stat.isFile()) {
        console.error('File not found:', filePath);
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = types[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (err) {
    console.error('[Server] Global Error:', err);

    // Attempt to extract callback for JSONP support even in global error
    try {
      const raw = req.url || '/';
      const parsed = url.parse(raw, true);
      const cbName = parsed.query && parsed.query.callback;

      if (cbName) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.end(`${cbName}(${JSON.stringify({ success: false, message: 'Internal Server Error', error: String(err) })})`);
        return;
      }
    } catch (_) { }

    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, message: 'Internal Server Error' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}/`);
  console.log('Root dir:', root);
});
