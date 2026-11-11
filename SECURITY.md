# Security and privacy

## What the app does with your data

Nothing leaves your device. Bets, bankrolls and settings are stored in local storage on the device or browser. There are no accounts, analytics, ads or servers. Betslip scanning runs entirely on the device with the bundled Tesseract engine.

## Protections

- **No network:** the Content Security Policy blocks every network connection (`connect-src` allows only `blob:` and `data:`), and the Android manifest disallows cleartext traffic.
- **No injected code:** scripts can only load from the app's own files. There's no inline script and no `eval`. WebAssembly is allowed only for the OCR engine (`wasm-unsafe-eval`).
- **Validated data:** everything loaded from storage, a pasted backup or an imported rule set is rebuilt field by field. Unknown fields are dropped, numbers are range-checked, text is length-limited and stripped of `<`, `>` and control characters, and all rendered text is HTML-escaped.
- **Backups can't loosen limits:** restoring a backup never relaxes your current deposit limit, loss limit or break.
- **Locked-down WebView (Android):**
  - file access, file-URL access, geolocation and form-data saving are all off
  - navigation is blocked, except `https://` and `tel:` support links, which open in the system browser or dialer
- **Share bridge only:** the one native function the page can call is `BTAndroid.share(title, text)`. It opens Android's share sheet and the user chooses where the text goes. It can't read files, contacts or anything else.
- **CSV exports are formula-safe:** cells that start with `=`, `+`, `-` or `@` get a leading `'`, so a spreadsheet won't run them as formulas.
- **Optional PIN lock:** stored as a salted, iterated SHA-256 hash, with timeouts after repeated wrong tries. It stops someone who picks up your phone; it isn't encryption.
- **Pinned build tools:** `build.sh` verifies the SHA-256 of every tool it downloads.
- **Release signing:** releases are signed with a private key (APK Signature Scheme v2 and v3), not a public debug key.

## Reporting a vulnerability

Please open a private security advisory on GitHub (**Security → Report a vulnerability**) rather than a public issue.
