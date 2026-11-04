# Costume pipeline — BUILD note

## Why this folder exists

`helty2024/ZhuiguangDramaAI` historically ships **docs + Releases only** (see root CONTRIBUTING).
The Electron/Nuxt application source is not published in that repo. Costume asset fixes (audit A–E + live-once verified) were first landed as **Win portable DEV patches**:

- `resources/frontend/_nuxt/D2CsWkmv.js` (+ API chunk `5IhsqtEn.js`)
- `resources/app.asar.unpacked/costume/costume-mount{-full}.js`
- surgical `app.asar` ImageTask writeback for `result_source=model`

This `dev/costume-pipeline/` tree is the **canonical maintainable source of truth** for those rules so future client builds do not reintroduce:

1. default `{mock:true}` on Generate
2. portrait / standing-image copy as fake success
3. UI 「已生成」 for non-`model` results
4. select overwriting character main cover
5. forced `use_character_reference=true`
6. machine-absolute stub paths (`C:\Users\Administrator\...`)

## Portable DEV ↔ source relationship

| Layer | Portable path (Win DEV) | Source module |
|-------|-------------------------|---------------|
| Prompt | `costume-mount-full.js` `buildCostumePrompt` | `src/buildCostumePrompt.js` |
| Badge / poll | FE `D2CsWkmv.js` | `src/resultSource.js` |
| Generate opts | FE button opts resolver | `src/generateOpts.js` |
| Select / VCE | BE `POST /:id/select` | `src/selectPolicy.js` |
| ImageTask writeback | asar ImageTask costume branch | `src/writebackFields.js` |
| use_character_reference | FE payload + BE resolve | `src/useCharacterReference.js` |
| Stub candidates | asar stub | `src/stubPaths.js` |
| Mock synthetic only | BE mock path | `src/mockImagePolicy.js` |

Verified portable hashes: `reference/PORTABLE_HASHES.json`.
Full binary freeze (incl. asar): on heltyPC `C:\Users\Administrator\agent-tools\zg-costume-stable-20261104\` (+ `MANIFEST.json`).

## Next client build checklist

1. Import / re-bundle FE helpers from `src/*` into the Nuxt costume card (do **not** re-minify a stale `mock:!0` default).
2. Ship BE mount from `reference/costume-mount-full.js` or a TypeScript port that preserves exports/tests.
3. Ensure ImageTask success writeback includes `status=ready` + `result_source=model`.
4. Run `npm test` in this folder (**0 paid calls**).
5. Only after unpaid suite green, optional single paid live-once smoke (requires explicit approval).

## Unpaid regression

```bash
cd dev/costume-pipeline && npm test
```


## Packaged release 2.4.3 (2026-11-04 Asia/Shanghai)

Win Setup built from portable DEV (`ZhuiguangDramaAI-mac-hotfix`) via `zg-win-v2.0/release/build-v243/build_installer_v243.py`.

| Item | Value |
|------|-------|
| Tag / Release | https://github.com/helty2024/ZhuiguangDramaAI/releases/tag/v2.4.3 |
| Setup | `ZhuiguangDramaAI-2.4.3-Win10-11-x64-Setup.exe` |
| Setup SHA256 | `2c4dbf75974b658c3518cea223e54df06638ca6895c482301da6eddc72192936` |
| SOURCE asar SHA256 (version-bumped copy) | `1c9ab9b0dbf861c0ff9b2d31c2f2cb643f9cf2d4abb9931b0fec186e52cf9686` |
| Portable asar (untouched) | `124e33a16275f9c6131ff09c6aae334cd0923c1030743874b41a42be64a04bbb` |
| FE `D2CsWkmv.js` | `e3affba26c1d6eec4c5abe38d6dd8a4274ca487bdb7fec931d9bb6db2a648dab` |
| Costume mount | `7fb5ba5fcb7b4fe5ba9892ab2fe01b550fe486991a60af6e3b5d91333c135341` |

Build asserts: costume mount marker + `result_source` in asar, unpacked costume present, no `Administrator` stub path, FE `__ZG_COSTUME_GEN_OPTS` and no `||{mock:!0}` default.

Mac DEV: surgical sync staging at heltyPC `agent-tools/zg-mac-sync-243-staging` (+ zip). Do **not** overwrite Mac app with Win Setup/DMG.
