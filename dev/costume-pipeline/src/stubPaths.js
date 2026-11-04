'use strict';

/**
 * costume-mount stub candidates must be relative to resourcesPath / __dirname.
 * Machine-absolute paths (e.g. C:\\Users\\Administrator\\...) are forbidden.
 */
function buildStubCandidates(resourcesPath, dirname) {
  const out = [];
  if (resourcesPath) {
    out.push(require('path').join(resourcesPath, 'app.asar.unpacked', 'costume', 'costume-mount-full.js'));
    out.push(require('path').join(resourcesPath, 'app.asar.unpacked', 'costume', 'costume-mount.js'));
  }
  if (dirname) {
    out.push(require('path').join(dirname, 'costume-mount-full.js'));
    out.push(require('path').join(dirname, 'costume-mount.js'));
  }
  return out;
}

function assertNoMachineAbsolutePaths(candidates) {
  const bad = (candidates || []).filter((p) => /[/\\]Users[/\\]Administrator[/\\]/i.test(String(p)) || /^[A-Za-z]:\\Users\\/i.test(String(p)));
  if (bad.length) {
    throw new Error('stub candidates contain machine-absolute paths: ' + bad.join(' | '));
  }
  return true;
}

module.exports = { buildStubCandidates, assertNoMachineAbsolutePaths };
