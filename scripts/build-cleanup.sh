#!/bin/bash
# 生產構建清理腳本
# 1. 將 dist/src 目錄結構平坦化
# 2. 移除所有 *.map 和 *.ts 文件
# 3. 移除開發相關的設置檔案

set -e

DIST_DIR="dist"

echo "🧹 清理編譯產物..."

# 保留原始目錄結構（dist/src, dist/config）
# 這樣可以正確保持相對導入路徑

# 保留 config 目錄（生產環境需要）
# config 目錄包含應用配置，不應刪除

# 移除任何剩餘的 TS 源文件、sourcemap 和測試文件
echo "  清除開發文件..."
find "$DIST_DIR" -type f \( -name "*.ts" -o -name "*.map" -o -name "*.test.js" -o -name "*.spec.js" \) -delete

# 清理源代碼目錄中的編譯產物遺留物（防止意外提交）
echo "  清理源代碼遺留產物..."
find config src database -type f \( -name "*.js" -o -name "*.d.ts" -o -name "*.d.ts.map" -o -name "*.js.map" \) ! -name "*.ts" -delete 2>/dev/null || true

# 修復 ESM 導入：添加 .js 擴展和修正路徑別名
echo "  修復 ESM 導入..."
cat > /tmp/fix-esm.js << 'EOF'
const fs = require('fs');
const path = require('path');

function fixESMImports(filePath, distRoot) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 計算文件相對於 dist 的路徑
  const relPath = path.relative(distRoot, filePath);
  const fileDir = path.dirname(relPath);

  // 1. 修正路徑別名：@/* -> 相對路徑
  // @/ 在源代碼中指向 src/
  // 編譯後都在 dist/ 中，所以：
  // - src/file.ts 中的 @/Shared -> dist/src/Shared
  // - src/a/b.ts 中的 @/Shared -> dist/src/Shared
  // 相對路徑取決於文件的深度
  content = content.replace(
    /from\s+['"]@\/([^'"]+)['"]/g,
    (match, importPath) => {
      // 文件在 src 中，@/ 指向 src 內的目標
      // 計算需要上升多少級才能到 src 根，然後進入目標
      const parts = fileDir.split(path.sep).filter(p => p && p !== 'src');
      const upLevels = parts.length; // 上升到 src 根
      const upPath = upLevels > 0 ? '../'.repeat(upLevels) : './';
      return `from '${upPath}${importPath}.js'`;
    }
  );

  // 2. 修正本地導入：添加 .js
  content = content.replace(
    /from\s+['"](\.[^'"]*)['"]/g,
    (match, importPath) => {
      if (importPath.endsWith('.js') || /\.[a-z]+$/i.test(importPath)) {
        return match;
      }
      return `from '${importPath}.js'`;
    }
  );

  // 3. 移除重複的 .js
  content = content.replace(/\.js\.js/g, '.js');

  fs.writeFileSync(filePath, content, 'utf-8');
}

// 遞歸處理所有 .js 文件
const walkDir = (dir, distRoot) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, distRoot);
    } else if (file.endsWith('.js')) {
      fixESMImports(filePath, distRoot);
    }
  });
};

const distDir = process.argv[2] || 'dist';
walkDir(distDir, distDir);
EOF

node /tmp/fix-esm.js "$DIST_DIR"
rm /tmp/fix-esm.js

# 驗證
echo ""
echo "📊 生產構建結構："
du -sh "$DIST_DIR" 2>/dev/null || echo "  (無法計算大小)"
echo ""
echo "✅ 生產構建完成"
