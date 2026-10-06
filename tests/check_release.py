#!/usr/bin/env python3
"""Offline, temporary-file fixtures for desktop release preparation/publication."""
import base64
import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import plistlib
import runpy
import shutil
import struct
import subprocess
import tempfile
import traceback
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('TEST_OUTPUT_DIR', ROOT / 'output/playwright'))
TOOLS = runpy.run_path(str(ROOT / 'desktop/prepare_release.py'))
RESULTS = []
SKIPPED = []
MANIFESTS = []
PAGE = b'<!doctype html><html lang="zh"><title>Release fixture</title></html>'
CONFIG = {
    'schema': 1, 'version': '1.1.0', 'shellVersion': '1.1.0', 'minimumShellVersion': '1.1.0',
    'publishedAt': '2026-10-03', 'manifestURL': 'https://zhixiang-classroom.pages.dev/desktop/latest.json',
    'websiteURL': 'https://zhixiang-classroom.pages.dev/', 'repository': 'Jasoniss8/zhixiang-classroom',
    'notes': ['Release fixture'],
    'downloads': {
        'macos': {'filename': 'Zhixiang-macOS-arm64.zip', 'architecture': 'arm64', 'minimumOS': 'macOS 13'},
        'windows': {'filename': 'Zhixiang-Windows-x64.zip', 'architecture': 'x64', 'minimumOS': 'Windows 10'},
    },
}


def check(name, body):
    try:
        if body() is False:
            raise AssertionError('检查条件不满足')
        item = {'name': name, 'passed': True}
    except Exception as error:
        item = {'name': name, 'passed': False, 'details': str(error)}
    RESULTS.append(item)
    print(('PASS ' if item['passed'] else 'FAIL ') + name + (': ' + item['details'] if not item['passed'] else ''), flush=True)


def rejects(body, message=None):
    try:
        body()
    except (ValueError, OSError, KeyError, TypeError) as error:
        if message and message not in str(error):
            raise AssertionError(f'提示不明确：{error}')
        return True
    raise AssertionError('应拒绝但实际接受')


def write_config(root, config):
    (root / 'desktop').mkdir(exist_ok=True)
    (root / 'desktop/release.json').write_text(json.dumps(config, ensure_ascii=False), encoding='utf-8')


def make_packages(root, page=PAGE, shell='1.1.0'):
    mac = root / 'output/macos/知象-macOS.zip'
    mac.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(mac, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('知象.app/Contents/Resources/standalone.html', page)
        archive.writestr('知象.app/Contents/Info.plist', plistlib.dumps({'CFBundleShortVersionString': shell}))
        archive.writestr('知象.app/Contents/MacOS/Zhixiang', b'fixture executable')
    content = {'app.html': page, 'package.json': json.dumps({'version': shell}).encode()}
    files, offset = {}, 0
    for name, data in content.items():
        files[name] = {'size': len(data), 'offset': str(offset)}
        offset += len(data)
    header = json.dumps({'files': files}).encode()
    payload = struct.pack('<I', len(header)) + header
    payload += b'\0' * (-len(payload) % 4)
    header = struct.pack('<I', len(payload)) + payload
    asar = struct.pack('<II', 4, len(header)) + header + b''.join(content.values())
    windows = root / 'output/windows/知象-Windows-免安装.zip'
    windows.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(windows, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('知象-Windows/resources/app.asar', asar)
        archive.writestr('知象-Windows/Zhixiang.exe', b'fixture executable')


def create_fixture(root):
    write_config(root, CONFIG)
    (root / 'standalone.html').write_bytes(PAGE)
    make_packages(root)


def config_checks(root):
    def accept(config):
        write_config(root, config)
        return TOOLS['read_config'](root)
    check('发布配置接受当前固定地址', lambda: bool(accept(copy.deepcopy(CONFIG))))
    for key in ('version', 'shellVersion', 'minimumShellVersion'):
        for value in ('01.1.0', '1.000001.0', '1000000.1.0', '1.2.３', '1.2.0\n', '1.2.0-beta'):
            candidate = copy.deepcopy(CONFIG)
            candidate[key] = value
            check(f'拒绝无效 {key}={value!r}', lambda candidate=candidate: rejects(lambda: accept(candidate)))
    candidate = copy.deepcopy(CONFIG)
    for key in ('version', 'shellVersion', 'minimumShellVersion'):
        candidate[key] = '999999.999999.999999'
    check('版本每段六位上界有效', lambda: bool(accept(candidate)))
    candidate = copy.deepcopy(CONFIG)
    candidate['minimumShellVersion'] = '1.2.0'
    check('最低壳版本不能高于下载壳', lambda: rejects(lambda: accept(candidate)))
    candidate = copy.deepcopy(CONFIG)
    candidate['version'] = '1.0.0'
    check('页面版本不能低于下载壳', lambda: rejects(lambda: accept(candidate)))
    for key, value in [('websiteURL', 'https://example.com/'), ('websiteURL', 'https://zhixiang-classroom.pages.dev'),
                       ('manifestURL', 'https://zhixiang-classroom.pages.dev/other.json'), ('repository', 'someone/other')]:
        candidate = copy.deepcopy(CONFIG)
        candidate[key] = value
        check('固定地址拒绝偏移 ' + key + '=' + value, lambda candidate=candidate: rejects(lambda: accept(candidate), '同时修改'))
    for platform in ('macos', 'windows'):
        for name in ('alternative.zip', '../escape.zip', '知象.zip'):
            candidate = copy.deepcopy(CONFIG)
            candidate['downloads'][platform]['filename'] = name
            check('固定下载名拒绝偏移 ' + platform + '/' + name, lambda candidate=candidate: rejects(lambda: accept(candidate), '同时修改'))
    for name, notes in [('13项', ['x'] * 13), ('241字符', ['x' * 241]), ('121个双UTF16字符', ['😀' * 121]),
                        ('NUL', ['x\x00']), ('垂直制表', ['x\x0b']), ('换页', ['x\x0c']), ('单元分隔', ['x\x1f']), ('非文本', [1])]:
        candidate = copy.deepcopy(CONFIG)
        candidate['notes'] = notes
        check('更新说明拒绝 ' + name, lambda candidate=candidate: rejects(lambda: accept(candidate)))
    for name, notes in [('12项', ['x'] * 12), ('240字符', ['x' * 240]), ('120个双UTF16字符', ['😀' * 120]),
                        ('允许的Tab/LF/CR', ['a\tb\nc\r'])]:
        candidate = copy.deepcopy(CONFIG)
        candidate['notes'] = notes
        check('更新说明接受 ' + name, lambda candidate=candidate: bool(accept(candidate)))
        manifest = TOOLS['manifest_for'](candidate, root / 'standalone.html', {
            'macos': root / 'output/macos/知象-macOS.zip', 'windows': root / 'output/windows/知象-Windows-免安装.zip'})
        MANIFESTS.append({'name': name, 'manifest': manifest, 'page': base64.b64encode(PAGE).decode()})
    write_config(root, CONFIG)


def preparation_checks(root):
    prepare = TOOLS['prepare']
    release = prepare(root)
    manifest = json.loads((release / 'latest.json').read_text())
    check('发布清单结构与版本正确', lambda: manifest['schema'] == 1 and manifest['version'] == '1.1.0' and set(manifest['downloads']) == {'macos', 'windows'})
    check('页面 SHA-256 来自实际文件', lambda: manifest['page']['sha256'] == hashlib.sha256(PAGE).hexdigest())
    check('发布目录仅含ASCII名', lambda: all(path.name.isascii() for path in release.iterdir()))
    check('部署首页来自当前页面', lambda: (root / 'dist/index.html').read_bytes() == PAGE)
    check('清单禁止缓存并允许跨来源', lambda: 'Cache-Control: no-store' in (root / 'dist/_headers').read_text() and 'Access-Control-Allow-Origin: *' in (root / 'dist/_headers').read_text())
    check('同版本相同内容允许幂等准备', lambda: prepare(root) == release)
    check('只校验模式通过', lambda: prepare(root, True) == release)
    proxy = root / 'dist/_redirects'
    rule = '/desktop/releases/:version/standalone.html /desktop/releases/:version/standalone 200\n'
    check('版本页面使用同站点200代理并保留固定html网址', lambda: proxy.read_text(encoding='utf-8') == rule)
    frozen = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in release.iterdir()}
    proxy.unlink()
    check('部署校验拒绝缺失版本页面代理规则', lambda: rejects(lambda: prepare(root, True)))
    prepare(root)
    check('幂等准备恢复代理且不改变发布资产字节', lambda: proxy.read_text(encoding='utf-8') == rule and frozen == {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in release.iterdir()})
    for invalid in (rule.replace(' 200', ' 302'), rule.replace('/desktop/releases/:version/standalone 200', 'https://example.com/standalone 200')):
        proxy.write_text(invalid, encoding='utf-8')
        check('部署校验拒绝跳转或站外代理', lambda: rejects(lambda: prepare(root, True)))
    prepare(root)
    check('代理配置不改变版本页面及清单地址', lambda: (root / 'dist/desktop/releases/1.1.0/standalone.html').read_bytes() == PAGE and json.loads((root / 'dist/desktop/latest.json').read_text()) == manifest)

    (root / 'dist/secret.txt').write_text('fixture only')
    check('部署校验拒绝额外文件', lambda: rejects(lambda: prepare(root, True)))
    prepare(root)
    check('准备白名单移除额外部署文件', lambda: not (root / 'dist/secret.txt').exists())
    (root / 'standalone.html').write_bytes(PAGE + b'changed')
    check('拒绝原生包内旧页面', lambda: rejects(lambda: prepare(root), '内置页面'))
    make_packages(root, PAGE + b'changed')
    check('同版本不同内容禁止覆盖', lambda: rejects(lambda: prepare(root), '禁止覆盖'))
    check('拒绝后旧发布内容保留', lambda: (release / 'standalone.html').read_bytes() == PAGE)
    config = copy.deepcopy(CONFIG)
    config['version'] = '1.1.1'
    write_config(root, config)
    new_release = prepare(root)
    check('仅升级页面可保留最低壳版本', lambda: json.loads((new_release / 'latest.json').read_text())['minimumShellVersion'] == '1.1.0')
    check('准备保留旧版本永久缓存页面', lambda: (root / 'dist/desktop/releases/1.1.0/standalone.html').read_bytes() == PAGE)
    check('通用版本代理规则跨内容版本保持有效', lambda: proxy.read_text(encoding='utf-8') == rule)
    make_packages(root, PAGE + b'changed', '1.0.0')
    check('拒绝旧原生壳包', lambda: rejects(lambda: prepare(root), '壳版本'))
    make_packages(root, PAGE + b'changed')
    (root / 'standalone.html').write_bytes(b'not HTML')
    check('拒绝不受更新器支持的页面头', lambda: rejects(lambda: prepare(root), 'HTML'))
    (root / 'standalone.html').write_bytes(b'<!doctype html>\xff')
    check('拒绝非UTF8页面', lambda: rejects(lambda: prepare(root)))


def size_checks(root):
    target = root / 'sparse-file'
    for label, maximum in [('页面', TOOLS['MAX_PAGE_BYTES']), ('安装包', TOOLS['MAX_PACKAGE_BYTES'])]:
        for size, accept in [(0, False), (1, True), (maximum, True), (maximum + 1, False)]:
            with target.open('wb') as stream:
                stream.truncate(size)
            body = lambda: TOOLS['check_file_size'](target, maximum, label)
            check(f'{label}大小边界 {size}', (lambda body=body: bool(body())) if accept else (lambda body=body: rejects(body, '更新器')))
    target.unlink()
    page = root / 'standalone.html'
    with page.open('wb') as stream:
        stream.truncate(TOOLS['MAX_PAGE_BYTES'] + 1)
    check('准备入口在读取前拒绝超限页面', lambda: rejects(lambda: TOOLS['prepare'](root), '页面 大小'))
    page.write_bytes(PAGE)
    archive = root / 'output/macos/知象-macOS.zip'
    with archive.open('wb') as stream:
        stream.truncate(TOOLS['MAX_PACKAGE_BYTES'] + 1)
    check('准备入口在解压前拒绝超限安装包', lambda: rejects(lambda: TOOLS['prepare'](root), '完整安装包 大小'))
    make_packages(root)
    packages = {'macos': archive, 'windows': root / 'output/windows/知象-Windows-免安装.zip'}
    manifest = TOOLS['manifest_for'](CONFIG, page, packages)
    manifest['padding'] = ''
    initial = len((json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    manifest['padding'] = 'x' * (TOOLS['MAX_MANIFEST_BYTES'] - initial)
    check('64KiB清单边界允许', lambda: len(TOOLS['expected_payload'](CONFIG, manifest, page, packages)['latest.json']) == TOOLS['MAX_MANIFEST_BYTES'])
    manifest['padding'] += 'x'
    check('超过64KiB清单拒绝', lambda: rejects(lambda: TOOLS['expected_payload'](CONFIG, manifest, page, packages), '64 KiB'))


def publishing_checks(root):
    if os.name == 'nt' or not shutil.which('bash'):
        SKIPPED.append('发布脚本离线流程需要 POSIX Bash；Windows 上跳过，Linux/macOS 执行。')
        print('SKIP ' + SKIPPED[-1])
        return
    create_fixture(root)
    release = TOOLS['prepare'](root)
    for name in ('publish_release.sh', 'prepare_release.py'):
        shutil.copyfile(ROOT / 'desktop' / name, root / 'desktop' / name)
    (root / 'bin').mkdir()
    manifest = json.loads((release / 'latest.json').read_text())
    assets = []
    for info in manifest['downloads'].values():
        assets.append({'name': info['filename'], 'state': 'uploaded', 'size': info['bytes'], 'digest': 'sha256:' + info['sha256'], 'browser_download_url': info['url']})
    for name in ('latest.json', 'SHA256SUMS.txt'):
        data = (release / name).read_bytes()
        assets.append({'name': name, 'state': 'uploaded', 'size': len(data), 'digest': 'sha256:' + hashlib.sha256(data).hexdigest()})
    remote = root / 'remote.json'
    remote.write_text(json.dumps({'draft': False, 'prerelease': False, 'tag_name': 'v1.1.0', 'assets': assets}))
    shim = '''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
name=Path(sys.argv[0]).name
args=sys.argv[1:]
with open(os.environ['TEST_PUBLISH_LOG'],'a') as f:f.write(name+':'+json.dumps(args)+'\\n')
case=os.environ['TEST_PUBLISH_CASE']
if name=='npx':raise SystemExit(0)
if args[:2]==['auth','status']:raise SystemExit(2 if case=='unauthenticated' else 0)
if args[:2]==['repo','view']:print('true' if case=='private' else 'false');raise SystemExit(0)
if args[:2]==['release','view']:raise SystemExit(0 if case=='existing' else 1)
if args[:2]==['release','create']:raise SystemExit(7 if case=='upload-failure' else 0)
if args[:2]==['release','edit']:raise SystemExit(0)
if args and args[0]=='api':
 d=json.loads(Path(os.environ['TEST_PUBLISH_REMOTE']).read_text())
 if case=='bad-digest':d['assets'][0]['digest']='sha256:invalid'
 if case=='missing-digest':d['assets'][0].pop('digest')
 if case=='draft':d['draft']=True
 print(json.dumps(d));raise SystemExit(0)
raise SystemExit(99)
'''
    for name in ('gh', 'npx'):
        path = root / 'bin' / name
        path.write_text(shim)
        path.chmod(0o755)
    for case in ('success', 'existing', 'unauthenticated', 'private', 'upload-failure', 'bad-digest', 'missing-digest', 'draft', 'deploy-only'):
        def run(case=case):
            log = root / 'calls.log'
            log.write_text('')
            env = dict(os.environ, PATH=str(root / 'bin') + os.pathsep + os.environ['PATH'],
                       TEST_PUBLISH_LOG=str(log), TEST_PUBLISH_REMOTE=str(remote), TEST_PUBLISH_CASE=case)
            result = subprocess.run(['bash', str(root / 'desktop/publish_release.sh'), *(['--deploy-only'] if case == 'deploy-only' else [])],
                                    cwd=root, env=env, text=True, capture_output=True, timeout=30)
            calls = log.read_text().splitlines()
            deployed = any(line.startswith('npx:') for line in calls)
            expected = case in ('success', 'deploy-only')
            if deployed != expected or (result.returncode == 0) != expected:
                raise AssertionError(f'exit={result.returncode}; calls={calls}; stderr={result.stderr}')
            if expected:
                assert next(i for i, line in enumerate(calls) if '"api"' in line) < next(i for i, line in enumerate(calls) if line.startswith('npx:'))
            if case == 'deploy-only':
                assert not any('"create"' in line or '"edit"' in line for line in calls)
            if case == 'upload-failure':
                assert not any('"edit"' in line for line in calls)
        check('离线发布顺序/失败保护 ' + case, run)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        with tempfile.TemporaryDirectory(prefix='zhixiang-release-regression-') as folder:
            base = Path(folder)
            root = base / 'prepare'
            root.mkdir()
            create_fixture(root)
            config_checks(root)
            preparation_checks(root)
            write_config(root, CONFIG)
            size_checks(root)
            publisher = base / 'publish'
            publisher.mkdir()
            publishing_checks(publisher)
    except Exception as error:
        RESULTS.append({'name': '发布测试夹具执行完整', 'passed': False, 'details': str(error)})
        print('FAIL 发布测试夹具执行完整：' + str(error))
        traceback.print_exc()
    report = {'date': datetime.now(timezone.utc).isoformat(), 'results': RESULTS, 'skipped': SKIPPED,
              'total': len(RESULTS), 'passed': sum(item['passed'] for item in RESULTS),
              'failed': sum(not item['passed'] for item in RESULTS), 'publicationPerformed': False}
    (OUT / 'release-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / 'release-manifest-fixtures.json').write_text(json.dumps(MANIFESTS, ensure_ascii=False, indent=2), encoding='utf-8')
    return 1 if report['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
