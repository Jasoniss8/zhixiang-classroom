#!/usr/bin/env python3
"""Build a portable Windows x64 desktop app with its own Electron runtime."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
WINDOWS = ROOT / 'windows'
SOURCE = WINDOWS / 'desktop'
OUTPUT = ROOT / 'output' / 'windows'
STAGE = OUTPUT / '.desktop-stage'
PACKAGED = OUTPUT / '.packager-output'
APP_FOLDER = OUTPUT / '知象-Windows'
ARCHIVE = OUTPUT / '知象-Windows-免安装.zip'
PACKAGER = WINDOWS / 'node_modules' / '@electron' / 'packager' / 'bin' / 'electron-packager.mjs'


def main() -> None:
    if not PACKAGER.is_file():
        raise SystemExit('Build tool missing. Run: npm install --prefix windows')

    for path in (STAGE, PACKAGED):
        if path.exists():
            shutil.rmtree(path)
    STAGE.mkdir(parents=True)
    for filename in ('main.cjs', 'package.json', 'icon.png', 'icon.ico'):
        shutil.copy2(SOURCE / filename, STAGE / filename)

    subprocess.run(
        [sys.executable, str(ROOT / 'build.py'), '--output', str(STAGE / 'app.html')],
        check=True,
    )
    subprocess.run(
        [
            'node', str(PACKAGER), str(STAGE), 'Zhixiang',
            '--platform=win32', '--arch=x64', '--electron-version=44.5.0',
            f'--out={PACKAGED}', '--overwrite', '--asar',
            f'--icon={SOURCE / "icon.ico"}',
        ],
        check=True,
        cwd=ROOT,
    )

    builds = list(PACKAGED.glob('*-win32-x64'))
    if len(builds) != 1 or not (builds[0] / 'Zhixiang.exe').is_file():
        raise SystemExit('Windows executable not found after packaging')
    if APP_FOLDER.exists():
        shutil.rmtree(APP_FOLDER)
    shutil.move(str(builds[0]), str(APP_FOLDER))
    (APP_FOLDER / '使用说明.txt').write_text(
        '知象 · 教学模型（Windows 桌面版）\n\n'
        '1. 解压整个文件夹，不要只提取 exe 文件。\n'
        '2. 双击 Zhixiang.exe 打开知象独立窗口。\n'
        '3. 内置运行环境和全部模型，使用时无需浏览器、Python 或网络。\n'
        '4. 程序未购买 Windows 代码签名证书；系统可能显示来源提示。\n\n'
        '收藏与课堂配置保存在这台电脑上的知象应用中。更新程序或更换电脑前，'
        '建议在“我的课堂”导出备份。\n',
        encoding='utf-8',
    )

    temporary_archive = ARCHIVE.with_suffix('.zip.tmp')
    if temporary_archive.exists():
        temporary_archive.unlink()
    with ZipFile(temporary_archive, 'w', compression=ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in sorted(APP_FOLDER.rglob('*')):
            if path.is_file():
                bundle.write(path, str(path.relative_to(OUTPUT)))
    with ZipFile(temporary_archive) as bundle:
        if bundle.testzip():
            raise SystemExit('Windows ZIP integrity check failed')
        if not any(name.endswith('/Zhixiang.exe') for name in bundle.namelist()):
            raise SystemExit('Windows ZIP does not contain the executable')
    temporary_archive.replace(ARCHIVE)
    shutil.rmtree(STAGE)
    shutil.rmtree(PACKAGED)
    print(f'Built {APP_FOLDER / "Zhixiang.exe"}')
    print(f'Built {ARCHIVE} ({ARCHIVE.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
