# Gravito DDD Starter Template

🚀 Clean, professional Domain-Driven Design (DDD) starter template for the Gravito Framework. Built for speed, scalability, and maintainability.

> 📖 **New here?** Check out [**docs/01-Getting-Started/README.md**](./docs/01-Getting-Started/README.md) for common commands and workflows!

## ✨ Features

- **Standard DDD Structure**: Clearly defined Domain, Application, Infrastructure, and Presentation layers.
- **IoC & Dependency Injection**: Powered by Gravito Core container and Service Providers.
- **Auto-Wiring Mechanism** 🔌: Automatic scanning and registration of modules using `ModuleAutoWirer`.
- **Complete Event System** ✅: Domain events, integration events, exponential backoff retry, and dead-letter queue.
- **ORM Transparent Design** 🗄️: Seamlessly switch between Memory, Drizzle (SQLite), and Atlas (PostgreSQL/MySQL) via environment variables.
- **Testing Ready**: Minimal smoke test included; expand as your domain grows.

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repo-url> my-app
cd my-app
bun install
```

### 2. Start Development Server

```bash
# Default starts with ORM=memory
bun run dev
# Server running on http://localhost:3000
```

### 3. Generate Your First Module

This template ships with **no sample modules**. Generate one to begin:

```bash
bun run generate:module Product
```

Then restart the server and hit your routes (example):

```bash
curl http://localhost:3000/products
```

## 🏗️ Project Structure

```
project/
├── app/                      # Core Application Source
│   ├── Modules/              # DDD Bounded Contexts (empty by default)
│   ├── Foundation/           # Shared Kernel (Used by all modules)
│   │   ├── Domain/           # BaseEntity, AggregateRoot, DomainEvent
│   │   ├── Application/      # BaseDTO, SystemWorker
│   │   ├── Infrastructure/   # Ports (Interfaces) for DB, Redis, Logger
│   │   └── Presentation/     # ApiResponse, IModuleRouter
│   ├── bootstrap.ts          # App initialization & Auto-Wiring
│   └── index.ts              # App entry point (Facade)
├── bin/
│   └── server.ts             # HTTP Server entry point
├── config/                   # Global configuration & Orbits
├── database/                 # Migrations & Seeders
├── start/
│   ├── routes.ts             # Global routes registry
│   └── wiring/               # Auto-Wiring logic & Registry
├── tests/                    # Integration & Functional tests
└── docs/                     # Comprehensive documentation
    ├── 01-Getting-Started/   # Handbook & Onboarding
    ├── 02-Architecture/      # Core design & Event system
    ├── 03-DDD-Design/        # DDD Patterns & Conventions
    ├── 04-Module-Development/ # Scaffolding & Wiring
    ├── 05-Database-ORM/      # DB conventions & ORM swapping
    ├── 05-Frontend-Integration/ # SSR, Routing & Token management ✨
    ├── 06-Adapters-Wiring/   # Adapters & Auto-Wiring mechanism
    ├── 07-Production-Deployment/ # Deploy & Troubleshooting
    ├── 08-Testing-API/       # API Standards & Testing strategy
    ├── 09-Internationalization/ # i18n & Message services ✨
    └── 10-Project-Reuse/     # Reuse this starter in new projects ✨
```

## 🎯 Template Baseline

- ✅ **Auto-Wiring**: `ModuleAutoWirer` scans `app/Modules/*/index.ts` for zero-manual registration.
- ✅ **Ports & Adapters**: Interfaces live in Foundation, implementations in Infrastructure.
- ✅ **ORM Transparent Design**: Switch DB/ORM via env without code changes.

## 📚 Documentation

### 🚀 Getting Started
- **[README.md](./docs/01-Getting-Started/README.md)** ⭐ - Minimal onboarding and commands.
- **[QUICK_START.md](./docs/01-Getting-Started/QUICK_START.md)** - Build your first module in 15 minutes.
- **[DEVELOPMENT_GUIDE.md](./docs/04-Module-Development/DEVELOPMENT_GUIDE.md)** - Create new modules from scratch.

### 📖 Architecture & Design
- **[CORE_DESIGN.md](./docs/02-Architecture/CORE_DESIGN.md)** - Four-layer architecture and dependency rules.
- **[EVENT_SYSTEM.md](./docs/02-Architecture/EVENT_SYSTEM.md)** - Event-driven system overview.
- **[DDD_CHECKLIST.md](./docs/03-DDD-Design/DDD_CHECKLIST.md)** - Checklist for DDD adoption.

### 🗄️ Persistence (ORM)
- **[ORM_GUIDE.md](./docs/05-Database-ORM/ORM_GUIDE.md)** - Migrations, seeders, and database operations.

### 🔌 Infrastructure & Wiring
- **[WIRING_SYSTEM.md](./docs/06-Adapters-Wiring/WIRING_SYSTEM.md)** - Under the hood of the Auto-Wiring mechanism.

### ♻️ Project Reuse
- **[REUSE_GUIDE.md](./docs/10-Project-Reuse/REUSE_GUIDE.md)** ✨ - Deep architecture analysis + step-by-step reuse workflow.

## 🛠️ Development Workflow

### Generating a New Module

Use the built-in CLI tool to scaffold new DDD modules:

```bash
bun run generate:module Product
```

### Running Tests

We prioritize high-quality code through rigorous testing using [Bun Test](https://bun.sh/docs/cli/test).

```bash
bun run test             # Run minimal tests
bun run test:unit        # Run unit tests only
```

### Environment Configuration

```bash
# Set the ORM tool (memory, drizzle, atlas)
ORM=memory

# Set the Database System (sqlite, postgres, mysql)
DB_CONNECTION=sqlite
DATABASE_URL=file:./database.sqlite
```

---

**Built with ❤️ by the Gravito Team.**
