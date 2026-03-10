# Gravito DDD Starter Template

🚀 Clean, professional Domain-Driven Design (DDD) starter template for the Gravito Framework. Built for speed, scalability, and maintainability.

## ✨ Features

- **Standard DDD Structure**: Clearly defined Domain, Application, Infrastructure, and Presentation layers.
- **IoC & Dependency Injection**: Powered by Gravito Core container and Service Providers.
- **Reference Example**: Includes a fully implemented `User` module as a best-practice reference.
- **Testing Ready**: Pre-configured integration and unit testing environment using Bun.
- **Developer Experience**: Hot-reload, type-safety, and modern tooling out of the box.

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/gravito-framework/gravito-ddd-starter my-app
cd my-app
bun install
```

### 2. Start Development Server

```bash
bun run dev
# Server running on http://localhost:3000
```

### 3. Try the Reference API

The template comes with a `User` module. You can test it immediately:

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# List users
curl http://localhost:3000/api/users
```

## 🏗️ Project Structure

```
gravito-ddd-starter/
├── src/
│   ├── Shared/               # Base classes & Interfaces (All modules inherit)
│   │   ├── Domain/           # BaseEntity, ValueObject, AggregateRoot, DomainEvent
│   │   ├── Application/      # BaseDTO, AppException
│   │   ├── Infrastructure/   # Cache, Redis, Database interfaces
│   │   └── Presentation/     # ApiResponse, Router interfaces
│   ├── Modules/              # DDD Bounded Contexts
│   │   └── User/             # Reference Module (Example)
│   │       ├── Domain/       # Entities, Aggregates, Repository Interfaces
│   │       ├── Application/  # Use Cases (Commands/Queries), DTOs
│   │       ├── Infrastructure/# Persistence, Service Providers
│   │       └── Presentation/ # Controllers, API Routes
│   ├── app.ts                # Application bootstrap & DI registration
│   ├── routes.ts             # Global route registry
│   └── index.ts              # Entry point (Server Liftoff)
├── config/                   # Global configuration & Orbits
├── tests/                    # Global test files
├── package.json
└── tsconfig.json
```

### 📚 Shared Layer (重要！)

`src/Shared/` 包含所有模組都需要繼承的基礎類別：

**Domain 層**:
- `BaseEntity` - 實體基類 (ID、時間戳)
- `AggregateRoot` - 聚合根基類
- `ValueObject` - 值物件基類
- `DomainEvent` - 領域事件基類
- `IRepository` - Repository 介面

**Application 層**:
- `BaseDTO` - 所有 DTO 繼承此類
- `AppException` - 應用異常基類

**Infrastructure 層**:
- `ICacheService` - 快取服務介面
- `IRedisService` - Redis 服務介面
- `IDatabaseAccess` - 數據庫存取介面

**Presentation 層**:
- `ApiResponse` - 統一 API 響應格式
- `IModuleRouter` - 模組路由介面
- `routerHelpers` - 路由輔助函數

所有自動生成的模組都會自動使用這些基礎類別！

## 📚 Documentation

Learn the architecture and best practices:

### Essential Guides
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Four-layer DDD architecture, design patterns, and data flow
- **[MODULE_GUIDE.md](./docs/MODULE_GUIDE.md)** - Step-by-step guide to creating new modules with examples
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Setup & Development
- **[SETUP.md](./docs/SETUP.md)** - Development environment setup for macOS, Linux, and Windows
- **[API_GUIDELINES.md](./docs/API_GUIDELINES.md)** - REST API design standards and conventions
- **[TESTING.md](./docs/TESTING.md)** - Testing strategy (Unit, Integration, Feature tests)

## 🛠️ Development Workflow

### Adding a New Module (Automatic with @gravito/pulse)

The easiest way to create a new module:

```bash
# Install the CLI
bun add -D @gravito/pulse

# Generate a new module (auto-generates everything!)
bun gravito module generate Order --ddd-type advanced

# ✅ What gets generated automatically:
#    - Complete DDD structure (Domain/Application/Presentation/Infrastructure)
#    - All classes inherit from Shared base classes
#    - Routes automatically integrated
#    - Tests automatically generated
#    - README documentation generated
```

### Manual Module Creation (Advanced)

If you prefer to create modules manually, use `src/Modules/User` as a reference:

1.  **Copy the Template**: Use the `src/Modules/User` directory as a reference.
2.  **Inherit from Shared**: Your classes should inherit from `Shared/` base classes:
    - Domain Entities inherit from `BaseEntity` or `AggregateRoot`
    - Value Objects inherit from `ValueObject`
    - Application DTOs inherit from `BaseDTO`
    - Exceptions inherit from `AppException`
3.  **Register Provider**: Register your new `ServiceProvider` in `src/app.ts`.
4.  **Register Routes**: Add your module's routes to `src/routes.ts`.

### Running Tests

We prioritize high-quality code through rigorous testing.

```bash
bun test                 # Run all tests
bun run test:user        # Run User module specific tests
bun test --watch         # Watch mode
```

## 📜 Available Scripts

### Development
| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server with hot-reload |
| `bun run dev:debug` | Start with debugging enabled (inspect-brk) |
| `bun run build` | Build the project for production |
| `bun run start` | Run the compiled production build |

### Testing
| Script | Description |
|--------|-------------|
| `bun run test` | Execute all tests (Unit, Integration, Feature) |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Generate test coverage report |
| `bun run test:unit` | Run only unit tests |
| `bun run test:integration` | Run only integration tests |
| `bun run test:feature` | Run only feature tests |

### Code Quality
| Script | Description |
|--------|-------------|
| `bun run typecheck` | Run TypeScript type checking |
| `bun run lint` | Check code style with Biome |
| `bun run lint:fix` | Auto-fix linting issues |
| `bun run format` | Format code with Biome |
| `bun run format:check` | Check if code is formatted |
| `bun run check` | Run all checks (type, lint, test) |

## 🔧 Git Hooks (Optional)

Set up automatic code quality checks before commits:

```bash
# Run the setup script
bash scripts/setup-hooks.sh

# This installs three hooks:
# - pre-commit: Checks format, lint, and types
# - prepare-commit-msg: Adds branch name to commit message
# - commit-msg: Validates commit message format
```

**Skip hooks temporarily**:
```bash
HUSKY=0 git commit
```

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
APP_NAME=gravito-ddd-app
APP_ENV=development
APP_DEBUG=true
```

## 📚 Documentation & Reference

- [Gravito Framework Docs](https://github.com/gravito-framework/gravito)
- [DDD Patterns Guide](https://domaindriven.org/)

## 📄 License

MIT

---

**Built with ❤️ by the Gravito Team.**
