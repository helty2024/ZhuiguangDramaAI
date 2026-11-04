'use strict';

/** Canonical result_source values persisted on character_costumes. */
const RESULT_SOURCE = Object.freeze({
  MODEL: 'model',
  MOCK: 'mock',
  LOCAL_FILL: 'local_fill',
  RECOVERED: 'recovered'
});

/**
 * UI badge for a costume row.
 * "已生成" ONLY when result_source === model AND an image exists.
 * Mock / local_fill / recovered → 占位图/待确认 (never fake success).
 */
function costumeUiBadge(costume) {
  const c = costume || {};
  const status = String(c.status || '').toLowerCase();
  const src = String(c.result_source || c.resultSource || c.image_source || c.imageSource || '').toLowerCase();
  const hasImage = !!(c.image_url || c.local_path || c.imageUrl || c.localPath);

  if (status === 'generating' || status === 'queued') return '正在生成';
  if (status === 'failed' || status === 'error') return '失败';

  if (hasImage && src === RESULT_SOURCE.MODEL) return '已生成';
  if (hasImage && (src === RESULT_SOURCE.MOCK || src === RESULT_SOURCE.LOCAL_FILL || src === RESULT_SOURCE.RECOVERED)) {
    return '占位图/待确认';
  }
  if (hasImage && !src) return '待确认'; // image present but source not yet written
  return '待生成';
}

/** Poll/client success: only promote to 已生成 when source is model. */
function shouldMarkGeneratedFromPoll(costume) {
  const src = String((costume && (costume.result_source || costume.resultSource)) || '').toLowerCase();
  return src === RESULT_SOURCE.MODEL;
}

module.exports = { RESULT_SOURCE, costumeUiBadge, shouldMarkGeneratedFromPoll };
