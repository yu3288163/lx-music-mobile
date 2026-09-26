#!/usr/bin/env bash
# 编译 lx-music-mobile debug 包（自带 debug.keystore 签名，无需 keystore.properties）
# 用法（Git Bash）：  bash build_debug.sh
set -e
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"
export GRADLE_USER_HOME="F:/Android/.gradle"
cd "$(dirname "$0")/android"
echo ">>> 开始 assembleDebug（首次会下载 Gradle 包装器，请耐心） <<<"
./gradlew assembleDebug
echo ">>> 完成 <<<"
echo "APK 位置: android/app/build/outputs/apk/debug/app-debug.apk"
