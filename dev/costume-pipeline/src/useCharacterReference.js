'use strict';

/**
 * use_character_reference follows the costume row / UI — never forced true.
 */
function resolveUseCharacterReference(costumeRow, body) {
  let useRef = !!(costumeRow && costumeRow.use_character_reference);
  if (!body) return useRef;
  if (body.use_character_reference === false || body.use_character_reference === 0 || body.use_character_reference === '0') {
    useRef = false;
  } else if (body.use_character_reference === true || body.use_character_reference === 1 || body.use_character_reference === '1') {
    useRef = true;
  }
  return useRef;
}

/** Default for newly created costumes */
const DEFAULT_USE_CHARACTER_REFERENCE = false;

module.exports = { resolveUseCharacterReference, DEFAULT_USE_CHARACTER_REFERENCE };
