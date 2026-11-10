# File map

Every folder and file in the repository, in one line each.

## Root

| Path        | What it is                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------- |
| `README.md` | Start here: what the app is, screenshots, how to install, build and contribute              |
| `SECURITY.md` | Privacy and security model, and how to report a vulnerability                             |
| `LICENSE`   | Apache License 2.0                                                                          |
| `NOTICE`    | Copyright and third-party components (Tesseract, build tools)                               |
| `build.sh`  | Builds the Android APK: downloads pinned and verified tools, assembles, aligns, signs       |
| `.gitignore` | Keeps build output and keystores (`*.p12`, `*.jks`, `*.keystore`) out of Git               |

## `web/`: the app

| Path                 | What it is                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `web/index.html`     | All screens (Home, Bets, Bet Slip, Stats, Rules), the bottom tabs, and the Content Security Policy           |
| `web/css/app.css`    | Theme colours (CSS variables at the top) and every component style                                           |
| `web/js/data.js`     | Plain data: sports, leagues, team lists, markets, rule presets, sport checklists, help-line contacts        |
| `web/js/app.js`      | App logic, in sections: helpers, odds formats, storage and validation, money maths, limits, rules engine, then each screen |
| `web/js/slip.js`     | Betslip reader: loads the OCR engine on demand, prepares the image, reads the text, and parses it into bet fields |
| `web/img/logo.png`   | App logo used in the top bar and as the browser icon                                                         |
| `web/vendor/ocr-core.js` | tesseract.js-core 5.1.1 (WebAssembly embedded), Apache-2.0                                               |
| `web/vendor/eng-data.js` | Tesseract English model (best_int), gzipped and base64-encoded so it loads as a script                   |

## `android/`: the Android wrapper

| Path                                    | What it is                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `android/AndroidManifest.xml`           | App ID `io.github.pranaysinghal19.bettracker`, one activity, no permissions, no cleartext traffic |
| `android/apktool.yml`                   | Build settings: min SDK 24, target SDK 34, version code and name                             |
| `android/smali/…/MainActivity.smali`    | Creates the locked-down WebView, loads `file:///android_asset/index.html`, returns picked photos |
| `android/smali/…/Chrome.smali`          | Opens the system photo picker when you tap "Scan a betslip"                                 |
| `android/smali/…/Guard.smali`           | Blocks all navigation; only `https://` and `tel:` support links open, in the browser or dialer |
| `android/res/mipmap-*/`                 | Launcher icons: legacy and adaptive foreground at every density                            |
| `android/res/mipmap-anydpi-v26/ic_launcher.xml` | Adaptive icon definition (Android 8+)                                               |
| `android/res/values/strings.xml`        | App name                                                                                    |
| `android/res/values/colors.xml`         | Adaptive icon background colour                                                              |

## `tools/`

| Path               | What it is                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `tools/Sign.java`  | Signs an aligned APK with your key (v2 + v3), verifies it and prints the certificate SHA-256 |

## `docs/`

| Path                    | What it is                                                     |
| ----------------------- | -------------------------------------------------------------- |
| `docs/RULES.md`         | The Pro Punter preset, rule by rule, with the reasoning        |
| `docs/ARCHITECTURE.md`  | Data model, money maths, rules engine, scanner, security layers |
| `docs/ANDROID.md`       | Building, signing, updating and releasing the APK              |
| `docs/DECISIONS.md`     | Why things were built the way they are                         |
| `docs/FILE_MAP.md`      | This file                                                      |
| `docs/assets/`          | Logo and README banner                                         |
| `docs/screenshots/`     | Phone screenshots used in the README (demo data)               |
