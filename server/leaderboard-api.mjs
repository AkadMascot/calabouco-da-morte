#!/usr/bin/env node
/**
 * Leaderboard API Server
 * - GET  /api/leaderboard → return top 50 entries
 * - POST /api/leaderboard → submit a new score
 * - Persists to local JSON + syncs to GitHub Gist
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'leaderboard-data.json');
const PORT = parseInt(process.env.LB_PORT || '3334');

// GitHub Gist config
const GIST_ID = '963ee96e5f73fa14179f701cfe693951';
const GH_TOKEN = process.env.GH_TOKEN || '';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://akadmascot.github.io',
  'https://calabouco.ngrok.io',
  'http://localhost:3333',
  'http://localhost:3000',
];

function loadData() {
  if (existsSync(DATA_FILE)) {
    try {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    } catch { }
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
        files: {
          'leaderboard.json': {
            content: JSON.stringify(data),
          },
        },
      }),
    });
    if (res.ok) {
      console.log(`[${new Date().toISOString()}] Gist synced`);
    } else {
      console.error(`[${new Date().toISOString()}] Gist sync failed: ${res.status}`);
    }
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Gist sync error:`, e.message);
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

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const cors = corsHeaders(origin);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  // Only handle /api/leaderboard
  if (!req.url.startsWith('/api/leaderboard')) {
    res.writeHead(404, { 'Content-Type': 'text/plain', ...cors });
    res.end('Not found');
    return;
  }

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

        // Validate
        if (!entry.name || typeof entry.steps !== 'number' || typeof entry.section !== 'number') {
          res.writeHead(400, { 'Content-Type': 'application/json', ...cors });
          res.end(JSON.stringify({ error: 'Invalid entry: need name, steps, section' }));
          return;
        }

        // Sanitize
        const clean = {
          name: String(entry.name).slice(0, 30).replace(/[<>&"']/g, ''),
          steps: Math.max(0, Math.min(9999, Math.floor(entry.steps))),
          section: Math.max(0, Math.min(400, Math.floor(entry.section))),
          outcome: ['death', 'victory', 'quit'].includes(entry.outcome) ? entry.outcome : 'death',
          timestamp: Date.now(),
        };

        const data = loadData();
        data.entries.push(clean);
        // Sort by steps descending (more steps = explored more)
        data.entries.sort((a, b) => b.steps - a.steps);
        // Keep top 50
        data.entries = data.entries.slice(0, 50);
        saveData(data);

        const rank = data.entries.findIndex(e => e.timestamp === clean.timestamp) + 1;

        console.log(`[${new Date().toISOString()}] New score: ${clean.name} - ${clean.steps} steps (rank #${rank})`);

        // Sync to Gist in background (don't block response)
        syncToGist(data).catch(() => { });

        res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
        res.end(JSON.stringify({ rank, entry: clean }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...cors });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain', ...cors });
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`Leaderboard API running on port ${PORT}`);
  console.log(`Gist sync: ${GH_TOKEN ? 'enabled' : 'DISABLED (no GH_TOKEN)'}`);
});
