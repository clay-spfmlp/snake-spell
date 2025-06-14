import { logger } from './logger.js';

export interface PerformanceMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  concurrentPlayers: number;
  activeGames: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private requestTimes: number[] = [];
  private errorCounts: Record<string, number> = {};
  private totalErrors = 0;
  private recentErrors = 0; // NEW: Track recent errors for rate calculation
  private concurrentPlayers = 0;
  private activeGames = 0;
  private requestCount = 0;
  private lastRequestCountReset = Date.now();

  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly retentionPeriod: number = 2 * 60 * 60 * 1000, // FIXED: 2 hours instead of 24
    private readonly monitoringFrequency: number = 5 * 60 * 1000 // FIXED: 5 minutes instead of 1
  ) { }

  public start(): void {
    // Start monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.monitoringFrequency);

    // Start cleanup of old metrics
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Every hour

    logger.info('Performance monitoring started');
  }

  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    logger.info('Performance monitoring stopped');
  }

  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate CPU usage percentage (approximate)
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    // Calculate average response time
    const avgResponseTime = this.requestTimes.length > 0
      ? this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
      : 0;

    // Calculate requests per second
    const timeSinceLastReset = Date.now() - this.lastRequestCountReset;
    const requestsPerSecond = this.requestCount / (timeSinceLastReset / 1000);

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      cpuUsage: cpuPercent,
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      concurrentPlayers: this.concurrentPlayers,
      activeGames: this.activeGames,
      averageResponseTime: avgResponseTime,
      requestsPerSecond,
      errors: {
        total: this.totalErrors,
        byType: { ...this.errorCounts }
      }
    };

    this.metrics.push(metrics);

    // FIXED: Check resource usage before resetting counters
    this.checkResourceUsage(metrics, requestsPerSecond);

    // Reset counters
    this.requestTimes = [];
    this.requestCount = 0;
    this.recentErrors = 0; // NEW: Reset recent errors
    this.lastRequestCountReset = Date.now();
  }

  private checkResourceUsage(metrics: PerformanceMetrics, requestsPerSecond: number): void {
    // Memory usage warning
    if (metrics.memoryUsage.percentage > 80) {
      logger.warn('High memory usage detected', {
        percentage: metrics.memoryUsage.percentage.toFixed(2),
        used: Math.round(metrics.memoryUsage.used / 1024 / 1024),
        total: Math.round(metrics.memoryUsage.total / 1024 / 1024)
      });
    }

    // Response time warning
    if (metrics.averageResponseTime > 1000) {
      logger.warn('High average response time detected', {
        averageResponseTime: metrics.averageResponseTime.toFixed(2),
        concurrentPlayers: metrics.concurrentPlayers
      });
    }

    // Concurrent players limit warning
    if (metrics.concurrentPlayers > 6) { // Warning at 75% of 8 player limit
      logger.warn('Approaching concurrent player limit', {
        current: metrics.concurrentPlayers,
        limit: 8
      });
    }

    // FIXED: Error rate warning using recent errors with minimum threshold
    if (requestsPerSecond > 0.5 && this.recentErrors > 5 && (this.recentErrors / requestsPerSecond) > 0.05) {
      logger.warn('High error rate detected', {
        errorRate: ((this.recentErrors / requestsPerSecond) * 100).toFixed(2),
        recentErrors: this.recentErrors,
        requestsPerSecond: requestsPerSecond.toFixed(2)
      });
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.retentionPeriod;
    const initialCount = this.metrics.length;

    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);

    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} old performance metrics`);
    }
  }

  // Public methods for updating counters
  public recordRequest(responseTime: number): void {
    this.requestTimes.push(responseTime);
    this.requestCount++;
  }

  public recordError(errorType: string): void {
    this.totalErrors++;
    this.recentErrors++; // NEW: Track recent errors
    this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;
  }

  public updateConcurrentPlayers(count: number): void {
    this.concurrentPlayers = count;
  }

  public updateActiveGames(count: number): void {
    this.activeGames = count;
  }

  // Public methods for retrieving metrics
  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getMetricsHistory(duration: number = 60 * 60 * 1000): PerformanceMetrics[] {
    const cutoffTime = Date.now() - duration;
    return this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Record<string, { status: string; value: any; threshold: any }>;
  } {
    const current = this.getCurrentMetrics();

    if (!current) {
      return {
        status: 'warning',
        checks: {
          metrics: { status: 'no_data', value: null, threshold: null }
        }
      };
    }

    const checks = {
      memory: {
        status: current.memoryUsage.percentage > 90 ? 'critical' :
          current.memoryUsage.percentage > 80 ? 'warning' : 'healthy',
        value: current.memoryUsage.percentage.toFixed(2) + '%',
        threshold: '80%'
      },
      response_time: {
        status: current.averageResponseTime > 2000 ? 'critical' :
          current.averageResponseTime > 1000 ? 'warning' : 'healthy',
        value: current.averageResponseTime.toFixed(2) + 'ms',
        threshold: '1000ms'
      },
      concurrent_players: {
        status: current.concurrentPlayers >= 8 ? 'critical' :
          current.concurrentPlayers >= 6 ? 'warning' : 'healthy',
        value: current.concurrentPlayers,
        threshold: 6
      },
      error_rate: {
        status: 'healthy', // Will be updated based on recent error rate
        value: current.errors.total,
        threshold: '5%'
      }
    };

    // Determine overall status
    const statuses = Object.values(checks).map(check => check.status);
    const overallStatus = statuses.includes('critical') ? 'critical' :
      statuses.includes('warning') ? 'warning' : 'healthy';

    return { status: overallStatus, checks };
  }

  public createMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.recordRequest(responseTime);

        // Record errors for 4xx and 5xx status codes
        if (res.statusCode >= 400) {
          const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
          this.recordError(errorType);
        }
      });

      next();
    };
  }

  public getPerformanceReport(): {
    summary: {
      uptime: number;
      totalRequests: number;
      totalErrors: number;
      peakConcurrentPlayers: number;
      peakMemoryUsage: number;
    };
    recent: PerformanceMetrics[];
  } {
    const recentMetrics = this.getMetricsHistory(60 * 60 * 1000); // Last hour

    const peakMemory = recentMetrics.reduce((max, metric) =>
      Math.max(max, metric.memoryUsage.percentage), 0);

    const peakPlayers = recentMetrics.reduce((max, metric) =>
      Math.max(max, metric.concurrentPlayers), 0);

    return {
      summary: {
        uptime: process.uptime(),
        totalRequests: this.requestCount,
        totalErrors: this.totalErrors,
        peakConcurrentPlayers: peakPlayers,
        peakMemoryUsage: peakMemory
      },
      recent: recentMetrics.slice(-10) // Last 10 metrics
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();