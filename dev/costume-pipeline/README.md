# Costume asset pipeline (dev source)

Maintainable modules + unpaid regression tests for the ZhuiguangDramaAI **服装资产** flow.

- Default generate = **real model** (mock only via `ZG_COSTUME_DEV_MOCK` / `__ZG_COSTUME_GEN_OPTS`)
- 「已生成」 only when `result_source === 'model'`
- Select never overwrites character main image; VCE costume anchor only for model
- No portrait-copy success fallback
- Stub paths relative only

```bash
npm test
```

See `docs/BUILD.md` for portable ↔ source mapping.
