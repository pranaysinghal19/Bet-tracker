# Android app

The Android app is a thin wrapper: one activity with a WebView that loads the bundled
`web/` folder. It's assembled with Apktool from smali sources, so you don't need Android
Studio, Gradle or the Android SDK.

## Build

```bash
./build.sh
```

What it does:

1. Downloads Apktool 2.10.0 and uber-apk-signer 1.3.0, and **checks their SHA-256**. It
   stops if either doesn't match.
2. Copies `android/` and `web/` (as `assets/`) into `.build/app` and assembles the APK.
3. Aligns it with the zipalign bundled in uber-apk-signer (needed for Android 11+).
4. If `BT_KEYSTORE` is set, signs it with `tools/Sign.java` (v2 + v3) and verifies it.

Output: `dist/bet-tracker.apk` (signed) or `dist/bet-tracker-unsigned.apk`.

## Signing

| Variable           | Meaning                                         |
| ------------------ | ----------------------------------------------- |
| `BT_KEYSTORE`      | Path to your `.p12` or `.jks` keystore          |
| `BT_KEYSTORE_PASS` | Keystore password                               |
| `BT_KEY_ALIAS`     | Key alias inside the keystore                   |
| `BT_KEY_PASS`      | Key password (defaults to the keystore password) |

**The key is the app's identity.** Android only installs an update over an existing app
if it's signed with the same key. Lose the key and users must uninstall (after exporting
a backup) to update. Never commit it: `.gitignore` blocks `*.p12`, `*.jks` and `*.keystore`.

Official releases are signed with a certificate whose SHA-256 is:

```
85:F6:5E:63:4B:BE:76:DF:BE:5F:73:0E:BD:72:C4:D9:3E:CC:4B:8E:87:D3:6F:EA:00:07:1A:89:5F:A8:AC:C6
```

Check a download with `keytool -printcert -jarfile bet-tracker.apk`.

## Releasing

1. Bump `VERSION` in `web/js/app.js`, and `versionCode` (+1) and `versionName` in
   `android/apktool.yml`.
2. Run the signed build.
3. On GitHub: **Releases → Draft a new release**, tag `vX.Y.Z`, attach
   `dist/bet-tracker.apk`, and write what changed.

## How the wrapper is locked down

- `MainActivity`:
  - JavaScript and DOM storage are on
  - file access, file-URL access, universal access, geolocation and form-data saving are off
  - status and navigation bars are themed
- `Guard` (WebViewClient): refuses every navigation. `https://` and `tel:` links (the
  support contacts) are handed to the system browser or dialer.
- `Chrome` (WebChromeClient): only handles the photo picker for slip scanning.
- Manifest: no permissions, `usesCleartextTraffic="false"`, target SDK 34. Data in
  `localStorage` survives updates, and can be included in Android's own Google backup.

## Changing the Java side

The classes are written directly in smali (`android/smali/io/github/pranaysinghal19/bettracker/`).
Keep `.registers` counts right: locals come first, then `p0` (this) and the parameters.
After changing them, a quick bytecode check is to run dex2jar on `classes.dex` and load the
classes with `java -Xverify:all` against an `android.jar`.
