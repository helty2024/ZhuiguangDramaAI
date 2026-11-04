'use strict';

/**
 * Build the image prompt for ONE costume row.
 * Must use only this costume's name/description/prompt — never sibling rows,
 * never re-inject prior final_prompt (would duplicate on regenerate).
 */
function buildCostumePrompt(charRow, costume) {
  if (!costume) throw new Error('costume required');
  const parts = [
    charRow && charRow.name ? ('character ' + String(charRow.name)) : '',
    costume.name ? ('costume: ' + String(costume.name)) : '',
    costume.description ? String(costume.description) : '',
    costume.prompt ? String(costume.prompt) : '',
    'full body costume reference sheet, clean background'
  ].filter((p) => p && String(p).trim());
  return parts.join(', ');
}

module.exports = { buildCostumePrompt };
