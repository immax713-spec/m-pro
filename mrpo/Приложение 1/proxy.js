const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const TARGET = 'https://script.google.com/macros/s/AKfycbwbUxbTH5jvqX6awLbVdmDy0-8vbftNs1z47Fvro2LYSgIoIeWEUCJeQDnXBGzSHw3MRA/exec';
const LEGACY_TARGET = 'https://script.google.com/macros/s/AKfycbwbUxbTH5jvqX6awLbVdmDy0-8vbftNs1z47Fvro2LYSgIoIeWEUCJeQDnXBGzSHw3MRA/exec';
let FORCE_SHEET_ID = '1B9Joj6DFhJM9DMmp8JHQpF66JSii0WPSdKZIUPvZGko';
const PORT = Number(process.env.PORT || '') || 5550;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
}

const server = http.createServer((req, res) => {
  let responded = false;
  const safeEnd = (code, headers, body = '') => {
    if (responded) return;
    responded = true;
    if (headers) {
      try { res.writeHead(code, headers); } catch (_) { }
    } else {
      try { res.writeHead(code); } catch (_) { }
    }
    try { res.end(body); } catch (_) { }
  };

  setCors(res);
  const parsed = url.parse(req.url, true);
  const isJsonp = parsed && parsed.query && typeof parsed.query.callback === 'string' && parsed.query.callback.length > 0;

  console.log(`[proxy] ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return safeEnd(204);
  }

  // Runtime TARGET controls
  if (req.method === 'GET' && parsed.pathname === '/target') {
    const body = JSON.stringify({ success: true, target: TARGET, legacy_target: LEGACY_TARGET, force_sheet_id: FORCE_SHEET_ID || '' });
    return safeEnd(200, { 'Content-Type': 'application/json' }, body);
  }
  if (req.method === 'GET' && parsed.pathname === '/target/legacy') {
    const body = JSON.stringify({ success: true, legacy_target: LEGACY_TARGET });
    return safeEnd(200, { 'Content-Type': 'application/json' }, body);
  }
  if (req.method === 'GET' && parsed.pathname === '/target/sid') {
    const body = JSON.stringify({ success: true, force_sheet_id: FORCE_SHEET_ID || '' });
    return safeEnd(200, { 'Content-Type': 'application/json' }, body);
  }
  if (req.method === 'GET' && parsed.pathname === '/target/sid/clear') {
    FORCE_SHEET_ID = '';
    const body = JSON.stringify({ success: true, force_sheet_id: '' });
    return safeEnd(200, { 'Content-Type': 'application/json' }, body);
  }
  if (req.method === 'GET' && parsed.pathname === '/target/set') {
    let next = parsed.query && typeof parsed.query.u === 'string' ? parsed.query.u : '';
    const hasSidParam = parsed.query && Object.prototype.hasOwnProperty.call(parsed.query, 'sid');
    let sid = hasSidParam ? String(parsed.query.sid || '') : '';
    if (!next) {
      return safeEnd(400, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'missing u' }));
    }
    try {
      next = decodeURIComponent(String(next).trim());
      next = next.replace(/^<|>$/g, '');
      if (/^AKf/i.test(next)) next = 'https://script.google.com/macros/s/' + next + '/exec';
      if (!/^https?:\/\//i.test(next)) {
        return safeEnd(400, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'invalid url', received: next }));
      }
      TARGET = next;
      try { LEGACY_TARGET = TARGET; } catch (_) { }
      if (hasSidParam) {
        sid = decodeURIComponent(String(sid).trim());
        sid = sid.replace(/^<|>$/g, '');
        FORCE_SHEET_ID = sid; // может быть пустой строкой — это очистка
      }
      console.log(`[proxy] TARGET updated -> ${TARGET}`);
      console.log(`[proxy] LEGACY_TARGET mirrored -> ${LEGACY_TARGET}`);
      return safeEnd(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, target: TARGET, legacy_target: LEGACY_TARGET, force_sheet_id: FORCE_SHEET_ID || '' }));
    } catch (e) {
      return safeEnd(500, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'update failed', error: String(e) }));
    }
  }
  if (req.method === 'GET' && parsed.pathname === '/target/legacy/set') {
    let next = parsed.query && typeof parsed.query.u === 'string' ? parsed.query.u : '';
    if (!next) return safeEnd(400, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'missing u' }));
    try {
      next = decodeURIComponent(String(next).trim());
      next = next.replace(/^<|>$/g, '');
      if (/^AKf/i.test(next)) next = 'https://script.google.com/macros/s/' + next + '/exec';
      if (!/^https?:\/\//i.test(next)) {
        return safeEnd(400, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'invalid url', received: next }));
      }
      LEGACY_TARGET = next;
      console.log(`[proxy] LEGACY_TARGET updated -> ${LEGACY_TARGET}`);
      return safeEnd(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true, legacy_target: LEGACY_TARGET }));
    } catch (e) {
      return safeEnd(500, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'legacy update failed', error: String(e) }));
    }
  }

  // Serve favicon
  if (req.method === 'GET' && (parsed.pathname === '/favicon.ico' || parsed.pathname === '/favicon.svg')) {
    const faviconPath = path.join(__dirname, 'favicon.svg');
    return fs.readFile(faviconPath, (err, data) => {
      if (err) {
        return safeEnd(204);
      }
      return safeEnd(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }, data);
    });
  }

  // Static site for Application 1: serve index.html and assets
  if (req.method === 'GET' && (parsed.pathname === '/' || parsed.pathname === '/index.html' || (parsed.pathname && parsed.pathname.startsWith('/assets/')))) {
    // If assets requested by dashboards page, serve from App2/dist assets
    if (parsed.pathname && parsed.pathname.startsWith('/assets/') && req.headers && typeof req.headers['referer'] === 'string' && req.headers['referer'].includes('/dashboards')) {
      const distRoot = path.join(__dirname, '..', 'Приложение 2', 'dist');
      const rel = parsed.pathname.replace(/^\/+/, '');
      const filePath = path.join(distRoot, rel);
      return fs.readFile(filePath, (err, data) => {
        if (err) {
          return safeEnd(404, { 'Content-Type': 'text/plain' }, 'Not Found');
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = (
          ext === '.html' ? 'text/html; charset=utf-8' :
            ext === '.js' ? 'application/javascript; charset=utf-8' :
              ext === '.css' ? 'text/css; charset=utf-8' :
                ext === '.png' ? 'image/png' :
                  ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                    ext === '.svg' ? 'image/svg+xml' :
                      'application/octet-stream'
        );
        return safeEnd(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }, data);
      });
    }
    const rel = parsed.pathname === '/' ? 'index.html' : parsed.pathname.replace(/^\/+/, '');
    const filePath = path.join(__dirname, rel);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return safeEnd(404, { 'Content-Type': 'text/plain' }, 'Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = (
        ext === '.html' ? 'text/html; charset=utf-8' :
          ext === '.js' ? 'application/javascript; charset=utf-8' :
            ext === '.css' ? 'text/css; charset=utf-8' :
              ext === '.png' ? 'image/png' :
                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                  ext === '.svg' ? 'image/svg+xml' :
                    'application/octet-stream'
      );
      return safeEnd(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }, data);
    });
    return;
  }

  // Serve Application 2 (dashboards) static build from ../Приложение 2/dist
  // Support both /dashboards and /Приложение 2/ paths
  const isDashboardsPath = parsed.pathname === '/dashboards' || parsed.pathname === '/dashboards/' || parsed.pathname === '/dashboards/index.html' || (parsed.pathname && parsed.pathname.startsWith('/dashboards/assets/'));

  // Check for /Приложение 2/ path (handle various encodings: space, %20)
  let isApp2Path = false;
  let app2RelPath = '';
  if (parsed.pathname) {
    // Try to decode the pathname to handle URL encoding
    let decodedPath = parsed.pathname;
    try {
      decodedPath = decodeURIComponent(parsed.pathname);
    } catch (e) {
      // If decoding fails, use original pathname
      decodedPath = parsed.pathname;
    }

    // Check if path starts with /Приложение 2/ (with space or encoded as %20)
    // Handle both encoded (%D0%9F%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5%202) and decoded versions
    const normalizedPath = decodedPath.toLowerCase();
    if (normalizedPath.startsWith('/приложение') && (normalizedPath.includes('2/') || normalizedPath.endsWith('2') || normalizedPath.match(/2(\/|$)/))) {
      isApp2Path = true;
      // Extract relative path after /Приложение 2/
      // Handle both space and %20 encoding
      app2RelPath = decodedPath.replace(/^\/Приложение[\s%20]+2\/?/i, '').replace(/^\/%D0%9F%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5%202\/?/i, '');
      if (!app2RelPath || app2RelPath === '/') app2RelPath = 'index.html';
      // Remove leading slash if present
      if (app2RelPath.startsWith('/')) app2RelPath = app2RelPath.substring(1);
      // If still empty after processing, it's the root
      if (!app2RelPath) app2RelPath = 'index.html';
    }
  }

  if (req.method === 'GET' && (isDashboardsPath || isApp2Path)) {
    const distRoot = path.join(__dirname, '..', 'Приложение 2', 'dist');
    let rel;
    if (isDashboardsPath) {
      rel = (parsed.pathname === '/dashboards' || parsed.pathname === '/dashboards/') ? 'index.html' : parsed.pathname.replace(/^\/dashboards\/?/, '');
    } else {
      rel = app2RelPath || 'index.html';
    }
    const filePath = path.join(distRoot, rel);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return safeEnd(404, { 'Content-Type': 'text/plain' }, 'Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = (
        ext === '.html' ? 'text/html; charset=utf-8' :
          ext === '.js' ? 'application/javascript; charset=utf-8' :
            ext === '.css' ? 'text/css; charset=utf-8' :
              ext === '.png' ? 'image/png' :
                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                  ext === '.svg' ? 'image/svg+xml' :
                    'application/octet-stream'
      );
      return safeEnd(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }, data);
    });
    return;
  }

  // Static image proxy: /image?u=<encoded-url>
  // Встроенный кэш изображений (LRU по количеству, TTL по времени)
  if (parsed.pathname === '/image') {
    const target = parsed.query && typeof parsed.query.u === 'string' ? parsed.query.u : '';
    if (!target) return safeEnd(400, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'missing url' }));
    const noCache = parsed.query && String(parsed.query.nocache || '') === '1';
    const headers = Object.assign({}, req.headers);
    delete headers['host'];
    delete headers['origin'];
    delete headers['referer'];
    const now = Date.now();
    const CACHE_TTL_MS = 10 * 60 * 1000; // 10 минут
    const CACHE_MAX = 200; // до 200 изображений
    if (!global.__imageCache) {
      global.__imageCache = new Map();
    }
    const cache = global.__imageCache;
    const entry = cache.get(target);
    if (!noCache && entry && (now - entry.time) < CACHE_TTL_MS) {
      try {
        res.writeHead(200, {
          'Content-Type': entry.type || 'application/octet-stream',
          'Cache-Control': 'public, max-age=600, immutable',
        });
        res.end(entry.buf);
        return;
      } catch (_) {
        // пробуем сетевой путь при ошибке ответа из кэша
      }
    }

    const follow = (target, method, headers, body, attempt = 0) => {
      const MAX_REDIRECTS = 5;
      const opts = url.parse(target);
      opts.method = method;
      opts.headers = headers || {};
      const handler = (up) => {
        const status = up.statusCode || 200;
        const loc = up.headers.location;
        if ([301, 302, 303, 307, 308].includes(status) && loc && attempt < MAX_REDIRECTS) {
          let nextMethod = method;
          let nextBody = body;
          let nextHeaders = headers || {};
          if ([301, 302, 303].includes(status) && method === 'POST') {
            nextMethod = 'GET';
            nextBody = undefined;
            nextHeaders = Object.assign({}, nextHeaders);
            delete nextHeaders['Content-Length'];
            delete nextHeaders['content-length'];
            delete nextHeaders['Content-Type'];
            delete nextHeaders['content-type'];
          }
          return follow(loc, nextMethod, nextHeaders, nextBody, attempt + 1);
        }
        const chunks = [];
        up.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        up.on('end', () => {
          const bodyBuf = Buffer.concat(chunks);
          const contentType = up.headers['content-type'] || 'application/octet-stream';
          const headersOut = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=600, immutable',
          };
          try {
            res.writeHead(status, headersOut);
            res.end(bodyBuf);
            try {
              if (!noCache) cache.set(target, { buf: bodyBuf, type: contentType, time: Date.now() });
              // ограничиваем размер кэша
              if (cache.size > CACHE_MAX) {
                const delCount = Math.max(1, cache.size - CACHE_MAX);
                const keys = Array.from(cache.keys());
                for (let i = 0; i < delCount; i++) cache.delete(keys[i]);
              }
            } catch (_) { }
          } catch (_) {
            safeEnd(500, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'image proxy error' }));
          }
        });
        up.on('error', (err) => safeEnd(502, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'image upstream error', error: String(err) })));
      };
      https.request(opts, handler).on('error', (err) => safeEnd(502, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'image request error', error: String(err) }))).end();
    };
    return follow(target, req.method || 'GET', undefined, undefined);
  }

  // Очистка кэша изображений: /cache/clear
  if (parsed.pathname === '/cache/clear') {
    try { if (global.__imageCache) { global.__imageCache.clear(); } } catch (_) { }
    return safeEnd(200, { 'Content-Type': 'application/json' }, JSON.stringify({ success: true }));
  }

  if (parsed.pathname !== '/exec') {
    return safeEnd(404, undefined, 'Not Found');
  }

  let search = parsed.search || '';
  const hasSid = (parsed.query && (parsed.query.sheet_id || parsed.query.spreadsheetId));
  if (!hasSid && FORCE_SHEET_ID) {
    search += (search ? '&' : '?') + ('sheet_id=' + encodeURIComponent(FORCE_SHEET_ID));
  }
  const legacyActions = new Set([
    'getLatestChecklist', 'saveChecklist', 'getCustomConfig', 'saveCustomConfig', 'getObjectHistory', 'getPhotos', 'getPhotosLatest', 'getDatabaseHeaders'
  ]);
  const actionName = parsed.query && typeof parsed.query.action === 'string' ? parsed.query.action : '';
  const base = legacyActions.has(actionName) ? LEGACY_TARGET : TARGET;
  const targetUrl = base + search;

  const followRedirect = (target, method, headers, body, attempt = 0) => {
    const MAX_REDIRECTS = 5;
    const opts = url.parse(target);
    opts.method = method;
    opts.headers = headers || {};

    const handler = (gsRes) => {
      const status = gsRes.statusCode || 200;
      const loc = gsRes.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && loc && attempt < MAX_REDIRECTS) {
        let nextMethod = method;
        let nextBody = body;
        let nextHeaders = headers || {};
        if ([301, 302, 303].includes(status) && method === 'POST') {
          nextMethod = 'GET';
          nextBody = undefined;
          nextHeaders = Object.assign({}, nextHeaders);
          delete nextHeaders['Content-Length'];
          delete nextHeaders['content-length'];
          delete nextHeaders['Content-Type'];
          delete nextHeaders['content-type'];
        }
        followRedirect(loc, nextMethod, nextHeaders, nextBody, attempt + 1);
        return;
      }
      const chunks = [];
      gsRes.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      gsRes.on('end', () => {
        console.log(`[upstream] ${method} ${target} -> ${status}`);
        const bodyBuf = Buffer.concat(chunks);
        let preview = '';
        try { preview = bodyBuf.toString('utf8', 0, 300).replace(/\s+/g, ' ').trim(); } catch (_) { }
        if (preview) console.log(`[upstream-body] ${preview}`);
        try {
          let outBody = bodyBuf;
          let outType = isJsonp ? 'application/javascript; charset=utf-8' : (gsRes.headers['content-type'] || 'application/json');
          const ct = (gsRes.headers['content-type'] || '').toLowerCase();
          if (isJsonp) {
            const cb = String(parsed.query.callback || 'callback');
            const looksHtml = ct.includes('text/html') || (preview && preview.startsWith('<'));
            if (looksHtml || status >= 400) {
              const isGetData = String(parsed.query.action || '') === 'getData';
              const payload = isGetData
                ? {
                  success: true,
                  points: [],
                  inspectorsConfig: { Admin: { color: '#00FF7F', icon: '⭐', status: 'active', accessRights: 'Администратор' } },
                  inspectorsHomes: {},
                  inspectorsData: { Admin: '' },
                  availableIcons: [],
                  filterAccessSettings: {},
                  availableColors: [],
                  statistics: { totalRows: 0, loadedPoints: 0, skippedNoCoords: 0, completedPoints: 0 },
                  note: 'proxy-fallback-default-admin',
                  hint: preview
                }
                : { success: false, message: 'upstream html/error', status: status, hint: preview };
              const js = `${cb}(${JSON.stringify(payload)})`;
              outBody = Buffer.from(js, 'utf8');
              outType = 'application/javascript; charset=utf-8';
            }
          }
          const outStatus = isJsonp ? 200 : status;
          res.writeHead(outStatus, {
            'Content-Type': outType,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          res.end(outBody);
        } catch (_) {
          safeEnd(500, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'proxy response error' }));
        }
      });
      gsRes.on('error', (err) => {
        console.log(`[upstream-error] ${method} ${target} -> ${String(err)}`);
        safeEnd(502, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'proxy upstream error', error: String(err) }));
      });
    };

    if (method === 'GET') {
      https.get(opts, handler).on('error', (err) => {
        safeEnd(502, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'proxy get error', error: String(err) }));
      });
    } else {
      const gsReq = https.request(opts, handler);
      gsReq.on('error', (err) => {
        safeEnd(502, { 'Content-Type': 'application/json' }, JSON.stringify({ success: false, message: 'proxy post error', error: String(err) }));
      });
      if (body) gsReq.write(body);
      gsReq.end();
    }
  };

  if (req.method === 'GET' || req.method === 'HEAD') {
    followRedirect(targetUrl, 'GET');
  } else if (req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const bodyBuffer = Buffer.concat(chunks);
      const bodyStr = bodyBuffer.toString('utf8');

      // Preserve original Content-Type from client
      const contentType = req.headers['content-type'] || 'application/json';
      const headers = {
        'Content-Type': contentType,
        'Content-Length': bodyBuffer.length
      };

      console.log(`[proxy] POST body size: ${bodyBuffer.length}, Content-Type: ${contentType}`);
      console.log(`[proxy] POST body preview:`, bodyStr.substring(0, 200));

      followRedirect(targetUrl, 'POST', headers, bodyBuffer);
    });
  } else {
    res.writeHead(405);
    res.end('Method Not Allowed');
  }
});

server.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}/exec -> ${TARGET}`);
});
