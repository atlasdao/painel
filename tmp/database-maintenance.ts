#!/usr/bin/env tsx
/**
 * Database Maintenance and Monitoring Script
 * Run this script periodically to maintain database health
 *
 * Usage:
 * npm run db:maintenance               # Run all maintenance tasks
 * npm run db:maintenance monitor       # Monitor database health
 * npm run db:maintenance cleanup       # Clean old data
 * npm run db:maintenance optimize      # Optimize tables and indexes
 * npm run db:maintenance report        # Generate performance report
 */

import { PrismaClient } from '../Atlas-API/node_modules/@prisma/client/index.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface MaintenanceOptions {
  verbose?: boolean;
  dryRun?: boolean;
  daysToKeep?: number;
}

class DatabaseMaintenance {
  private options: MaintenanceOptions;

  constructor(options: MaintenanceOptions = {}) {
    this.options = {
      verbose: true,
      dryRun: false,
      daysToKeep: 90,
      ...options,
    };
  }

  private log(message: string, data?: any) {
    if (this.options.verbose) {
      console.log(`[${new Date().toISOString()}] ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * Monitor database health and performance
   */
  async monitor() {
    this.log('=== DATABASE HEALTH MONITORING ===\n');

    try {
      // 1. Connection pool status
      const poolStatus = await prisma.$queryRaw<any[]>`
        SELECT
          count(*) as total_connections,
          count(*) filter (where state = 'active') as active,
          count(*) filter (where state = 'idle') as idle,
          count(*) filter (where state = 'idle in transaction') as idle_in_transaction,
          count(*) filter (where state is null) as null_state,
          max(extract(epoch from (clock_timestamp() - query_start))) as longest_query_seconds
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      this.log('Connection Pool Status:', poolStatus[0]);

      // 2. Database size
      const dbSize = await prisma.$queryRaw<any[]>`
        SELECT
          pg_database_size(current_database()) as size_bytes,
          pg_size_pretty(pg_database_size(current_database())) as size_pretty
      `;

      this.log('Database Size:', dbSize[0]);

      // 3. Table sizes
      const tableSizes = await prisma.$queryRaw<any[]>`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          round(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_percent
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `;

      this.log('\nTop 10 Tables by Size:');
      tableSizes.forEach(table => {
        this.log(`- ${table.tablename}: ${table.total_size} (${table.live_rows} rows, ${table.dead_percent || 0}% dead)`);
      });

      // 4. Index usage
      const indexUsage = await prisma.$queryRaw<any[]>`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 10
      `;

      this.log('\nTop 10 Most Used Indexes:');
      indexUsage.forEach(idx => {
        this.log(`- ${idx.indexname} on ${idx.tablename}: ${idx.idx_scan} scans`);
      });

      // 5. Slow queries (if pg_stat_statements is available)
      try {
        const slowQueries = await prisma.$queryRaw<any[]>`
          SELECT
            substring(query, 1, 100) as query_preview,
            calls,
            mean_exec_time,
            total_exec_time
          FROM pg_stat_statements
          WHERE mean_exec_time > 100
          ORDER BY mean_exec_time DESC
          LIMIT 5
        `;

        this.log('\nTop 5 Slow Queries:');
        slowQueries.forEach(q => {
          this.log(`- ${q.query_preview}... (${q.mean_exec_time}ms avg)`);
        });
      } catch (e) {
        this.log('\nSlow query monitoring not available (pg_stat_statements extension may not be installed)');
      }

      // 6. Cache hit ratios
      const cacheHits = await prisma.$queryRaw<any[]>`
        SELECT
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit) as heap_hit,
          sum(idx_blks_read) as idx_read,
          sum(idx_blks_hit) as idx_hit,
          round(100 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as heap_hit_ratio,
          round(100 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2) as idx_hit_ratio
        FROM pg_statio_user_tables
      `;

      this.log('\nCache Hit Ratios:', {
        heapHitRatio: `${cacheHits[0]?.heap_hit_ratio || 0}%`,
        indexHitRatio: `${cacheHits[0]?.idx_hit_ratio || 0}%`,
      });

      return {
        healthy: true,
        metrics: {
          connections: poolStatus[0],
          size: dbSize[0],
          cacheHits: cacheHits[0],
        },
      };
    } catch (error) {
      this.log('Error monitoring database:', error);
      return { healthy: false, error };
    }
  }

  /**
   * Clean up old and unnecessary data
   */
  async cleanup() {
    this.log('=== DATABASE CLEANUP ===\n');

    if (this.options.dryRun) {
      this.log('DRY RUN MODE - No actual deletions will occur\n');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.daysToKeep!);

    try {
      // 1. Clean old audit logs
      const auditLogsToDelete = await prisma.auditLog.count({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      this.log(`Found ${auditLogsToDelete} audit logs older than ${this.options.daysToKeep} days`);

      if (!this.options.dryRun && auditLogsToDelete > 0) {
        const result = await prisma.auditLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
          },
        });
        this.log(`✓ Deleted ${result.count} old audit logs`);
      }

      // 2. Clean expired transactions
      const expiredTransactions = await prisma.transaction.count({
        where: {
          status: 'EXPIRED',
          createdAt: { lt: cutoffDate },
        },
      });

      this.log(`Found ${expiredTransactions} expired transactions`);

      if (!this.options.dryRun && expiredTransactions > 0) {
        const result = await prisma.transaction.deleteMany({
          where: {
            status: 'EXPIRED',
            createdAt: { lt: cutoffDate },
          },
        });
        this.log(`✓ Deleted ${result.count} expired transactions`);
      }

      // 3. Mark old pending transactions as expired
      const oldPendingTransactions = await prisma.transaction.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoffDate },
        },
      });

      this.log(`Found ${oldPendingTransactions} old pending transactions`);

      if (!this.options.dryRun && oldPendingTransactions > 0) {
        const result = await prisma.transaction.updateMany({
          where: {
            status: 'PENDING',
            createdAt: { lt: cutoffDate },
          },
          data: {
            status: 'EXPIRED',
            errorMessage: 'Transaction expired due to timeout',
          },
        });
        this.log(`✓ Marked ${result.count} transactions as expired`);
      }

      // 4. Clean old rate limits
      const oldRateLimits = await prisma.rateLimit.count({
        where: {
          resetAt: { lt: new Date() },
        },
      });

      this.log(`Found ${oldRateLimits} expired rate limit entries`);

      if (!this.options.dryRun && oldRateLimits > 0) {
        const result = await prisma.rateLimit.deleteMany({
          where: {
            resetAt: { lt: new Date() },
          },
        });
        this.log(`✓ Deleted ${result.count} expired rate limit entries`);
      }

      // 5. Clean failed webhook events older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const failedWebhooks = await prisma.webhookEvent.count({
        where: {
          status: 'FAILED',
          createdAt: { lt: thirtyDaysAgo },
        },
      });

      this.log(`Found ${failedWebhooks} failed webhook events older than 30 days`);

      if (!this.options.dryRun && failedWebhooks > 0) {
        const result = await prisma.webhookEvent.deleteMany({
          where: {
            status: 'FAILED',
            createdAt: { lt: thirtyDaysAgo },
          },
        });
        this.log(`✓ Deleted ${result.count} failed webhook events`);
      }

      // 6. Reset daily limits if needed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const usersNeedingLimitReset = await prisma.userLevel.count({
        where: {
          lastLimitReset: { lt: yesterday },
        },
      });

      if (usersNeedingLimitReset > 0) {
        const result = await prisma.userLevel.updateMany({
          where: {
            lastLimitReset: { lt: yesterday },
          },
          data: {
            dailyUsedBrl: 0,
            lastLimitReset: new Date(),
          },
        });
        this.log(`✓ Reset daily limits for ${result.count} users`);
      }

      return { success: true };
    } catch (error) {
      this.log('Error during cleanup:', error);
      return { success: false, error };
    }
  }

  /**
   * Optimize database tables and indexes
   */
  async optimize() {
    this.log('=== DATABASE OPTIMIZATION ===\n');

    try {
      // 1. Update table statistics
      const tables = [
        'User', 'Transaction', 'AuditLog', 'WebhookEvent',
        'PaymentLink', 'WithdrawalRequest', 'ApiKeyRequest',
        'UserLimit', 'UserReputation', 'UserLevel',
      ];

      for (const table of tables) {
        try {
          await prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
          this.log(`✓ Updated statistics for ${table}`);
        } catch (e) {
          this.log(`✗ Failed to update statistics for ${table}`);
        }
      }

      // 2. Vacuum tables (if not in dry run)
      if (!this.options.dryRun) {
        this.log('\nVacuuming tables...');
        await prisma.$executeRawUnsafe('VACUUM ANALYZE');
        this.log('✓ Vacuum completed');
      }

      // 3. Check for missing indexes based on query patterns
      const missingIndexes = await this.checkMissingIndexes();
      if (missingIndexes.length > 0) {
        this.log('\nPotential missing indexes detected:');
        missingIndexes.forEach(idx => this.log(`- ${idx}`));
      } else {
        this.log('\n✓ No missing indexes detected');
      }

      return { success: true };
    } catch (error) {
      this.log('Error during optimization:', error);
      return { success: false, error };
    }
  }

  /**
   * Check for potentially missing indexes
   */
  private async checkMissingIndexes(): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for sequential scans on large tables
    const seqScans = await prisma.$queryRaw<any[]>`
      SELECT
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_live_tup
      FROM pg_stat_user_tables
      WHERE n_live_tup > 1000
        AND seq_scan > idx_scan
      ORDER BY seq_tup_read DESC
      LIMIT 5
    `;

    seqScans.forEach(table => {
      if (table.seq_scan > table.idx_scan * 2) {
        suggestions.push(
          `Table ${table.tablename} has high sequential scans (${table.seq_scan}) vs index scans (${table.idx_scan})`
        );
      }
    });

    return suggestions;
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    this.log('=== GENERATING PERFORMANCE REPORT ===\n');

    const report = {
      timestamp: new Date().toISOString(),
      database: 'atlas_db',
      health: await this.monitor(),
      statistics: {} as any,
      recommendations: [] as string[],
    };

    try {
      // Get detailed statistics
      const stats = await prisma.$queryRaw<any[]>`
        SELECT
          (SELECT count(*) FROM "User") as users,
          (SELECT count(*) FROM "Transaction") as transactions,
          (SELECT count(*) FROM "AuditLog") as audit_logs,
          (SELECT count(*) FROM "Transaction" WHERE status = 'COMPLETED') as completed_tx,
          (SELECT count(*) FROM "Transaction" WHERE status = 'PENDING') as pending_tx,
          (SELECT count(*) FROM "User" WHERE "isAccountValidated" = true) as validated_users,
          (SELECT count(*) FROM "User" WHERE "commerceMode" = true) as commerce_users
      `;

      report.statistics = stats[0];

      // Add recommendations
      if (report.statistics.audit_logs > 10000) {
        report.recommendations.push(
          'Consider archiving old audit logs (>10,000 entries detected)'
        );
      }

      if (report.statistics.pending_tx > 100) {
        report.recommendations.push(
          'High number of pending transactions detected - review processing pipeline'
        );
      }

      const cacheHitRatio = report.health.metrics?.cacheHits?.heap_hit_ratio || 0;
      if (cacheHitRatio < 90) {
        report.recommendations.push(
          `Cache hit ratio is low (${cacheHitRatio}%) - consider increasing shared_buffers`
        );
      }

      // Save report
      const reportPath = join(
        '/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/tmp',
        `db-report-${new Date().toISOString().split('T')[0]}.json`
      );

      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`\n✓ Report saved to: ${reportPath}`);

      // Print summary
      this.log('\n=== REPORT SUMMARY ===');
      this.log(`Total Users: ${report.statistics.users}`);
      this.log(`Total Transactions: ${report.statistics.transactions}`);
      this.log(`Validated Users: ${report.statistics.validated_users}`);
      this.log(`Commerce Users: ${report.statistics.commerce_users}`);

      if (report.recommendations.length > 0) {
        this.log('\nRecommendations:');
        report.recommendations.forEach(rec => this.log(`- ${rec}`));
      } else {
        this.log('\n✓ No recommendations - database is well optimized!');
      }

      return report;
    } catch (error) {
      this.log('Error generating report:', error);
      return { error };
    }
  }

  /**
   * Run all maintenance tasks
   */
  async runAll() {
    this.log('=== RUNNING ALL MAINTENANCE TASKS ===\n');

    const results = {
      monitor: await this.monitor(),
      cleanup: await this.cleanup(),
      optimize: await this.optimize(),
      report: await this.generateReport(),
    };

    this.log('\n=== MAINTENANCE COMPLETE ===');
    return results;
  }
}

// Command line interface
async function main() {
  const command = process.argv[2] || 'all';
  const options: MaintenanceOptions = {
    verbose: true,
    dryRun: process.argv.includes('--dry-run'),
    daysToKeep: parseInt(process.env.CLEANUP_DAYS || '90'),
  };

  const maintenance = new DatabaseMaintenance(options);

  try {
    switch (command) {
      case 'monitor':
        await maintenance.monitor();
        break;
      case 'cleanup':
        await maintenance.cleanup();
        break;
      case 'optimize':
        await maintenance.optimize();
        break;
      case 'report':
        await maintenance.generateReport();
        break;
      case 'all':
      default:
        await maintenance.runAll();
        break;
    }
  } catch (error) {
    console.error('Maintenance error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { DatabaseMaintenance };