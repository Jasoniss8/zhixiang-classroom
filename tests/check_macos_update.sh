#!/bin/bash
set -euo pipefail
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'SKIP macOS native update checks require macOS and Xcode command line tools.'
  exit 0
fi
project_root="$(cd "$(dirname "$0")/.." && pwd)"
result_dir="${TEST_OUTPUT_DIR:-$project_root/output/playwright/macos-update-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$result_dir/module-cache"
export CLANG_MODULE_CACHE_PATH="$result_dir/module-cache"
export SWIFT_MODULE_CACHE_PATH="$result_dir/module-cache"
xcrun swiftc -parse-as-library -framework CryptoKit \
  "$project_root/macos/DesktopUpdater.swift" "$project_root/tests/check_macos_update.swift" \
  -o "$result_dir/check-update"
"$result_dir/check-update" | tee "$result_dir/update-checks.txt"
xcrun swiftc -parse-as-library -framework AppKit -framework WebKit \
  "$project_root/tests/check_macos_update_storage.swift" -o "$result_dir/check-storage"
"$result_dir/check-storage" | tee "$result_dir/storage-checks.txt"
