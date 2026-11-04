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
