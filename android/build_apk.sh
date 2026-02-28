#!/bin/bash
# ============================================================
# 智护银龄 — 桑梓智护项目 APK 构建脚本
# 1. Next.js 静态导出
# 2. 复制到 Android assets 目录
# 3. 构建 APK
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$SCRIPT_DIR"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets/web"

echo "=== 步骤1: Next.js 静态导出 ==="
cd "$APP_DIR"
npx next build

echo "=== 步骤2: 复制静态文件到 Android assets ==="
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"
cp -r "$APP_DIR/out/"* "$ASSETS_DIR/"

echo "=== 步骤3: 构建 APK ==="
cd "$ANDROID_DIR"
./gradlew assembleRelease

echo "=== 构建完成 ==="
echo "APK 位置: $ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
