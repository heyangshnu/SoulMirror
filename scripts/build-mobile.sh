#!/bin/bash
# 在服务器或本地触发 EAS 云端打包（推荐方式）
# iOS 必须在 Expo 云端编译（Linux 服务器无法本地编 iOS）
set -e

cd "$(dirname "$0")/../apps/mobile"

PROFILE="${1:-preview}"   # preview=Android APK 内测 | production=正式包
PLATFORM="${2:-android}"  # android | ios | all

echo "==> 使用 profile: $PROFILE, platform: $PLATFORM"
echo "==> 请确认 eas.json 里 EXPO_PUBLIC_API_URL 已改为你的正式域名"
echo ""

eas build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive

echo ""
echo "✅ 构建已提交到 Expo 云端"
echo "查看进度：eas build:list"
echo "或打开 https://expo.dev 下载安装包"
