# Rocket Launcher

Adobe Illustrator CEP 11 panel (bundle `com.tata.pro`) and its Marketplace website.

## Repository
- Panel: `index.html`, `js/`, `jsx/`, `css/`, `CSXS/`
- Marketplace site (PHP, https://rl.kirita.me): `market-backend/` — see `market-backend/README.md`
- Panel tests: `tests/`

## Local development

```bash
npm ci
npm test -- --runInBand
cd market-backend && php tests/run.php
```

To run the panel from source, copy or symlink this folder to
`/Library/Application Support/Adobe/CEP/extensions/TATA` and restart Illustrator.

## Where the panel keeps its data

Scripts, layout, hotkeys, the Keep index and custom colours live in the panel's `localStorage` and are
mirrored to `~/Library/Application Support/RocketLauncher/panel-data`
(`%APPDATA%\RocketLauncher\panel-data` on Windows), so clearing the CEP cache does not remove them.
Keep files are in `~/.tata_keeper`; graphic styles are in `~/Documents/Illustrator_Style_Presets`.

## Releasing the panel

Releases are signed ZXP files on GitHub Releases. The panel shows the matching **Download ZXP** link in
**Settings → Extension updates**; it never overwrites its own files.

```bash
git tag v3.1.1
git push origin v3.1.1
```

GitHub Actions checks that the tag matches `CSXS/manifest.xml`, runs the tests and creates
`RocketLauncher-v<version>-macos.zxp`, `-windows.zxp` and their `.sha256` files. `market-backend/`,
tests and docs are left out of the ZXP.

### Configure signing once

```bash
ZXPSignCmd -selfSignedCert US NY RocketLauncher RocketLauncher \
  'choose-a-strong-password' RocketLauncher.p12
```

Base64-encode `RocketLauncher.p12` and add the GitHub Actions secrets `ZXP_CERT_P12_B64` and
`ZXP_CERT_PASSWORD`. Keep the `.p12` and password backed up; the same certificate must sign every release.

## Deploying the Marketplace site

A push to `main` that changes `market-backend/` runs the site's tests and republishes that folder as the
root of the `market-deploy` branch. Hostinger's Git deployment pulls that branch. Never point Hostinger at
`main`. `config.json` and the data in `storage/` exist only on the server.

## License
Proprietary. See [LICENSE](LICENSE).
