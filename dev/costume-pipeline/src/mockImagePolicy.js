'use strict';

const crypto = require('crypto');

/**
 * Mock / DEV synthetic images must be unique per costume description.
 * Copying character portrait / standing images as a success fallback is FORBIDDEN.
 */
function mockImageFileName(costumeId, descriptionOrPrompt) {
  const descHash = crypto
    .createHash('sha1')
    .update(String(descriptionOrPrompt || ''), 'utf8')
    .digest('hex')
    .slice(0, 12);
  return 'costume-mock-' + String(costumeId || 'x') + '-' + descHash + '-xxxxxxxx.png';
}

function isForbiddenPortraitFallbackPath(relOrAbs) {
  const s = String(relOrAbs || '').toLowerCase();
  if (!s) return false;
  // historical failure mode: copy character cover / reference into costume result
  if (s.includes('copyStaticImage'.toLowerCase())) return true;
  return false;
}

/** Success-path must not call portrait copy helpers */
function assertNoPortraitFallbackInGenerateSuccess(sourceText) {
  const src = String(sourceText || '');
  // Allow the hard-throw stub named copyStaticImage, but forbid actual fs.copyFile of character images as success
  const banned = [
    /copyFileSync\s*\([^)]*reference_images/i,
    /copyFileSync\s*\([^)]*character/i,
    /fs\.copyFileSync\([^)]*portrait/i,
    /已用占位图填充/ // toast that accompanied portrait fake-success
  ];
  for (const re of banned) {
    if (re.test(src)) throw new Error('forbidden portrait-fallback pattern: ' + re);
  }
  // copyStaticImage must throw if present
  if (/function\s+copyStaticImage\s*\(/.test(src) && !/throw new Error/.test(src.slice(src.indexOf('function copyStaticImage'), src.indexOf('function copyStaticImage') + 200))) {
    throw new Error('copyStaticImage must hard-throw');
  }
  return true;
}

module.exports = {
  mockImageFileName,
  isForbiddenPortraitFallbackPath,
  assertNoPortraitFallbackInGenerateSuccess
};
