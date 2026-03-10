#!/bin/bash

# Git Hooks 設置腳本
# 此腳本設置 pre-commit hooks 以自動檢查代碼風格和類型

set -e

HOOKS_DIR=".git/hooks"
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

echo "📦 Setting up Git hooks..."

# 建立 hooks 目錄
mkdir -p "$HOOKS_DIR"

# 1. Pre-commit Hook - 檢查 lint 和 format
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

echo "🔍 Running pre-commit checks..."

# 獲取要提交的檔案
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js)$' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "📝 Checking ${#STAGED_FILES[@]} files..."

# 1. Format 檢查
echo "  → Running format check..."
if ! bun run format:check $STAGED_FILES 2>&1 | head -20; then
  echo "  ❌ Format check failed!"
  echo "  💡 Run: bun run format"
  exit 1
fi

# 2. Lint 檢查
echo "  → Running lint check..."
if ! bun run lint $STAGED_FILES 2>&1 | head -20; then
  echo "  ❌ Lint check failed!"
  echo "  💡 Run: bun run lint:fix"
  exit 1
fi

# 3. Type 檢查 (TypeScript)
echo "  → Running type check..."
if ! bun run typecheck 2>&1 | head -20; then
  echo "  ❌ Type check failed!"
  echo "  💡 Check your TypeScript definitions"
  exit 1
fi

echo "✅ All checks passed!"
exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"

# 2. Prepare-commit-msg Hook - 自動添加分支名稱到提交訊息 (可選)
cat > "$HOOKS_DIR/prepare-commit-msg" << 'EOF'
#!/bin/bash

# 自動從分支名稱添加前綴到提交訊息
# 例如: feature/user-auth -> feat: [user-auth]

BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
COMMIT_FILE=$1

if [ -z "$BRANCH_NAME" ] || [ "$BRANCH_NAME" = "HEAD" ]; then
  exit 0
fi

# 提取分支類型和名稱
# feature/user-auth -> feat [user-auth]
# fix/login-bug -> fix [login-bug]
# refactor/cleanup -> refactor [cleanup]

BRANCH_TYPE=$(echo $BRANCH_NAME | cut -d'/' -f1)
BRANCH_FEATURE=$(echo $BRANCH_NAME | cut -d'/' -f2-)

# 映射分支類型到提交類型
case $BRANCH_TYPE in
  feature|feat)
    PREFIX="feat"
    ;;
  fix|bugfix)
    PREFIX="fix"
    ;;
  refactor|refactoring)
    PREFIX="refactor"
    ;;
  docs)
    PREFIX="docs"
    ;;
  test|tests)
    PREFIX="test"
    ;;
  chore)
    PREFIX="chore"
    ;;
  *)
    PREFIX=$BRANCH_TYPE
    ;;
esac

# 讀取提交訊息
COMMIT_MSG=$(cat "$COMMIT_FILE")

# 檢查是否已經有類型前綴
if [[ $COMMIT_MSG =~ ^[a-z]+(\(.*\))?:\ \[ ]]; then
  exit 0
fi

# 添加分支前綴到提交訊息
echo "$PREFIX: [$BRANCH_FEATURE] $COMMIT_MSG" > "$COMMIT_FILE"
EOF

chmod +x "$HOOKS_DIR/prepare-commit-msg"

# 3. Commit-msg Hook - 驗證提交訊息格式
cat > "$HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash

# 驗證提交訊息遵循約定提交格式
# 有效格式: type(scope): subject
# 例: feat: add user authentication
# 例: fix: correct login validation

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# 允許的類型
VALID_TYPES="^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert|3rd)"

if ! [[ $COMMIT_MSG =~ $VALID_TYPES ]]; then
  echo "❌ Invalid commit message format!"
  echo ""
  echo "Valid formats:"
  echo "  feat: add new feature"
  echo "  fix: fix a bug"
  echo "  docs: update documentation"
  echo "  style: code style changes"
  echo "  refactor: refactor code"
  echo "  perf: performance improvement"
  echo "  test: add/update tests"
  echo "  chore: build/config changes"
  echo "  ci: CI/CD changes"
  echo ""
  echo "Your message: $COMMIT_MSG"
  exit 1
fi

# 檢查訊息長度 (第一行應該簡短)
FIRST_LINE=$(echo "$COMMIT_MSG" | head -n 1)
if [ ${#FIRST_LINE} -gt 100 ]; then
  echo "❌ First line is too long (max 100 chars)"
  echo "Your message: $FIRST_LINE"
  exit 1
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/commit-msg"

echo ""
echo "✅ Git hooks installed successfully!"
echo ""
echo "🔗 Installed hooks:"
echo "   • pre-commit  - 檢查 format、lint、type"
echo "   • prepare-commit-msg - 自動添加分支前綴 (可選)"
echo "   • commit-msg - 驗證提交訊息格式"
echo ""
echo "💡 You can disable a hook temporarily with:"
echo "   HUSKY=0 git commit"
echo ""
echo "📚 To remove hooks:"
echo "   rm .git/hooks/pre-commit .git/hooks/commit-msg"
echo ""
