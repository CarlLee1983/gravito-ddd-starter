# Gravito DDD Starter Template

🚀 Clean, minimal Gravito DDD project starter with automated module generation via CLI.

## Quick Start

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

### 3. Generate Your First Module

```bash
# Install the CLI
bun add -D @cmg/scaffold-cli

# Generate a module
bun gravito module generate Payment --ddd-type advanced

# ✅ Automatic:
#    - Complete DDD layer structure
#    - Event sourcing setup (if advanced)
#    - Route integration
#    - Test files
```

## Project Structure

```
my-app/
├── src/
│   ├── Modules/              # Your DDD modules (auto-generated)
│   │   └── [Generated]/
│   │       ├── Domain/       # Business logic
│   │       ├── Application/  # Use cases
│   │       ├── Presentation/ # HTTP handlers
│   │       └── Infrastructure/ # Implementations
│   ├── routes.ts             # Route registry
│   ├── bootstrap.ts          # Framework configuration
│   └── index.ts              # Application entry
├── config/                   # Configuration
│   ├── app.ts
│   ├── database.ts
│   ├── cache.ts
│   └── index.ts
├── tests/                    # Test files
├── package.json
├── tsconfig.json
└── biome.json
```

## Available CLI Commands

### Generate Modules

```bash
# Simple CRUD module
bun gravito module generate User --ddd-type simple

# Event Sourcing module
bun gravito module generate Order --ddd-type advanced

# CQRS Read-side module
bun gravito module generate OrderStatistics \
  --ddd-type cqrs-query \
  --subscribes-to OrderCreated,OrderCompleted
```

### Available Options

| Option | Values | Description |
|--------|--------|-------------|
| `--ddd-type` | `simple`, `advanced`, `cqrs-query` | Module type |
| `--subscribes-to` | Event names | Events to subscribe to |
| `--depends-on` | Module names | Module dependencies |
| `--skip-tests` | flag | Skip test generation |
| `--skip-route-integration` | flag | Skip route integration |

## Development Workflow

```bash
# 1. Generate modules as needed
bun gravito module generate Payment
bun gravito module generate Order
bun gravito module generate WalletBalance --ddd-type cqrs-query

# 2. Run tests
bun test

# 3. Start development
bun run dev

# 4. Build for production
bun run build

# 5. Run production build
bun start
```

## Available Scripts

```bash
bun run dev              # Development server (hot-reload)
bun run build            # Build for production
bun run start            # Run production build
bun test                 # Run all tests
bun test --watch         # Watch mode
bun run typecheck        # TypeScript type checking
bun run lint             # Lint code with Biome
bun run format           # Format code with Biome
```

## Environment Configuration

Create `.env` from `.env.example`:

```env
# Application
PORT=3000
APP_NAME=my-app
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:3000

# Database (optional)
ENABLE_DB=true
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# Cache & Redis (optional)
CACHE_DRIVER=memory
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Next Steps

1. **Generate your first module**
   ```bash
   bun gravito module generate User --ddd-type simple
   ```

2. **Implement business logic** in the Domain layer

3. **Run tests**
   ```bash
   bun test
   ```

4. **Deploy** - Build and run `bun start`

## Architecture

This starter uses **Domain-Driven Design (DDD)** with:

- **4-Layer Architecture**: Domain → Application → Presentation → Infrastructure
- **DDD Patterns**: Aggregates, Value Objects, Domain Services, Repositories
- **Event Sourcing** (optional): Event-based state management
- **CQRS** (optional): Separate read and write models
- **TDD**: Comprehensive test generation

## Documentation

- [Gravito Framework](https://github.com/gravito-framework/gravito)
- [CMG Station DDD](https://github.com/your-org/cmg-station-ddd) - Complete example
- [DDD Guide](https://domaindriven.org/)

## License

MIT

## Support

- 📚 [Gravito Docs](https://github.com/gravito-framework/gravito)
- 💬 [Community Discord](#) - Coming soon
- 🐛 [Issue Tracker](#)

---

**Happy coding! 🎉**
