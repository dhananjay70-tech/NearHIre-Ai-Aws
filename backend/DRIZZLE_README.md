# Drizzle ORM Setup Guide

This document explains how Drizzle ORM is configured in the NearHire.AI Node.js backend.

## Overview

The backend has been migrated from raw SQL queries to Drizzle ORM for type-safe database operations with PostgreSQL (Supabase).

## Installation

Required packages are already installed:

```bash
npm install drizzle-orm drizzle-kit postgres dotenv
npm install --save-dev @types/node
```

## Folder Structure

```
node-backend/
├── src/
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   ├── schema.ts         # Drizzle schema definitions
│   │   ├── relations.ts      # Table relationships
│   │   ├── seed.ts           # Seed data (to be added)
│   │   └── migrations/       # Migration files
├── drizzle.config.ts         # Drizzle configuration
└── .env                      # Environment variables
```

## Database Configuration

### Environment Variables

Set these in your `.env` file:

```env
DATABASE_URL=postgresql://postgres.rjpaznyszzivhmvnyzfr:YOUR_PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

### Drizzle Config

`drizzle.config.ts` contains the configuration:

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## Schema Definitions

All tables are defined in `src/db/schema.ts` using Drizzle ORM:

- **users** - User accounts
- **user_preferences** - User job preferences
- **companies** - Company information
- **jobs** - Job listings
- **skills** - Skills database
- **job_skills** - Job-skill relationships
- **saved_jobs** - Saved jobs by users
- **applications** - Job applications

### Example Schema

```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('USER').notNull(),
  // ... other fields
});
```

## Database Connection

The database connection is in `src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
export const db = drizzle(client);
```

## Available Scripts

```bash
# Generate migration files from schema changes
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Run migrations (production)
npm run db:migrate

# Open Drizzle Studio (GUI for database)
npm run db:studio
```

## Usage Examples

### Basic Query

```typescript
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Find user by email
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'test@example.com'))
  .limit(1);
```

### Insert

```typescript
const newUser = await db
  .insert(users)
  .values({
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: hashedPassword,
  })
  .returning();
```

### Update

```typescript
const updated = await db
  .update(users)
  .set({ name: 'Jane Doe' })
  .where(eq(users.id, userId))
  .returning();
```

### Transactions

```typescript
const result = await db.transaction(async (tx) => {
  const user = await tx.insert(users).values(userData).returning();
  await tx.insert(userPreferences).values({ userId: user.id });
  return user;
});
```

## Refactoring Services

Services have been refactored from raw SQL to Drizzle ORM:

### Before (Raw SQL)
```javascript
const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

### After (Drizzle ORM)
```typescript
const result = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
```

## Migration Status

- ✅ Schema converted to Drizzle
- ✅ Database connection configured
- ✅ Auth service refactored
- ✅ Tables created in Supabase
- ✅ Registration endpoint tested successfully
- ⏳ Other services to be refactored (job, application, company, savedJob, skill)

## Adding New Tables

1. Add table definition to `src/db/schema.ts`
2. Add relations to `src/db/relations.ts` (if needed)
3. Generate migration: `npm run db:generate`
4. Push to database: `npm run db:push`

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` in `.env` is correct
- Check Supabase database is accessible
- Ensure network connectivity

### Migration Issues
- Run `npm run db:push` for development
- Use `npm run db:migrate` for production
- Check migration files in `src/db/migrations/`

## Benefits of Drizzle ORM

- **Type Safety**: TypeScript support for database queries
- **Better DX**: Intellisense and compile-time error checking
- **Maintainability**: Schema-first approach
- **Performance**: Efficient query generation
- **Portability**: Easy to switch database providers

## Next Steps

1. Refactor remaining services (job, application, company, savedJob, skill)
2. Create seed data file
3. Add comprehensive error handling
4. Set up migration workflow for production
