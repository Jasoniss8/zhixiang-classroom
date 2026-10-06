#!/usr/bin/env python3
"""Create ADMIN_PASSWORD_HASH and a SESSION_SECRET for the analytics admin.

The password is read without echo and never written to disk. Paste the output
into Cloudflare Pages > Settings > Variables and Secrets (type: Secret).
"""
import base64
import getpass
import hashlib
import secrets
import sys

ITERATIONS = 100_000


def make_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, 32)
    return 'pbkdf2_sha256${}${}${}'.format(
        ITERATIONS, base64.b64encode(salt).decode('ascii'), base64.b64encode(digest).decode('ascii'))


def main() -> int:
    if sys.stdin.isatty():
        first = getpass.getpass('后台密码：')
        second = getpass.getpass('再输入一次：')
    else:
        lines = sys.stdin.read().split('\n')
        first, second = lines[0], (lines[1] if len(lines) > 1 else '')
    if not first or first != second:
        print('两次输入不一致或为空，未生成。', file=sys.stderr)
        return 1
    if len(first) < 12:
        print('提示：密码少于 12 个字符，容易被猜中。', file=sys.stderr)
    print('ADMIN_PASSWORD_HASH=' + make_hash(first))
    print('SESSION_SECRET=' + secrets.token_urlsafe(48))
    return 0


if __name__ == '__main__':
    sys.exit(main())
