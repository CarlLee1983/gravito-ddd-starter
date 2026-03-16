#!/bin/bash

# ╔════════════════════════════════════════════════════════════════╗
# ║  Gravito DDD Starter - Troubleshooting & Diagnostics Script    ║
# ║  Helps identify and fix common setup issues                    ║
# ╚════════════════════════════════════════════════════════════════╝

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║        🔍 Gravito DDD Starter - Troubleshooting Guide         ║${RESET}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Track results
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ PASS${RESET}: $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${RESET}: $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${RESET}: $1"
    ((WARNINGS++))
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Runtime Environment
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}📋 1. Runtime Environment${RESET}"
echo ""

# Check Bun
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    check_pass "Bun installed: $BUN_VERSION"
else
    check_fail "Bun not found. Install from: https://bun.sh"
    exit 1
fi

# Check Node.js (optional but recommended)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_warn "Node.js not found (optional, but recommended)"
fi

# Check Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    check_pass "Git installed: $GIT_VERSION"
else
    check_fail "Git not found. Install from: https://git-scm.com"
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Project Dependencies
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}📦 2. Project Dependencies${RESET}"
echo ""

# Check node_modules
if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"

    # Check key dependencies
    if [ -d "node_modules/@gravito/core" ]; then
        check_pass "@gravito/core installed"
    else
        check_warn "@gravito/core missing - run: bun install"
    fi

    if [ -d "node_modules/@gravito/atlas" ]; then
        check_pass "@gravito/atlas installed"
    else
        check_warn "@gravito/atlas missing - run: bun install"
    fi
else
    check_fail "node_modules not found - run: bun install"
fi

# Check bun.lock
if [ -f "bun.lockb" ]; then
    check_pass "bun.lockb exists (lock file)"
else
    check_warn "bun.lockb missing - run: bun install"
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Environment Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}⚙️  3. Environment Configuration${RESET}"
echo ""

# Check .env
if [ -f ".env" ]; then
    check_pass ".env file exists"

    # Check key variables
    if grep -q "^APP_NAME=" .env; then
        check_pass "APP_NAME configured"
    else
        check_warn "APP_NAME not configured in .env"
    fi

    if grep -q "^PORT=" .env; then
        PORT=$(grep "^PORT=" .env | cut -d'=' -f2)
        check_pass "PORT configured: $PORT"
    else
        check_warn "PORT not configured (default: 3000)"
    fi
else
    check_fail ".env file not found - run: cp .env.example .env"
fi

# Check .env.example
if [ -f ".env.example" ]; then
    check_pass ".env.example exists (template)"
else
    check_fail ".env.example not found"
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Database Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}💾 4. Database Configuration${RESET}"
echo ""

if [ -f ".env" ]; then
    DB_CONNECTION=$(grep "^DB_CONNECTION=" .env 2>/dev/null | cut -d'=' -f2 || echo "not set")
    ENABLE_DB=$(grep "^ENABLE_DB=" .env 2>/dev/null | cut -d'=' -f2 || echo "true")

    if [ "$ENABLE_DB" = "false" ]; then
        check_pass "Database disabled (ENABLE_DB=false)"
    else
        check_pass "Database enabled (ENABLE_DB=true)"
        echo "        Type: $DB_CONNECTION"

        case $DB_CONNECTION in
            sqlite)
                DB_DATABASE=$(grep "^DB_DATABASE=" .env 2>/dev/null | cut -d'=' -f2 || echo "database/database.sqlite")
                if [ -f "$DB_DATABASE" ]; then
                    check_pass "SQLite database file exists: $DB_DATABASE"
                else
                    check_warn "SQLite database file not found: $DB_DATABASE (will be created on startup)"
                fi
                ;;
            postgres)
                DB_HOST=$(grep "^DB_HOST=" .env 2>/dev/null | cut -d'=' -f2 || echo "localhost")
                DB_PORT=$(grep "^DB_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "5432")

                if command -v psql &> /dev/null; then
                    if psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -tc "SELECT 1" &> /dev/null; then
                        check_pass "PostgreSQL connection OK ($DB_HOST:$DB_PORT)"
                    else
                        check_fail "PostgreSQL connection failed ($DB_HOST:$DB_PORT)"
                        echo "          💡 Fix: Check if PostgreSQL is running and credentials are correct"
                        echo "             docker run -d --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15"
                    fi
                else
                    check_warn "psql not found - cannot verify PostgreSQL connection"
                fi
                ;;
            mysql)
                DB_HOST=$(grep "^DB_HOST=" .env 2>/dev/null | cut -d'=' -f2 || echo "localhost")
                DB_PORT=$(grep "^DB_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "3306")

                if command -v mysql &> /dev/null; then
                    if mysql -h "$DB_HOST" -P "$DB_PORT" -e "SELECT 1" &> /dev/null; then
                        check_pass "MySQL connection OK ($DB_HOST:$DB_PORT)"
                    else
                        check_fail "MySQL connection failed ($DB_HOST:$DB_PORT)"
                    fi
                else
                    check_warn "mysql client not found - cannot verify MySQL connection"
                fi
                ;;
            *)
                check_warn "Unknown database type: $DB_CONNECTION"
                ;;
        esac
    fi
else
    check_warn "Cannot check database config - .env file not found"
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. Cache Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}⚡ 5. Cache Configuration${RESET}"
echo ""

if [ -f ".env" ]; then
    CACHE_DRIVER=$(grep "^CACHE_DRIVER=" .env 2>/dev/null | cut -d'=' -f2 || echo "memory")
    check_pass "Cache driver: $CACHE_DRIVER"

    if [ "$CACHE_DRIVER" = "redis" ]; then
        REDIS_HOST=$(grep "^REDIS_HOST=" .env 2>/dev/null | cut -d'=' -f2 || echo "127.0.0.1")
        REDIS_PORT=$(grep "^REDIS_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "6379")

        if command -v redis-cli &> /dev/null; then
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
                check_pass "Redis connection OK ($REDIS_HOST:$REDIS_PORT)"
            else
                check_fail "Redis connection failed ($REDIS_HOST:$REDIS_PORT)"
                echo "          💡 Fix: Start Redis or switch to memory cache:"
                echo "             docker run -d --name redis -p 6379:6379 redis:7"
            fi
        else
            check_warn "redis-cli not found - cannot verify Redis connection"
        fi
    fi
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. TypeScript & Code Quality
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}✨ 6. TypeScript & Code Quality${RESET}"
echo ""

# Check tsconfig.json
if [ -f "tsconfig.json" ]; then
    check_pass "tsconfig.json exists"
else
    check_fail "tsconfig.json not found"
fi

# Check biome config
if [ -f "biome.json" ] || [ -f ".biomerc.json" ]; then
    check_pass "Biome config exists"
else
    check_warn "Biome config not found"
fi

# Check TypeScript compilation
echo -n "        Running TypeScript check... "
if bun run typecheck > /dev/null 2>&1; then
    echo ""
    check_pass "TypeScript compilation OK"
else
    echo ""
    check_fail "TypeScript compilation failed - run: bun run typecheck"
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. Project Structure
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}📂 7. Project Structure${RESET}"
echo ""

# Check key directories
DIRS=(
    "src"
    "app/Foundation"
    "app/Modules"
    "tests"
    "config"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "Directory exists: $dir/"
    else
        check_fail "Missing directory: $dir/"
    fi
done

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. Port Availability
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}🔌 8. Port Availability${RESET}"
echo ""

if [ -f ".env" ]; then
    PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "3000")

    if command -v lsof &> /dev/null; then
        if ! lsof -i ":$PORT" &> /dev/null; then
            check_pass "Port $PORT is available"
        else
            check_fail "Port $PORT is already in use"
            echo "          Running processes:"
            lsof -i ":$PORT" | tail -n +2 | sed 's/^/          /'
            echo "          💡 Fix: Use a different port:"
            echo "             PORT=3001 bun run dev"
        fi
    else
        check_warn "lsof not found - cannot check port availability"
    fi
else
    check_warn "Cannot check port - .env file not found"
fi

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║                       📊 Summary                              ║${RESET}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${RESET}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${RESET}"
echo -e "${RED}❌ Failed: $FAILED${RESET}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! You're ready to go.${RESET}"
    echo ""
    echo "Next steps:"
    echo "  1. Start development server: bun run dev"
    echo "  2. Open http://localhost:3000 in your browser"
    echo "  3. Check API docs: http://localhost:3000/api"
    echo ""
else
    echo -e "${RED}⚠️  Please fix the errors above before continuing.${RESET}"
    echo ""
    echo "Need help?"
    echo "  - Read: docs/SETUP.md"
    echo "  - Read: docs/TROUBLESHOOTING.md"
    echo "  - Run: bun run troubleshoot (re-run this script)"
    echo ""
fi

exit $FAILED
