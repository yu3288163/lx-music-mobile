#!/usr/bin/env bash
# 编译 lx-music-mobile release 包（签名信息从 android/local.properties 读取）
# 用法（Git Bash）：  bash build_release.sh
set -e
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"
export GRADLE_USER_HOME="F:/Android/.gradle"
# 用本地下载的 Gradle 直接编译，绕过 gradlew wrapper 下载（wrapper 下载受代理证书拦截）
GRADLE_BIN="F:/Android/gradle/gradle-8.8/bin/gradle"
if [ ! -f "$GRADLE_BIN" ]; then
  echo "ERROR: 本地 Gradle 未找到 ($GRADLE_BIN)，请先下载解压 gradle-8.8-all.zip 到 F:/Android/gradle/"
  exit 1
fi
cd "$(dirname "$0")/android"
echo ">>> 开始 assembleRelease（本地 Gradle，签名从 local.properties 读取）<<<"
"$GRADLE_BIN" assembleRelease
echo ">>> 完成 <<<"
echo "APK 位置: android/app/build/outputs/apk/release/app-release.apk"
