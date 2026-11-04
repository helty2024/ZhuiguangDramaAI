'use strict';

/**
 * Product rule: selecting a costume updates storyboard/VCE costume anchors
 * for MODEL results only, and NEVER overwrites the character main image/cover.
 */
function selectCostumeEffects(costume) {
  const src = String((costume && (costume.result_source || costume.resultSource)) || '').toLowerCase();
  const hasImage = !!(costume && (costume.image_url || costume.local_path));
  return {
    maySetIsSelected: true,
    mayOverwriteCharacterCover: false, // hard rule — always false
    mayUpsertVceCostumeAnchor: src === 'model' && hasImage,
    skipVceReason: src === 'model' ? (hasImage ? null : 'no_image') : ('result_source=' + (src || 'empty'))
  };
}

module.exports = { selectCostumeEffects };
