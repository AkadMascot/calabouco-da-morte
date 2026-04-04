#!/usr/bin/env node
/**
 * Combined server: static files (game) + leaderboard API
 * Replaces `serve out -l 3333 -s` + leaderboard-api on 3334
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, statSync, createReadStream } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = join(__dirname, '..', 'out');
const DATA_FILE = join(__dirname, 'leaderboard-data.json');
const PORT = parseInt(process.env.PORT || '3333');

// GitHub Gist config
const GIST_ID = '963ee96e5f73fa14179f701cfe693951';
const GH_TOKEN = process.env.GH_TOKEN || '';

const ALLOWED_ORIGINS = [
  'https://akadmascot.github.io',
  'https://calabouco.ngrok.io',
  'http://localhost:3333',
  'http://localhost:3000',
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webm': 'video/webm',
  '.txt': 'text/plain',
};

// ── Leaderboard ──

function loadData() {
  if (existsSync(DATA_FILE)) {
    try { return JSON.parse(readFileSync(DATA_FILE, 'utf-8')); } catch { }
  }
  return { entries: [], total: 0, lastUpdated: new Date().toISOString() };
}

function saveData(data) {
  data.lastUpdated = new Date().toISOString();
  data.total = data.entries.length;
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function syncToGist(data) {
  if (!GH_TOKEN) return;
  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'calabouco-leaderboard',
      },
      body: JSON.stringify({
        files: { 'leaderboard.json': { content: JSON.stringify(data) } },
      }),
    });
    if (res.ok) console.log(`[GIST] Synced OK`);
    else console.error(`[GIST] Failed: ${res.status}`);
  } catch (e) {
    console.error(`[GIST] Error:`, e.message);
  }
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// ── Static file serving ──

function serveStatic(req, res, urlPath) {
  // SPA fallback: try file → try file.html → index.html
  let filePath = join(STATIC_DIR, urlPath);

  // Directory → index.html
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  // Try .html extension
  if (!existsSync(filePath) && !extname(filePath)) {
    const withHtml = filePath + '.html';
    if (existsSync(withHtml)) filePath = withHtml;
  }

  // If file exists, serve it
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    // Range support for video/audio
    const stat = statSync(filePath);
    const range = req.headers.range;

    if (range && (ext === '.mp4' || ext === '.mp3' || ext === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    const content = readFileSync(filePath);
    const cacheControl = ext === '.html'
      ? 'no-cache'
      : 'public, max-age=31536000, immutable';

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': content.length,
      'Cache-Control': cacheControl,
    });
    res.end(content);
    return;
  }

  // SPA fallback → /index.html (for client-side routing)
  const indexFile = join(STATIC_DIR, 'index.html');
  if (existsSync(indexFile)) {
    const content = readFileSync(indexFile);
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
    res.end(content);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

// ── Main server ──

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const cors = corsHeaders(origin);
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  // ── API: Leaderboard ──
  if (url.pathname === '/api/leaderboard') {
    if (req.method === 'GET') {
      const data = loadData();
      res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
      res.end(JSON.stringify(data));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const entry = JSON.parse(body);
          if (!entry.name || typeof entry.steps !== 'number' || typeof entry.section !== 'number') {
            res.writeHead(400, { 'Content-Type': 'application/json', ...cors });
            res.end(JSON.stringify({ error: 'Invalid entry' }));
            return;
          }

          const clean = {
            name: String(entry.name).slice(0, 30).replace(/[<>&"']/g, ''),
            steps: Math.max(0, Math.min(9999, Math.floor(entry.steps))),
            section: Math.max(0, Math.min(400, Math.floor(entry.section))),
            outcome: ['death', 'victory', 'quit'].includes(entry.outcome) ? entry.outcome : 'death',
            timestamp: Date.now(),
          };

          const data = loadData();
          data.entries.push(clean);
          data.entries.sort((a, b) => b.steps - a.steps);
          data.entries = data.entries.slice(0, 50);
          saveData(data);

          const rank = data.entries.findIndex(e => e.timestamp === clean.timestamp) + 1;
          console.log(`[SCORE] ${clean.name} - ${clean.steps} steps (rank #${rank})`);

          syncToGist(data).catch(() => { });

          res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
          res.end(JSON.stringify({ rank, entry: clean }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json', ...cors });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'text/plain', ...cors });
    res.end('Method not allowed');
    return;
  }

  // ── Static files ──
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`🎮 Calabouço server on port ${PORT}`);
  console.log(`📊 Leaderboard API: /api/leaderboard`);
  console.log(`📁 Static files: ${STATIC_DIR}`);
  console.log(`🔗 Gist sync: ${GH_TOKEN ? 'enabled' : 'DISABLED'}`);
});
