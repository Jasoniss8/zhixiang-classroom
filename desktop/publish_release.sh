#!/usr/bin/env bash
# Publishes prepared artifacts only. It does not commit or push source code.
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
python_command="${PYTHON:-python3}"
deploy_only=false
if [ "${1:-}" = "--deploy-only" ] && [ "$#" -eq 1 ]; then
  deploy_only=true
elif [ "${1:-}" = "--site-only" ] && [ "$#" -eq 1 ]; then
  # Website-only: new home page, admin and Functions. The desktop manifest and
  # versioned pages stay byte-identical to the live release; GitHub is not touched.
  for command_name in "$python_command" npx curl; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      printf '缺少发布工具：%s\n' "$command_name" >&2
      exit 2
    fi
  done
  "$python_command" desktop/prepare_release.py --site-only
  manifest_url="$("$python_command" -c 'import json; print(json.load(open("desktop/release.json"))["manifestURL"])')"
  live_manifest="$(mktemp)"
  trap 'rm -f "$live_manifest"' EXIT
  if ! curl -fsS --max-time 20 "$manifest_url" -o "$live_manifest"; then
    printf '%s\n' '无法读取线上更新清单，未部署网站。' >&2
    exit 1
  fi
  if ! cmp -s "$live_manifest" dist/desktop/latest.json; then
    printf '%s\n' '线上更新清单与本地发布文件不一致，未部署网站；请先核对当前桌面版本。' >&2
    exit 1
  fi
  npx --yes wrangler@4.143.0 pages deploy "$project_root/dist" \
    --project-name zhixiang-classroom --branch main --commit-dirty=true
  printf '%s\n' '已更新网站；后台：https://zhixiang-classroom.pages.dev/admin/'
  exit 0
elif [ "$#" -ne 0 ]; then
  printf '%s\n' '用法：bash desktop/publish_release.sh [--deploy-only | --site-only]' >&2
  exit 2
fi
for command_name in "$python_command" gh npx; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '缺少发布工具：%s\n' "$command_name" >&2
    exit 2
  fi
done
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  printf '%s\n' 'GitHub 尚未登录。请先运行 gh auth login，再重新发布。' >&2
  exit 2
fi
"$python_command" desktop/prepare_release.py --verify-only
repository="$("$python_command" -c 'import json; print(json.load(open("desktop/release.json"))["repository"])')"
version="$("$python_command" -c 'import json; print(json.load(open("desktop/release.json"))["version"])')"
mac_filename="$("$python_command" -c 'import json; print(json.load(open("desktop/release.json"))["downloads"]["macos"]["filename"])')"
windows_filename="$("$python_command" -c 'import json; print(json.load(open("desktop/release.json"))["downloads"]["windows"]["filename"])')"
release_tag="v$version"
release_directory="$project_root/output/releases/$release_tag"
private_repo="$(gh repo view "$repository" --json isPrivate --jq '.isPrivate')"
if [ "$private_repo" != 'false' ]; then
  printf '%s\n' '下载需要公开仓库；当前仓库不是公开仓库，停止发布。' >&2
  exit 1
fi
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/zhixiang-release.XXXXXX")"
trap 'rm -rf "$temporary_directory"' EXIT
if [ "$deploy_only" = false ]; then
  if gh release view "$release_tag" --repo "$repository" >/dev/null 2>&1; then
    printf 'GitHub 已存在 %s，禁止覆盖。若仅需重试网站部署，请用 --deploy-only；有内容变更则提升版本。\n' "$release_tag" >&2
    exit 1
  fi
  "$python_command" - "$temporary_directory/notes.md" <<'PY'
import json
from pathlib import Path
import sys
config = json.loads(Path('desktop/release.json').read_text(encoding='utf-8'))
text = '\n'.join('- ' + note for note in config['notes'])
text += '\n\n下载后解压整个压缩包。两种桌面包均内置离线页面；SHA256SUMS.txt 提供文件校验值。\n'
Path(sys.argv[1]).write_text(text, encoding='utf-8')
PY
  # Draft first: a partial upload must not expose an incomplete release.
  gh release create "$release_tag" \
    "$release_directory/$mac_filename" \
    "$release_directory/$windows_filename" \
    "$release_directory/SHA256SUMS.txt" \
    "$release_directory/latest.json" \
    --repo "$repository" --draft \
    --title "知象 $release_tag" --notes-file "$temporary_directory/notes.md"
  gh release edit "$release_tag" --repo "$repository" --draft=false --latest
fi
# --deploy-only never modifies an existing release. Both paths verify that its
# public download assets match the prepared files before publishing the manifest.
gh api "repos/$repository/releases/tags/$release_tag" > "$temporary_directory/release.json"
"$python_command" - "$temporary_directory/release.json" "$release_directory" <<'PY'
import hashlib
import json
from pathlib import Path
import sys
remote = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
directory = Path(sys.argv[2])
manifest = json.loads((directory / 'latest.json').read_text(encoding='utf-8'))
if remote.get('draft') or remote.get('prerelease') or remote.get('tag_name') != 'v' + manifest['version']:
    raise SystemExit('GitHub Release 尚未公开或版本不符，未发布网站。')
assets = {item['name']: item for item in remote.get('assets', [])}
for info in manifest['downloads'].values():
    item = assets.get(info['filename'], {})
    if item.get('state') != 'uploaded' or item.get('size') != info['bytes'] or item.get('browser_download_url') != info['url']:
        raise SystemExit('GitHub 下载包缺失、上传未完成或链接/大小不符，未发布网站。')
    if item.get('digest') != 'sha256:' + info['sha256']:
        raise SystemExit('GitHub 下载包 SHA-256 缺失或不符，未发布网站；请核对 Release 资产。')
for name in ('SHA256SUMS.txt', 'latest.json'):
    data = (directory / name).read_bytes()
    item = assets.get(name, {})
    if item.get('state') != 'uploaded' or item.get('size') != len(data) or item.get('digest') != 'sha256:' + hashlib.sha256(data).hexdigest():
        raise SystemExit('GitHub 发布清单或校验文件不符，未发布网站。')
print('GitHub 两种下载包、发布清单与校验文件已公开且匹配。')
PY
# Only now can the public update manifest point at those download URLs.
npx --yes wrangler@4.143.0 pages deploy "$project_root/dist" \
  --project-name zhixiang-classroom --branch main --commit-dirty=true
printf '已发布 %s；下载页：https://zhixiang-classroom.pages.dev/#downloads\n' "$release_tag"
