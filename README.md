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

## 🛠️ Development Workflow

### Adding a New Module

To create a new module (e.g., `Order`):

1.  **Copy the Template**: Use the `src/Modules/User` directory as a reference.
2.  **Implement Layers**: Follow the Domain → Application → Infrastructure → Presentation flow.
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

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server with hot-reload |
| `bun run build` | Build the project for production |
| `bun run start` | Run the compiled production build |
| `bun run test` | Execute all test suites |
| `bun run typecheck` | Run static type checking |
| `bun run lint` | Lint code using Biome |
| `bun run format` | Format code using Biome |

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
