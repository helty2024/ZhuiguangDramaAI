'use strict';

/**
 * ImageTask costume writeback must set status + result_source=model on success
 * (not only image_url/local_path). Failure clears image and sets failed+error.
 */
function costumeWritebackSuccessPatch(imageUrl, localPath) {
  return {
    status: 'ready',
    progress: 100,
    error_message: null,
    image_url: imageUrl || localPath || null,
    local_path: localPath || imageUrl || null,
    result_source: 'model'
  };
}

function costumeWritebackFailurePatch(errorMessage) {
  return {
    status: 'failed',
    progress: 0,
    error_message: String(errorMessage || '生成失败'),
    image_url: null,
    local_path: null,
    result_source: null
  };
}

/** Columns that MUST be present in costume success UPDATE */
const REQUIRED_SUCCESS_FIELDS = Object.freeze([
  'status',
  'image_url',
  'local_path',
  'result_source',
  'updated_at'
]);

module.exports = {
  costumeWritebackSuccessPatch,
  costumeWritebackFailurePatch,
  REQUIRED_SUCCESS_FIELDS
};
