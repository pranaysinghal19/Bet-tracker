# Architecture

Bet Tracker is a single-page web app with no server. On Android it runs inside a
locked-down WebView. Everything happens on the device.

## Data model

Everything is one JSON object in `localStorage` under the key `bettracker_v1`, with a
second copy under `bettracker_v1_prev` as a fallback.

```
{
  setup, adult,                       first-run flags
  active,                             id of the bankroll in use
  display: { cur, odds, unit },       currency symbol, odds format (dec | us | frac), unit size
  safer:   { dep, depP, loss, lossP, coolUntil },   limits, pending raises, break end time
  profiles: [                         bankrolls
    { id, name,
      plan:  { start, goal, from, to },
      rules: { name, preset, maxOdds, maxBetsPerDay, maxStakePct, maxLegs, requireChecklist,
               leagues: { sport: null | [leagueKeys] },
               bannedTeams, bannedPlayers, bannedMarkets, checklists: { sport: [steps] } },
      bets:   [ { id, date, sport, league, away, home, event, market, sel, ou, line, player,
                  desc, legs, pick, odds (decimal), stake, res: P|W|L|C|V, cash, book, tipster, note } ],
      moves:  [ { id, date, amount (+ in / − out), note } ],
      closes: [ { id, date, balance, kind: bet|money, note } ],
      custom: { teams, players, books, tipsters } }     remembered entries
  ]
}
```

Odds are always stored as decimals and only converted for display and input.

## Validation: `clean()`

Every load and import rebuilds the whole object with `clean()` → `cleanProfile()` →
`cleanRules()` / `cleanBet()`:

- unknown fields are dropped, and sports, leagues and markets must exist in `data.js`
- numbers are range-checked, dates must be `YYYY-MM-DD`, and ids are unique positive integers
- text is length-limited, with control characters and `<` `>` removed
- anything that fails is replaced with a safe default or skipped

## Money maths

- **Ledger (`ledger()`):** replays a bankroll's events in date order. On each day, money
  moves come first, then bets, then the end-of-day balance. It produces the running
  balance, each day's closing balance and profit, W–L, the streak, and the amount staked.
- **End-of-day balance:** sets the balance to exactly what you typed. The gap is booked as
  betting profit or as money in/out.
- **Plan:** `dailyR = (goal / start) ^ (1 / days)`. The original target for day *i* is
  `start × dailyR^i`.
- **Quota (`quotaFor()`):** growth needed from the start-of-day balance over the days
  left: `g = (goal / balance)^(1/n) − 1`, so the quota is `balance × g`. Active bets count
  toward it at their potential profit.
- **Adjusted plan (`planRef()`):** re-plots the path from today's real balance, which is
  what the calendar targets and the green chart line show.
- **Auto stake:** `stake = remaining quota / (odds − 1)`, capped by the balance and your
  max stake %.

## Rules engine: `validate()`

Runs on every keystroke on the bet slip and returns the list of reasons **Place Bet** is
locked:

1. break active; daily bet limit reached
2. sport or league not allowed; market banned
3. sides missing or identical; bet details incomplete
4. banned team or player in any field (full name, or surname as a whole word)
5. odds missing or over the max; too many legs in a multi
6. stake missing, over the available balance, over the max stake %, or past the daily loss limit
7. cash out without the amount returned; checklist steps not ticked

## Safer-betting limits

Shared across all bankrolls. `limit(k)` applies a pending raise once its 24 hours have
passed. Deposits are checked over a rolling 7 days, and losses per calendar day. A
break (`coolUntil`) blocks bets, scans and deposits until it ends.

## Betslip scanner: `slip.js`

1. On the first scan, loads `vendor/ocr-core.js` (Tesseract WASM) and `vendor/eng-data.js`,
   then unzips the model with `DecompressionStream`.
2. Prepares the image: greyscale, inverts dark-mode screenshots, and resizes to about 1,300 px wide.
3. Runs Tesseract on the main thread, since workers are blocked by the CSP.
4. `parse()` reads the stake, return and odds (decimal, American or worked out from
   return ÷ stake), the result, the bookmaker, and the teams (matched against every built-in
   and remembered team, longest match wins), then the market and its fields.

## Security layers

See [`SECURITY.md`](../SECURITY.md). In short: a CSP with no network and no inline or
eval'd script, validated data, escaped output, and on Android a WebView with file access
off and a navigation guard.
