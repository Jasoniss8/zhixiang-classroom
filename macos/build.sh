#!/bin/bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
output_root="${1:-$project_root/output/macos}"
app_path="$output_root/知象.app"
contents_path="$app_path/Contents"
resources_path="$contents_path/Resources"
binary_path="$contents_path/MacOS"
iconset_path="$output_root/Zhixiang.iconset"

mkdir -p "$resources_path" "$binary_path" "$iconset_path"
python3 "$project_root/build.py" --output "$resources_path/standalone.html"

cat > "$contents_path/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>zh_CN</string>
  <key>CFBundleDisplayName</key><string>知象</string>
  <key>CFBundleExecutable</key><string>Zhixiang</string>
  <key>CFBundleIconFile</key><string>Zhixiang.icns</string>
  <key>CFBundleIdentifier</key><string>cn.zhixiang.classroom</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>知象</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

mkdir -p "$output_root/.module-cache"
CLANG_MODULE_CACHE_PATH="$output_root/.module-cache" \
SWIFT_MODULE_CACHE_PATH="$output_root/.module-cache" \
xcrun swiftc -O -target arm64-apple-macos13.0 \
  -framework AppKit -framework WebKit \
  "$project_root/macos/ZhixiangApp.swift" -o "$binary_path/Zhixiang"

sips --cropToHeightWidth 1024 1024 "$project_root/assets/zhixiang-logo.png" \
  --out "$iconset_path/icon_512x512@2x.png" >/dev/null
for size in 16 32 64 128 256 512; do
  sips --resampleHeightWidth "$size" "$size" \
    "$iconset_path/icon_512x512@2x.png" \
    --out "$output_root/icon-$size.png" >/dev/null
done
cp "$output_root/icon-16.png" "$iconset_path/icon_16x16.png"
cp "$output_root/icon-32.png" "$iconset_path/icon_16x16@2x.png"
cp "$output_root/icon-32.png" "$iconset_path/icon_32x32.png"
cp "$output_root/icon-64.png" "$iconset_path/icon_32x32@2x.png"
cp "$output_root/icon-128.png" "$iconset_path/icon_128x128.png"
cp "$output_root/icon-256.png" "$iconset_path/icon_128x128@2x.png"
cp "$output_root/icon-256.png" "$iconset_path/icon_256x256.png"
cp "$output_root/icon-512.png" "$iconset_path/icon_256x256@2x.png"
cp "$output_root/icon-512.png" "$iconset_path/icon_512x512.png"
python3 - "$iconset_path" "$resources_path/Zhixiang.icns" <<'PY'
from pathlib import Path
import struct
import sys

iconset = Path(sys.argv[1])
destination = Path(sys.argv[2])
sizes = (
    ('icp4', 'icon_16x16.png'),
    ('icp5', 'icon_32x32.png'),
    ('icp6', 'icon_32x32@2x.png'),
    ('ic07', 'icon_128x128.png'),
    ('ic08', 'icon_256x256.png'),
    ('ic09', 'icon_512x512.png'),
    ('ic10', 'icon_512x512@2x.png'),
)
chunks = []
for kind, filename in sizes:
    image = (iconset / filename).read_bytes()
    chunks.append(kind.encode('ascii') + struct.pack('>I', len(image) + 8) + image)
payload = b''.join(chunks)
destination.write_bytes(b'icns' + struct.pack('>I', len(payload) + 8) + payload)
PY

codesign --force --sign - "$app_path" >/dev/null
ditto -c -k --sequesterRsrc --keepParent "$app_path" "$output_root/知象-macOS.zip"
printf '应用：%s\n压缩包：%s\n' "$app_path" "$output_root/知象-macOS.zip"
