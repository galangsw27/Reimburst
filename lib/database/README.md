# Database Connection Module

This module provides PostgreSQL database connection management using connection pooling for efficient database access.

## Features

- **Connection Pooling**: Manages a pool of database connections (min=2, max=10)
- **Automatic Resource Management**: Connections are automatically acquired and released
- **Error Handling**: Proper error handling for connection and query failures
- **Singleton Pattern**: Single connection pool instance for the entire application

## Requirements

This module satisfies the following requirements:
- **4.1**: Create a connection pool for PostgreSQL connections
- **4.2**: Configure connection pool with minimum 2 and maximum 10 connections
- **4.3**: Acquire a connection from the pool when executing queries
- **4.4**: Release the connection back to the pool when query completes

## Usage

### Basic Setup

```typescript
import { db } from './lib/database/connection';
import { getDatabaseConfig } from './lib/config/database';

// Initialize the connection pool (typically done at application startup)
const config = getDatabaseConfig();
if (config.mode === 'database' && config.connectionString && config.poolConfig) {
  db.initialize(config.connectionString, config.poolConfig);
}
```

### Simple Query Execution

The `query()` method automatically handles connection acquisition and release:

```typescript
// Execute a simple query
const result = await db.query('SELECT * FROM users');
console.log(result.rows);

// Execute a parameterized query (prevents SQL injection)
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
console.log(user.rows[0]);
```

### Manual Connection Management

For transactions or multiple related queries, you can manually manage connections:

```typescript
const client = await db.getClient();
try {
  await client.query('BEGIN');
  
  // Execute multiple queries in a transaction
  await client.query('INSERT INTO users (name, email) VALUES ($1, $2)', ['Alice', 'alice@example.com']);
  await client.query('INSERT INTO audit_log (action) VALUES ($1)', ['user_created']);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  // Always release the connection back to the pool
  client.release();
}
```

### Cleanup

Close the connection pool when shutting down the application:

```typescript
await db.close();
```

## Configuration

The connection pool is configured with the following settings:

- **min**: 2 connections (minimum number of connections in the pool)
- **max**: 10 connections (maximum number of connections in the pool)
- **idleTimeoutMillis**: 30000ms (30 seconds - how long a connection can be idle before being closed)

These settings are defined in `lib/config/database.ts` and passed to the `initialize()` method.

## Error Handling

The module handles several error scenarios:

1. **Uninitialized Pool**: Throws an error if you try to use the pool before calling `initialize()`
2. **Query Failures**: Connections are released back to the pool even if queries fail
3. **Pool Errors**: Unexpected pool errors are logged to the console

Example error handling:

```typescript
try {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
} catch (error) {
  console.error('Database query failed:', error);
  throw new Error('Failed to fetch user');
}
```

## Testing

### Unit Tests

Run unit tests (no database required):

```bash
npm test -- lib/database/connection.test.ts
```

### Integration Tests

Run integration tests (requires running PostgreSQL database):

```bash
# Start the database
docker-compose up -d

# Run integration tests
DATABASE_MODE=database DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reimbursement_db npm test -- lib/database/connection.integration.test.ts --run
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection:
   ```typescript
   // Good
   await db.query('SELECT * FROM users WHERE email = $1', [email]);
   
   // Bad - vulnerable to SQL injection
   await db.query(`SELECT * FROM users WHERE email = '${email}'`);
   ```

2. **Release connections in finally blocks** when using manual connection management:
   ```typescript
   const client = await db.getClient();
   try {
     // Use the client
   } finally {
     client.release(); // Always release
   }
   ```

3. **Initialize the pool once** at application startup, not on every request

4. **Close the pool** when shutting down the application to clean up resources

## Architecture

The module uses a singleton pattern with a single `DatabaseConnection` instance exported as `db`. This ensures that only one connection pool is created for the entire application, which is the recommended approach for connection pooling.

```
Application
    ↓
db.initialize() → Creates Pool (min=2, max=10)
    ↓
db.query() → Acquires Connection → Executes Query → Releases Connection
    ↓
db.close() → Closes Pool
```
