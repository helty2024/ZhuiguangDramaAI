"use strict";
/**
 * Costume assets module (rebuild 2026-11-04)
 * Routes: /api/v1/costumes/*
 * Persisted status machine: idle | queued | generating | ready | failed
 * Mock generate supported via body.mock=true (no paid model).
 */
const FEATURE_KEY = "feature_costume_assets";
const STATUS = {
  IDLE: "idle",
  QUEUED: "queued",
  GENERATING: "generating",
  READY: "ready",
  FAILED: "failed"
};

function ensureTables(sqlite) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS character_costumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      drama_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      use_character_reference INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      local_path TEXT,
      reference_images TEXT,
      prompt TEXT,
      final_prompt TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_character_costumes_character ON character_costumes(character_id);
    CREATE TABLE IF NOT EXISTS storyboard_costumes (
      storyboard_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      costume_id INTEGER,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (storyboard_id, character_id)
    );
  `);
  const cols = sqlite.prepare("PRAGMA table_info(character_costumes)").all().map((r) => r.name);
  const add = (name, ddl) => {
    if (!cols.includes(name)) sqlite.exec(`ALTER TABLE character_costumes ADD COLUMN ${ddl}`);
  };
  add("status", "status TEXT DEFAULT 'idle'");
  add("task_id", "task_id INTEGER");
  add("error_message", "error_message TEXT");
  add("progress", "progress INTEGER DEFAULT 0");
  add("is_selected", "is_selected INTEGER NOT NULL DEFAULT 0");
  add("result_source", "result_source TEXT");
  // backfill result_source + status (do NOT promote mock/local fills to model-ready)
  try {
    sqlite.prepare(`
      UPDATE character_costumes
      SET result_source = CASE
        WHEN result_source IS NOT NULL AND result_source != '' THEN result_source
        WHEN task_id IS NOT NULL AND ((image_url IS NOT NULL AND image_url != '') OR (local_path IS NOT NULL AND local_path != '')) THEN 'model'
        WHEN task_id IS NULL AND ((image_url IS NOT NULL AND image_url != '') OR (local_path IS NOT NULL AND local_path != '')) THEN 'mock'
        ELSE result_source
      END
      WHERE deleted_at IS NULL
    `).run();
  } catch (_) {}
  try {
    sqlite.prepare(`
      UPDATE character_costumes
      SET status = CASE
        WHEN deleted_at IS NOT NULL THEN status
        WHEN status IS NULL OR status = '' THEN
          CASE WHEN (image_url IS NOT NULL AND image_url != '') OR (local_path IS NOT NULL AND local_path != '') THEN 'ready' ELSE 'idle' END
        ELSE status
      END
      WHERE deleted_at IS NULL
    `).run();
  } catch (_) {}
}

function rowToCostume(r) {
  if (!r) return null;
  let refs = r.reference_images;
  try { if (typeof refs === "string" && refs) refs = JSON.parse(refs); } catch { refs = null; }
  const hasImg = !!(r.image_url || r.local_path);
  let status = r.status || STATUS.IDLE;
  const resultSource = r.result_source || null;
  // Keep generating/queued/failed sticky; otherwise trust stored status.
  // Images from mock/local_fill still use status=ready but result_source distinguishes UI badge.
  if (!status) status = hasImg ? STATUS.READY : STATUS.IDLE;
  return {
    id: r.id,
    character_id: r.character_id,
    drama_id: r.drama_id,
    name: r.name,
    description: r.description,
    use_character_reference: !!r.use_character_reference,
    image_url: r.image_url,
    local_path: r.local_path,
    reference_images: refs,
    prompt: r.prompt,
    final_prompt: r.final_prompt,
    sort_order: r.sort_order,
    status,
    result_source: resultSource,
    image_source: resultSource,
    task_id: r.task_id != null ? Number(r.task_id) : null,
    error_message: r.error_message || null,
    progress: Number(r.progress || 0) || 0,
    is_selected: !!r.is_selected,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

function getFeature(sqlite) {
  const row = sqlite.prepare("SELECT value FROM app_settings WHERE key = ?").get(FEATURE_KEY);
  if (!row) return false;
  const v = String(row.value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function setFeature(sqlite, enabled, nowFn) {
  const val = enabled ? "1" : "0";
  const ts = nowFn ? nowFn() : new Date().toISOString();
  const existing = sqlite.prepare("SELECT key FROM app_settings WHERE key = ?").get(FEATURE_KEY);
  if (existing) {
    sqlite.prepare("UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?").run(val, ts, FEATURE_KEY);
  } else {
    sqlite.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)").run(FEATURE_KEY, val, ts);
  }
  return enabled;
}

function setCostumeState(sqlite, id, patch, nowFn) {
  const ts = nowFn ? nowFn() : new Date().toISOString();
  const row = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ? AND deleted_at IS NULL").get(id);
  if (!row) return null;
  const status = patch.status != null ? patch.status : row.status;
  const taskId = patch.task_id !== undefined ? patch.task_id : row.task_id;
  const errorMessage = patch.error_message !== undefined ? patch.error_message : row.error_message;
  const progress = patch.progress !== undefined ? patch.progress : row.progress;
  const imageUrl = patch.image_url !== undefined ? patch.image_url : row.image_url;
  const localPath = patch.local_path !== undefined ? patch.local_path : row.local_path;
  const resultSource = patch.result_source !== undefined ? patch.result_source : row.result_source;
  sqlite.prepare(`
    UPDATE character_costumes
    SET status=?, task_id=?, error_message=?, progress=?, image_url=?, local_path=?, result_source=?, updated_at=?
    WHERE id=?
  `).run(status, taskId, errorMessage, progress, imageUrl, localPath, resultSource, ts, id);
  return sqlite.prepare("SELECT * FROM character_costumes WHERE id = ?").get(id);
}

function resolveDataRoot(deps) {
  const path = require("path");
  if (deps && deps.dataRoot) return deps.dataRoot;
  try {
    if (deps && typeof deps.getAbsolutePath === "function") {
      const probe = deps.getAbsolutePath("static");
      if (probe) return path.dirname(probe);
    }
  } catch (_) {}
  try {
    const electron = require("electron");
    if (electron && electron.app && typeof electron.app.getPath === "function") {
      return path.join(electron.app.getPath("userData"), "data");
    }
  } catch (_) {}
  return path.join(process.env.APPDATA || "", "ZhuiguangDramaAI", "data");
}
function pngCrc32(buf) {
  let c = 0xffffffff;
  const table = pngCrc32._t || (pngCrc32._t = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c0 = n;
      for (let k = 0; k < 8; k++) c0 = (c0 & 1) ? (0xedb88320 ^ (c0 >>> 1)) : (c0 >>> 1);
      t[n] = c0 >>> 0;
    }
    return t;
  })());
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(pngCrc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
/** Build a unique synthetic PNG for THIS costume — never copy character portrait / sibling art. */
function writeSyntheticCostumeImage(deps, costume, promptText) {
  const fs = require("fs");
  const path = require("path");
  const crypto = require("crypto");
  const zlib = require("zlib");
  const name = String((costume && costume.name) || "costume");
  const desc = String((costume && (costume.description || costume.prompt)) || "");
  const prompt = String(promptText || "");
  const seed = crypto.createHash("sha256")
    .update([costume && costume.id, name, desc, prompt, Date.now()].join("|"))
    .digest("hex");
  const descHash = crypto.createHash("sha256").update(desc + "|" + name + "|" + String(costume && costume.id || "")).digest("hex").slice(0, 16);
  const w = 512, h = 768;
  const stride = w * 3;
  const filtered = Buffer.alloc((stride + 1) * h);
  const r0 = parseInt(seed.slice(0, 2), 16);
  const g0 = parseInt(seed.slice(2, 4), 16);
  const b0 = parseInt(seed.slice(4, 6), 16);
  for (let y = 0; y < h; y++) {
    const row = y * (stride + 1);
    filtered[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      // banded synthetic sheet — visually not a character standing portrait
      const band = Math.floor(y / 48) % 3;
      filtered[i] = (r0 + x + band * 40) & 255;
      filtered[i + 1] = (g0 + y + (seed.charCodeAt(x % 16) || 0)) & 255;
      filtered[i + 2] = (b0 + x * 2 + y) & 255;
      // stamp hash as unique pixel noise near top
      if (y < 8) {
        const hx = parseInt(seed.substr((x % 16) * 2, 2) || "00", 16);
        filtered[i] ^= hx;
        filtered[i + 1] ^= (hx << 1) & 255;
      }
    }
  }
  // bright marker block encoding costume id so file content is clearly synthetic
  const idNum = Number(costume && costume.id) || 0;
  for (let y = 20; y < 60; y++) {
    for (let x = 20; x < 20 + 8 + (idNum % 200); x++) {
      if (x >= w) break;
      const i = y * (stride + 1) + 1 + x * 3;
      filtered[i] = 255;
      filtered[i + 1] = 220;
      filtered[i + 2] = 40;
    }
  }
  const compressed = zlib.deflateSync(filtered, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const meta = Buffer.from(
    "Costume\\0" + JSON.stringify({
      costume_id: costume && costume.id,
      name: name,
      desc_hash: descHash,
      prompt_head: prompt.slice(0, 240),
      synthetic: true,
      source: "mock-synthetic"
    }),
    "binary"
  );
  // fix: Costume\0 as real null
  const metaLabel = Buffer.from("Costume", "ascii");
  const metaJson = Buffer.from(JSON.stringify({
    costume_id: costume && costume.id,
    name: name,
    desc_hash: descHash,
    prompt_head: prompt.slice(0, 240),
    synthetic: true,
    source: "mock-synthetic"
  }), "utf8");
  const metaChunk = Buffer.concat([metaLabel, Buffer.from([0]), metaJson]);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("tEXt", metaChunk),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
  const fileName = "costume-mock-" + String(costume && costume.id || "x") + "-" + descHash + "-" + crypto.randomUUID().slice(0, 8) + ".png";
  const rel = "static/images/" + fileName;
  const getAbs = deps && deps.getAbsolutePath;
  let destAbs = null;
  if (typeof getAbs === "function") {
    try { destAbs = getAbs(rel); } catch (_) { destAbs = null; }
  }
  if (!destAbs) destAbs = path.join(resolveDataRoot(deps), rel);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, png);
  console.log("[costume] synthetic mock image written id=" + (costume && costume.id) + " rel=" + rel + " desc_hash=" + descHash + " bytes=" + png.length);
  return { rel: rel, abs: destAbs, descHash: descHash, bytes: png.length };
}
/** @deprecated portrait-copy path removed — kept as hard throw to catch regressions */
function copyStaticImage() {
  throw new Error("已禁用：禁止用人物原图/旧图拷贝冒充服装生成结果");
}

function upsertVceCostumeAnchor(sqlite, costume, charRow, nowFn) {
  try {
    const has = sqlite.prepare("SELECT name FROM sqlite_master WHERE name='visual_anchors'").get();
    if (!has) return;
    const dramaId = costume.drama_id || (charRow && charRow.drama_id);
    if (!dramaId) return;
    const key = "costume_" + costume.id;
    const ts = nowFn ? nowFn() : new Date().toISOString();
    const payload = JSON.stringify({
      costume_id: costume.id,
      character_id: costume.character_id,
      character_name: charRow && charRow.name || null,
      name: costume.name,
      description: costume.description || null,
      image_url: costume.image_url || costume.local_path || null,
      local_path: costume.local_path || costume.image_url || null
    });
    const existing = sqlite.prepare(`
      SELECT id, version FROM visual_anchors
      WHERE drama_id = ? AND category = 'costume' AND anchor_key = ? AND IFNULL(is_current,1)=1
      ORDER BY version DESC LIMIT 1
    `).get(dramaId, key);
    if (existing) {
      sqlite.prepare("UPDATE visual_anchors SET is_current = 0, updated_at = ? WHERE id = ?").run(ts, existing.id);
      const ver = Number(existing.version || 1) + 1;
      sqlite.prepare(`
        INSERT INTO visual_anchors
        (drama_id, scene_id, anchor_key, category, payload_json, version, is_current, source, created_at, updated_at)
        VALUES (?, NULL, ?, 'costume', ?, ?, 1, 'costume-module', ?, ?)
      `).run(dramaId, key, payload, ver, ts, ts);
    } else {
      sqlite.prepare(`
        INSERT INTO visual_anchors
        (drama_id, scene_id, anchor_key, category, payload_json, version, is_current, source, created_at, updated_at)
        VALUES (?, NULL, ?, 'costume', ?, 1, 1, 'costume-module', ?, ?)
      `).run(dramaId, key, payload, ts, ts);
    }
  } catch (err) {
    console.warn("[costume] vce anchor upsert failed:", err && err.message ? err.message : err);
  }
}

function reconcileOne(sqlite, costume, nowFn) {
  if (!costume || !costume.task_id) return costume;
  if (costume.status === STATUS.READY && (costume.image_url || costume.local_path)) return costume;
  const task = sqlite.prepare("SELECT id, status, local_path, result_url, error_msg, params FROM sys_task WHERE id = ?").get(Number(costume.task_id));
  if (!task) return costume;
  const st = String(task.status || "").toLowerCase();
  if (st === "completed" || st === "success" || st === "succeeded") {
    const lp = task.local_path || task.result_url || null;
    const updated = setCostumeState(sqlite, costume.id, {
      status: STATUS.READY,
      progress: 100,
      error_message: null,
      image_url: lp || costume.image_url,
      local_path: lp || costume.local_path,
      result_source: "model"
    }, nowFn);
    return updated;
  }
  if (st === "failed" || st === "error" || st === "cancelled") {
    return setCostumeState(sqlite, costume.id, {
      status: STATUS.FAILED,
      progress: 0,
      error_message: task.error_msg || ("任务失败: " + st)
    }, nowFn);
  }
  // still running
  return setCostumeState(sqlite, costume.id, {
    status: STATUS.GENERATING,
    progress: Math.max(Number(costume.progress || 0), 10)
  }, nowFn);
}


function buildCostumePrompt(charRow, costume) {
  if (!costume) throw new Error("costume required");
  // CRITICAL: only THIS costume row's name/description/user prompt — never sibling/selected costumes,
  // and never re-inject previously built final_prompt (would duplicate on regenerate).
  const parts = [
    charRow && charRow.name ? ("character " + String(charRow.name)) : "",
    costume.name ? ("costume: " + String(costume.name)) : "",
    costume.description ? String(costume.description) : "",
    costume.prompt ? String(costume.prompt) : "",
    "full body costume reference sheet, clean background"
  ].filter((p) => p && String(p).trim());
  return parts.join(", ");
}

function mountCostumeApi(api, deps) {
  if (!api || !deps?.sqlite || !deps?.Hono) throw new Error("mountCostumeApi requires api, sqlite, Hono");
  const sqlite = deps.sqlite;
  const Hono = deps.Hono;
  const success = deps.success;
  const badRequest = deps.badRequest;
  const nowFn = deps.now || (() => new Date().toISOString());
  const generateImage = deps.generateImage;

  ensureTables(sqlite);

  const app = new Hono();

  app.get("/feature", (c) => success(c, { enabled: getFeature(sqlite) }));
  app.put("/feature", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const enabled = !!(body && (body.enabled === true || body.enabled === 1 || body.enabled === "1"));
    setFeature(sqlite, enabled, nowFn);
    return success(c, { enabled });
  });

  app.get("/", (c) => {
    const characterId = Number(c.req.query("character_id"));
    if (!Number.isFinite(characterId) || characterId <= 0) return badRequest(c, "character_id 必填");
    const rows = sqlite.prepare(
      "SELECT * FROM character_costumes WHERE character_id = ? AND deleted_at IS NULL ORDER BY is_selected DESC, sort_order ASC, id ASC"
    ).all(characterId);
    const out = rows.map((r) => {
      let cur = r;
      if (r.task_id && (r.status === STATUS.GENERATING || r.status === STATUS.QUEUED || (!r.image_url && !r.local_path))) {
        cur = reconcileOne(sqlite, r, nowFn) || r;
      } else if (r.task_id && r.status !== STATUS.READY && r.status !== STATUS.FAILED) {
        cur = reconcileOne(sqlite, r, nowFn) || r;
      }
      return rowToCostume(cur);
    });
    return success(c, out);
  });

  app.get("/storyboard/:id", (c) => {
    const storyboardId = Number(c.req.param("id"));
    if (!Number.isFinite(storyboardId)) return badRequest(c, "storyboard id 无效");
    const rows = sqlite.prepare(
      "SELECT storyboard_id, character_id, costume_id FROM storyboard_costumes WHERE storyboard_id = ?"
    ).all(storyboardId);
    return success(c, rows);
  });

  app.put("/storyboard/:id", async (c) => {
    const storyboardId = Number(c.req.param("id"));
    const body = await c.req.json().catch(() => ({}));
    const characterId = Number(body.character_id);
    if (!Number.isFinite(characterId)) return badRequest(c, "character_id 必填");
    const costumeId = body.costume_id == null || body.costume_id === "" ? null : Number(body.costume_id);
    const ts = nowFn();
    if (costumeId == null) {
      sqlite.prepare("DELETE FROM storyboard_costumes WHERE storyboard_id = ? AND character_id = ?").run(storyboardId, characterId);
    } else {
      sqlite.prepare(`INSERT INTO storyboard_costumes (storyboard_id, character_id, costume_id, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(storyboard_id, character_id) DO UPDATE SET costume_id=excluded.costume_id, updated_at=excluded.updated_at`)
        .run(storyboardId, characterId, costumeId, ts);
    }
    return success(c, { storyboard_id: storyboardId, character_id: characterId, costume_id: costumeId });
  });

  app.get("/:id", (c) => {
    const id = Number(c.req.param("id"));
    let row = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ? AND deleted_at IS NULL").get(id);
    if (!row) return badRequest(c, "服装不存在");
    if (row.task_id) row = reconcileOne(sqlite, row, nowFn) || row;
    return success(c, rowToCostume(row));
  });

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || !body.name || !String(body.name).trim()) return badRequest(c, "name 必填");
    const characterId = Number(body.character_id);
    if (!Number.isFinite(characterId) || characterId <= 0) return badRequest(c, "character_id 必填");
    const char = sqlite.prepare("SELECT id, drama_id, image_url, local_path FROM characters WHERE id = ? AND deleted_at IS NULL").get(characterId);
    if (!char) return badRequest(c, "角色不存在");
    const ts = nowFn();
    const dramaId = Number(body.drama_id) || char.drama_id || null;
    const useRef = body.use_character_reference === true || body.use_character_reference === 1 || body.use_character_reference === "1" ? 1 : 0;
    const info = sqlite.prepare(`INSERT INTO character_costumes
      (character_id, drama_id, name, description, use_character_reference, reference_images, status, progress, is_selected, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`).run(
      characterId,
      dramaId,
      String(body.name).trim(),
      body.description != null ? String(body.description) : null,
      useRef,
      useRef && (char.image_url || char.local_path)
        ? JSON.stringify([char.local_path || char.image_url])
        : null,
      STATUS.IDLE,
      ts,
      ts
    );
    const row = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ?").get(Number(info.lastInsertRowid));
    return success(c, rowToCostume(row));
  });

  app.patch("/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const row = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ? AND deleted_at IS NULL").get(id);
    if (!row) return badRequest(c, "服装不存在");
    const body = await c.req.json().catch(() => ({}));
    const ts = nowFn();
    const name = body.name != null ? String(body.name).trim() : row.name;
    const description = body.description != null ? String(body.description) : row.description;
    const useRef = body.use_character_reference == null
      ? row.use_character_reference
      : (body.use_character_reference === false || body.use_character_reference === 0 || body.use_character_reference === "0" ? 0 : 1);
    sqlite.prepare("UPDATE character_costumes SET name=?, description=?, use_character_reference=?, updated_at=? WHERE id=?")
      .run(name, description, useRef, ts, id);
    const updated = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ?").get(id);
    return success(c, rowToCostume(updated));
  });

  app.delete("/:id", (c) => {
    const id = Number(c.req.param("id"));
    const row = sqlite.prepare("SELECT id FROM character_costumes WHERE id = ? AND deleted_at IS NULL").get(id);
    if (!row) return badRequest(c, "服装不存在");
    const ts = nowFn();
    sqlite.prepare("UPDATE character_costumes SET deleted_at=?, updated_at=?, is_selected=0 WHERE id=?").run(ts, ts, id);
    return success(c, { id, deleted: true });
  });

  app.post("/:id/select", (c) => {
    const id = Number(c.req.param("id"));
    let row = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ? AND deleted_at IS NULL").get(id);
    if (!row) return badRequest(c, "服装不存在");
    const ts = nowFn();
    sqlite.prepare("UPDATE character_costumes SET is_selected=0, updated_at=? WHERE character_id=? AND deleted_at IS NULL").run(ts, row.character_id);
    sqlite.prepare("UPDATE character_costumes SET is_selected=1, updated_at=? WHERE id=?").run(ts, id);
    row = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ?").get(id);
    // Costume is independent of character main portrait — never overwrite characters.image_url/local_path.
    // VCE/storyboard costume anchor only for verified model results.
    try {
      const src = String(row.result_source || "").toLowerCase();
      if (src === "model" && (row.image_url || row.local_path)) {
        const char = sqlite.prepare("SELECT * FROM characters WHERE id = ?").get(row.character_id);
        upsertVceCostumeAnchor(sqlite, row, char, nowFn);
      } else {
        console.log("[costume] select skip VCE anchor (result_source="+src+") id="+id);
      }
    } catch (eVce) {
      console.warn("[costume] select vce sync failed:", eVce && eVce.message ? eVce.message : eVce);
    }
    return success(c, rowToCostume(row));
  });

  app.post("/:id/sync", (c) => {
    const id = Number(c.req.param("id"));
    let row = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ? AND deleted_at IS NULL").get(id);
    if (!row) return badRequest(c, "服装不存在");
    row = reconcileOne(sqlite, row, nowFn) || row;
    if (row.status === STATUS.READY) {
      const char = sqlite.prepare("SELECT * FROM characters WHERE id = ?").get(row.character_id);
      upsertVceCostumeAnchor(sqlite, row, char, nowFn);
    }
    return success(c, rowToCostume(row));
  });

  app.post("/:id/generate-image", async (c) => {
    const id = Number(c.req.param("id"));
    const costume = sqlite.prepare("SELECT * FROM character_costumes WHERE id = ? AND deleted_at IS NULL").get(id);
    if (!costume) return badRequest(c, "服装不存在");
    const body = await c.req.json().catch(() => ({}));
    if (!body.episode_id && !body.mock) return badRequest(c, "episode_id 必填");
    const char = sqlite.prepare("SELECT * FROM characters WHERE id = ? AND deleted_at IS NULL").get(costume.character_id);
    if (!char) return badRequest(c, "角色不存在");
    let useRef = !!costume.use_character_reference;
    if (body.use_character_reference === false || body.use_character_reference === 0 || body.use_character_reference === "0") useRef = false;
    else if (body.use_character_reference === true || body.use_character_reference === 1 || body.use_character_reference === "1") useRef = true;

    // MOCK path — no paid model
    if (body.mock === true || body.mock === 1 || body.mock === "1") {
      try {
        setCostumeState(sqlite, id, { status: STATUS.GENERATING, progress: 20, error_message: null }, nowFn);
        const delayMs = Math.max(0, Math.min(15000, Number(body.mock_delay_ms != null ? body.mock_delay_ms : 1200) || 0));
        if (delayMs > 0) await new Promise(function(r){ setTimeout(r, delayMs); });
        if (body.mock_fail === true || body.mock_fail === 1 || body.mock_fail === "1") {
          const failMsg = String(body.mock_error || "模拟生成失败（可重试）");
          const failed = setCostumeState(sqlite, id, {
            status: STATUS.FAILED,
            progress: 0,
            error_message: failMsg,
            task_id: null,
            image_url: null,
            local_path: null,
            result_source: null
          }, nowFn);
          return success(c, { mock: true, mock_fail: true, costume: rowToCostume(failed || sqlite.prepare("SELECT * FROM character_costumes WHERE id=?").get(id)), image_generation_id: null });
        }
        // NEVER copy character portrait / reference_images / prior costume art as "success".
        // Mock must still exercise full status machine but bind a DISTINCT synthetic image to THIS row.
        const mockPrompt = buildCostumePrompt(char, costume);
        try { sqlite.prepare("UPDATE character_costumes SET final_prompt=?, updated_at=? WHERE id=?").run(mockPrompt, nowFn(), id); } catch(_){}
        const synth = writeSyntheticCostumeImage(deps, costume, mockPrompt);
        const updated = setCostumeState(sqlite, id, {
          status: STATUS.READY,
          progress: 100,
          error_message: null,
          task_id: null,
          image_url: synth.rel,
          local_path: synth.rel,
          result_source: "mock"
        }, nowFn);
        upsertVceCostumeAnchor(sqlite, updated, char, nowFn);
        console.log("[costume] mock generate-image id="+id+" name="+String(costume.name||"")+" prompt="+mockPrompt+" image="+synth.rel+" desc_hash="+synth.descHash);
        return success(c, {
          mock: true,
          synthetic: true,
          costume: rowToCostume(sqlite.prepare("SELECT * FROM character_costumes WHERE id=?").get(id)),
          image_generation_id: null,
          built_prompt: mockPrompt,
          desc_hash: synth.descHash
        });
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        setCostumeState(sqlite, id, { status: STATUS.FAILED, progress: 0, error_message: msg }, nowFn);
        return badRequest(c, msg);
      }
    }

    if (typeof generateImage !== "function") return badRequest(c, "图像生成服务不可用");
    const prompt = buildCostumePrompt(char, costume);
    try {
      const tsPrompt = nowFn();
      sqlite.prepare("UPDATE character_costumes SET final_prompt=?, updated_at=? WHERE id=?").run(prompt, tsPrompt, id);
    } catch (_) {}
    console.log("[costume] generate-image id="+id+" name="+String(costume.name||"")+" prompt="+prompt);
    const refs = [];
    if (useRef) {
      const ref = char.local_path || char.image_url;
      if (ref) refs.push(ref);
    }
    try {
      setCostumeState(sqlite, id, { status: STATUS.QUEUED, progress: 5, error_message: null, result_source: null }, nowFn);
      // IMPORTANT: do NOT pass characterId — avoids overwriting character portrait on writeback
      const genId = await generateImage({
        dramaId: costume.drama_id || char.drama_id,
        prompt,
        model: body.model,
        configId: body.config_id,
        size: body.size || "1024x1024",
        referenceImages: refs.length ? refs : undefined,
        costumeId: id
      });
      const updated = setCostumeState(sqlite, id, {
        status: STATUS.GENERATING,
        progress: 15,
        task_id: genId,
        error_message: null
      }, nowFn);
      return success(c, { image_generation_id: genId, costume_id: id, costume: rowToCostume(updated) });
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      // Failure must not keep/write character portrait or sibling costume image as success.
      setCostumeState(sqlite, id, {
        status: STATUS.FAILED,
        progress: 0,
        error_message: msg,
        task_id: null,
        image_url: null,
        local_path: null,
        result_source: null
      }, nowFn);
      return badRequest(c, msg);
    }
  });

  api.route("/costumes", app);

  api.get("/settings/costume-assets", (c) => success(c, { enabled: getFeature(sqlite) }));
  api.put("/settings/costume-assets", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const enabled = !!(body && (body.enabled === true || body.enabled === 1 || body.enabled === "1"));
    setFeature(sqlite, enabled, nowFn);
    return success(c, { enabled });
  });

  // background reconciler for in-flight costume tasks
  try {
    if (!globalThis.__zgCostumeReconciler) {
      globalThis.__zgCostumeReconciler = setInterval(() => {
        try {
          const rows = sqlite.prepare(`
            SELECT * FROM character_costumes
            WHERE deleted_at IS NULL AND task_id IS NOT NULL
              AND status IN ('queued','generating')
          `).all();
          for (const r of rows) {
            const u = reconcileOne(sqlite, r, nowFn);
            if (u && u.status === STATUS.READY) {
              const char = sqlite.prepare("SELECT * FROM characters WHERE id = ?").get(u.character_id);
              upsertVceCostumeAnchor(sqlite, u, char, nowFn);
            }
          }
        } catch (e) {
          // ignore tick errors
        }
      }, 2500);
      if (globalThis.__zgCostumeReconciler.unref) globalThis.__zgCostumeReconciler.unref();
    }
  } catch (_) {}

  console.log("[costume] rebuild mounted /api/v1/costumes/* (status machine + mock)");
}

module.exports = { mountCostumeApi, FEATURE_KEY, ensureTables, STATUS, buildCostumePrompt };
