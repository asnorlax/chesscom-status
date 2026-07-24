# chesscom-status

A tiny always-on recorder that pings **chess.com** every ~10 minutes from GitHub's
servers and keeps a rolling 48-hour history in [`history.json`](history.json).

It exists so [rookbook.net/is-chess-com-down.html](https://rookbook.net/is-chess-com-down.html)
can draw a **shared** 24-hour uptime / response-time chart — the same for every visitor —
without Rookbook needing a backend. The page fetches `history.json` straight from
`raw.githubusercontent.com` (which sends open CORS headers), so nothing here touches
Rookbook's own hosting.

## How it works

- [`.github/workflows/probe.yml`](.github/workflows/probe.yml) runs on a cron schedule.
- [`probe.mjs`](probe.mjs) checks `api.chess.com` (verdict + latency) and `www.chess.com`
  (reachability), appends one point to `history.json`, trims to the last 48h, and the
  workflow commits the file back.

Each point: `{ "t": <ms epoch>, "up": 0|1, "ms": <api round-trip or null>, "web": 0|1, "code": <api http status> }`

## Setup (one time)

1. Create a **public** GitHub repo named `chesscom-status` and add these files.
2. Open the **Actions** tab and enable workflows if prompted.
3. Run **chesscom-probe → Run workflow** once to seed the first data point.
4. In Rookbook's `is-chess-com-down.html`, set `SHARED_HISTORY_URL` to:
   `https://raw.githubusercontent.com/<your-username>/chesscom-status/main/history.json`

## Notes

- 5 minutes is GitHub's minimum cron interval; this uses ~10 min at odd offsets to avoid
  the top-of-hour queue, where scheduled jobs are often delayed 10+ minutes.
- GitHub disables scheduled workflows after 60 days of repo inactivity — but this commits
  on every run, so it keeps itself alive.

Not affiliated with or endorsed by Chess.com.
