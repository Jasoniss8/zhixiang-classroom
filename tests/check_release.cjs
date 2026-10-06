/* Offline release regression: Python fixtures + the real Windows manifest parser.
 * No browser, GitHub login, network request or real publication is performed.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {outputDir} = require('./runtime.cjs');
const root = path.resolve(__dirname, '..');
const command = process.env.PYTHON || (process.platform === 'win32' ? 'py' : 'python3');
const args = [...(process.platform === 'win32' && !process.env.PYTHON ? ['-3'] : []), path.join(__dirname, 'check_release.py')];
const result = spawnSync(command, args, {
  cwd: root, env: {...process.env, TEST_OUTPUT_DIR: outputDir, PYTHONDONTWRITEBYTECODE: '1'},
  encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error || result.status !== 0) {
  if (result.error) console.log('FAIL 发布回归 Python 环境：' + result.error.message);
  process.exitCode = 1;
} else {
  const {validateManifest, verifyPage} = require('../windows/desktop/update-service.cjs');
  const fixtures = JSON.parse(fs.readFileSync(path.join(outputDir, 'release-manifest-fixtures.json'), 'utf8'));
  const reportPath = path.join(outputDir, 'release-results.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  for (const fixture of fixtures) {
    let passed = true, details;
    try {
      const manifest = validateManifest(fixture.manifest);
      verifyPage(Buffer.from(fixture.page, 'base64'), manifest.page);
    } catch (error) {passed = false; details = error.message;}
    const name = '生产者清单可被 Windows 更新器接受：' + fixture.name;
    report.results.push({name, passed, ...(details ? {details} : {})});
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${details ? ' ' + details : ''}`);
  }
  report.total = report.results.length;
  report.passed = report.results.filter(item => item.passed).length;
  report.failed = report.total - report.passed;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`RESULT ${report.passed}/${report.total} release checks; no publication performed`);
  if (report.failed) process.exitCode = 1;
}
