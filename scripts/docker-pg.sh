#!/bin/bash

# PostgreSQL + Redis Docker 管理腳本
# 使用方式: ./scripts/docker-pg.sh [start|stop|restart|logs|status|shell|redis]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
PG_CONTAINER="gravito-postgres"
REDIS_CONTAINER="gravito-redis"

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
    print_info "啟動 PostgreSQL 和 Redis 服務..."
    cd "$PROJECT_DIR"
    docker-compose up -d

    print_info "等待服務就緒..."
    sleep 5

    # 檢查 PostgreSQL 健康狀態
    if docker-compose ps postgres 2>/dev/null | grep -q "(healthy)"; then
        print_success "PostgreSQL 已就緒"
    else
        print_warning "PostgreSQL 正在初始化..."
    fi

    # 檢查 Redis 健康狀態
    if docker-compose ps redis 2>/dev/null | grep -q "(healthy)"; then
        print_success "Redis 已就緒"
    else
        print_warning "Redis 正在初始化..."
    fi

    print_success "PostgreSQL 和 Redis 服務已啟動"
    print_info "PostgreSQL 連接信息："
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: gravito_ddd"
    echo "  User: postgres"
    echo "  Password: postgres"
    echo ""
    print_info "Redis 連接信息："
    echo "  Host: localhost"
    echo "  Port: 6379"
    echo "  Database: 0"
}

# 停止服務
stop_service() {
    print_info "停止 PostgreSQL 和 Redis 服務..."
    cd "$PROJECT_DIR"
    docker-compose down
    print_success "PostgreSQL 和 Redis 服務已停止"
}

# 重啟服務
restart_service() {
    print_info "重啟 PostgreSQL 和 Redis 服務..."
    stop_service
    start_service
}

# 查看日誌
show_logs() {
    local service="${1:-all}"
    cd "$PROJECT_DIR"

    case "$service" in
        postgres)
            print_info "PostgreSQL 日誌："
            docker-compose logs -f postgres
            ;;
        redis)
            print_info "Redis 日誌："
            docker-compose logs -f redis
            ;;
        *)
            print_info "PostgreSQL 和 Redis 日誌："
            docker-compose logs -f postgres redis
            ;;
    esac
}

# 查看狀態
show_status() {
    print_info "服務狀態："
    cd "$PROJECT_DIR"
    docker-compose ps
    echo ""

    # PostgreSQL 連接檢查
    if command -v psql &> /dev/null; then
        print_info "檢查 PostgreSQL 連接..."
        if psql -h localhost -U postgres -d gravito_ddd -c "SELECT 1" &> /dev/null; then
            print_success "PostgreSQL 連接成功 ✓"
        else
            print_warning "PostgreSQL 連接失敗"
        fi
    else
        print_info "psql 未安裝，跳過 PostgreSQL 連接檢查"
    fi

    # Redis 連接檢查
    if command -v redis-cli &> /dev/null; then
        print_info "檢查 Redis 連接..."
        if redis-cli -h localhost -p 6379 ping &> /dev/null; then
            print_success "Redis 連接成功 ✓"
        else
            print_warning "Redis 連接失敗"
        fi
    else
        print_info "redis-cli 未安裝，跳過 Redis 連接檢查"
    fi
}

# 進入 PostgreSQL 命令行
enter_pg_shell() {
    print_info "進入 PostgreSQL 命令行..."
    cd "$PROJECT_DIR"
    docker-compose exec postgres psql -U postgres -d gravito_ddd
}

# 進入 Redis 命令行
enter_redis_shell() {
    print_info "進入 Redis 命令行..."
    cd "$PROJECT_DIR"
    docker-compose exec redis redis-cli
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
            show_logs "$2"
            ;;
        status)
            show_status
            ;;
        shell)
            enter_pg_shell
            ;;
        redis)
            enter_redis_shell
            ;;
        help|*)
            echo "PostgreSQL + Redis Docker 管理工具"
            echo ""
            echo "使用方式: $0 [command] [options]"
            echo ""
            echo "命令列表："
            echo "  start           - 啟動 PostgreSQL 和 Redis 服務"
            echo "  stop            - 停止 PostgreSQL 和 Redis 服務"
            echo "  restart         - 重啟 PostgreSQL 和 Redis 服務"
            echo "  logs [service]  - 查看服務日誌（postgres|redis|all，默認 all）"
            echo "  status          - 查看服務狀態和連接測試"
            echo "  shell           - 進入 PostgreSQL 命令行"
            echo "  redis           - 進入 Redis 命令行"
            echo "  help            - 顯示此幫助信息"
            echo ""
            echo "範例："
            echo "  $0 start                # 啟動服務"
            echo "  $0 stop                 # 停止服務"
            echo "  $0 logs                 # 查看所有日誌"
            echo "  $0 logs postgres        # 只看 PostgreSQL 日誌"
            echo "  $0 logs redis           # 只看 Redis 日誌"
            echo "  $0 status               # 檢查狀態"
            echo "  $0 shell                # 進入 PostgreSQL CLI"
            echo "  $0 redis                # 進入 Redis CLI"
            ;;
    esac
}

main "$@"
