# Bet Tracker

<img src="web/img/logo.png" width="96" align="right" alt="Bet Tracker logo">

**A private, offline bet tracker for every sport, with rules that keep you disciplined.**

Log your bets, set a bankroll goal, and let the app hold you to your own rules: maximum odds, bets per day, stake limits, banned teams, players and markets, and a pre-bet checklist. It ships with a **Pro Punter** rule set by default, and anyone can switch presets or write their own.

Everything stays on your phone. There are no accounts, servers, ads or tracking, and the app has no internet access at all.

## Features

**Tracking**
- Every sport: basketball, soccer, AFL, rugby league and union, cricket, tennis, NFL, MLB, NHL, MMA and boxing, motorsport, golf, racing, plus anything else.
- Built-in team lists for NBA, NBL, NFL, MLB, NHL, AFL, NRL, IPL, BBL, A-League and international cricket. Any team or player you type is remembered.
- Market types for each sport: head to head, line, totals, player props, double chance, BTTS, corners, cards, Asian handicap, scorers, top batter, set handicaps, outrights, podiums, same game multis, multis and more.
- Bookmaker, tipster/source, notes, and **cash out** with the amount returned.
- **Scan a betslip**: pick a screenshot and the bet fills in automatically. The text reader runs on your phone (Tesseract, bundled), and nothing is uploaded.
- **Multiple bankrolls or strategies**, each with its own plan, rules and bets.
- Add or withdraw money, and an **end-of-day balance** that matches your bookie account.
- Decimal, American or fractional odds, and an optional **unit size**.

**Goal planner**
- Set a start balance, a goal and a deadline. The app works out the **daily quota** and fills in the stake for you.
- The plan **re-adjusts** when you're ahead or behind, and the calendar shows each day's target.

**Stats**
- Period filter (7 days, 30 days, this month, this year, all time) and a balance chart.
- Profit, ROI, progression, win rate, record, average odds and stake, and best and worst bets.
- A results donut, plus total and average stake by result.
- Breakdowns by sport, league, market, bookmaker, tipster, odds range, bet type and weekday.
- **Optimizer**: shows how your results would look without your worst-performing segments.

**Rules**
- Presets: **Pro Punter (default)**, **Careful bankroll** and **Open**.
- Editable limits: max odds per bet, max bets per day, max stake % of balance, max legs in a multi.
- Allowed sports and leagues, banned teams, players and markets, and a checklist for each sport.
- Export a rule set as text and share it. Anyone can import it.

**Safer betting** (on by design)
- Weekly deposit limit and daily loss limit. Lowering a limit is instant; raising one waits 24 hours.
- Take a break for 24 hours, 7 days or 30 days. It can't be undone early.
- One-tap support contacts for Australia, New Zealand, the UK, the US and international services.
- An 18+ confirmation on first run.

## The Pro Punter rule set

The default preset is the author's own system: short-priced, high-probability bets that compound a bankroll toward a goal. See [docs/RULES.md](docs/RULES.md) for each rule and the reasoning behind it.

## Install

**Android:** download the APK from [Releases](../../releases), open it on your phone and allow "Install unknown apps" when asked.

**Any browser:** open `web/index.html`, or host the `web/` folder anywhere static (GitHub Pages works). Data is kept in that browser's storage.

## Build the APK yourself

You need Java 17+, `curl` and `unzip`. No Android SDK is required.

```bash
./build.sh                       # -> dist/bet-tracker-unsigned.apk
```

Android only installs signed apps. To sign with your own key:

```bash
keytool -genkeypair -keystore my-release.p12 -storetype PKCS12 -alias bettracker \
        -keyalg RSA -keysize 4096 -validity 12000
BT_KEYSTORE=my-release.p12 BT_KEYSTORE_PASS=... BT_KEY_ALIAS=bettracker ./build.sh   # -> dist/bet-tracker.apk
```

Keep your keystore safe. Updates must be signed with the same key, or they won't install over the previous version.

## How it's built

- `web/`: the whole app. Plain HTML, CSS and JavaScript with no frameworks or build step.
  - `js/data.js`: sports, leagues, teams, markets, presets, checklists and help contacts. **Most contributions only need to touch this file.**
  - `js/app.js`: app logic. `js/slip.js`: the betslip reader.
  - `vendor/`: Tesseract OCR engine and English data (Apache-2.0).
- `android/`: a small Android wrapper (WebView), written in smali and assembled with apktool.
- `build.sh`: downloads pinned, checksum-verified tools, then builds, aligns and signs.

## Contributing

Pull requests are welcome, especially:
- new leagues and team lists in `web/js/data.js` (team lists change every season)
- bookmaker betslip layouts the scanner misreads (attach a screenshot with personal details blurred)
- new rule presets
- translations

## Security and privacy

See [SECURITY.md](SECURITY.md). In short: no network access, a strict Content Security Policy, every stored and imported value is validated, and the Android wrapper can't navigate anywhere except the support links.

## Disclaimer

Bet Tracker is a record-keeping tool. It doesn't take bets, give tips or offer financial advice, and no rule set guarantees profit. Past results don't predict future ones. You must be 18+ and betting must be legal where you live. If betting stops being fun, contact Gambling Help Online on **1800 858 858** (Australia) or your local service, which are listed inside the app.

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE) for third-party components.
