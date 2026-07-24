// Probes chess.com from GitHub's servers and appends one data point to history.json.
// Runs on a schedule via .github/workflows/probe.yml. No dependencies — Node 20+ (global fetch).

import { readFileSync, writeFileSync } from "node:fs";

const HIST = "history.json";
const KEEP_MS = 48 * 60 * 60 * 1000; // retain ~48h of points; the page shows the last 24h
const TIMEOUT_MS = 12000;
// chess.com's API rejects requests without a descriptive User-Agent, so identify ourselves.
const UA = "RookbookStatusChecker/1.0 (+https://rookbook.net/is-chess-com-down.html)";

async function probe(url) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA },
    });
    // drain the body so a keep-alive socket doesn't hold the process open
    await res.arrayBuffer().catch(() => {});
    return { reached: true, ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch {
    return { reached: false, ok: false, status: 0, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

const api = await probe("https://api.chess.com/pub/player/erik"); // small, stable, CORS-ok
const web = await probe("https://www.chess.com/favicon.ico");     // is the website answering at all

const apiUp = api.reached && api.ok;
const point = {
  t: Date.now(),
  up: apiUp ? 1 : 0,               // primary verdict: API responded 2xx
  ms: apiUp ? api.ms : null,       // round-trip ms when up
  web: web.reached ? 1 : 0,        // website reachable
  code: api.status,                // API HTTP status (0 = no response)
};

let hist = [];
try {
  hist = JSON.parse(readFileSync(HIST, "utf8"));
} catch {
  hist = [];
}
if (!Array.isArray(hist)) hist = [];

hist.push(point);
const cutoff = Date.now() - KEEP_MS;
hist = hist.filter((p) => p && typeof p.t === "number" && p.t >= cutoff);

writeFileSync(HIST, JSON.stringify(hist) + "\n");
console.log(`recorded up=${point.up} ms=${point.ms} web=${point.web} code=${point.code} total=${hist.length}`);
