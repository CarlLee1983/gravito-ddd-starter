# Repository Guidelines

## Project Structure & Module Organization
- `app/Modules/*` holds DDD bounded contexts. Each module follows `Domain/`, `Application/`, `Infrastructure/`, `Presentation/`.
- `app/Foundation/` is the shared kernel used across modules.
- `bin/server.ts` is the HTTP entry point; `app/bootstrap.ts` wires modules.
- `tests/` is split into `Unit/`, `Integration/`, `Functional/`, and `E2E/`.
- `database/` contains migrations and seeders; `start/` contains global routes/wiring.
- `docs/` holds architecture, DDD, and operational guides.

## Build, Test, and Development Commands
- `bun run dev`: start the dev server with hot reload.
- `bun run build`: compile TypeScript to `dist/` and run cleanup.
- `bun run start`: run the built server from `dist/`.
- `bun run test`: run all tests with Bun.
- `bun run test:unit`: run the scoped unit test suite (see `tests/Unit/`).
- `bun run lint` / `bun run format`: Biome linting and formatting.
- `bun run typecheck`: TypeScript type check.
- `bun run check`: typecheck + lint + boundaries + tests.

## Coding Style & Naming Conventions
- Formatting is enforced by Biome: 2-space indentation, line width 100, single quotes.
- Prefer domain language in names. Entities: `User`, `Order`. Value Objects: `Email`, `Money`.
- Repositories use `I*Repository` (e.g., `IUserRepository`); services use verb-noun (e.g., `CreateUserService`).
- Events are past-tense nouns (e.g., `UserCreated`); controllers use `*Controller`.
- Routes are RESTful and plural (e.g., `/users`).

## Testing Guidelines
- Primary framework: `bun test` (Bun). E2E lives under `tests/E2E/` (Playwright config in `playwright.config.ts`).
- Keep test files inside the suite folders and name for intent (e.g., `UserCreate.test.ts`). Functional tests live under `tests/Functional/`.
- Target coverage runs via `bun run test:coverage`.

## Commit & Pull Request Guidelines
- Commit messages use conventional prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:` with optional scopes like `feat: [User] add profile endpoint`.
- PRs should include: summary, rationale, tests run, and screenshots for UI changes.
- PR checks: Domain/Application must not import ORM or `@gravito/*` directly.
- PR checks: Repositories are interfaces in Domain; implementations live in Infrastructure.
- PR checks: Migrations use `SchemaBuilder` and avoid mixing raw SQL unless necessary.

## Configuration & Data
- Copy `.env.example` to `.env` for local setup.
- Use `bun run migrate`, `bun run seed`, or `bun run db:fresh` to manage schemas.
