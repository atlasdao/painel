# Database Connection Optimization Configuration

## Recommended DATABASE_URL Format

```bash
# Optimized connection string with pooling parameters
DATABASE_URL="postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db?schema=public&connection_limit=10&pool_timeout=30&statement_cache_size=100&pgbouncer=true"
```

## Connection Pool Parameters Explained

### For .env file:
```bash
# Database Configuration
DATABASE_URL=postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db

# Connection Pool Settings (if using separate config)
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=10000
DB_POOL_CONNECTION_TIMEOUT=5000
```

### PostgreSQL Performance Tuning

Add these to your PostgreSQL configuration (postgresql.conf):

```ini
# Connection Settings
max_connections = 100
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 256MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 1GB

# Checkpoint Settings
checkpoint_timeout = 5min
checkpoint_completion_target = 0.7
max_wal_size = 1GB
min_wal_size = 80MB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 100

# Logging
log_min_duration_statement = 100
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0

# Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
```

### Prisma Schema Optimization

Add to schema.prisma:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["metrics", "tracing", "multiSchema"]
  binaryTargets   = ["native", "darwin-arm64"]
}

datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_DATABASE_URL") // For migrations
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // For development
}
```

## Application-Level Optimizations

### 1. Use Connection Pooler (PgBouncer)

Install and configure PgBouncer:

```bash
# Install PgBouncer
brew install pgbouncer

# Configure pgbouncer.ini
[databases]
atlas_db = host=localhost port=5432 dbname=atlas_db

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /usr/local/etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
server_idle_timeout = 30
```

### 2. Environment-Specific Configuration

```typescript
// config/database.config.ts
export default () => ({
  database: {
    url: process.env.DATABASE_URL,
    pooling: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT, 10) || 30000,
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 10000,
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT, 10) || 5000,
    },
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
  },
});
```

## Monitoring Queries

### Check Active Connections
```sql
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE datname = 'atlas_db'
ORDER BY query_start;
```

### Check Slow Queries
```sql
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    min_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Check Index Usage
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Check Table Bloat
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup,
    n_dead_tup,
    round(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_percent
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

## Maintenance Scripts

### Weekly Maintenance
```bash
#!/bin/bash
# Run as cron job weekly

# Vacuum and analyze all tables
psql -U atlas_user -d atlas_db -c "VACUUM ANALYZE;"

# Reindex for performance
psql -U atlas_user -d atlas_db -c "REINDEX DATABASE atlas_db;"

# Update statistics
psql -U atlas_user -d atlas_db -c "ANALYZE;"
```

### Daily Cleanup
```bash
#!/bin/bash
# Run as cron job daily

# Clean old audit logs (>90 days)
psql -U atlas_user -d atlas_db -c "
DELETE FROM \"AuditLog\"
WHERE \"createdAt\" < NOW() - INTERVAL '90 days';"

# Clean expired transactions
psql -U atlas_user -d atlas_db -c "
UPDATE \"Transaction\"
SET status = 'EXPIRED'
WHERE status = 'PENDING'
AND \"createdAt\" < NOW() - INTERVAL '30 days';"

# Clean old rate limits
psql -U atlas_user -d atlas_db -c "
DELETE FROM \"RateLimit\"
WHERE \"resetAt\" < NOW();"
```

## Performance Benchmarks

After optimization, you should see:
- Query response time: < 50ms for simple queries
- Transaction completion: < 100ms for typical operations
- Connection pool utilization: < 80% under normal load
- Index hit ratio: > 95%
- Cache hit ratio: > 90%