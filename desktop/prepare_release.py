#!/usr/bin/env python3
"""Prepare immutable desktop downloads and a minimal Cloudflare Pages directory.

Run build.py and both native build scripts first. This script never publishes.
Only Python's standard library is required (Python 3.9+).
"""

import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import plistlib
import re
import shutil
import struct
import sys
import tempfile
from zipfile import BadZipFile, ZipFile


ROOT = Path(__file__).resolve().parent.parent
VERSION_PART = r'(?:0|[1-9][0-9]{0,5})'
VERSION = re.compile(rf'{VERSION_PART}\.{VERSION_PART}\.{VERSION_PART}\Z')
WEBSITE_URL = 'https://zhixiang-classroom.pages.dev/'
REPOSITORY = 'Jasoniss8/zhixiang-classroom'
FILENAMES = {'macos': 'Zhixiang-macOS-arm64.zip', 'windows': 'Zhixiang-Windows-x64.zip'}
MAX_PAGE_BYTES = 10 * 1024 * 1024
MAX_MANIFEST_BYTES = 64 * 1024
MAX_PACKAGE_BYTES = 2 * 1024 * 1024 * 1024
NOTE_CONTROLS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')
PIN_ERROR = '发布地址或文件名与桌面更新器固定规则不一致；如需更改，请同时修改 Windows / macOS updater 并重新构建，不能只改发布清单。'
HEADERS = """/desktop/latest.json
  Cache-Control: no-store
  Access-Control-Allow-Origin: *
/desktop/releases/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *
/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/admin/*
  Cache-Control: no-store
  X-Robots-Tag: noindex
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
"""

# Static admin dashboard deployed beside the site; its API lives in functions/.
ADMIN_FILES = ('admin/index.html', 'admin/admin.css', 'admin/admin.js')


# Pages normally redirects .html to an extensionless URL. Desktop updaters pin
# the manifest URL and reject redirects, so serve it through a same-site 200
# proxy before Pages' asset canonicalization. The published HTML is unchanged.
# https://developers.cloudflare.com/pages/configuration/redirects/#proxying
REDIRECTS = "/desktop/releases/:version/standalone.html /desktop/releases/:version/standalone 200\n"


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def regular_file(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError(f'缺少普通文件或不允许符号链接：{path}')
    return path


def check_file_size(path, maximum, label):
    size = regular_file(path).stat().st_size
    if not 0 < size <= maximum:
        raise ValueError(f'{label} 大小必须为 1–{maximum:,} 字节，当前为 {size:,} 字节；桌面更新器会拒绝超限文件。')
    return size


def read_config(root):
    config = json.loads(regular_file(root / 'desktop/release.json').read_text(encoding='utf-8'))
    if config.get('schema') != 1:
        raise ValueError('desktop/release.json 的 schema 必须为 1。')
    for key in ('version', 'shellVersion', 'minimumShellVersion'):
        if not isinstance(config.get(key), str) or not VERSION.fullmatch(config[key]):
            raise ValueError(f'{key} 必须是三段 ASCII 数字版本，每段最多 6 位且无前导零，如 1.1.0。')
    versions = {key: tuple(map(int, config[key].split('.'))) for key in ('version', 'shellVersion', 'minimumShellVersion')}
    if versions['minimumShellVersion'] > versions['shellVersion']:
        raise ValueError('最低壳版本不能高于本次下载包的壳版本。')
    if versions['shellVersion'] > versions['version']:
        raise ValueError('页面版本不能低于本次下载包的壳版本。')
    date.fromisoformat(config['publishedAt'])
    if config.get('repository') != REPOSITORY or config.get('websiteURL') != WEBSITE_URL or config.get('manifestURL') != WEBSITE_URL + 'desktop/latest.json':
        raise ValueError(PIN_ERROR)
    notes = config.get('notes')
    if not isinstance(notes, list) or len(notes) > 12:
        raise ValueError('notes 必须是最多 12 项的文本数组。')
    for note in notes:
        # JavaScript String.length and Swift utf16.count both count UTF-16 units.
        # TAB, LF and CR are permitted by both native updaters; other C0 controls are not.
        if not isinstance(note, str) or len(note.encode('utf-16-le')) // 2 > 240 or NOTE_CONTROLS.search(note):
            raise ValueError('每项更新说明最多 240 个 UTF-16 字符单位，不能含除制表、换行、回车外的 C0 控制字符。')
    filenames = []
    for platform in ('macos', 'windows'):
        entry = config['downloads'][platform]
        filename = entry['filename']
        if filename != FILENAMES[platform]:
            raise ValueError(PIN_ERROR)
        for key in ('architecture', 'minimumOS'):
            if not isinstance(entry.get(key), str) or not entry[key].strip():
                raise ValueError(f'{platform}.{key} 不能为空。')
        filenames.append(filename)
    if len(set(filenames)) != 2:
        raise ValueError('两个平台必须使用不同下载文件名。')
    return config


def zip_member(bundle, suffix):
    names = [name for name in bundle.namelist() if name.endswith(suffix) and not name.startswith('__MACOSX/')]
    if len(names) != 1:
        raise ValueError(f'压缩包中必须且只能有一个 {suffix}。')
    return names[0]


def asar_members(stream, names):
    """Read only named packed ASAR members; never extract archive paths."""
    prefix = stream.read(16)
    if len(prefix) != 16:
        raise ValueError('Windows ASAR 文件头不完整。')
    size, header_size, payload_size, json_size = struct.unpack('<IIII', prefix)
    if size != 4 or not 8 <= header_size <= 2 * 1024 * 1024 or payload_size + 4 != header_size or json_size > payload_size - 4:
        raise ValueError('Windows ASAR 文件头无效。')
    header = json.loads(stream.read(json_size))
    data_start = 8 + header_size
    result = {}
    for name in names:
        item = header['files'][name]
        offset, length = int(item['offset']), int(item['size'])
        if item.get('unpacked') or item.get('link') or offset < 0 or not 0 <= length <= 32 * 1024 * 1024:
            raise ValueError(f'ASAR 中的 {name} 不是有效的内置文件。')
        stream.seek(data_start + offset)
        result[name] = stream.read(length)
        if len(result[name]) != length:
            raise ValueError(f'ASAR 中的 {name} 内容不完整。')
    return result


def verify_native_packages(config, page, packages):
    for platform, path in packages.items():
        check_file_size(path, MAX_PACKAGE_BYTES, platform + ' 完整安装包')
        with ZipFile(regular_file(path)) as bundle:
            invalid = bundle.testzip()
            if invalid:
                raise ValueError(f'{platform} 压缩包校验失败：{invalid}')
            if platform == 'macos':
                html = bundle.read(zip_member(bundle, '/Contents/Resources/standalone.html'))
                info = plistlib.loads(bundle.read(zip_member(bundle, '/Contents/Info.plist')))
                version = info.get('CFBundleShortVersionString')
                zip_member(bundle, '/Contents/MacOS/Zhixiang')
            else:
                zip_member(bundle, '/Zhixiang.exe')
                with bundle.open(zip_member(bundle, '/resources/app.asar')) as stream:
                    files = asar_members(stream, ('app.html', 'package.json'))
                html = files['app.html']
                version = json.loads(files['package.json'])['version']
            if html != page:
                raise ValueError(f'{platform} 内置页面与 standalone.html 不一致，请按构建顺序重建。')
            if version != config['shellVersion']:
                raise ValueError(f'{platform} 壳版本为 {version}，预期 {config["shellVersion"]}，请重建。')


def manifest_for(config, page_path, packages):
    version = config['version']
    base = config['websiteURL'].rstrip('/')
    downloads = {}
    for platform, path in packages.items():
        entry = config['downloads'][platform]
        downloads[platform] = {
            'url': f'https://github.com/{config["repository"]}/releases/download/v{version}/{entry["filename"]}',
            'sha256': sha256(path), 'bytes': path.stat().st_size,
            'filename': entry['filename'], 'architecture': entry['architecture'], 'minimumOS': entry['minimumOS'],
        }
    return {
        'schema': 1, 'version': version, 'minimumShellVersion': config['minimumShellVersion'],
        'publishedAt': config['publishedAt'], 'notes': config['notes'],
        'page': {'url': f'{base}/desktop/releases/{version}/standalone.html', 'sha256': sha256(page_path), 'bytes': page_path.stat().st_size},
        'downloads': downloads,
    }


def expected_payload(config, manifest, page_path, packages):
    payload = {'standalone.html': page_path}
    payload.update({config['downloads'][key]['filename']: path for key, path in packages.items()})
    payload['latest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if len(payload['latest.json']) > MAX_MANIFEST_BYTES:
        raise ValueError('更新清单超过 64 KiB；桌面更新器会拒绝该文件，请缩短发布信息。')
    sums = []
    for name in sorted(payload):
        value = payload[name]
        digest = sha256(value) if isinstance(value, Path) else hashlib.sha256(value).hexdigest()
        sums.append(f'{digest}  {name}')
    payload['SHA256SUMS.txt'] = ('\n'.join(sums) + '\n').encode('ascii')
    return payload


def matches(path, value):
    regular_file(path)
    if isinstance(value, Path):
        return path.stat().st_size == value.stat().st_size and sha256(path) == sha256(value)
    return path.read_bytes() == value


def verify_release(directory, payload):
    if directory.is_symlink() or not directory.is_dir() or {p.name for p in directory.iterdir()} != set(payload):
        raise ValueError(f'发布目录缺失或文件清单不同：{directory}')
    for name, value in payload.items():
        if not matches(directory / name, value):
            raise ValueError(f'同版本文件内容不同，禁止覆盖：{directory / name}。请提升 version。')


def write_payload(directory, payload):
    for name, value in payload.items():
        if isinstance(value, Path):
            shutil.copyfile(value, directory / name)
        else:
            (directory / name).write_bytes(value)


def site_files(root):
    return {name: regular_file(root / name).read_bytes() for name in ADMIN_FILES}


def verify_dist(directory, config, payload, site, index=None):
    version = config['version']
    expected = {
        **site,
        'index.html': index or payload['standalone.html'],
        'desktop/latest.json': payload['latest.json'],
        f'desktop/releases/{version}/standalone.html': payload['standalone.html'],
        '_headers': HEADERS.encode('utf-8'),
        '_redirects': REDIRECTS.encode('utf-8'),
    }
    for name, value in expected.items():
        if not matches(directory / name, value):
            raise ValueError(f'dist 与准备好的发布内容不一致：{name}')
    for path in directory.rglob('*'):
        if path.is_symlink():
            raise ValueError(f'dist 不允许符号链接：{path}')
        if path.is_file():
            name = path.relative_to(directory).as_posix()
            if name not in expected and not re.fullmatch(rf'desktop/releases/{VERSION_PART}\.{VERSION_PART}\.{VERSION_PART}/standalone\.html', name):
                raise ValueError(f'dist 出现不在发布白名单的文件：{name}')


def stage_dist(root, config, payload, site, index=None):
    destination = root / 'dist'
    if destination.is_symlink():
        raise ValueError('dist 不允许符号链接。')
    version = config['version']
    old_page = destination / 'desktop/releases' / version / 'standalone.html'
    if old_page.exists() and not matches(old_page, payload['standalone.html']):
        raise ValueError('dist 中已有同版本不同内容的页面；请提升 version，不能覆盖永久缓存资源。')
    temporary = Path(tempfile.mkdtemp(prefix='.release-dist-', dir=root))
    backup = None
    try:
        # Retain old immutable pages, but never copy arbitrary dist files.
        old_versions = destination / 'desktop/releases'
        if old_versions.exists():
            if old_versions.is_symlink():
                raise ValueError('旧页面目录不允许符号链接。')
            for entry in old_versions.iterdir():
                if VERSION.fullmatch(entry.name):
                    if entry.is_symlink():
                        raise ValueError('旧版本目录不允许符号链接。')
                    source = regular_file(entry / 'standalone.html')
                    target = temporary / 'desktop/releases' / entry.name / 'standalone.html'
                    target.parent.mkdir(parents=True)
                    shutil.copyfile(source, target)
        page = temporary / 'desktop/releases' / version / 'standalone.html'
        page.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(payload['standalone.html'], page)
        shutil.copyfile(index or payload['standalone.html'], temporary / 'index.html')
        (temporary / 'desktop/latest.json').write_bytes(payload['latest.json'])
        (temporary / '_headers').write_text(HEADERS, encoding='utf-8')
        (temporary / '_redirects').write_text(REDIRECTS, encoding='utf-8')
        for name, data in site.items():
            (temporary / name).parent.mkdir(parents=True, exist_ok=True)
            (temporary / name).write_bytes(data)
        verify_dist(temporary, config, payload, site, index)
        if destination.exists():
            backup = Path(tempfile.mkdtemp(prefix='.release-dist-backup-', dir=root))
            backup.rmdir()
            destination.rename(backup)
        try:
            temporary.rename(destination)
        except BaseException:
            if backup is not None:
                backup.rename(destination)
                backup = None
            raise
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
        if backup is not None:
            shutil.rmtree(backup)


def read_page(root):
    page_path = regular_file(root / 'standalone.html')
    check_file_size(page_path, MAX_PAGE_BYTES, '页面')
    page = page_path.read_bytes()
    page.decode('utf-8')
    if not re.match(r'^\s*<!doctype html>', page[:512].decode('utf-8', errors='ignore'), re.IGNORECASE):
        raise ValueError('standalone.html 缺少标准 HTML 文档开头，桌面更新器会拒绝。')
    return page_path, page


def prepare_site(root=ROOT, verify_only=False):
    """Website-only update: new home page and admin files. The published
    desktop release (manifest, versioned page, packages) is reused unchanged."""
    root = Path(root).resolve()
    config = read_config(root)
    page_path, _ = read_page(root)
    directory = root / 'output/releases' / ('v' + config['version'])
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError(f'缺少已发布版本目录 {directory.name}；只更新网站时必须保留当前桌面版本的发布文件。')
    payload = {
        'standalone.html': regular_file(directory / 'standalone.html'),
        'latest.json': regular_file(directory / 'latest.json').read_bytes(),
    }
    site = site_files(root)
    if verify_only:
        verify_dist(root / 'dist', config, payload, site, page_path)
    else:
        stage_dist(root, config, payload, site, page_path)
    return directory


def prepare(root=ROOT, verify_only=False):
    root = Path(root).resolve()
    config = read_config(root)
    page_path, page = read_page(root)
    packages = {'macos': root / 'output/macos/知象-macOS.zip', 'windows': root / 'output/windows/知象-Windows-免安装.zip'}
    verify_native_packages(config, page, packages)
    manifest = manifest_for(config, page_path, packages)
    payload = expected_payload(config, manifest, page_path, packages)
    parent = root / 'output/releases'
    directory = parent / ('v' + config['version'])
    if directory.is_symlink():
        raise ValueError('发布版本目录不允许符号链接。')
    if directory.exists() or verify_only:
        verify_release(directory, payload)
    else:
        parent.mkdir(parents=True, exist_ok=True)
        temporary = Path(tempfile.mkdtemp(prefix='.preparing-', dir=parent))
        try:
            write_payload(temporary, payload)
            verify_release(temporary, payload)
            # rename into an absent version directory; never replace an existing release.
            if directory.exists():
                raise ValueError('版本目录在准备期间已出现，请重新执行校验。')
            temporary.rename(directory)
        finally:
            if temporary.exists():
                shutil.rmtree(temporary)
    site = site_files(root)
    if verify_only:
        verify_dist(root / 'dist', config, payload, site)
    else:
        stage_dist(root, config, payload, site)
    return directory


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true', help='verify prepared assets and dist without changing files')
    parser.add_argument('--site-only', action='store_true', help='update only the website home page and admin; keep the published desktop release')
    args = parser.parse_args()
    try:
        directory = (prepare_site if args.site_only else prepare)(verify_only=args.verify_only)
    except (OSError, ValueError, KeyError, TypeError, BadZipFile) as error:
        print(f'发布准备未完成：{error}', file=sys.stderr)
        return 1
    print(('已校验：' if args.verify_only else '已准备（尚未发布）：') + str(directory))
    print('发布目录：' + str(ROOT / 'dist'))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
