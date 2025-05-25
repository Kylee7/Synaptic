import { Logger } from './Logger';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage?: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private logger: Logger;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private requestCounts: number[] = [];
  private responseTimes: number[] = [];
  private errorCounts: number[] = [];
  private activeConnections: number = 0;

  private constructor() {
    this.logger = new Logger('PerformanceMonitor');
    this.startMetricsCollection();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string, metadata?: Record<string, any>, tags?: string[]): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
      tags
    };

    this.metrics.set(id, metric);
    return id;
  }

  /**
   * End timing an operation
   */
  endTimer(id: string): PerformanceMetric | null {
    const metric = this.metrics.get(id);
    if (!metric) {
      this.logger.warn(`Timer not found: ${id}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.metrics.delete(id);
    this.completedMetrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.completedMetrics.length > 1000) {
      this.completedMetrics = this.completedMetrics.slice(-1000);
    }

    // Log slow operations
    if (metric.duration > 1000) { // More than 1 second
      this.logger.warn(`Slow operation detected: ${metric.name}`, {
        duration: metric.duration,
        metadata: metric.metadata
      });
    }

    return metric;
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTimer(name, metadata);
    try {
      const result = await fn();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      this.recordError();
      throw error;
    }
  }

  /**
   * Record a request
   */
  recordRequest(responseTime: number): void {
    this.requestCounts.push(Date.now());
    this.responseTimes.push(responseTime);

    // Keep only last 1000 entries
    if (this.requestCounts.length > 1000) {
      this.requestCounts = this.requestCounts.slice(-1000);
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCounts.push(Date.now());

    // Keep only last 1000 entries
    if (this.errorCounts.length > 1000) {
      this.errorCounts = this.errorCounts.slice(-1000);
    }
  }

  /**
   * Increment active connections
   */
  incrementConnections(): void {
    this.activeConnections++;
  }

  /**
   * Decrement active connections
   */
  decrementConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Calculate requests per second (last minute)
    const recentRequests = this.requestCounts.filter(time => time > oneMinuteAgo);
    const requestsPerSecond = recentRequests.length / 60;

    // Calculate average response time (last minute)
    const recentResponseTimes = this.responseTimes.slice(-recentRequests.length);
    const averageResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, time) => sum + time, 0) / recentResponseTimes.length
      : 0;

    // Calculate error rate (last minute)
    const recentErrors = this.errorCounts.filter(time => time > oneMinuteAgo);
    const errorRate = recentRequests.length > 0
      ? (recentErrors.length / recentRequests.length) * 100
      : 0;

    return {
      memoryUsage: this.getMemoryUsage(),
      activeConnections: this.activeConnections,
      requestsPerSecond,
      averageResponseTime,
      errorRate
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    // Group metrics by name
    const metricsByName = new Map<string, PerformanceMetric[]>();
    this.completedMetrics.forEach(metric => {
      if (!metricsByName.has(metric.name)) {
        metricsByName.set(metric.name, []);
      }
      metricsByName.get(metric.name)!.push(metric);
    });

    // Calculate statistics for each metric
    metricsByName.forEach((metrics, name) => {
      const durations = metrics.map(m => m.duration!).filter(d => d !== undefined);
      if (durations.length > 0) {
        stats[name] = {
          count: durations.length,
          average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          min: Math.min(...durations),
          max: Math.max(...durations),
          p95: this.calculatePercentile(durations, 95),
          p99: this.calculatePercentile(durations, 99)
        };
      }
    });

    return stats;
  }

  /**
   * Get slow operations (> 1 second)
   */
  getSlowOperations(): PerformanceMetric[] {
    return this.completedMetrics.filter(metric => 
      metric.duration && metric.duration > 1000
    );
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.completedMetrics = [];
    this.requestCounts = [];
    this.responseTimes = [];
    this.errorCounts = [];
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    system: SystemMetrics;
    performance: Record<string, any>;
    slowOperations: PerformanceMetric[];
  } {
    return {
      system: this.getSystemMetrics(),
      performance: this.getPerformanceStats(),
      slowOperations: this.getSlowOperations()
    };
  }

  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    // Mock memory usage - in real Node.js environment, use process.memoryUsage()
    const used = 50 * 1024 * 1024; // 50MB mock
    const total = 100 * 1024 * 1024; // 100MB mock
    
    return {
      used,
      total,
      percentage: (used / total) * 100
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.logger.debug('System metrics collected', metrics);

      // Alert on high error rate
      if (metrics.errorRate > 10) {
        this.logger.warn('High error rate detected', { errorRate: metrics.errorRate });
      }

      // Alert on high response time
      if (metrics.averageResponseTime > 2000) {
        this.logger.warn('High response time detected', { 
          averageResponseTime: metrics.averageResponseTime 
        });
      }

      // Alert on high memory usage
      if (metrics.memoryUsage.percentage > 80) {
        this.logger.warn('High memory usage detected', { 
          memoryUsage: metrics.memoryUsage 
        });
      }
    }, 30000);
  }
}

/**
 * Performance monitoring decorator
 */
export function monitor(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      return await monitor.timeFunction(metricName, () => method.apply(this, args));
    };
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance(); 