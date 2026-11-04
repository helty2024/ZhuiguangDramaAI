'use strict';

/**
 * Resolve generate options for the costume card button.
 * Default is REAL model (empty opts). Mock only via explicit DEV flag/opts.
 *
 * Portable FE equivalent:
 *   try {
 *     if (window.__ZG_COSTUME_GEN_OPTS) return window.__ZG_COSTUME_GEN_OPTS;
 *     if (localStorage.getItem('ZG_COSTUME_DEV_MOCK') === '1') return { mock: true };
 *   } catch (_) {}
 *   return {};
 */
function resolveCostumeGenerateOpts(env) {
  const e = env || {};
  if (e.__ZG_COSTUME_GEN_OPTS && typeof e.__ZG_COSTUME_GEN_OPTS === 'object') {
    return { ...e.__ZG_COSTUME_GEN_OPTS };
  }
  if (e.ZG_COSTUME_DEV_MOCK === true || e.ZG_COSTUME_DEV_MOCK === '1' || e.ZG_COSTUME_DEV_MOCK === 1) {
    return { mock: true };
  }
  if (e.localStorageGetItem && e.localStorageGetItem('ZG_COSTUME_DEV_MOCK') === '1') {
    return { mock: true };
  }
  return {};
}

function isMockGenerateRequest(body, opts) {
  if (opts && (opts.mock === true || opts.mock === 1 || opts.mock === '1')) return true;
  if (body && (body.mock === true || body.mock === 1 || body.mock === '1')) return true;
  return false;
}

/** Default UI click must NOT send mock:true */
function defaultGeneratePayload(episodeId, useCharacterReference) {
  const payload = { episode_id: episodeId };
  if (useCharacterReference === true || useCharacterReference === 1 || useCharacterReference === '1') {
    payload.use_character_reference = true;
  } else if (useCharacterReference === false || useCharacterReference === 0 || useCharacterReference === '0') {
    payload.use_character_reference = false;
  }
  // intentionally omit mock
  return payload;
}

module.exports = { resolveCostumeGenerateOpts, isMockGenerateRequest, defaultGeneratePayload };
