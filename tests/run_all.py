#!/usr/bin/env python3
"""Build, serve on an owned loopback port, run regressions, always close the server."""
import argparse
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import threading

ROOT = Path(__file__).resolve().parent.parent
CORE = ['check_models.cjs', 'check_resistance_math.cjs', 'check_resistance_browser.cjs']
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--extended', action='store_true', help='also run every additional check_*.cjs regression')
    args = parser.parse_args()
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    out = ROOT / 'output' / 'playwright' / ('run-' + stamp)
    out.mkdir(parents=True)
    summary = {'date': stamp, 'total': 0, 'passed': 0, 'failed': 0, 'groups': [], 'infrastructureErrors': []}
    server = None
    def run(command, label, env=None):
        try:
            result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, timeout=600)
            log = result.stdout + result.stderr
            (out / (label + '.log')).write_text(log, encoding='utf-8')
            return result.returncode, log
        except (OSError, subprocess.TimeoutExpired) as exc:
            return 2, str(exc)
    try:
        code, log = run([os.sys.executable, 'build.py'], 'build')
        print(log.strip())
        if code: raise RuntimeError('构建失败，详见 build.log')
        node = shutil.which('node')
        if not node: raise RuntimeError('未找到 Node.js。请安装 Node.js 22 或更新的 LTS 版本用于测试。')
        env = {**os.environ, 'TEST_OUTPUT_DIR': str(out)}
        code, log = run([node, 'tests/runtime.cjs'], 'preflight', env)
        if code: raise RuntimeError(log.strip())
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        env['TEST_BASE_URL'] = 'http://127.0.0.1:' + str(server.server_port)
        summary['serverURL'] = env['TEST_BASE_URL']
        checks = CORE + (sorted(p.name for p in (ROOT / 'tests').glob('check_*.cjs') if p.name not in CORE) if args.extended else [])
        for filename in checks:
            code, log = run([node, 'tests/' + filename], filename[:-4], env)
            passed = len(re.findall(r'^PASS\s', log, re.M))
            failed = len(re.findall(r'^FAIL\s', log, re.M))
            # A crash must never be reported as an entirely passing group.
            if code and not failed: failed = 1
            group = {'name': filename, 'total': passed + failed, 'passed': passed, 'failed': failed, 'exitCode': code}
            summary['groups'].append(group)
            for key in ('total', 'passed', 'failed'): summary[key] += group[key]
            print(f"{filename}: {passed}/{passed + failed} 通过", flush=True)
            if code: print(log[-3500:], flush=True)
    except (RuntimeError, OSError) as exc:
        summary['infrastructureErrors'].append(str(exc))
        print(str(exc), flush=True)
    finally:
        if server:
            server.shutdown()
            server.server_close()
        summary['serverClosed'] = True
        (out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"总数 {summary['total']} / 通过 {summary['passed']} / 失败 {summary['failed']} / 环境错误 {len(summary['infrastructureErrors'])}")
        print('结果：' + str(out / 'summary.json'))
    return 1 if summary['failed'] or summary['infrastructureErrors'] else 0
if __name__ == '__main__':
    raise SystemExit(main())
