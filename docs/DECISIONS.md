# Decisions

Why Bet Tracker is built the way it is.

**Offline only, no accounts.** Betting history is sensitive. Not having a server means
there's nothing to breach, no subscription to fund and no reason to collect data. Bet
syncing from bookmakers, copy-betting, chat and pick marketplaces were left out on
purpose: they need servers, paid data and access to people's bookmaker accounts.

**Rules that block, not just warn.** The whole point is to stop impulse bets. A warning is
easy to tap past, so **Place Bet** stays locked until every rule passes. To bet outside your
rules you have to edit the rules first, which is a deliberate act.

**Limits that loosen slowly.** Tightening a safer-betting limit is instant; loosening one
waits 24 hours, and a break can't be ended early. That's the standard approach of
responsible-gambling tools, and it guards against decisions made in the moment.
Restoring a backup can't be used to get around it.

**Pro Punter as the default.** The project started as one punter's disciplined system,
and opinionated defaults are more useful than a blank screen. Everyone can switch to
"Careful" or "Open", or edit any rule.

**Plain JavaScript, no framework or build step.** The app is small enough not to need one.
With no dependencies to audit or update, contributors can edit a file and refresh the
page, and the CSP can stay strict (no inline scripts, no eval).

**Data in one file (`data.js`).** Team lists and leagues change every season, and most
contributions are data. Keeping data apart from logic lets people help without reading
`app.js`.

**OCR on the device.** Sending slip screenshots to a cloud OCR service would leak
betting data. Tesseract in WebAssembly is slower (about a second per slip on a laptop, a
few on a phone) but private. The model is bundled as a script so the CSP can keep blocking
the network.

**Apktool and smali instead of Gradle.** The Android side is three tiny classes. Building
with Apktool needs only Java and makes the build reproducible on any machine without the
Android SDK. The trade-off is writing smali by hand, which is documented in
[`ANDROID.md`](ANDROID.md).

**A private release key.** Early personal builds were signed with Android's public debug
key, which would let anyone publish a fake "update". Releases are now signed with a
private key, and its fingerprint is published in the README so downloads can be checked.

**Decimal odds stored, other formats displayed.** One internal format keeps the maths
simple. American and fractional are converted only at input and display.

**The optimizer is hindsight.** It's labelled clearly and needs 10+ settled bets, and only
segments with 3+ bets are included, so a lucky or unlucky streak isn't sold as a strategy.
