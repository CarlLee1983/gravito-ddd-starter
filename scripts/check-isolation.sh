#!/bin/bash
# 生產隔離檢查腳本
# 驗證編譯與開發環境完全隔離

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🔍 gravito-ddd 隔離檢查                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

FAILED=0

# 檢查函數
check() {
  local name=$1
  local condition=$2
  local success_msg=$3
  local fail_msg=$4

  if [ "$condition" = "true" ]; then
    echo "  ✅ $name : $success_msg"
  else
    echo "  ❌ $name : $fail_msg"
    FAILED=$((FAILED + 1))
  fi
}

echo "📂 源代碼目錄隔離"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 檢查 config 目錄
CONFIG_JS=$(find config -name "*.js" 2>/dev/null | wc -l)
CONFIG_TS=$(find config -name "*.ts" 2>/dev/null | wc -l)
check "config/ 編譯產物" "$([ $CONFIG_JS -eq 0 ] && echo true || echo false)" \
  "0 個 .js 文件" "$CONFIG_JS 個 .js 文件"
check "config/ 源代碼" "$([ $CONFIG_TS -gt 0 ] && echo true || echo false)" \
  "$CONFIG_TS 個 .ts 文件" "找不到源代碼"

# 檢查 src 目錄
SRC_JS=$(find src -name "*.js" 2>/dev/null | wc -l)
SRC_TS=$(find src -name "*.ts" 2>/dev/null | wc -l)
check "src/ 編譯產物" "$([ $SRC_JS -eq 0 ] && echo true || echo false)" \
  "0 個 .js 文件" "$SRC_JS 個 .js 文件"
check "src/ 源代碼" "$([ $SRC_TS -gt 0 ] && echo true || echo false)" \
  "$SRC_TS 個 .ts 文件" "找不到源代碼"

echo ""
echo "📊 編譯產物隔離"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DIST_TS=$(find dist -name "*.ts" 2>/dev/null | wc -l)
DIST_DTS=$(find dist -name "*.d.ts" 2>/dev/null | wc -l)
DIST_MAP=$(find dist -name "*.map" 2>/dev/null | wc -l)
DIST_JS=$(find dist -name "*.js" 2>/dev/null | wc -l)

check "dist/ 無源代碼" "$([ $DIST_TS -eq 0 ] && echo true || echo false)" \
  "0 個 .ts 文件" "$DIST_TS 個 .ts 文件"
check "dist/ 無宣告" "$([ $DIST_DTS -eq 0 ] && echo true || echo false)" \
  "0 個 .d.ts 文件" "$DIST_DTS 個 .d.ts 文件"
check "dist/ 無源地圖" "$([ $DIST_MAP -eq 0 ] && echo true || echo false)" \
  "0 個 .map 文件" "$DIST_MAP 個 .map 文件"
check "dist/ 有編譯產物" "$([ $DIST_JS -gt 0 ] && echo true || echo false)" \
  "$DIST_JS 個 .js 文件" "編譯產物缺失"

echo ""
echo "🔐 Git 隔離"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

UNTRACKED=$(git status --porcelain 2>/dev/null | grep '^??' | wc -l)
MODIFIED=$(git status --porcelain 2>/dev/null | grep -v '^??' | wc -l)

check "未追蹤文件" "$([ $UNTRACKED -eq 0 ] && echo true || echo false)" \
  "0 個" "$UNTRACKED 個"
check "修改中文件" "$([ $MODIFIED -eq 0 ] && echo true || echo false)" \
  "0 個" "$MODIFIED 個"

echo ""
echo "📋 .gitignore 覆蓋"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GITIGNORE_CONFIG_JS=$(grep -c "config/\*\*/\*.js" .gitignore 2>/dev/null)
GITIGNORE_SRC_JS=$(grep -c "src/\*\*/\*.js" .gitignore 2>/dev/null)
GITIGNORE_DIST=$(grep -c "^dist$" .gitignore 2>/dev/null)

check ".gitignore config/**/*.js" "$([ $GITIGNORE_CONFIG_JS -gt 0 ] && echo true || echo false)" \
  "已覆蓋" "未覆蓋"
check ".gitignore src/**/*.js" "$([ $GITIGNORE_SRC_JS -gt 0 ] && echo true || echo false)" \
  "已覆蓋" "未覆蓋"
check ".gitignore dist/" "$([ $GITIGNORE_DIST -gt 0 ] && echo true || echo false)" \
  "已覆蓋" "未覆蓋"

echo ""
echo "🏗️  構建配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "tsconfig.json 存在" "$([ -f tsconfig.json ] && echo true || echo false)" \
  "✅" "缺失"
check "tsconfig.prod.json 存在" "$([ -f tsconfig.prod.json ] && echo true || echo false)" \
  "✅" "缺失"
check "build-cleanup.sh 存在" "$([ -f scripts/build-cleanup.sh ] && echo true || echo false)" \
  "✅" "缺失"
check "Dockerfile.prod 存在" "$([ -f docker/Dockerfile.prod ] && echo true || echo false)" \
  "✅" "缺失"

echo ""
echo "🔒 安全檢查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_EXISTS=$([ -f .env ] && echo "存在" || echo "不存在")
LOGS_COUNT=$(find . -maxdepth 1 -name "*.log" 2>/dev/null | wc -l)

check ".env 文件" "$([ ! -f .env ] && echo true || echo false)" \
  "未提交" "$ENV_EXISTS"
check "日誌檔案" "$([ $LOGS_COUNT -eq 0 ] && echo true || echo false)" \
  "0 個" "$LOGS_COUNT 個"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo "✅ 隔離檢查通過 (0 個問題)"
  echo ""
  echo "📊 隔離達成度: 100% ✅"
  exit 0
else
  echo "❌ 隔離檢查失敗 ($FAILED 個問題)"
  exit 1
fi
