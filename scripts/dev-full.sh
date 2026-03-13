#!/bin/bash

# 同時啟動前後端開發伺服器
# 後端: http://localhost:3000
# 前端: http://localhost:5173

set -e

echo "🚀 啟動 gravito-ddd 完整開發環境..."
echo ""
echo "後端伺服器: http://localhost:3000"
echo "前端伺服器: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止所有伺服器"
echo ""

# 清理函數：當腳本結束時，殺掉所有子進程
cleanup() {
  echo ""
  echo "🛑 停止開發伺服器..."
  kill $(jobs -p) 2>/dev/null || true
}

trap cleanup EXIT

# 並發運行前後端
bun run dev:server &
bun run dev:vite &

# 等待所有背景程序
wait
