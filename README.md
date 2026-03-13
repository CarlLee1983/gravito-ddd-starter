# Gravito DDD Starter Template

🚀 Clean, professional Domain-Driven Design (DDD) starter template for the Gravito Framework. Built for speed, scalability, and maintainability.

> 📖 **New here?** Check out [**docs/01-Getting-Started/HANDBOOK.md**](./docs/01-Getting-Started/HANDBOOK.md) for common commands and workflows!

## ✨ Features

- **Standard DDD Structure**: Clearly defined Domain, Application, Infrastructure, and Presentation layers.
- **IoC & Dependency Injection**: Powered by Gravito Core container and Service Providers.
- **Auto-Wiring Mechanism** 🔌: Automatic scanning and registration of modules using `ModuleAutoWirer`.
- **Complete Event System** ✅: Domain events, integration events, exponential backoff retry, and dead-letter queue.
- **ORM Transparent Design** 🗄️: Seamlessly switch between Memory, Drizzle (SQLite), and Atlas (PostgreSQL/MySQL) via environment variables.
- **Testing Ready**: 360+ unit tests with high coverage. Pre-configured testing environment using Bun.

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/gravito-framework/gravito-ddd-starter my-app
cd my-app
bun install
```

### 2. Start Development Server

```bash
# Default starts with ORM=memory
bun run dev
# Server running on http://localhost:3000
```

### 3. Try the Reference API

The template comes with a `User` module. You can test it immediately:

```bash
# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# List users
curl http://localhost:3000/users
```

## 🏗️ Project Structure

```
gravito-ddd-starter/
├── app/                      # Core Application Source
│   ├── Modules/              # DDD Bounded Contexts (User, Post, etc.)
│   │   └── User/             # Reference Module
│   │       ├── Domain/       # Entities, Aggregates, Events, Repository Ports
│   │       ├── Application/  # Use Cases, Services, DTOs, Handlers
│   │       ├── Infrastructure/# Adapters, Persistence, Service Providers
│   │       └── Presentation/ # Controllers, Routes
│   ├── Shared/               # Shared Kernel (Used by all modules)
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
```

## 🎯 Architecture Status

**Release 2026-03-13 Highlights**:
- ✅ **Ports & Adapters**: Full separation of interfaces (`app/Shared/Infrastructure/Ports`) and implementations.
- ✅ **Single Repository Pattern**: ORM-agnostic repositories injected with technology adapters.
- ✅ **Auto-Wiring**: `ModuleAutoWirer` scans `app/Modules/*/index.ts` for zero-manual registration.
- ✅ **Standardized Logging**: `ILogger` port replaces all `console.log` for production readiness.

## 📚 Documentation

### 🚀 Getting Started
- **[HANDBOOK.md](./docs/01-Getting-Started/HANDBOOK.md)** ⭐ - Common commands and developer workflow.
- **[DEVELOPMENT_GUIDE.md](./docs/04-Module-Development/DEVELOPMENT_GUIDE.md)** - Creating new modules from scratch.

### 📖 Architecture & Design
- **[CORE_DESIGN.md](./docs/02-Architecture/CORE_DESIGN.md)** - Four-layer architecture and dependency rules.
- **[EVENT_SYSTEM.md](./docs/02-Architecture/EVENT_SYSTEM.md)** - Detailed guide on the event-driven system.
- **[DDD_CHECKLIST.md](./docs/03-DDD-Design/DDD_CHECKLIST.md)** - Checklist for implementing DDD patterns.
- **[NAMING_CONVENTION.md](./docs/03-DDD-Design/NAMING_CONVENTION.md)** - Ubiquitous Language and naming standards.

### 🗄️ Persistence (ORM)
- **[ORM_GUIDE.md](./docs/05-Database-ORM/ORM_GUIDE.md)** - Migrations, seeders, and database operations.
- **[ORM_TRANSPARENT_DESIGN.md](./docs/05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)** - How the zero-if ORM switching works.
- **[DATABASE_CONVENTIONS.md](./docs/05-Database-ORM/DATABASE_CONVENTIONS.md)** - Table naming and audit column standards.

### 🔌 Infrastructure & Wiring
- **[ADAPTER_GUIDE.md](./docs/06-Adapters-Wiring/ADAPTER_GUIDE.md)** - Port & Adapter implementation details.
- **[WIRING_SYSTEM.md](./docs/06-Adapters-Wiring/WIRING_SYSTEM.md)** - Under the hood of the Auto-Wiring mechanism.

## 🛠️ Development Workflow

### Generating a New Module

Use the built-in CLI tool to scaffold new DDD modules:

```bash
bun run generate:module Product
```

### Running Tests

We prioritize high-quality code through rigorous testing using [Bun Test](https://bun.sh/docs/cli/test).

```bash
bun run test             # Run all tests
bun run test:unit        # Run unit tests only
bun run test:integration # Run integration tests
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
