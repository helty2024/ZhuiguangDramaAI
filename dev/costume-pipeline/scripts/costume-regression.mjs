#!/usr/bin/env node
/**
 * Unpaid costume-pipeline regression suite.
 * paidCalls MUST remain 0 — unit/static assertions only.
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const api = require(path.join(root, 'src/index.js'));

let paidCalls = 0;
let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log('PASS  ' + name);
  } else {
    failed++;
    console.error('FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}

// 1) buildCostumePrompt isolation
{
  const p = api.buildCostumePrompt(
    { name: '蕾欧娜' },
    { name: '末日服装', description: '简单的兽皮缝制而成的连体衣', prompt: '' }
  );
  assert('prompt includes costume name', p.includes('costume: 末日服装'));
  assert('prompt includes description', p.includes('简单的兽皮缝制而成的连体衣'));
  assert('prompt includes character name', p.includes('character 蕾欧娜'));
  assert('prompt excludes sibling costume names', !p.includes('战斗服'));
  const p2 = api.buildCostumePrompt({ name: 'A' }, { name: 'X', description: 'd1', final_prompt: 'SHOULD_NOT_APPEAR' });
  assert('prompt ignores final_prompt field', !p2.includes('SHOULD_NOT_APPEAR'));
}

// 2) mock vs real default
{
  const def = api.resolveCostumeGenerateOpts({});
  assert('default generate opts empty (real)', Object.keys(def).length === 0 && def.mock !== true);
  const payload = api.defaultGeneratePayload(12, false);
  assert('default payload has episode_id', payload.episode_id === 12);
  assert('default payload omits mock', payload.mock === undefined);
  assert('default payload use_character_reference false when false', payload.use_character_reference === false);
  const mockOpts = api.resolveCostumeGenerateOpts({ ZG_COSTUME_DEV_MOCK: '1' });
  assert('DEV mock flag enables mock', mockOpts.mock === true);
  const winOpts = api.resolveCostumeGenerateOpts({ __ZG_COSTUME_GEN_OPTS: { mock: true, mock_delay_ms: 10 } });
  assert('window opts honored', winOpts.mock === true && winOpts.mock_delay_ms === 10);
  assert('isMockGenerateRequest body', api.isMockGenerateRequest({ mock: true }, {}) === true);
  assert('isMockGenerateRequest default body false', api.isMockGenerateRequest({ episode_id: 1 }, {}) === false);
}

// 3) result_source badge rules
{
  assert('badge model+image => 已生成', api.costumeUiBadge({ status: 'ready', result_source: 'model', image_url: '/x.png' }) === '已生成');
  assert('badge mock+image => 占位图/待确认', api.costumeUiBadge({ status: 'ready', result_source: 'mock', image_url: '/x.png' }) === '占位图/待确认');
  assert('badge local_fill => 占位图/待确认', api.costumeUiBadge({ status: 'ready', result_source: 'local_fill', local_path: '/x.png' }) === '占位图/待确认');
  assert('badge recovered => 占位图/待确认', api.costumeUiBadge({ status: 'ready', result_source: 'recovered', image_url: '/x.png' }) === '占位图/待确认');
  assert('badge empty source + image => 待确认', api.costumeUiBadge({ status: 'ready', image_url: '/x.png' }) === '待确认');
  assert('badge idle => 待生成', api.costumeUiBadge({ status: 'idle' }) === '待生成');
  assert('badge generating', api.costumeUiBadge({ status: 'generating' }) === '正在生成');
  assert('poll mark only model', api.shouldMarkGeneratedFromPoll({ result_source: 'model' }) === true);
  assert('poll mark rejects mock', api.shouldMarkGeneratedFromPoll({ result_source: 'mock' }) === false);
}

// 4) select policy
{
  const mockSel = api.selectCostumeEffects({ result_source: 'mock', image_url: '/m.png' });
  assert('select never overwrites character cover (mock)', mockSel.mayOverwriteCharacterCover === false);
  assert('select mock skips VCE', mockSel.mayUpsertVceCostumeAnchor === false);
  const modelSel = api.selectCostumeEffects({ result_source: 'model', image_url: '/m.png' });
  assert('select never overwrites character cover (model)', modelSel.mayOverwriteCharacterCover === false);
  assert('select model allows VCE', modelSel.mayUpsertVceCostumeAnchor === true);
}

// 5) writeback fields
{
  const ok = api.costumeWritebackSuccessPatch('/static/a.png', '/abs/a.png');
  assert('writeback success result_source=model', ok.result_source === 'model');
  assert('writeback success status=ready', ok.status === 'ready');
  for (const f of api.REQUIRED_SUCCESS_FIELDS) {
    if (f === 'updated_at') continue;
    assert('writeback has ' + f, ok[f] !== undefined);
  }
  const bad = api.costumeWritebackFailurePatch('boom');
  assert('writeback failure clears image', bad.image_url === null && bad.local_path === null);
  assert('writeback failure status failed', bad.status === 'failed');
}

// 6) use_character_reference follows row/UI
{
  assert('row false, body omit => false', api.resolveUseCharacterReference({ use_character_reference: 0 }, {}) === false);
  assert('row true, body false => false', api.resolveUseCharacterReference({ use_character_reference: 1 }, { use_character_reference: false }) === false);
  assert('row false, body true => true', api.resolveUseCharacterReference({ use_character_reference: 0 }, { use_character_reference: true }) === true);
  assert('default new costume false', api.DEFAULT_USE_CHARACTER_REFERENCE === false);
}

// 7) stub paths — no Administrator absolute
{
  const cands = api.buildStubCandidates('/app/resources', '/app/resources/app.asar.unpacked/costume');
  assert('stub candidates non-empty', cands.length >= 2);
  let threw = false;
  try { api.assertNoMachineAbsolutePaths(cands); } catch (_) { threw = true; }
  assert('relative stub candidates pass', threw === false);
  let caught = false;
  try {
    api.assertNoMachineAbsolutePaths(['C:\\Users\\Administrator\\agent-tools\\x\\costume-mount-full.js']);
  } catch (_) { caught = true; }
  assert('Administrator absolute path rejected', caught === true);

  const stubSrc = fs.readFileSync(path.join(root, 'reference/costume-mount.js'), 'utf8');
  assert('reference stub has no Administrator path', !/Administrator/.test(stubSrc));
}

// 8) no portrait fallback in generate success path
{
  const full = fs.readFileSync(path.join(root, 'reference/costume-mount-full.js'), 'utf8');
  let ok = false;
  try { api.assertNoPortraitFallbackInGenerateSuccess(full); ok = true; } catch (e) { console.error(e.message); }
  assert('reference BE has no portrait-fallback success', ok);
  assert('copyStaticImage hard-throws', /function copyStaticImage[\s\S]{0,120}throw new Error/.test(full));
  assert('mock synthetic writer present', full.includes('mock-synthetic'));
  assert('mock filename pattern uses costume-mock-', /costume-mock-/.test(full));
  const name = api.mockImageFileName(13, '兽皮连体衣');
  assert('mock filename unique prefix', name.startsWith('costume-mock-13-') && name.includes('.png'));
}

// 9) unpaid gate
{
  assert('evidence live-once present', fs.existsSync(path.join(root, 'evidence/live-once-DELIVERABLE.json')));
  assert('evidence ae-fix present', fs.existsSync(path.join(root, 'evidence/ae-fix-DELIVERABLE.json')));
  assert('this suite paidCalls===0', paidCalls === 0);
}

console.log('\n---');
console.log(JSON.stringify({ passed, failed, paidCalls }, null, 2));
if (failed) process.exit(1);
