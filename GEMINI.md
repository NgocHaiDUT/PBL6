# Project Overview

This is a NestJS application that serves as the backend for an e-commerce platform with social features. It uses Prisma for database access, PostgreSQL as the database, and provides APIs for user authentication, product management, orders, posts, and more.

# Building and Running

## Installation

```bash
npm install
```

## Running the app

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Testing the app

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

# Development Conventions

*   **Linting:** The project uses ESLint for code linting. Run `npm run lint` to check and fix linting errors.
*   **Formatting:** The project uses Prettier for code formatting. Run `npm run format` to format the code.
*   **Database:** The project uses Prisma for database management. The database schema is defined in `prisma/schema.prisma`. To apply schema changes, use `npx prisma migrate dev`.
*   **Environment Variables:** The project uses a `.env` file for environment variables. A `ValidationPipe` is used for validating incoming request data.
*   **Static Assets:** The `uploads` directory is used to serve static assets.
*   **CORS:** CORS is enabled for `http://localhost:5173` and `http://localhost:3000`.
*   **Seeding:** The database can be seeded with initial data by running `npm run seed`.
