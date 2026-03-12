#!/bin/bash

# PostgreSQL Docker 管理腳本
# 使用方式: ./scripts/docker-pg.sh [start|stop|restart|logs|status|shell]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
CONTAINER_NAME="gravito-postgres"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印樣式函數
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 檢查 Docker 是否安裝
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安裝"
        echo "請從 https://www.docker.com/products/docker-desktop 安裝 Docker"
        exit 1
    fi
    print_success "Docker 已安裝"
}

# 檢查 Docker Compose 是否安裝
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安裝"
        echo "請執行: docker run docker/compose:latest --version"
        exit 1
    fi
    print_success "Docker Compose 已安裝"
}

# 啟動服務
start_service() {
    print_info "啟動 PostgreSQL 服務..."
    cd "$PROJECT_DIR"
    docker-compose up -d

    print_info "等待服務就緒..."
    sleep 3

    # 檢查健康狀態
    if docker-compose ps | grep -q "healthy"; then
        print_success "PostgreSQL 服務已啟動並就緒"
        print_info "連接信息："
        echo "  Host: localhost"
        echo "  Port: 5432"
        echo "  Database: gravito_ddd"
        echo "  User: postgres"
        echo "  Password: postgres"
    else
        print_warning "服務已啟動，但健康檢查未完成"
        echo "請稍候或執行: ./scripts/docker-pg.sh logs"
    fi
}

# 停止服務
stop_service() {
    print_info "停止 PostgreSQL 服務..."
    cd "$PROJECT_DIR"
    docker-compose down
    print_success "PostgreSQL 服務已停止"
}

# 重啟服務
restart_service() {
    print_info "重啟 PostgreSQL 服務..."
    stop_service
    start_service
}

# 查看日誌
show_logs() {
    print_info "PostgreSQL 日誌："
    cd "$PROJECT_DIR"
    docker-compose logs -f postgres
}

# 查看狀態
show_status() {
    print_info "服務狀態："
    cd "$PROJECT_DIR"
    docker-compose ps

    # 嘗試連接檢查
    if command -v psql &> /dev/null; then
        print_info "嘗試連接 PostgreSQL..."
        if psql -h localhost -U postgres -d gravito_ddd -c "SELECT 1" &> /dev/null; then
            print_success "PostgreSQL 連接成功 ✓"
        else
            print_warning "PostgreSQL 連接失敗"
        fi
    fi
}

# 進入 PostgreSQL 命令行
enter_shell() {
    print_info "進入 PostgreSQL 命令行..."
    cd "$PROJECT_DIR"
    docker-compose exec postgres psql -U postgres -d gravito_ddd
}

# 主程序
main() {
    check_docker
    check_docker_compose

    case "${1:-help}" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        shell)
            enter_shell
            ;;
        help|*)
            echo "PostgreSQL Docker 管理工具"
            echo ""
            echo "使用方式: $0 [command]"
            echo ""
            echo "命令列表："
            echo "  start      - 啟動 PostgreSQL 服務"
            echo "  stop       - 停止 PostgreSQL 服務"
            echo "  restart    - 重啟 PostgreSQL 服務"
            echo "  logs       - 查看服務日誌（即時）"
            echo "  status     - 查看服務狀態"
            echo "  shell      - 進入 PostgreSQL 命令行"
            echo "  help       - 顯示此幫助信息"
            echo ""
            echo "範例："
            echo "  $0 start       # 啟動服務"
            echo "  $0 stop        # 停止服務"
            echo "  $0 shell       # 進入 PostgreSQL"
            ;;
    esac
}

main "$@"
