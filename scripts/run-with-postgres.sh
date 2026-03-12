#!/bin/bash

# 使用 PostgreSQL 運行應用的快速腳本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.postgres"

# 顏色輸出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 檢查 .env.postgres 是否存在
if [ ! -f "$ENV_FILE" ]; then
    print_info "創建 .env.postgres..."
    touch "$ENV_FILE"
fi

print_info "環境配置已就緒"
echo ""

# 應用環境變數
print_info "加載 PostgreSQL 環境配置..."
set -a
source "$ENV_FILE"
set +e

# 驗證 PostgreSQL 連接
print_info "驗證 PostgreSQL 連接..."
if ! docker-compose ps | grep -q "postgres.*healthy"; then
    print_info "PostgreSQL 容器不健康，正在重啟..."
    cd "$PROJECT_DIR"
    ./scripts/docker-pg.sh restart
    sleep 5
fi

# 驗證數據庫連接
cd "$PROJECT_DIR"
if ! docker-compose exec -T postgres psql -U postgres -d gravito_ddd -c "SELECT 1" &> /dev/null; then
    echo "❌ PostgreSQL 連接失敗"
    exit 1
fi

print_success "PostgreSQL 連接成功"
echo ""

print_info "連接信息:"
echo "  Host: ${DB_HOST:-localhost}"
echo "  Port: ${DB_PORT:-5432}"
echo "  Database: ${DB_DATABASE:-gravito_ddd}"
echo "  User: ${DB_USER:-postgres}"
echo ""

# 選擇運行命令
case "${1:-dev}" in
    dev)
        print_info "啟動開發伺服器..."
        echo ""
        exec bun dev
        ;;
    test)
        print_info "運行測試套件..."
        echo ""
        exec bun test
        ;;
    shell)
        print_info "進入 PostgreSQL 命令行..."
        echo ""
        exec docker-compose exec postgres psql -U postgres -d gravito_ddd
        ;;
    *)
        echo "使用方式: $0 [command]"
        echo ""
        echo "命令列表:"
        echo "  dev    - 啟動開發伺服器（預設）"
        echo "  test   - 運行測試套件"
        echo "  shell  - 進入 PostgreSQL 命令行"
        echo ""
        echo "範例："
        echo "  $0          # 啟動開發伺服器"
        echo "  $0 test     # 運行測試"
        echo "  $0 shell    # 進入 PostgreSQL"
        ;;
esac
